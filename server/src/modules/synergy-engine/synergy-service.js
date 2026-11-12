const placesRepository = require('../places/places-repository');
const osrmClient = require('../../shared/clients/osrm-routing-api');
const openMeteoClient = require('../../shared/clients/open-meteo-api');
const publicServicesClient = require('../../shared/clients/public-services-cr-api');
const hazardsClient = require('../../shared/clients/hazards-marine-api');
const contextMediaClient = require('../../shared/clients/context-media-api');
const { estimateRouteTolls } = require('../../shared/utils/geo-math');

class SynergyService {
  async calculateComboRoute(startLat = 9.9333, startLng = -84.0833) {
    const places = await placesRepository.findAll({ limit: 6 });
    const selected = places.slice(0, 3);

    const start = { lat: parseFloat(startLat), lng: parseFloat(startLng) };
    const destination = selected[0] ? { lat: selected[0].lat, lng: selected[0].lng } : start;

    const routeInfo = await osrmClient.getRoute(start, destination);
    const tolls = estimateRouteTolls(start, destination);

    return {
      combo_type: '3_stops_micro_route',
      stops: selected.map((p, idx) => ({
        order: idx + 1,
        id: p.id,
        name: p.name,
        category: p.category,
        address: p.address,
        coords: { lat: p.lat, lng: p.lng }
      })),
      route_duration_seconds: routeInfo.routes[0]?.duration || 1200,
      route_distance_meters: routeInfo.routes[0]?.distance || 5000,
      curvature_index: routeInfo.routes[0]?.curvature?.curvature_index || 15,
      motion_sickness_risk: routeInfo.routes[0]?.curvature?.motion_sickness_risk || 'low',
      tolls_detected: tolls,
      source: routeInfo.source
    };
  }

  async estimateTotalTripCost({ distanceKm = 25, mealCostCrc = 12000, parkingHours = 2, fuelType = 'super' }) {
    const fuel = publicServicesClient.estimateTripFuelCost(distanceKm, fuelType);
    const tolls = estimateRouteTolls({ lat: 9.93, lng: -84.08 }, { lat: 9.91, lng: -84.24 });
    const parkingRatePerHour = 1000;
    const parkingTotal = parkingHours * parkingRatePerHour;

    const totalCost = mealCostCrc + fuel.estimated_fuel_cost_crc + tolls.total_tolls_crc + parkingTotal;

    return {
      total_estimated_cost_crc: totalCost,
      breakdown: {
        meal_crc: mealCostCrc,
        fuel_recope_crc: fuel.estimated_fuel_cost_crc,
        tolls_crc: tolls.total_tolls_crc,
        parking_crc: parkingTotal,
      },
      currency: 'CRC'
    };
  }

  async findClimateShelter(lat = 9.9333, lng = -84.0833) {
    const weather = await openMeteoClient.getForecast(lat, lng);
    const rainCurrent = weather.current?.precipitation || 0;
    const isRaining = rainCurrent > 0.5;

    const shelters = await placesRepository.findAll({ category: 'cafe', limit: 2 });
    const shelter = shelters[0] || {
      name: 'Cafetería Techada Refugio Central',
      address: '100m Este del Parque',
      distance_meters: 180
    };

    return {
      current_rain_mm: rainCurrent,
      is_shelter_needed: isRaining,
      recommendation: isRaining 
        ? 'Lluvia activa detectada. Dirígete al refugio bajo techo más cercano a 180m.' 
        : 'Condiciones climáticas estables para actividades al aire libre.',
      nearest_shelter: shelter,
    };
  }

  async getHolidayEscape() {
    const holidays = await contextMediaClient.getOfficialHolidaysCR();
    const marine = await hazardsClient.getMarineConditions();
    const trains = await publicServicesClient.getPublicTransportFares();

    return {
      upcoming_holidays: holidays.slice(0, 3),
      coastal_conditions: marine,
      train_fares: trains,
      recommendation: 'Escapada recomendada para el próximo fin de semana largo hacia el Pacífico Central.'
    };
  }
}

module.exports = new SynergyService();

