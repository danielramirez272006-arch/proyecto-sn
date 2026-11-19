import { useEffect, useMemo, useState } from 'react';

const BASE_URL = import.meta.env?.VITE_API_BASE_URL || '/api';

// Caché en memoria de sesión únicamente (nunca persiste URLs temporales en localStorage ni Supabase)
const sessionPhotoCache = new Map();
const inFlightRequests = new Map();

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
  if (!resuelto) return lugar;

  const galeriaUrls = Array.isArray(resuelto.gallery)
    ? resuelto.gallery.map((g) => g.url).filter(Boolean)
    : [];

  return {
    ...lugar,
    imagen: resuelto.status === 'resolved' && resuelto.photo_url ? resuelto.photo_url : null,
    galeria: resuelto.status === 'resolved' ? galeriaUrls : [],
    photoMeta: {
      status: resuelto.status,
      provider: resuelto.provider || 'google_places',
      externalId: resuelto.external_id || null,
      attributions: Array.isArray(resuelto.attributions) ? resuelto.attributions : [],
      galleryEntries: Array.isArray(resuelto.gallery) ? resuelto.gallery : [],
      sourceUrl: resuelto.source_url || null,
      reason: resuelto.reason || null,
      errorCode: resuelto.error_code || null
    }
  };
}

export async function resolverFotosLugares(lugares) {
  const lista = Array.isArray(lugares) ? lugares.filter((l) => l && l.id) : [];
  if (lista.length === 0) return {};

  const faltantes = lista.filter((l) => !sessionPhotoCache.has(l.id));
  if (faltantes.length > 0) {
    // Dividir en lotes de máximo 10 para respetar límite del backend
    for (let i = 0; i < faltantes.length; i += 10) {
      const lote = faltantes.slice(i, i + 10);
      const loteKey = lote.map((l) => l.id).sort().join('|');

      let promesa = inFlightRequests.get(loteKey);
      if (!promesa) {
        promesa = fetch(`${BASE_URL}/places/resolve-photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ places: lote.map(construirPayloadLugar) })
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
