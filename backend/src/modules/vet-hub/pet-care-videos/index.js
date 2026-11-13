const petCareVideosService = require('./pet-care-videos-service');
const petCareVideosController = require('./pet-care-videos-controller');
const petCareVideosRoutes = require('./pet-care-videos-routes');
const petCareVideosAdminRoutes = require('./pet-care-videos-admin-routes');
const youtubeParser = require('./youtube-parser');
const questionMatcher = require('./question-matcher');

module.exports = {
  petCareVideosService,
  petCareVideosController,
  petCareVideosRoutes,
  petCareVideosAdminRoutes,
  youtubeParser,
  questionMatcher
};

