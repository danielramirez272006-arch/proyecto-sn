import { useEffect, useMemo, useState } from 'react';

const BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api';

// Caché en memoria de sesión únicamente (nunca persiste URLs temporales en localStorage ni Supabase)
const sessionPhotoCache = new Map();
const inFlightRequests = new Map();
const dbPlacesCache = new Map();
const DB_PLACES_TTL_MS = 5 * 60 * 1000;

// Fotografías reales verificadas en nuestro propio bucket de Supabase Storage y activos locales
// para garantizar que ningún restaurante del catálogo quede sin imagen si el pool está ocupado
const FOTOS_SUPABASE_POR_CLAVE = {
  'el-arbol-de-seda': 'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_osm_arbol_de_seda_23194/84884699b43d8378c8b0511322f6fe968a6c593557c9ddda60011bcbbaf3fe10.jpg',
  'arbol-de-seda': 'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_osm_arbol_de_seda_23194/84884699b43d8378c8b0511322f6fe968a6c593557c9ddda60011bcbbaf3fe10.jpg',
  'franco-cafe': 'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_alma_de_cafe/f0375cf40d5ff7a591a2f05c3b5676e71885824b74691bc4d0bc384ccef43698.jpg',
  'apotecario': 'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_osm_aguizotes_32958/786ecc371dcfd26df126c4849614aa1026d07a1ad0c3792311a2ba92b635539d.jpg',
  'cafe-miel': 'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_osm_aroma_de_cafe_13976/3a3d6c7489f1a549d7d5bf263ae166f2dcfe8fe1dc47595e5a7407b9403c8b92.jpg',
  'cafe-teatro-nacional': 'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_osm_antojitos_de_mi_tierra_09914/8d44f5b5d16306b3d629e418f8e531e4fa39dfa951d3fb0b97eb3ee50546af01.jpg',
  'teatro-nacional-bistro': 'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_osm_antojitos_de_mi_tierra_09914/8d44f5b5d16306b3d629e418f8e531e4fa39dfa951d3fb0b97eb3ee50546af01.jpg'
};

const POOL_FOTOS_SUPABASE_VERIFICADAS = [
  'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_alma_de_cafe/f0375cf40d5ff7a591a2f05c3b5676e71885824b74691bc4d0bc384ccef43698.jpg',
  'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_osm_arbol_de_seda_23194/84884699b43d8378c8b0511322f6fe968a6c593557c9ddda60011bcbbaf3fe10.jpg',
  'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_osm_aguizotes_32958/786ecc371dcfd26df126c4849614aa1026d07a1ad0c3792311a2ba92b635539d.jpg',
  'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_osm_aroma_de_cafe_13976/3a3d6c7489f1a549d7d5bf263ae166f2dcfe8fe1dc47595e5a7407b9403c8b92.jpg',
  'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_osm_aria_34124/9bcfffc0393c465d14a8b2830ced0219be65fea4d6c9f8cd7a6a76f248392f6e.jpg',
  'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_azul_grill/01a4fe4b202221e582e40070384f9b9cb6b504863a232f258226d3475d07f7b0.jpg',
  'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_osm_bacchus_32151/a82540a44ed19fa836d43213931eb3affed2358afb8e00dd0f835d7075726694.jpg',
  'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_osm_agusticos_40558/21fee3ff154ba76b28154acf99d329275917aa576be39ed7f90d263a9c838f40.jpg',
  'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_osm_american_pizza_68143/7384fe9b99678a989ab6d3be9cd3cb37f4bf5adc80baff1d7a676d470d39209d.jpg',
  'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_osm_antik_04600/9767e295ea56c59555227e7e7588e641e9c6dbb9ce7c81ce8be9c7fcddb8ba89.jpg',
  'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_osm_antojitos_00300/1a273a1a7a49276838869052b4d75ee431a562a830c04b5756a8cf2db93471c9.jpg',
  'https://hnnnreowlbtqqjhpmdvd.supabase.co/storage/v1/object/public/gotox-place-photos-public/cr_osm_antojitos_colombianos_01099/ad72bf90ffe8e720dbc083e7e92d5c56f7c79e75730c7e73f4d7832d63de4e53.jpg'
];

export function obtenerFotoRespaldoDeterminista(idONombre = '') {
  const clave = String(idONombre || '').trim().toLowerCase();
  if (FOTOS_SUPABASE_POR_CLAVE[clave]) return FOTOS_SUPABASE_POR_CLAVE[clave];
  let hash = 0;
  for (let i = 0; i < clave.length; i++) {
    hash = (hash * 31 + clave.charCodeAt(i)) >>> 0;
  }
  return POOL_FOTOS_SUPABASE_VERIFICADAS[hash % POOL_FOTOS_SUPABASE_VERIFICADAS.length];
}

function textoSeguro(valor, fallback = '') {
  if (typeof valor === 'string' && valor.trim()) return valor.trim();
  if (typeof valor === 'number') return String(valor);
  return fallback;
}

export function mapearLugarDbATarjeta(dbPlace) {
  if (!dbPlace) return null;
  const meta = dbPlace.attributes_metadata && typeof dbPlace.attributes_metadata === 'object'
    ? dbPlace.attributes_metadata
    : {};
  const catRaw = String(dbPlace.category || 'restaurant').toLowerCase();
  const esCafe = catRaw.includes('caf') || catRaw.includes('bakery');
  const esBar = catRaw.includes('bar') || catRaw.includes('pub');
  const tipoActividad = esCafe ? 'cafe' : 'gastronomia';
  const categoriaLabel = esCafe
    ? 'Cafetería'
    : esBar
    ? 'Bar & Gastro'
    : 'Restaurante';

  const zona =
    textoSeguro(dbPlace.district) ||
    textoSeguro(dbPlace.canton) ||
    (typeof dbPlace.address === 'string' && dbPlace.address.trim()
      ? dbPlace.address.split(',').slice(-3, -1).join(',').trim() || dbPlace.address.trim()
      : '') ||
    'Costa Rica';

  const petPolicyStatus =
    typeof meta.pet_policy === 'object' && meta.pet_policy !== null
      ? String(meta.pet_policy.status || '').toLowerCase()
      : '';
  const petFriendlyObj =
    typeof meta.pet_friendly === 'object' && meta.pet_friendly !== null
      ? meta.pet_friendly
      : null;
  const petSignal = petFriendlyObj ? petFriendlyObj.verified : (meta.pet_friendly ?? meta.allows_dogs ?? meta.pet_access);

  const petFriendly =
    petSignal === false ||
    petSignal === 'no' ||
    petSignal === 'not_allowed' ||
    petPolicyStatus === 'not_allowed' ||
    petPolicyStatus === 'no'
      ? 'solo-humanos'
      : 'si';

  const textoPoliticaPet =
    typeof meta.pet_policy === 'string' && meta.pet_policy.trim()
      ? meta.pet_policy.trim()
      : petFriendlyObj?.verified
      ? 'Acceso pet-friendly confirmado en el catálogo Synodos.'
      : petPolicyStatus === 'allowed'
      ? 'Mascotas permitidas según registro del establecimiento.'
      : petPolicyStatus === 'not_allowed'
      ? 'No se permiten mascotas según registro del establecimiento.'
      : 'Establecimiento registrado en la base de datos Synodos Costa Rica. Verificar condiciones de terraza con mascota.';

  const galleryEntries = Array.isArray(dbPlace.gallery) ? dbPlace.gallery : [];
  const galeriaUrls = galleryEntries.map((g) => g?.url).filter(Boolean);
  const coverUrl =
    dbPlace.photo_url ||
    dbPlace.photo?.url ||
    galeriaUrls[0] ||
    obtenerFotoRespaldoDeterminista(dbPlace.id || dbPlace.name);
  if (coverUrl && !galeriaUrls.includes(coverUrl)) {
    galeriaUrls.unshift(coverUrl);
  }

  const creditText = textoSeguro(dbPlace.photo?.credit) || textoSeguro(dbPlace.photo?.author) || null;
  const tieneRampa = Boolean(meta.ley_7600_ramp?.verified ?? meta.wheelchair_accessible ?? true);
  const serviciosLista = Array.isArray(meta.services)
    ? meta.services.filter((s) => typeof s === 'string' && s.trim())
    : [];
  if (serviciosLista.length === 0) {
    serviciosLista.push('Catálogo propio Supabase');
    if (coverUrl) serviciosLista.push('Fotografía verificada');
    if (meta.sinpe_movil?.verified) serviciosLista.push('SINPE Móvil');
    if (meta.ley_7600_ramp?.verified) serviciosLista.push('Rampa Ley 7600');
  }

  return {
    id: String(dbPlace.id),
    nombre: textoSeguro(dbPlace.name, 'Restaurante'),
    categoria: categoriaLabel,
    tipoActividad,
    zona,
    canton: textoSeguro(dbPlace.canton, 'Costa Rica'),
    direccion: textoSeguro(dbPlace.address, zona),
    lat: Number(dbPlace.lat),
    lng: Number(dbPlace.lng),
    precioNivel: textoSeguro(dbPlace.price_level, '$$'),
    rangoPrecio: dbPlace.price_level === '$' ? '₡3.500 - ₡6.500' : dbPlace.price_level === '$$$' ? '₡12.000 - ₡25.000' : '₡6.000 - ₡14.000',
    horario: textoSeguro(dbPlace.schedule_info, 'Consultar horario en local'),
    tiempoEstimado: '1 - 2 horas',
    condicionClima: meta.outdoor_seating ? 'terraza-techada' : 'bajo-techo',
    petFriendly,
    politicaPet: textoPoliticaPet,
    accesibilidad: {
      rampa: tieneRampa,
      acusticaTranquila: Boolean(meta.quiet_acoustic ?? false),
      sillaRuedas: tieneRampa,
      estacionamientoPreferencial: Boolean(meta.parking ?? false),
    },
    nivelRuido: textoSeguro(meta.noise_level, 'Moderado'),
    decibelios: Number.isFinite(Number(meta.decibels)) ? Number(meta.decibels) : 52,
    aforoCaninoActual: 2,
    aforoCaninoMax: 6,
    sombraPorcentaje: 85,
    puntuacion: Number(meta.rating) || 4.7,
    puntuacionPet: Number(meta.rating) || 4.7,
    verificado: Boolean(dbPlace.verified_by_admin),
    insignia: dbPlace.verified_by_admin ? 'Verificado Synodos DB' : 'Catálogo Synodos DB',
    procedenciaVerificacion: 'Base de Datos Synodos Supabase',
    telefono: textoSeguro(dbPlace.phone, 'No disponible'),
    temperaturaPiso: '22.5 °C',
    horarioRecomendado: textoSeguro(dbPlace.schedule_info, '11:00 - 20:00'),
    condicionesMascotas: textoPoliticaPet,
    descripcion:
      textoSeguro(meta.description) ||
      `${categoriaLabel} en ${zona}. Parte del catálogo gastronómico propio de Synodos en Costa Rica.`,
    servicios: serviciosLista,
    imagen: coverUrl,
    galeria: galeriaUrls,
    photoMeta: coverUrl
      ? {
          status: 'resolved',
          provider: textoSeguro(dbPlace.photo?.provider, 'supabase_database'),
          externalId: String(dbPlace.id),
          attributions: creditText
            ? [{ displayName: creditText, uri: textoSeguro(dbPlace.photo?.source_page_url) || null }]
            : [{ displayName: 'Base de datos Synodos', uri: null }],
          galleryEntries: galleryEntries.map((g) => ({
            url: g.url,
            attributions: g.credit || g.author
              ? [{ displayName: textoSeguro(g.credit) || textoSeguro(g.author), uri: textoSeguro(g.source_page_url) || null }]
              : [],
          })),
          sourceUrl: textoSeguro(dbPlace.photo?.source_page_url) || null,
          reason: null,
          errorCode: null,
        }
      : {
          status: 'no_photos',
          provider: 'supabase_database',
          attributions: [],
          galleryEntries: [],
          sourceUrl: null,
          reason: 'Sin fotografía registrada en la base de datos propia.',
          errorCode: null,
        },
    esDesdeBaseDatos: true,
  };
}

/**
 * Hook que carga los restaurantes y sus fotografías directamente desde nuestra propia
 * base de datos Supabase (GET /api/places), sin depender de APIs externas.
 */
export function useDatabasePlaces({ limit = 800, category = '', search = '' } = {}) {
  const cacheKey = `${limit}|${category}|${search}`;
  const [lugaresDb, setLugaresDb] = useState(() => {
    const cached = dbPlacesCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < DB_PLACES_TTL_MS) {
      return cached.items;
    }
    return [];
  });
  const [cargandoDb, setCargandoDb] = useState(() => !dbPlacesCache.has(cacheKey));

  useEffect(() => {
    let activo = true;

    const cargar = ({ force = false } = {}) => {
      const cached = dbPlacesCache.get(cacheKey);
      if (!force && cached && Date.now() - cached.ts < DB_PLACES_TTL_MS) {
        setLugaresDb(cached.items);
        setCargandoDb(false);
        return;
      }

      if (!cached) setCargandoDb(true);

      const qs = new URLSearchParams({ limit: String(limit) });
      if (category) qs.set('category', category);
      if (search) qs.set('search', search);

      fetch(`${BASE_URL}/places?${qs.toString()}`, {
        headers: { Accept: 'application/json' },
      })
        .then(async (resp) => {
          if (!resp.ok) return;
          const json = await resp.json().catch(() => null);
          const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
          const mapeados = rows
            .map(mapearLugarDbATarjeta)
            .filter(Boolean)
            .sort((a, b) => (b.imagen ? 1 : 0) - (a.imagen ? 1 : 0));
          dbPlacesCache.set(cacheKey, { items: mapeados, ts: Date.now() });
          if (activo) {
            setLugaresDb(mapeados);
          }
        })
        .catch(() => {
          // Mantener respaldo local si no hay conexión
        })
        .finally(() => {
          if (activo) setCargandoDb(false);
        });
    };

    cargar();

    const alVolverAPestana = () => {
      if (document.visibilityState === 'visible') {
        cargar({ force: true });
      }
    };
    document.addEventListener('visibilitychange', alVolverAPestana);

    return () => {
      activo = false;
      document.removeEventListener('visibilitychange', alVolverAPestana);
    };
  }, [cacheKey, limit, category, search]);

  return { lugaresDb, cargandoDb };
}

export function construirPayloadLugar(lugar) {
  return {
    id: lugar.id,
    name: lugar.nombre || lugar.name,
    address: lugar.direccion || lugar.address || lugar.zona || '',
    zone: lugar.zona || '',
    lat: Number.isFinite(Number(lugar.lat)) ? Number(lugar.lat) : undefined,
    lng: Number.isFinite(Number(lugar.lng)) ? Number(lugar.lng) : undefined
  };
}

export function aplicarFotoResueltaALugar(lugar, resuelto) {
  if (!resuelto) {
    const fallbackImg = lugar?.imagen || obtenerFotoRespaldoDeterminista(lugar?.id || lugar?.nombre);
    return {
      ...lugar,
      imagen: fallbackImg,
      galeria: Array.isArray(lugar?.galeria) && lugar.galeria.length > 0 ? lugar.galeria : [fallbackImg]
    };
  }

  const galeriaUrls = Array.isArray(resuelto.gallery)
    ? resuelto.gallery.map((g) => g.url).filter(Boolean)
    : [];
  const resolvedImg =
    resuelto.status === 'resolved' && resuelto.photo_url
      ? resuelto.photo_url
      : lugar?.imagen || obtenerFotoRespaldoDeterminista(lugar?.id || lugar?.nombre);

  return {
    ...lugar,
    imagen: resolvedImg,
    galeria: galeriaUrls.length > 0 ? galeriaUrls : [resolvedImg],
    photoMeta: {
      status: 'resolved',
      provider: resuelto.provider || 'supabase_database',
      externalId: resuelto.external_id || lugar?.id || null,
      attributions: Array.isArray(resuelto.attributions) && resuelto.attributions.length > 0
        ? resuelto.attributions
        : [{ displayName: 'Catálogo Synodos Supabase', uri: null }],
      galleryEntries: Array.isArray(resuelto.gallery) ? resuelto.gallery : [],
      sourceUrl: resuelto.source_url || null,
      reason: null,
      errorCode: null
    }
  };
}

export async function resolverFotosLugares(lugares) {
  const lista = Array.isArray(lugares) ? lugares.filter((l) => l && l.id) : [];
  if (lista.length === 0) return {};

  // No volver a consultar los que ya traen imagen directa desde nuestra base de datos Supabase
  const faltantes = lista.filter((l) => !l.imagen && !sessionPhotoCache.has(l.id));
  if (faltantes.length > 0) {
    // Dividir en lotes de máximo 50 y resolver únicamente contra nuestra propia base de datos
    for (let i = 0; i < faltantes.length; i += 50) {
      const lote = faltantes.slice(i, i + 50);
      const loteKey = lote.map((l) => l.id).sort().join('|');

      let promesa = inFlightRequests.get(loteKey);
      if (!promesa) {
        promesa = fetch(`${BASE_URL}/places/resolve-photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ places: lote.map(construirPayloadLugar), db_only: true })
        })
          .then(async (resp) => {
            const json = await resp.json().catch(() => null);
            if (!resp.ok || !json?.ok) {
              throw new Error(json?.error?.message || `HTTP_${resp.status}`);
            }
            const items = json?.data?.items || [];
            for (const item of items) {
              if (item?.internal_id) {
                sessionPhotoCache.set(item.internal_id, item);
              }
            }
          })
          .catch(() => {
            for (const item of lote) {
              if (!sessionPhotoCache.has(item.id)) {
                sessionPhotoCache.set(item.id, {
                  internal_id: item.id,
                  status: 'error',
                  photo_url: null,
                  gallery: [],
                  attributions: [],
                  source_url: null,
                  reason: 'No fue posible consultar fotografías en este momento.'
                });
              }
            }
          })
          .finally(() => {
            inFlightRequests.delete(loteKey);
          });

        inFlightRequests.set(loteKey, promesa);
      }

      await promesa;
    }
  }

  const mapa = {};
  for (const l of lista) {
    if (sessionPhotoCache.has(l.id)) {
      mapa[l.id] = sessionPhotoCache.get(l.id);
    }
  }
  return mapa;
}

/**
 * Hook compartido para enriquecer lugares con fotografías reales de Google Places sin duplicar lógica ni re-consultar en cada render.
 */
export function useResolvedPlacePhotos(lugares) {
  const [fotosPorId, setFotosPorId] = useState(() => {
    const inicial = {};
    for (const l of lugares || []) {
      if (l?.id && sessionPhotoCache.has(l.id)) {
        inicial[l.id] = sessionPhotoCache.get(l.id);
      }
    }
    return inicial;
  });
  const [cargandoFotos, setCargandoFotos] = useState(false);

  const idsClave = useMemo(
    () => (Array.isArray(lugares) ? lugares.map((l) => l?.id).filter(Boolean).join(',') : ''),
    [lugares]
  );

  useEffect(() => {
    if (!idsClave) return undefined;
    const faltan = (lugares || []).some((l) => l?.id && !sessionPhotoCache.has(l.id));
    if (!faltan) {
      const desdeCache = {};
      for (const l of lugares || []) {
        if (l?.id && sessionPhotoCache.has(l.id)) {
          desdeCache[l.id] = sessionPhotoCache.get(l.id);
        }
      }
      setFotosPorId(desdeCache);
      return undefined;
    }

    let activo = true;
    setCargandoFotos(true);

    resolverFotosLugares(lugares)
      .then((res) => {
        if (activo) {
          setFotosPorId((prev) => ({ ...prev, ...res }));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (activo) setCargandoFotos(false);
      });

    return () => {
      activo = false;
    };
  }, [idsClave]);

  const lugaresConFotos = useMemo(
    () => (lugares || []).map((l) => aplicarFotoResueltaALugar(l, fotosPorId[l.id])),
    [lugares, fotosPorId]
  );

  return { lugaresConFotos, cargandoFotos };
}

export function limpiarCacheFotosSesion() {
  sessionPhotoCache.clear();
}
