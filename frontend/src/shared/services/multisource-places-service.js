import { useCallback, useEffect, useState } from 'react';

const BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api';
const TTL_MS = 5 * 60 * 1000;
const liveCache = new Map();

export function mapearLugarMultifuenteATarjeta(item) {
  const petFriendly =
    item.access_status === 'allowed'
      ? 'si'
      : item.access_status === 'not_allowed'
      ? 'solo-humanos'
      : 'consultar';

  const cat = String(item.category || 'restaurant').toLowerCase();
  const tipoActividad = cat.includes('caf') ? 'cafe' : 'gastronomia';

  return {
    id: item.id,
    nombre: item.name,
    categoria: cat === 'cafe' ? 'Cafetería (En vivo)' : cat === 'bar' ? 'Bar & Gastro (En vivo)' : 'Restaurante (En vivo)',
    tipoActividad,
    zona: item.address || 'San José, GAM',
    canton: 'San José',
    direccion: item.address || 'Dirección no especificada',
    lat: item.lat,
    lng: item.lng,
    precioNivel: '$$',
    rangoPrecio: 'Consultar en local',
    horario: 'Consultar en local',
    tiempoEstimado: '1 - 2 horas',
    condicionClima: item.known_conditions?.seating_access === 'outdoor' ? 'aire-libre' : 'bajo-techo',
    petFriendly,
    politicaPet: item.explanation || 'Estado según proveedor externo; confirmar condiciones en el local.',
    accesibilidad: {
      rampa: false,
      acusticaTranquila: false,
      sillaRuedas: false,
      estacionamientoPreferencial: false
    },
    nivelRuido: 'Por confirmar',
    decibelios: null,
    puntuacion: 4.5,
    verificado: item.verification_level === 'business_confirmation' || item.verification_level === 'admin_review',
    insignia:
      item.verification_level === 'business_confirmation'
        ? 'Confirmado por local'
        : 'Fuente Real OSM / Multi-fuente',
    telefono: item.provenance?.phone?.value || 'No disponible',
    descripcion: item.explanation || 'Establecimiento real consultado en vivo.',
    servicios: [
      item.known_conditions?.seating_access ? `Zona: ${item.known_conditions.seating_access}` : 'Condiciones por confirmar'
    ],
    imagen: item.photo?.url || null,
    galeria: item.photo?.url ? [item.photo.url] : [],
    photoMeta: item.photo
      ? {
          status: 'resolved',
          provider: item.photo.provider || 'wikimedia_commons',
          externalId: item.id,
          attributions: item.photo.author
            ? [{ displayName: `${item.photo.author}${item.photo.license ? ` · ${item.photo.license}` : ''}`, uri: item.photo.source_page_url }]
            : [],
          sourceUrl: item.photo.source_page_url || null,
          reason: null
        }
      : {
          status: 'no_photos',
          provider: null,
          attributions: [],
          sourceUrl: null,
          reason: item.photo_reason || 'Sin fotografía disponible.'
        },
    esRealEnVivo: true,
    queried_at: item.queried_at || null
  };
}

export function useLiveMultisourcePlaces({
  lat = 9.9352,
  lng = -84.0695,
  radius = 2200,
  limit = 10,
  refreshIntervalMs = TTL_MS
} = {}) {
  const [lugaresReales, setLugaresReales] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const cargar = useCallback(
    async ({ force = false } = {}) => {
      const cacheKey = `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)},${radius},${limit}`;
      const cached = liveCache.get(cacheKey);
      if (!force && cached && Date.now() - cached.ts < TTL_MS) {
        setLugaresReales(cached.items);
        setUltimaActualizacion(cached.queriedAt);
        return;
      }

      setCargando(true);
      try {
        const resp = await fetch(
          `${BASE_URL}/places/multisource/search?lat=${lat}&lng=${lng}&radius=${radius}&limit=${limit}`
        );
        if (!resp.ok) return;
        const json = await resp.json();
        const raw = json?.data?.places;
        if (Array.isArray(raw)) {
          const mapeados = raw.map(mapearLugarMultifuenteATarjeta);
          const qAt = json?.data?.queried_at || new Date().toISOString();
          liveCache.set(cacheKey, { items: mapeados, queriedAt: qAt, ts: Date.now() });
          setLugaresReales(mapeados);
          setUltimaActualizacion(qAt);
        }
      } catch {
        // Mantener datos previos si falla red
      } finally {
        setCargando(false);
      }
    },
    [lat, lng, radius, limit]
  );

  useEffect(() => {
    cargar();
    const timer = window.setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        cargar({ force: true });
      }
    }, refreshIntervalMs);
    return () => window.clearInterval(timer);
  }, [cargar, refreshIntervalMs]);

  return {
    lugaresReales,
    cargandoReales: cargando,
    ultimaActualizacion,
    refrescarReales: () => cargar({ force: true })
  };
}
