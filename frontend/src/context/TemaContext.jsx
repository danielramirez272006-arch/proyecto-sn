import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Temas visuales de GoToX Pet OS:
 * 1. 'claro'  - Tono luminoso diurno en marfil y detalles vino.
 * 2. 'oscuro' - Modo oscuro neutro / puro (carbón, negros profundos, textos blancos y contrastes limpios).
 * 3. 'morado' - Tono vino/burgundy profundo característico de la identidad GoToX.
 *
 * El valor vive en <html data-tema="claro|oscuro|morado"> para que todo el CSS y Tailwind
 * reaccionen dinámicamente tanto en páginas públicas como en el Centro de Mando.
 */

const CLAVE = 'gotox_tema';
const TemaContext = createContext(null);

export const TEMAS = ['claro', 'oscuro', 'morado'];

function leerTemaInicial() {
  if (typeof window === 'undefined') return 'claro';
  try {
    const guardado = window.localStorage.getItem(CLAVE);
    if (guardado && TEMAS.includes(guardado)) return guardado;
  } catch (_) {
    /* localStorage bloqueado: seguimos con el valor por defecto */
  }
  return 'claro';
}

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(leerTemaInicial);

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.tema = tema;
    raiz.style.colorScheme = tema === 'claro' ? 'light' : 'dark';
    try {
      window.localStorage.setItem(CLAVE, tema);
    } catch (_) {
      /* sin persistencia, pero el tema sigue funcionando en esta sesión */
    }
  }, [tema]);

  const alternarTema = useCallback(() => {
    setTema((actual) => {
      if (actual === 'claro') return 'oscuro';
      if (actual === 'oscuro') return 'morado';
      return 'claro';
    });
  }, []);

  const cambiarTema = useCallback((nuevoTema) => {
    if (TEMAS.includes(nuevoTema)) {
      setTema(nuevoTema);
    }
  }, []);

  const valor = useMemo(
    () => ({
      tema,
      setTema: cambiarTema,
      alternarTema,
      esClaro: tema === 'claro',
      esOscuro: tema === 'oscuro',
      esMorado: tema === 'morado',
      esModoOscuro: tema === 'oscuro' || tema === 'morado'
    }),
    [tema, cambiarTema, alternarTema]
  );

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export function useTema() {
  const contexto = useContext(TemaContext);
  if (!contexto) {
    throw new Error('useTema debe usarse dentro de <TemaProvider>');
  }
  return contexto;
}
