import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

/**
 * Tema claro / oscuro del sitio público.
 *
 * - El valor vive en <html data-tema="claro|oscuro">, así el CSS puede
 *   reaccionar sin pasar props por todo el árbol.
 * - Se recuerda en localStorage (misma convención que useLocalStorage).
 * - El tema claro es el valor por defecto para no cambiar el aspecto
 *   actual de quien nunca ha tocado el interruptor.
 */

const CLAVE = 'gotox_tema';
const TemaContext = createContext(null);

function leerTemaInicial() {
  if (typeof window === 'undefined') return 'claro';
  try {
    const guardado = window.localStorage.getItem(CLAVE);
    if (guardado === 'claro' || guardado === 'oscuro') return guardado;
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
    raiz.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';
    try {
      window.localStorage.setItem(CLAVE, tema);
    } catch (_) {
      /* sin persistencia, pero el tema sigue funcionando en esta sesión */
    }
  }, [tema]);

  const alternarTema = useCallback(() => {
    setTema((actual) => (actual === 'oscuro' ? 'claro' : 'oscuro'));
  }, []);

  const valor = useMemo(
    () => ({ tema, setTema, alternarTema, esOscuro: tema === 'oscuro' }),
    [tema, alternarTema]
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
