/**
 * Generador de formatos abiertos estándar:
 * - GeoJSON (RFC 7946) para SIG, mapas web (Leaflet, Mapbox, QGIS)
 * - iCalendar (RFC 5545) para Google Calendar, Apple Calendar, Outlook
 */

function placesToGeoJson(places = []) {
  const features = places.map(p => {
    const lat = parseFloat(p.lat) || 0;
    const lng = parseFloat(p.lng) || 0;

    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat] // GeoJSON especifica siempre [longitud, latitud]
      },
      properties: {
        id: p.id,
        name: p.name,
        category: p.category,
        address: p.address || null,
        canton: p.canton || null,
        district: p.district || null,
        phone: p.phone || null,
        schedule_info: p.schedule_info || null,
        price_level: p.price_level || '$$',
        verified_by_admin: Boolean(p.verified_by_admin),
        attributes_metadata: p.attributes_metadata || {},
        updated_at: p.updated_at || new Date().toISOString()
      }
    };
  });

  return {
    type: 'FeatureCollection',
    name: 'SinergiaUrbana_Lugares_CostaRica',
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
    },
    metadata: {
      generated_at: new Date().toISOString(),
      total_features: features.length,
      country: 'Costa Rica',
      provider: 'Sinergia Urbana API'
    },
    features
  };
}

function formatDateToIcs(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '20261114T120000Z';
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function eventToIcs(event) {
  const dtStamp = formatDateToIcs(new Date());
  const dtStart = formatDateToIcs(event.start_time || new Date());
  const dtEnd = formatDateToIcs(event.end_time || new Date(Date.now() + 3 * 3600000));
  const summary = (event.title || 'Evento Comunitario').replace(/,/g, '\\,');
  const description = (event.description || '').replace(/\n/g, '\\n').replace(/,/g, '\\,');
  const location = (event.place_address || event.place_name || 'Costa Rica').replace(/,/g, '\\,');
  const uid = `evt-${event.id || Date.now()}@sinergia.cr`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sinergia Urbana//Eventos Costa Rica//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `STATUS:${(event.status || 'CONFIRMED').toUpperCase()}`,
    'CATEGORIES:COMMUNITY,CULTURE,COSTA_RICA',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

function eventsToIcs(events = []) {
  const dtStamp = formatDateToIcs(new Date());

  const vevents = events.map(event => {
    const dtStart = formatDateToIcs(event.start_time || new Date());
    const dtEnd = formatDateToIcs(event.end_time || new Date(Date.now() + 3 * 3600000));
    const summary = (event.title || 'Evento Comunitario').replace(/,/g, '\\,');
    const description = (event.description || '').replace(/\n/g, '\\n').replace(/,/g, '\\,');
    const location = (event.place_address || event.place_name || 'Costa Rica').replace(/,/g, '\\,');
    const uid = `evt-${event.id || Math.random().toString(36).slice(2)}@sinergia.cr`;

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `STATUS:${(event.status || 'CONFIRMED').toUpperCase()}`,
      'END:VEVENT'
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sinergia Urbana//Calendario Oficial Eventos Costa Rica//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Eventos y Ferias Sinergia Urbana CR',
    'X-WR-TIMEZONE:America/Costa_Rica',
    ...vevents,
    'END:VCALENDAR'
  ].join('\r\n');
}

module.exports = {
  placesToGeoJson,
  eventToIcs,
  eventsToIcs
};
