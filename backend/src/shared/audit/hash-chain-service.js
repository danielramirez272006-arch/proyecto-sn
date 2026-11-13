const crypto = require('node:crypto');
const { query, execute } = require('../config/database');

const GENESIS_PREV_HASH = '0'.repeat(64);

class HashChainService {
  /**
   * Genera un hash SHA-256 canónico de un objeto serializado
   */
  canonicalHash(data) {
    if (typeof data !== 'object' || data === null) {
      return crypto.createHash('sha256').update(String(data || '')).digest('hex');
    }
    // Ordenar claves alfabéticamente para asegurar idempotencia matemática
    const sortedKeys = Object.keys(data).sort();
    const sortedObj = {};
    for (const key of sortedKeys) {
      sortedObj[key] = data[key];
    }
    return crypto.createHash('sha256').update(JSON.stringify(sortedObj)).digest('hex');
  }

  /**
   * Calcula el hash criptográfico del bloque encadenado
   */
  computeBlockHash({ prevHash, sequenceNumber, entityType, recordId, action, actorId, dataHash }) {
    const raw = `${prevHash}|${sequenceNumber}|${entityType}|${recordId}|${action}|${actorId || 'anon'}|${dataHash}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Registra un nuevo eslabón en la cadena inmutable
   */
  async recordBlock({ recordId, entityType, action, actorId = null, data = {} }) {
    try {
      const lastRows = await query(
        'SELECT sequence_number, block_hash FROM audit_chain_ledger ORDER BY sequence_number DESC LIMIT 1'
      );
      const lastBlock = lastRows && lastRows.length > 0 ? lastRows[0] : null;

      const sequenceNumber = lastBlock ? Number(lastBlock.sequence_number) + 1 : 1;
      const prevHash = lastBlock ? lastBlock.block_hash : GENESIS_PREV_HASH;
      const dataHash = this.canonicalHash(data);

      const blockHash = this.computeBlockHash({
        prevHash,
        sequenceNumber,
        entityType,
        recordId,
        action,
        actorId,
        dataHash
      });

      const id = `blk_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      await execute(
        `INSERT INTO audit_chain_ledger 
         (id, record_id, sequence_number, entity_type, action, actor_id, data_hash, previous_hash, block_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [id, recordId, sequenceNumber, entityType, action, actorId, dataHash, prevHash, blockHash]
      );

      return {
        id,
        record_id: recordId,
        sequence_number: sequenceNumber,
        previous_hash: prevHash,
        block_hash: blockHash,
        data_hash: dataHash,
        verified: true
      };
    } catch (err) {
      console.warn('[HashChainService] Error registrando bloque en la cadena:', err.message);
      return { verified: false, error: err.message };
    }
  }

  /**
   * Valida matemáticamente la integridad de toda la cadena de bloques
   */
  async verifyChain() {
    const blocks = await query('SELECT * FROM audit_chain_ledger ORDER BY sequence_number ASC');

    if (!blocks || blocks.length === 0) {
      return {
        valid: true,
        total_blocks: 0,
        genesis_hash: null,
        latest_hash: null,
        message: 'Cadena vacía: sin registros de auditoría'
      };
    }

    let expectedPrevHash = GENESIS_PREV_HASH;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const seq = Number(block.sequence_number);

      // 1. Verificar secuencia secuencial
      if (seq !== i + 1) {
        return {
          valid: false,
          total_blocks: blocks.length,
          broken_at_sequence: seq,
          error: `Discontinuidad en la secuencia: se esperaba ${i + 1} pero se encontró ${seq}`
        };
      }

      // 2. Verificar encadenamiento con el bloque anterior
      if (block.previous_hash !== expectedPrevHash) {
        return {
          valid: false,
          total_blocks: blocks.length,
          broken_at_sequence: seq,
          error: `Eslabón roto: previous_hash no coincide con el hash del bloque previo en secuencia ${seq}`
        };
      }

      // 3. Recalcular el hash del bloque actual
      const expectedBlockHash = this.computeBlockHash({
        prevHash: block.previous_hash,
        sequenceNumber: seq,
        entityType: block.entity_type,
        recordId: block.record_id,
        action: block.action,
        actorId: block.actor_id,
        dataHash: block.data_hash
      });

      if (block.block_hash !== expectedBlockHash) {
        return {
          valid: false,
          total_blocks: blocks.length,
          broken_at_sequence: seq,
          error: `Hash alterado o manipulado en secuencia ${seq}`
        };
      }

      expectedPrevHash = block.block_hash;
    }

    return {
      valid: true,
      total_blocks: blocks.length,
      genesis_hash: blocks[0].block_hash,
      latest_hash: blocks[blocks.length - 1].block_hash,
      message: 'Integridad criptográfica verificada: 100% inmutable y consistente'
    };
  }

  /**
   * Obtiene la pista de auditoría encadenada de un recurso específico
   */
  async getTrail(entityType, recordId) {
    const blocks = await query(
      `SELECT id, record_id, sequence_number, entity_type, action, actor_id, data_hash, previous_hash, block_hash, created_at
       FROM audit_chain_ledger
       WHERE entity_type = ? AND record_id = ?
       ORDER BY sequence_number ASC`,
      [entityType, recordId]
    );

    return blocks || [];
  }
}

module.exports = new HashChainService();

