import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../shared/services/api-client';
import { IDIOMAS_SOPORTADOS, TRADUCCIONES } from '../data/traducciones';
import { useA11yAnnouncer } from '../shared/hooks/use-a11y-announcer';

const CLAVE_IDIOMA = 'sn_language';
const CODIGOS_VALIDOS = IDIOMAS_SOPORTADOS.map((i) => i.codigo);
const IdiomaContext = createContext(null);

function leerIdiomaInicial() {
  if (typeof window === 'undefined') return 'es';
  try {
    const guardado = window.localStorage.getItem(CLAVE_IDIOMA);
    if (guardado && CODIGOS_VALIDOS.includes(guardado)) {
      return guardado;
    }
    const navLang = (window.navigator?.language || 'es').slice(0, 2).toLowerCase();
    if (CODIGOS_VALIDOS.includes(navLang)) {
      return navLang;
    }
  } catch {
    /* ignorar si storage no está disponible */
  }
  return 'es';
}

function obtenerPorRuta(obj, ruta) {
  if (!obj || !ruta) return undefined;
  return String(ruta)
    .split('.')
    .reduce((acc, parte) => (acc && acc[parte] !== undefined ? acc[parte] : undefined), obj);
}

export function IdiomaProvider({ children }) {
  const [idioma, setIdiomaState] = useState(leerIdiomaInicial);
  const { anunciar } = useA11yAnnouncer();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = idioma;
      document.documentElement.dataset.idioma = idioma;
    }
    api.setLanguage(idioma);
    try {
      window.localStorage.setItem(CLAVE_IDIOMA, idioma);
    } catch {
      /* sin persistencia */
    }
  }, [idioma]);

  const cambiarIdioma = useCallback(
    (nuevoCodigo) => {
      if (!CODIGOS_VALIDOS.includes(nuevoCodigo) || nuevoCodigo === idioma) return;
      setIdiomaState(nuevoCodigo);
      const aviso =
        TRADUCCIONES[nuevoCodigo]?.a11y?.anuncioCambioIdioma || `Idioma: ${nuevoCodigo}`;
      anunciar(aviso, 'polite');
    },
    [idioma, anunciar]
  );

  const t = useCallback(
    (clave, fallback = '') => {
      const enIdioma = obtenerPorRuta(TRADUCCIONES[idioma], clave);
      if (enIdioma !== undefined) return enIdioma;
      const enEspanol = obtenerPorRuta(TRADUCCIONES.es, clave);
      if (enEspanol !== undefined) return enEspanol;
      return fallback || clave;
    },
    [idioma]
  );

  const idiomaActual = useMemo(
    () => IDIOMAS_SOPORTADOS.find((i) => i.codigo === idioma) || IDIOMAS_SOPORTADOS[0],
    [idioma]
  );

  const valor = useMemo(
    () => ({
      idioma,
      idiomaActual,
      idiomas: IDIOMAS_SOPORTADOS,
      setIdioma: cambiarIdioma,
      t
    }),
    [idioma, idiomaActual, cambiarIdioma, t]
  );

  return <IdiomaContext.Provider value={valor}>{children}</IdiomaContext.Provider>;
}

export function useIdioma() {
  const ctx = useContext(IdiomaContext);
  if (!ctx) {
    throw new Error('useIdioma debe usarse dentro de <IdiomaProvider>');
  }
  return ctx;
}
