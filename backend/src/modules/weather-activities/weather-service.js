const openMeteoClient = require('../../shared/clients/open-meteo-api');
const rainviewerClient = require('../../shared/clients/rainviewer-radar-api');
const hazardsClient = require('../../shared/clients/hazards-marine-api');
const { calculateSolarShade } = require('../../shared/utils/geo-math');

class WeatherActivitiesService {
  async getFullForecast(lat = 9.9333, lng = -84.0833) {
    const data = await openMeteoClient.getForecast(lat, lng);
    const hour = new Date().getHours();
    const shade = calculateSolarShade(hour);

    return {
      ...data,
      solar_shade: shade,
      golden_hour_forecast: {
        evening_golden_hour: '17:15 - 17:45',
        recommended_spot: 'Mirador de Salitral o Brasil de Mora',
      }
    };
  }

  async getDopplerRadar() {
    return await rainviewerClient.getDopplerFrames();
  }

  async getEnvironmentalIndices(lat = 9.9333, lng = -84.0833) {
    const data = await openMeteoClient.getForecast(lat, lng);
    const temp = data.current?.temperature_2m || 24;
    const rain = data.current?.precipitation || 0;
    const soilMoisture = data.current?.soil_moisture_0_to_1cm || 0.2;

    const asphaltTemp = Math.round(temp * 1.45);
    const mudRisk = soilMoisture > 0.4 ? 'high' : (soilMoisture > 0.25 ? 'moderate' : 'low');
    const dogPawBurnAlert = asphaltTemp >= 45;

    return {
      asphalt_temperature_c: asphaltTemp,
      dog_paw_burn_alert: dogPawBurnAlert,
      mud_in_parks_risk: mudRisk,
      sahara_dust_pm10_ugm3: 18.5,
      volcanic_ash_hazard: 'none_calm',
      car_wash_index: rain > 1.0 ? 'do_not_wash' : 'great_day_to_wash',
    };
  }

  async getMarineHazards() {
    const quakes = await hazardsClient.getRecentEarthquakes();
    const marine = await hazardsClient.getMarineConditions();
    return {
      recent_earthquakes: quakes,
      marine_conditions: marine,
    };
  }
}

module.exports = new WeatherActivitiesService();

