/**
 * Generador de enlaces universales de navegación para Waze, Google Maps y Apple Maps
 */
function generateNavigationLinks(latitude, longitude, label = 'Destino') {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const encodedLabel = encodeURIComponent(label || 'Destino');

  return {
    coordinates: { latitude: lat, longitude: lng },
    label,
    links: {
      waze_app: `waze://?ll=${lat},${lng}&navigate=yes`,
      waze_web: `https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`,
      google_maps: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
      apple_maps: `https://maps.apple.com/?daddr=${lat},${lng}&q=${encodedLabel}`,
      geo_uri: `geo:${lat},${lng}?q=${lat},${lng}(${encodedLabel})`
    },
    qr_waze_url: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`https://www.waze.com/ul?ll=${lat},${lng}&navigate=yes`)}`
  };
}

module.exports = {
  generateNavigationLinks
};

