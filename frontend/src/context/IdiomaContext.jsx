import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../shared/services/api-client';
import { IDIOMAS_SOPORTADOS, TRADUCCIONES } from '../data/traducciones';
import { useA11yAnnouncer } from '../shared/hooks/use-a11y-announcer';

const CLAVE_IDIOMA = 'sn_language';
const IdiomaContext = createContext(null);

function leerIdiomaInicial() {
  if (typeof window === 'undefined') return 'es';
  const codigos = IDIOMAS_SOPORTADOS.map((i) => i.codigo);
  try {
    const guardado = window.localStorage.getItem(CLAVE_IDIOMA);
    if (guardado && codigos.includes(guardado)) {
      return guardado;
    }
    const navLang = (window.navigator?.language || 'es').slice(0, 2).toLowerCase();
    if (codigos.includes(navLang)) {
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
  const [idiomas, setIdiomas] = useState(IDIOMAS_SOPORTADOS);
  const [diccionariosBackend, setDiccionariosBackend] = useState({});
  const [backendConectado, setBackendConectado] = useState(false);
  const solicitandoRef = useRef(new Set());
  const { anunciar } = useA11yAnnouncer();

  // Sincronizar catálogo de los 10 idiomas desde /api/i18n/languages del backend
  useEffect(() => {
    let activo = true;
    api
      .get('/i18n/languages')
      .then((res) => {
        if (!activo || !Array.isArray(res?.languages)) return;
        const fusion = res.languages.map((beLang) => {
          const localMeta = IDIOMAS_SOPORTADOS.find((i) => i.codigo === beLang.code);
          return {
            codigo: beLang.code,
            corto: localMeta?.corto || beLang.code.toUpperCase(),
            nombreNativo: localMeta?.nombreNativo || beLang.nativeName || beLang.name,
            region: beLang.nativeName || localMeta?.region || beLang.name,
            ttsLang: localMeta?.ttsLang || beLang.code,
            flag: beLang.flag || ''
          };
        });
        if (fusion.length >= 1) {
          setIdiomas(fusion);
          setBackendConectado(true);
        }
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  // Sincronizar diccionario del idioma activo desde /api/i18n/translations/:lang
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

    if (diccionariosBackend[idioma] || solicitandoRef.current.has(idioma)) {
      return;
    }

    solicitandoRef.current.add(idioma);
    let activo = true;
    api
      .get(`/i18n/translations/${idioma}`)
      .then((res) => {
        if (!activo || !res?.dictionary) return;
        setDiccionariosBackend((prev) => ({
          ...prev,
          [idioma]: res.dictionary
        }));
        setBackendConectado(true);
      })
      .catch(() => {})
      .finally(() => {
        solicitandoRef.current.delete(idioma);
      });

    return () => {
      activo = false;
    };
  }, [idioma, diccionariosBackend]);

  const codigosValidos = useMemo(() => idiomas.map((i) => i.codigo), [idiomas]);

  const cambiarIdioma = useCallback(
    (nuevoCodigo) => {
      if (!codigosValidos.includes(nuevoCodigo) || nuevoCodigo === idioma) return;
      setIdiomaState(nuevoCodigo);
      const aviso =
        TRADUCCIONES[nuevoCodigo]?.a11y?.anuncioCambioIdioma || `Language: ${nuevoCodigo}`;
      anunciar(aviso, 'polite');
    },
    [codigosValidos, idioma, anunciar]
  );

  const t = useCallback(
    (clave, fallback = '') => {
      if (String(clave).startsWith('backend.')) {
        const rutaBackend = String(clave).slice(8);
        const deBackend =
          obtenerPorRuta(diccionariosBackend[idioma], rutaBackend) ??
          obtenerPorRuta(diccionariosBackend.es, rutaBackend);
        if (deBackend !== undefined) return deBackend;
      }

      const enIdioma = obtenerPorRuta(TRADUCCIONES[idioma], clave);
      if (enIdioma !== undefined) return enIdioma;
      const enEspanol = obtenerPorRuta(TRADUCCIONES.es, clave);
      if (enEspanol !== undefined) return enEspanol;
      return fallback || clave;
    },
    [idioma, diccionariosBackend]
  );

  const idiomaActual = useMemo(
    () => idiomas.find((i) => i.codigo === idioma) || idiomas[0] || IDIOMAS_SOPORTADOS[0],
    [idiomas, idioma]
  );

  const valor = useMemo(
    () => ({
      idioma,
      idiomaActual,
      idiomas,
      backendConectado,
      diccionarioBackend: diccionariosBackend[idioma] || {},
      setIdioma: cambiarIdioma,
      t
    }),
    [idioma, idiomaActual, idiomas, backendConectado, diccionariosBackend, cambiarIdioma, t]
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
