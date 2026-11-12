const express = require('express');
const router = express.Router();
const eventsService = require('./events-service');
const { success, notFound } = require('../../shared/utils/http-response');

router.get('/', async (req, res, next) => {
  try {
    const { status, category, fromDate, limit, offset } = req.query;
    const events = await eventsService.listEvents({
      status,
      category,
      fromDate,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    return success(res, events, { total: events.length });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const event = await eventsService.getEventById(req.params.id);
    if (!event) {
      return notFound(res, 'Evento no encontrado');
    }
    return success(res, event);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

