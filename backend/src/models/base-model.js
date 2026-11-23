const crypto = require('node:crypto');
const env = require('../shared/config/env-config');
const { query, execute, transaction } = require('../shared/config/database');

const SAFE_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const ALLOWED_WHERE_OPERATORS = new Set(['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$like', '$isNull']);
const ALLOWED_ORDER_DIRS = new Set(['ASC', 'DESC']);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ENCRYPTED_PREFIX = 'enc:v1:';

// Clave de 32 bytes derivada para cifrado transparente AES-256-GCM a nivel de columna y firma HMAC de filas
const ORM_MASTER_KEY = crypto.scryptSync(
  String(env.jwtSecret || process.env.JWT_SECRET || 'gotox-orm-default-master-key-2026'),
  'gotox-orm-salt-cr-8968',
  32
);

function ormSecurityError(code, message, status = 400) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

/**
 * Cifra un valor en texto plano usando AES-256-GCM autenticado (prefijo enc:v1:iv:tag:ciphertext).
 */
function encryptColumnValue(plainValue) {
  if (plainValue === null || plainValue === undefined || plainValue === '') {
    return plainValue;
  }
  const str = String(plainValue);
  if (str.startsWith(ENCRYPTED_PREFIX)) {
    return str;
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ORM_MASTER_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(str, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Descifra un valor AES-256-GCM. Si el valor fue guardado previamente en texto plano, lo devuelve sin romper compatibilidad.
 */
function decryptColumnValue(storedValue) {
  if (storedValue === null || storedValue === undefined || typeof storedValue !== 'string') {
    return storedValue;
  }
  if (!storedValue.startsWith(ENCRYPTED_PREFIX)) {
    return storedValue;
  }
  try {
    const parts = storedValue.slice(ENCRYPTED_PREFIX.length).split(':');
    if (parts.length !== 3) return storedValue;
    const [ivHex, tagHex, cipherHex] = parts;
    const decipher = crypto.createDecipheriv('aes-256-gcm', ORM_MASTER_KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(cipherHex, 'hex')),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch {
    return '[DATO_CIFRADO_PROTEGIDO]';
  }
}

/**
 * BaseModel — ORM Empresarial Endurecido para GoToX (Supabase PostgreSQL, MySQL y SQLite).
 *
 * Capas de seguridad incluidas:
 * 1. Whitelist estricta de columnas e identificadores SQL (ORM_INVALID_COLUMN_BLOCKED).
 * 2. Validación declarativa de esquemas por columna (tipos, longitudes, rangos, enums, email) antes de ejecutar SQL.
 * 3. Cifrado transparente a nivel de campo con AES-256-GCM autenticado (encryptedColumns).
 * 4. Firma e inspección de integridad criptográfica de fila con HMAC-SHA256 (signRow / verifyRowIntegrity).
 * 5. Protección contra Mass-Assignment (readOnlyColumns) y redacción automática de secretos (hiddenColumns).
 * 6. Paginación segura (findPaginated), Upsert atómico, Hooks de ciclo de vida y Transacciones ACID.
 */
class BaseModel {
  constructor({
    name,
    tableName,
    primaryKey = 'id',
    idPrefix = 'rec',
    columns = [],
    schema = {},
    hiddenColumns = [],
    readOnlyColumns = ['id', 'created_at'],
    jsonColumns = [],
    encryptedColumns = [],
    integrityColumns = [],
    hooks = {}
  }) {
    if (!tableName || !SAFE_IDENTIFIER_REGEX.test(tableName)) {
      throw new Error(`Nombre de tabla inválido en ORM: ${tableName}`);
    }
    this.name = name || tableName;
    this.tableName = tableName;
    this.primaryKey = primaryKey;
    this.idPrefix = idPrefix;
    this.columns = new Set(columns);
    this.schema = schema || {};
    this.hiddenColumns = new Set(hiddenColumns);
    this.readOnlyColumns = new Set(readOnlyColumns);
    this.jsonColumns = new Set(jsonColumns);
    this.encryptedColumns = new Set(encryptedColumns);
    this.integrityColumns = integrityColumns.length > 0 ? integrityColumns : [...columns];
    this.hooks = hooks || {};

    for (const col of this.columns) {
      if (!SAFE_IDENTIFIER_REGEX.test(col)) {
        throw new Error(`Identificador de columna inválido en modelo ${this.name}: ${col}`);
      }
    }
  }

  _assertValidColumn(col) {
    const clean = String(col || '').trim();
    if (!SAFE_IDENTIFIER_REGEX.test(clean) || !this.columns.has(clean)) {
      throw ormSecurityError(
        'ORM_INVALID_COLUMN_BLOCKED',
        `Columna '${clean}' no permitida o inexistente en el modelo '${this.name}'.`
      );
    }
    return clean;
  }

  _runner(tx = null) {
    return tx && typeof tx.query === 'function' ? tx : { query, execute };
  }

  /**
   * Valida cada campo contra las reglas declaradas en this.schema (type, required, maxLength, min, max, enum).
   */
  _validateFieldSchema(col, value, { isUpdate = false } = {}) {
    const rules = this.schema[col];
    if (!rules) return;

    if (value === null || value === undefined || value === '') {
      if (rules.required && !isUpdate) {
        throw ormSecurityError(
          'ORM_VALIDATION_FAILED',
          `El campo '${col}' es obligatorio en el modelo '${this.name}'.`
        );
      }
      return;
    }

    if (rules.type === 'string' || rules.type === 'email') {
      if (typeof value !== 'string') {
        throw ormSecurityError('ORM_VALIDATION_FAILED', `El campo '${col}' debe ser una cadena de texto en '${this.name}'.`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        throw ormSecurityError(
          'ORM_VALIDATION_FAILED',
          `El campo '${col}' excede la longitud máxima de ${rules.maxLength} caracteres en '${this.name}'.`
        );
      }
      if (rules.minLength && value.trim().length < rules.minLength) {
        throw ormSecurityError(
          'ORM_VALIDATION_FAILED',
          `El campo '${col}' debe tener al menos ${rules.minLength} caracteres en '${this.name}'.`
        );
      }
      if (rules.type === 'email' && !EMAIL_REGEX.test(value.trim())) {
        throw ormSecurityError('ORM_VALIDATION_FAILED', `El campo '${col}' no contiene un correo electrónico válido.`);
      }
    } else if (rules.type === 'number') {
      const num = Number(value);
      if (!Number.isFinite(num)) {
        throw ormSecurityError('ORM_VALIDATION_FAILED', `El campo '${col}' debe ser un número válido en '${this.name}'.`);
      }
      if (rules.min !== undefined && num < rules.min) {
        throw ormSecurityError('ORM_VALIDATION_FAILED', `El campo '${col}' no puede ser menor que ${rules.min} en '${this.name}'.`);
      }
      if (rules.max !== undefined && num > rules.max) {
        throw ormSecurityError('ORM_VALIDATION_FAILED', `El campo '${col}' no puede ser mayor que ${rules.max} en '${this.name}'.`);
      }
    }

    if (Array.isArray(rules.enum) && !rules.enum.includes(value)) {
      throw ormSecurityError(
        'ORM_VALIDATION_FAILED',
        `Valor '${value}' inválido para '${col}' en '${this.name}'. Valores permitidos: ${rules.enum.join(', ')}.`
      );
    }
  }

  _buildSelectList(select = null, includeSecrets = false) {
    const requested = Array.isArray(select) && select.length > 0
      ? select.map((c) => this._assertValidColumn(c))
      : [...this.columns];

    const filtered = includeSecrets
      ? requested
      : requested.filter((c) => !this.hiddenColumns.has(c));

    return filtered.length > 0 ? filtered.join(', ') : this.primaryKey;
  }

  _buildWhereClause(where = {}) {
    if (!where || typeof where !== 'object' || Array.isArray(where)) {
      throw ormSecurityError('ORM_INVALID_WHERE', 'El filtro where debe ser un objeto clave-valor.');
    }

    const keys = Object.keys(where);
    if (keys.length === 0) {
      return { sql: '', params: [] };
    }

    const clauses = [];
    const params = [];

    for (const rawCol of keys) {
      const col = this._assertValidColumn(rawCol);
      const val = where[rawCol];

      if (val === null) {
        clauses.push(`${col} IS NULL`);
        continue;
      }

      if (val !== undefined && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        const opKeys = Object.keys(val);
        if (opKeys.length === 0) {
          throw ormSecurityError('ORM_EMPTY_OPERATOR', `Operador vacío para la columna '${col}'.`);
        }

        for (const op of opKeys) {
          if (!ALLOWED_WHERE_OPERATORS.has(op)) {
            throw ormSecurityError(
              'ORM_INVALID_OPERATOR_BLOCKED',
              `Operador '${op}' bloqueado por seguridad en columna '${col}'.`
            );
          }

          const opVal = val[op];
          if (op === '$eq') {
            if (opVal === null) {
              clauses.push(`${col} IS NULL`);
            } else {
              clauses.push(`${col} = ?`);
              params.push(opVal);
            }
          } else if (op === '$ne') {
            if (opVal === null) {
              clauses.push(`${col} IS NOT NULL`);
            } else {
              clauses.push(`${col} <> ?`);
              params.push(opVal);
            }
          } else if (op === '$gt') {
            clauses.push(`${col} > ?`);
            params.push(opVal);
          } else if (op === '$gte') {
            clauses.push(`${col} >= ?`);
            params.push(opVal);
          } else if (op === '$lt') {
            clauses.push(`${col} < ?`);
            params.push(opVal);
          } else if (op === '$lte') {
            clauses.push(`${col} <= ?`);
            params.push(opVal);
          } else if (op === '$like') {
            clauses.push(`${col} LIKE ?`);
            params.push(String(opVal));
          } else if (op === '$isNull') {
            clauses.push(opVal ? `${col} IS NULL` : `${col} IS NOT NULL`);
          } else if (op === '$in') {
            if (!Array.isArray(opVal) || opVal.length === 0 || opVal.length > 200) {
              throw ormSecurityError('ORM_INVALID_IN_LIST', `El operador $in en '${col}' requiere un arreglo de 1 a 200 elementos.`);
            }
            const placeholders = opVal.map(() => '?').join(', ');
            clauses.push(`${col} IN (${placeholders})`);
            params.push(...opVal);
          }
        }
      } else {
        clauses.push(`${col} = ?`);
        params.push(val);
      }
    }

    return {
      sql: clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '',
      params
    };
  }

  _serializeInputRow(data = {}, { isUpdate = false, allowProtectedFields = false } = {}) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw ormSecurityError('ORM_INVALID_PAYLOAD', 'Los datos del modelo deben ser un objeto.');
    }

    if (!isUpdate) {
      for (const [colName, rule] of Object.entries(this.schema)) {
        if (rule?.required && (data[colName] === undefined || data[colName] === null || data[colName] === '')) {
          throw ormSecurityError('ORM_VALIDATION_FAILED', `El campo '${colName}' es obligatorio en '${this.name}'.`);
        }
      }
    }

    const clean = {};
    for (const [rawKey, rawVal] of Object.entries(data)) {
      if (rawVal === undefined) continue;
      const col = this._assertValidColumn(rawKey);

      if (isUpdate && !allowProtectedFields && this.readOnlyColumns.has(col)) {
        throw ormSecurityError(
          'ORM_MASS_ASSIGNMENT_BLOCKED',
          `La columna protegida '${col}' no puede modificarse mediante update() en '${this.name}'.`
        );
      }

      this._validateFieldSchema(col, rawVal, { isUpdate });

      let processedVal = rawVal;
      if (this.jsonColumns.has(col) && rawVal !== null && typeof rawVal === 'object') {
        processedVal = JSON.stringify(rawVal);
      }
      if (this.encryptedColumns.has(col) && processedVal !== null && processedVal !== '') {
        processedVal = encryptColumnValue(processedVal);
      }

      clean[col] = processedVal;
    }
    return clean;
  }

  _deserializeOutputRow(row, includeSecrets = false) {
    if (!row || typeof row !== 'object') return null;
    const out = {};
    for (const [key, val] of Object.entries(row)) {
      if (!includeSecrets && this.hiddenColumns.has(key)) {
        continue;
      }
      let current = val;
      if (this.encryptedColumns.has(key) && typeof current === 'string') {
        current = decryptColumnValue(current);
      }
      if (this.jsonColumns.has(key) && typeof current === 'string') {
        try {
          out[key] = JSON.parse(current);
        } catch {
          out[key] = current;
        }
      } else {
        out[key] = current;
      }
    }
    return out;
  }

  /**
   * Calcula un sello criptográfico HMAC-SHA256 sobre las columnas clave de una fila
   * para detectar adulteraciones directas en base de datos fuera de la aplicación.
   */
  computeRowSignature(row = {}) {
    const canonical = this.integrityColumns
      .filter((col) => !this.hiddenColumns.has(col) && col !== 'updated_at' && col !== 'created_at')
      .sort()
      .map((col) => {
        const val = row[col];
        return `${col}=${val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val) : String(val)}`;
      })
      .join('|');

    return crypto
      .createHmac('sha256', ORM_MASTER_KEY)
      .update(`${this.tableName}:${canonical}`)
      .digest('hex');
  }

  verifyRowIntegrity(row = {}, expectedSignature = '') {
    if (!row || !expectedSignature) return false;
    const actual = this.computeRowSignature(row);
    try {
      return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(String(expectedSignature), 'hex'));
    } catch {
      return false;
    }
  }

  async findAll({
    where = {},
    select = null,
    orderBy = null,
    orderDir = 'DESC',
    limit = 100,
    offset = 0,
    includeSecrets = false,
    withIntegritySeal = false,
    tx = null
  } = {}) {
    const runner = this._runner(tx);
    const selectCols = this._buildSelectList(select, includeSecrets);
    const { sql: whereSql, params } = this._buildWhereClause(where);

    let orderSql = '';
    if (orderBy) {
      const validOrderCol = this._assertValidColumn(orderBy);
      const dir = String(orderDir || 'ASC').toUpperCase();
      if (!ALLOWED_ORDER_DIRS.has(dir)) {
        throw ormSecurityError('ORM_INVALID_ORDER_DIR', `Dirección de ordenamiento inválida: ${orderDir}`);
      }
      orderSql = ` ORDER BY ${validOrderCol} ${dir}`;
    }

    const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
    const safeOffset = Math.max(0, Number(offset) || 0);

    const fullSql = `SELECT ${selectCols} FROM ${this.tableName}${whereSql}${orderSql} LIMIT ? OFFSET ?`;
    const rows = await runner.query(fullSql, [...params, safeLimit, safeOffset]);
    return (rows || []).map((r) => {
      const item = this._deserializeOutputRow(r, includeSecrets);
      if (withIntegritySeal && item) {
        item._integrity_hmac = this.computeRowSignature(item);
      }
      return item;
    });
  }

  async findPaginated({
    where = {},
    select = null,
    orderBy = null,
    orderDir = 'DESC',
    page = 1,
    limit = 20,
    includeSecrets = false,
    tx = null
  } = {}) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 20));
    const offset = (safePage - 1) * safeLimit;

    const [total, items] = await Promise.all([
      this.count({ where, tx }),
      this.findAll({ where, select, orderBy, orderDir, limit: safeLimit, offset, includeSecrets, tx })
    ]);

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return {
      items,
      pagination: {
        total,
        page: safePage,
        limit: safeLimit,
        total_pages: totalPages,
        has_next: safePage < totalPages,
        has_prev: safePage > 1
      }
    };
  }

  async findOne({ where = {}, select = null, includeSecrets = false, withIntegritySeal = false, tx = null } = {}) {
    const rows = await this.findAll({ where, select, limit: 1, offset: 0, includeSecrets, withIntegritySeal, tx });
    return rows[0] || null;
  }

  async findByPk(id, { select = null, includeSecrets = false, withIntegritySeal = false, tx = null } = {}) {
    if (id === undefined || id === null || id === '') return null;
    return await this.findOne({
      where: { [this.primaryKey]: id },
      select,
      includeSecrets,
      withIntegritySeal,
      tx
    });
  }

  async count({ where = {}, tx = null } = {}) {
    const runner = this._runner(tx);
    const { sql: whereSql, params } = this._buildWhereClause(where);
    const rows = await runner.query(`SELECT COUNT(*) AS total FROM ${this.tableName}${whereSql}`, params);
    return Number(rows?.[0]?.total || 0);
  }

  async create(data = {}, { includeSecrets = false, withIntegritySeal = false, tx = null } = {}) {
    const runner = this._runner(tx);
    let payload = { ...data };
    if (this.primaryKey && this.columns.has(this.primaryKey) && !payload[this.primaryKey]) {
      payload[this.primaryKey] = `${this.idPrefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    }

    if (typeof this.hooks.beforeCreate === 'function') {
      payload = (await this.hooks.beforeCreate(payload)) || payload;
    }

    const clean = this._serializeInputRow(payload, { isUpdate: false });
    const cols = Object.keys(clean);
    if (cols.length === 0) {
      throw ormSecurityError('ORM_EMPTY_INSERT', `No se proporcionaron columnas válidas para insertar en '${this.name}'.`);
    }

    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map((c) => clean[c]);

    await runner.execute(
      `INSERT INTO ${this.tableName} (${cols.join(', ')}) VALUES (${placeholders})`,
      values
    );

    let resultRow = null;
    if (payload[this.primaryKey]) {
      resultRow = await this.findByPk(payload[this.primaryKey], { includeSecrets, withIntegritySeal, tx });
    }
    if (!resultRow) {
      resultRow = this._deserializeOutputRow(clean, includeSecrets);
      if (withIntegritySeal && resultRow) {
        resultRow._integrity_hmac = this.computeRowSignature(resultRow);
      }
    }

    if (typeof this.hooks.afterCreate === 'function') {
      await this.hooks.afterCreate(resultRow).catch(() => {});
    }

    return resultRow;
  }

  async update(id, data = {}, { allowProtectedFields = false, includeSecrets = false, withIntegritySeal = false, tx = null } = {}) {
    if (id === undefined || id === null || id === '') {
      throw ormSecurityError('ORM_MISSING_PRIMARY_KEY', `Se requiere '${this.primaryKey}' para actualizar en '${this.name}'.`);
    }

    const runner = this._runner(tx);
    let payload = { ...data };
    if (typeof this.hooks.beforeUpdate === 'function') {
      payload = (await this.hooks.beforeUpdate(id, payload)) || payload;
    }

    const clean = this._serializeInputRow(payload, { isUpdate: true, allowProtectedFields });
    const cols = Object.keys(clean);
    if (cols.length === 0) {
      throw ormSecurityError('ORM_EMPTY_UPDATE', `No se proporcionaron columnas modificables para actualizar en '${this.name}'.`);
    }

    const setClause = cols.map((c) => `${c} = ?`).join(', ');
    const values = cols.map((c) => clean[c]);

    await runner.execute(
      `UPDATE ${this.tableName} SET ${setClause} WHERE ${this.primaryKey} = ?`,
      [...values, id]
    );

    const updated = await this.findByPk(id, { includeSecrets, withIntegritySeal, tx });
    if (typeof this.hooks.afterUpdate === 'function') {
      await this.hooks.afterUpdate(id, updated).catch(() => {});
    }
    return updated;
  }

  async upsert(data = {}, { allowProtectedFields = false, includeSecrets = false, tx = null } = {}) {
    const pkVal = data?.[this.primaryKey];
    if (pkVal) {
      const existing = await this.findByPk(pkVal, { tx });
      if (existing) {
        const updatePayload = { ...data };
        delete updatePayload[this.primaryKey];
        return await this.update(pkVal, updatePayload, { allowProtectedFields, includeSecrets, tx });
      }
    }
    return await this.create(data, { includeSecrets, tx });
  }

  async destroy(id, { tx = null } = {}) {
    if (id === undefined || id === null || id === '') {
      throw ormSecurityError('ORM_MISSING_PRIMARY_KEY', `Se requiere '${this.primaryKey}' para eliminar en '${this.name}'.`);
    }
    const runner = this._runner(tx);
    await runner.execute(`DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`, [id]);
    return { deleted: true, [this.primaryKey]: id };
  }

  async destroyWhere(where = {}, { tx = null } = {}) {
    const keys = Object.keys(where || {});
    if (keys.length === 0) {
      throw ormSecurityError(
        'ORM_UNSAFE_DELETE_BLOCKED',
        `Bloqueado intento de DELETE sin cláusula WHERE en '${this.name}'.`
      );
    }
    const runner = this._runner(tx);
    const { sql: whereSql, params } = this._buildWhereClause(where);
    await runner.execute(`DELETE FROM ${this.tableName}${whereSql}`, params);
    return { deleted: true };
  }

  async withTransaction(fn) {
    return await transaction(fn);
  }

  getSecurityDescriptor() {
    return {
      model: this.name,
      table: this.tableName,
      primary_key: this.primaryKey,
      columns_count: this.columns.size,
      hidden_columns: [...this.hiddenColumns],
      read_only_columns: [...this.readOnlyColumns],
      encrypted_columns: [...this.encryptedColumns],
      json_columns: [...this.jsonColumns],
      schema_validated_fields: Object.keys(this.schema)
    };
  }
}

module.exports = {
  BaseModel,
  ormSecurityError,
  encryptColumnValue,
  decryptColumnValue
};
