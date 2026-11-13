const { query, execute } = require('../../shared/config/database');
const { haversineDistanceKm } = require('../../shared/utils/geo-math');

class PlacesRepository {
  async findAll({ category, verifiedOnly, search, limit = 50, offset = 0 } = {}) {
    let sql = 'SELECT * FROM places WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (verifiedOnly) {
      sql += ' AND (verified_by_admin IS TRUE OR verified_by_admin = 1)';
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

  async findPaginated({
    category,
    verifiedOnly,
    search,
    lat,
    lng,
    radiusKm,
    page = 1,
    limit = 20,
    sortBy = 'name',
    sortOrder = 'ASC'
  } = {}) {
    const validSortCols = ['name', 'category', 'price_level', 'created_at', 'verified_by_admin'];
    const safeSortBy = validSortCols.includes(sortBy) ? sortBy : 'name';
    const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    let countSql = 'SELECT COUNT(*) as total FROM places WHERE 1=1';
    let sql = 'SELECT * FROM places WHERE 1=1';
    const params = [];

    if (category) {
      countSql += ' AND category = ?';
      sql += ' AND category = ?';
      params.push(category);
    }
    if (verifiedOnly) {
      countSql += ' AND (verified_by_admin IS TRUE OR verified_by_admin = 1)';
      sql += ' AND (verified_by_admin IS TRUE OR verified_by_admin = 1)';
      params.push();
    }
    if (search) {
      const term = `%${search}%`;
      const searchClause = ' AND (name LIKE ? OR address LIKE ? OR district LIKE ?)';
      countSql += searchClause;
      sql += searchClause;
      params.push(term, term, term);
    }

    const countRows = await query(countSql, [...params]);
    const totalRecords = countRows?.[0]?.total || 0;

    sql += ` ORDER BY ${safeSortBy} ${safeOrder}`;

    // Si hay filtro por radio GPS, calculamos distancias en memoria antes de paginar
    if (lat !== undefined && lng !== undefined && radiusKm) {
      const allRows = await query(sql, [...params]);
      const originLat = parseFloat(lat);
      const originLng = parseFloat(lng);
      const maxRadius = parseFloat(radiusKm);

      const itemsWithDistance = allRows
        .map(r => this.deserialize(r))
        .map(p => ({
          ...p,
          distance_km: Number(haversineDistanceKm(originLat, originLng, p.lat, p.lng).toFixed(2))
        }))
        .filter(p => p.distance_km <= maxRadius);

      if (sortBy === 'distance_km') {
        itemsWithDistance.sort((a, b) => safeOrder === 'ASC' ? a.distance_km - b.distance_km : b.distance_km - a.distance_km);
      }

      const totalGeo = itemsWithDistance.length;
      const totalPagesGeo = Math.ceil(totalGeo / limit) || 1;
      const offsetGeo = (page - 1) * limit;
      const pageItems = itemsWithDistance.slice(offsetGeo, offsetGeo + limit);

      return {
        items: pageItems,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total_records: totalGeo,
          total_pages: totalPagesGeo,
          has_next_page: page < totalPagesGeo,
          has_prev_page: page > 1,
        }
      };
    }

    const offset = (page - 1) * limit;
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await query(sql, params);
    const items = rows.map(r => this.deserialize(r));
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    return {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total_records: Number(totalRecords),
        total_pages: totalPages,
        has_next_page: page < totalPages,
        has_prev_page: page > 1,
      }
    };
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
