const fs = require('fs');
const path = require('path');

class JsonStoreEngine {
  constructor(filePath, defaultData = []) {
    this.filePath = filePath;
    this.defaultData = defaultData;
    this.data = null;
    this.indexes = new Map();
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(this.filePath)) {
        this.data = this.defaultData;
        this.saveAtomic();
      } else {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        try {
          this.data = JSON.parse(raw);
          if (!Array.isArray(this.data) && typeof this.data !== 'object') {
            throw new Error('Formato JSON no es colección u objeto');
          }
        } catch (parseErr) {
          console.warn(`[JsonStoreEngine] Archivo corrupto detectado en ${this.filePath}. Auto-reparando con snapshot de respaldo.`);
          this.data = this.defaultData;
          this.saveAtomic();
        }
      }
      this.rebuildIndexes();
    } catch (err) {
      console.error(`[JsonStoreEngine] Error crítico inicializando ${this.filePath}:`, err);
      this.data = this.defaultData;
    }
  }

  rebuildIndexes() {
    this.indexes.clear();
    if (Array.isArray(this.data)) {
      for (const item of this.data) {
        if (item && item.id) {
          this.indexes.set(String(item.id), item);
        }
      }
    }
  }

  getById(id) {
    return this.indexes.get(String(id)) || null;
  }

  getAll() {
    return Array.isArray(this.data) ? [...this.data] : { ...this.data };
  }

  saveAtomic() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.filePath}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.error(`[JsonStoreEngine] Fallo en guardado atómico para ${this.filePath}:`, err);
      throw err;
    }
  }

  upsert(item) {
    if (!item || !item.id) throw new Error('El elemento debe contener un id');
    if (!Array.isArray(this.data)) this.data = [];

    const idx = this.data.findIndex(x => String(x.id) === String(item.id));
    if (idx >= 0) {
      this.data[idx] = { ...this.data[idx], ...item, updated_at: new Date().toISOString() };
    } else {
      this.data.push({ ...item, created_at: item.created_at || new Date().toISOString() });
    }
    this.rebuildIndexes();
    this.saveAtomic();
    return this.getById(item.id);
  }

  delete(id) {
    if (!Array.isArray(this.data)) return false;
    const initialLen = this.data.length;
    this.data = this.data.filter(x => String(x.id) !== String(id));
    if (this.data.length !== initialLen) {
      this.rebuildIndexes();
      this.saveAtomic();
      return true;
    }
    return false;
  }
}

module.exports = JsonStoreEngine;

