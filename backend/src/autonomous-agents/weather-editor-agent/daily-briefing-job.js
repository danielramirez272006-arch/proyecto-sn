const openMeteoClient = require('../../shared/clients/open-meteo-api');

class DailyBriefingJob {
  async generateBriefing(lat = 9.9333, lng = -84.0833) {
    const weather = await openMeteoClient.getForecast(lat, lng);
    const rain = weather.current?.precipitation || 0;
    const temp = weather.current?.temperature_2m || 24;

    return {
      date: new Date().toISOString().slice(0, 10),
      summary: `Buenos días. Clima en el Valle Central: ${temp}°C, probabilidad de lluvia ${rain > 0.5 ? 'alta en la tarde' : 'baja'}.`,
      vet_advice: temp > 28 ? 'Cuidado con el asfalto caliente para las almohadillas caninas antes de las 3:00 PM.' : 'Buen día para paseo matutino.',
      status: 'published'
    };
  }
}

module.exports = new DailyBriefingJob();

