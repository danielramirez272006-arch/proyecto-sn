const { query, execute } = require('../../shared/config/database');
const placesRepository = require('../places/places-repository');
const { success, notFound, badRequest } = require('../../shared/utils/http-response');

class PlaceCorrectionReviewController {
  async listCorrections(req, res, next) {
    try {
      const rows = await query(`
        SELECT c.*, p.name AS place_name 
        FROM place_corrections c
        LEFT JOIN places p ON c.place_id = p.id
        ORDER BY c.created_at DESC LIMIT 50
      `);
      return success(res, rows);
    } catch (err) {
      next(err);
    }
  }

  async decideCorrection(req, res, next) {
    try {
      const { decision } = req.body; // 'approved' o 'rejected'
      if (!['approved', 'rejected'].includes(decision)) {
        return badRequest(res, "decision debe ser 'approved' o 'rejected'");
      }

      const rows = await query('SELECT * FROM place_corrections WHERE id = ?', [req.params.id]);
      if (!rows || rows.length === 0) return notFound(res, 'Solicitud de corrección no encontrada');
      const correction = rows[0];

      const reviewerId = req.user ? req.user.id : 'usr_admin_1';

      if (decision === 'approved') {
        let proposed = {};
        try { proposed = JSON.parse(correction.proposed_data); } catch {}
        await placesRepository.update(correction.place_id, proposed);
      }

      await execute(
        'UPDATE place_corrections SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
        [decision, reviewerId, req.params.id]
      );

      return success(res, { ok: true, status: decision });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PlaceCorrectionReviewController();

