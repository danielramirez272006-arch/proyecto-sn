const vetRoutes = require('./vet-routes');
const vetService = require('./vet-service');
const vetController = require('./vet-controller');
const petCareVideos = require('./pet-care-videos');

module.exports = {
  vetRoutes,
  vetService,
  vetController,
  ...petCareVideos
};

