const express = require('express');
const router = express.Router();
const placeCorrectionService = require('./place-correction-service');
const { created, badRequest } = require('../../shared/utils/http-response');

router.post('/place-corrections', async (req, res, next) => {
  try {
    const { place_id, proposed_data, evidence_url } = req.body;
    if (!place_id || !proposed_data) {
      return badRequest(res, 'place_id y proposed_data son requeridos');
    }

    const result = await placeCorrectionService.submitCorrection({
      place_id,
      proposed_data,
      evidence_url,
      submitted_by: req.user?.id || 'anonymous_merchant'
    });
    return created(res, result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

