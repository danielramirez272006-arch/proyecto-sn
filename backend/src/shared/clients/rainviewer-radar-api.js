const httpClient = require('./http-client');
const env = require('../config/env-config');

class RainviewerRadarApiClient {
  async getDopplerFrames() {
    const fallback = {
      version: 'v2',
      generated: Math.floor(Date.now() / 1000),
      host: 'https://tilecache.rainviewer.com',
      radar: {
        past: [{ time: Math.floor(Date.now() / 1000) - 600, path: '/v2/radar/sample/256/{z}/{x}/{y}/2/1_1.png' }],
        nowcast: [{ time: Math.floor(Date.now() / 1000) + 600, path: '/v2/radar/sample/256/{z}/{x}/{y}/2/1_1.png' }]
      },
      source: 'offline_fallback'
    };

    try {
      const data = await httpClient.getJson(env.integrations.rainviewerUrl, fallback, 2500);
      data.source = 'rainviewer_live';
      return data;
    } catch {
      return fallback;
    }
  }
}

module.exports = new RainviewerRadarApiClient();

