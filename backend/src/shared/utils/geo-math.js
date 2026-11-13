/**
 * Utilidades Matemáticas y Geoespaciales ($0 Costo en la nube)
 * - Haversine (distancia en km)
 * - Punto Medio geográfico ponderado
 * - Estimador de peajes en ruta (Costa Rica: San José - Cartago, Caldera, Alajuela)
 * - Sombra solar y azimuth según hora del día
 * - Índice de curvatura de ruta (alerta de mareo para perros y niños)
 * - Fuzzy match (similitud de cadenas para nombres de comercios duplicados)
 */

const TOLL_BOOTHS_CR = [
  { name: 'Peaje Escazú (Ruta 27)', lat: 9.9328, lng: -84.1450, cost_crc: 420 },
  { name: 'Peaje San Rafael (Ruta 27)', lat: 9.9388, lng: -84.2185, cost_crc: 640 },
  { name: 'Peaje Atenas (Ruta 27)', lat: 9.9702, lng: -84.3850, cost_crc: 850 },
  { name: 'Peaje Pozón (Ruta 27)', lat: 9.9021, lng: -84.5860, cost_crc: 640 },
  { name: 'Peaje Naranjo (Bernardo Soto)', lat: 10.0880, lng: -84.3840, cost_crc: 550 },
  { name: 'Peaje Río Segundo (General Cañas)', lat: 10.0050, lng: -84.1950, cost_crc: 275 },
  { name: 'Peaje Tres Ríos (Florencio del Castillo)', lat: 9.8965, lng: -83.9980, cost_crc: 250 },
  { name: 'Peaje Braulio Carrillo (Ruta 32)', lat: 10.1550, lng: -83.9720, cost_crc: 250 }
];

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

function calculateMidpoint(coordinates = []) {
  if (!coordinates || coordinates.length === 0) return null;
  if (coordinates.length === 1) return { lat: coordinates[0].lat, lng: coordinates[0].lng };

  let x = 0;
  let y = 0;
  let z = 0;

  for (const coord of coordinates) {
    const latRad = (coord.lat * Math.PI) / 180;
    const lonRad = (coord.lng * Math.PI) / 180;
    x += Math.cos(latRad) * Math.cos(lonRad);
    y += Math.cos(latRad) * Math.sin(lonRad);
    z += Math.sin(latRad);
  }

  const total = coordinates.length;
  x /= total;
  y /= total;
  z /= total;

  const centralLon = Math.atan2(y, x);
  const centralSqrt = Math.sqrt(x * x + y * y);
  const centralLat = Math.atan2(z, centralSqrt);

  return {
    lat: Math.round(((centralLat * 180) / Math.PI) * 100000) / 100000,
    lng: Math.round(((centralLon * 180) / Math.PI) * 100000) / 100000,
  };
}

function estimateRouteTolls(startCoord, endCoord) {
  if (!startCoord || !endCoord) return { total_tolls_crc: 0, tolls: [] };
  const detectedTolls = [];
  let totalCost = 0;

  const minLat = Math.min(startCoord.lat, endCoord.lat) - 0.05;
  const maxLat = Math.max(startCoord.lat, endCoord.lat) + 0.05;
  const minLng = Math.min(startCoord.lng, endCoord.lng) - 0.05;
  const maxLng = Math.max(startCoord.lng, endCoord.lng) + 0.05;

  for (const booth of TOLL_BOOTHS_CR) {
    if (booth.lat >= minLat && booth.lat <= maxLat && booth.lng >= minLng && booth.lng <= maxLng) {
      detectedTolls.push(booth);
      totalCost += booth.cost_crc;
    }
  }

  return { total_tolls_crc: totalCost, tolls: detectedTolls };
}

function calculateSolarShade(hourOfDay) {
  // 6:00 a 18:00 (Costa Rica UTC-6 tropical)
  const hour = typeof hourOfDay === 'number' ? hourOfDay : 12;
  if (hour < 6 || hour > 18) {
    return { isDaylight: false, shade_quality: 'night', shade_percentage: 100 };
  }
  const peakDiff = Math.abs(hour - 12);
  const shadePercentage = Math.min(95, Math.round(peakDiff * 15 + 10));
  return {
    isDaylight: true,
    hour,
    shade_quality: peakDiff <= 1.5 ? 'harsh_sun' : (peakDiff <= 3.5 ? 'moderate_shade' : 'pleasant_shade'),
    shade_percentage: shadePercentage,
  };
}

function calculateCurvatureIndex(routePoints = []) {
  if (!routePoints || routePoints.length < 3) return { curvature_index: 0, motion_sickness_risk: 'low' };
  let totalAngleChange = 0;

  for (let i = 1; i < routePoints.length - 1; i++) {
    const p1 = routePoints[i - 1];
    const p2 = routePoints[i];
    const p3 = routePoints[i + 1];

    const b1 = Math.atan2(p2.lat - p1.lat, p2.lng - p1.lng);
    const b2 = Math.atan2(p3.lat - p2.lat, p3.lng - p2.lng);
    let diff = Math.abs(b2 - b1);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    totalAngleChange += diff;
  }

  const curvatureScore = Math.round((totalAngleChange / (routePoints.length - 2)) * 100);
  let risk = 'low';
  if (curvatureScore > 40) risk = 'high';
  else if (curvatureScore > 20) risk = 'medium';

  return { curvature_index: curvatureScore, motion_sickness_risk: risk };
}

function stringSimilarityFuzzy(str1 = '', str2 = '') {
  const s1 = String(str1).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const s2 = String(str2).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  const distance = track[s2.length][s1.length];
  const maxLen = Math.max(s1.length, s2.length);
  return Math.round((1 - distance / maxLen) * 100) / 100;
}

module.exports = {
  haversineDistanceKm,
  calculateMidpoint,
  estimateRouteTolls,
  calculateSolarShade,
  calculateCurvatureIndex,
  stringSimilarityFuzzy,
};

