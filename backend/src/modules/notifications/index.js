const notificationService = require('./notification-service');
const outboxRepository = require('./outbox-repository');
const emailWorker = require('./email-worker');

module.exports = {
  notificationService,
  outboxRepository,
  emailWorker,
};

