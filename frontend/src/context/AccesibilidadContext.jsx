import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useA11yAnnouncer } from '../shared/hooks/use-a11y-announcer';
import { IDIOMAS_SOPORTADOS } from '../data/traducciones';

const CLAVE_A11Y = 'synodos_accesibilidad_v1';

const PREFS_DEFECTO = {
  escalaTexto: 'normal', // 'normal' | 'grande' | 'extra'
  altoContraste: false,
  lecturaFacil: false,
  reducirMovimiento: false,
  resaltarEnlaces: false
};

const ESCALAS_PX = {
  normal: '16px',
  grande: '18.5px',
  extra: '20.5px'
};

const AccesibilidadContext = createContext(null);

function leerPrefsIniciales() {
  if (typeof window === 'undefined') return PREFS_DEFECTO;
  const reduceSistema =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try {
    const raw = window.localStorage.getItem(CLAVE_A11Y);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...PREFS_DEFECTO,
        ...parsed,
        escalaTexto: ['normal', 'grande', 'extra'].includes(parsed?.escalaTexto)
          ? parsed.escalaTexto
          : 'normal'
      };
    }
  } catch {
    /* ignorar */
  }
  return {
    ...PREFS_DEFECTO,
    reducirMovimiento: reduceSistema
  };
}

export function AccesibilidadProvider({ children }) {
  const [prefs, setPrefs] = useState(leerPrefsIniciales);
  const [leyendoVoz, setLeyendoVoz] = useState(false);
  const { anunciar } = useA11yAnnouncer();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const raiz = document.documentElement;
    raiz.style.fontSize = ESCALAS_PX[prefs.escalaTexto] || '16px';
    raiz.dataset.a11yScale = prefs.escalaTexto;
    raiz.dataset.a11yContrast = prefs.altoContraste ? 'high' : 'normal';
    raiz.dataset.a11yDyslexic = prefs.lecturaFacil ? 'true' : 'false';
    raiz.dataset.a11yMotion = prefs.reducirMovimiento ? 'reduced' : 'normal';
    raiz.dataset.a11yLinks = prefs.resaltarEnlaces ? 'true' : 'false';

    try {
      window.localStorage.setItem(CLAVE_A11Y, JSON.stringify(prefs));
    } catch {
      /* sin persistencia */
    }
  }, [prefs]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const actualizarPref = useCallback(
    (campo, valor, etiquetaAnuncio = '') => {
      setPrefs((prev) => ({ ...prev, [campo]: valor }));
      if (etiquetaAnuncio) {
        anunciar(etiquetaAnuncio, 'polite');
      }
    },
    [anunciar]
  );

  const restablecer = useCallback(
    (mensajeAnuncio = 'Ajustes de accesibilidad restablecidos') => {
      setPrefs(PREFS_DEFECTO);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setLeyendoVoz(false);
      anunciar(mensajeAnuncio, 'polite');
    },
    [anunciar]
  );

  const detenerLecturaVoz = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setLeyendoVoz(false);
  }, []);

  const alternarLecturaVoz = useCallback(
    (idiomaCodigo = 'es') => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        anunciar('Tu navegador no soporta síntesis de voz.', 'assertive');
        return;
      }

      if (leyendoVoz) {
        detenerLecturaVoz();
        return;
      }

      const mainEl = document.getElementById('contenido-principal') || document.querySelector('main');
      const bloques = mainEl
        ? Array.from(mainEl.querySelectorAll('h1, h2, h3, p')).slice(0, 8)
        : [];
      const texto = bloques
        .map((el) => el.textContent?.trim())
        .filter(Boolean)
        .join('. ')
        .slice(0, 900);

      if (!texto) return;

      window.speechSynthesis.cancel();
      const langMeta = IDIOMAS_SOPORTADOS.find((i) => i.codigo === idiomaCodigo);
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = langMeta?.ttsLang || 'es-CR';
      utterance.rate = 0.96;
      utterance.onend = () => setLeyendoVoz(false);
      utterance.onerror = () => setLeyendoVoz(false);
      setLeyendoVoz(true);
      window.speechSynthesis.speak(utterance);
    },
    [leyendoVoz, detenerLecturaVoz, anunciar]
  );

  const hayAjustesActivos = useMemo(
    () =>
      prefs.escalaTexto !== 'normal' ||
      prefs.altoContraste ||
      prefs.lecturaFacil ||
      prefs.reducirMovimiento ||
      prefs.resaltarEnlaces,
    [prefs]
  );

  const valor = useMemo(
    () => ({
      prefs,
      leyendoVoz,
      hayAjustesActivos,
      soportaVoz: typeof window !== 'undefined' && 'speechSynthesis' in window,
      setEscalaTexto: (escala, aviso) => actualizarPref('escalaTexto', escala, aviso),
      toggleAltoContraste: (aviso) => actualizarPref('altoContraste', !prefs.altoContraste, aviso),
      toggleLecturaFacil: (aviso) => actualizarPref('lecturaFacil', !prefs.lecturaFacil, aviso),
      toggleReducirMovimiento: (aviso) =>
        actualizarPref('reducirMovimiento', !prefs.reducirMovimiento, aviso),
      toggleResaltarEnlaces: (aviso) =>
        actualizarPref('resaltarEnlaces', !prefs.resaltarEnlaces, aviso),
      alternarLecturaVoz,
      detenerLecturaVoz,
      restablecer
    }),
    [
      prefs,
      leyendoVoz,
      hayAjustesActivos,
      actualizarPref,
      alternarLecturaVoz,
      detenerLecturaVoz,
      restablecer
    ]
  );

  return <AccesibilidadContext.Provider value={valor}>{children}</AccesibilidadContext.Provider>;
}

export function useAccesibilidad() {
  const ctx = useContext(AccesibilidadContext);
  if (!ctx) {
    throw new Error('useAccesibilidad debe usarse dentro de <AccesibilidadProvider>');
  }
  return ctx;
}
