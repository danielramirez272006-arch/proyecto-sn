const httpClient = require('./http-client');
const env = require('../config/env-config');

class ContextMediaApiClient {
  async getOfficialHolidaysCR(year = new Date().getFullYear()) {
    const fallback = [
      { date: `${year}-01-01`, localName: 'Año Nuevo', name: "New Year's Day" },
      { date: `${year}-04-11`, localName: 'Día de Juan Santamaría', name: 'Juan Santamaría Day' },
      { date: `${year}-05-01`, localName: 'Día del Trabajador', name: 'Labour Day' },
      { date: `${year}-07-25`, localName: 'Anexión del Partido de Nicoya', name: 'Annexation of Guanacaste' },
      { date: `${year}-08-02`, localName: 'Día de la Virgen de los Ángeles', name: 'Our Lady of the Angels' },
      { date: `${year}-08-15`, localName: 'Día de la Madre', name: "Mother's Day" },
      { date: `${year}-09-15`, localName: 'Día de la Independencia', name: 'Independence Day' },
      { date: `${year}-12-25`, localName: 'Navidad', name: 'Christmas Day' },
    ];

    try {
      const data = await httpClient.getJson(`${env.integrations.nagerUrl}/${year}/CR`, fallback, 2500);
      return data || fallback;
    } catch {
      return fallback;
    }
  }

  async getAmbientRadioStations() {
    return [
      {
        name: 'Radio Clásica 88.5 FM',
        url: 'https://stream.radioclasica.cr/live',
        genre: 'classical / ambient calm',
        bitrate: 128
      },
      {
        name: 'Sinfonola Costa Rica',
        url: 'https://stream.sinfonola.cr/live',
        genre: 'retro / boleros',
        bitrate: 128
      }
    ];
  }
}

module.exports = new ContextMediaApiClient();

