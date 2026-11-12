const { query, execute } = require('../../shared/config/database');

class PlacesRepository {
  async findAll({ category, verifiedOnly, search, limit = 50, offset = 0 } = {}) {
    let sql = 'SELECT * FROM places WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (verifiedOnly) {
      sql += ' AND verified_by_admin = 1';
      params.push();
    }
    if (search) {
      sql += ' AND (name LIKE ? OR address LIKE ? OR district LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY verified_by_admin DESC, name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await query(sql, params);
    return rows.map(r => this.deserialize(r));
  }

  async findById(id) {
    const rows = await query('SELECT * FROM places WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return null;
    return this.deserialize(rows[0]);
  }

  async create(placeData) {
    const id = placeData.id || `plc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const metadataStr = typeof placeData.attributes_metadata === 'object' 
      ? JSON.stringify(placeData.attributes_metadata) 
      : (placeData.attributes_metadata || '{}');

    await execute(
      `INSERT INTO places (id, name, category, lat, lng, address, district, canton, phone, schedule_info, price_level, verified_by_admin, attributes_metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        placeData.name,
        placeData.category,
        placeData.lat,
        placeData.lng,
        placeData.address || '',
        placeData.district || '',
        placeData.canton || '',
        placeData.phone || '',
        placeData.schedule_info || '',
        placeData.price_level || '$$',
        placeData.verified_by_admin ? 1 : 0,
        metadataStr
      ]
    );

    return this.findById(id);
  }

  async update(id, updates) {
    const current = await this.findById(id);
    if (!current) return null;

    const fields = [];
    const params = [];

    for (const [key, val] of Object.entries(updates)) {
      if (['name', 'category', 'lat', 'lng', 'address', 'district', 'canton', 'phone', 'schedule_info', 'price_level', 'verified_by_admin'].includes(key)) {
        fields.push(`${key} = ?`);
        params.push(key === 'verified_by_admin' ? (val ? 1 : 0) : val);
      } else if (key === 'attributes_metadata') {
        fields.push('attributes_metadata = ?');
        params.push(typeof val === 'object' ? JSON.stringify(val) : val);
      }
    }

    if (fields.length === 0) return current;

    params.push(id);
    await execute(`UPDATE places SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.findById(id);
  }

  async delete(id) {
    const res = await execute('DELETE FROM places WHERE id = ?', [id]);
    return res;
  }

  deserialize(row) {
    if (!row) return null;
    let metadata = {};
    try {
      metadata = typeof row.attributes_metadata === 'string' 
        ? JSON.parse(row.attributes_metadata) 
        : (row.attributes_metadata || {});
    } catch {
      metadata = {};
    }
    return {
      ...row,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      verified_by_admin: Boolean(row.verified_by_admin),
      attributes_metadata: metadata
    };
  }
}

module.exports = new PlacesRepository();

