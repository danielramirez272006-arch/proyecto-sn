import React, { useEffect, useState, useCallback } from 'react';

const EVENTO_ANUNCIO = 'synodos:a11y-announce';

/**
 * Emite un anuncio audible para lectores de pantalla (NVDA, VoiceOver, TalkBack).
 * @param {string} mensaje
 * @param {'polite'|'assertive'} prioridad
 */
export function anunciarAccesibilidad(mensaje, prioridad = 'polite') {
  if (typeof window === 'undefined' || !mensaje) return;
  window.dispatchEvent(
    new CustomEvent(EVENTO_ANUNCIO, {
      detail: { mensaje: String(mensaje), prioridad: prioridad === 'assertive' ? 'assertive' : 'polite' }
    })
  );
}

/**
 * Hook para emitir anuncios accesibles hacia la región viva global ARIA.
 */
export function useA11yAnnouncer() {
  const anunciar = useCallback((mensaje, prioridad = 'polite') => {
    anunciarAccesibilidad(mensaje, prioridad);
  }, []);

  return { anunciar };
}

/**
 * Regiones vivas ARIA globales montadas una sola vez en la raíz de la aplicación.
 */
export function A11yLiveRegions() {
  const [mensajeCortesia, setMensajeCortesia] = useState('');
  const [mensajeUrgente, setMensajeUrgente] = useState('');

  useEffect(() => {
    let timerPolite;
    let timerAssertive;

    const manejarAnuncio = (e) => {
      const { mensaje, prioridad } = e.detail || {};
      if (!mensaje) return;

      if (prioridad === 'assertive') {
        setMensajeUrgente('');
        window.clearTimeout(timerAssertive);
        timerAssertive = window.setTimeout(() => setMensajeUrgente(mensaje), 40);
      } else {
        setMensajeCortesia('');
        window.clearTimeout(timerPolite);
        timerPolite = window.setTimeout(() => setMensajeCortesia(mensaje), 40);
      }
    };

    window.addEventListener(EVENTO_ANUNCIO, manejarAnuncio);
    return () => {
      window.removeEventListener(EVENTO_ANUNCIO, manejarAnuncio);
      window.clearTimeout(timerPolite);
      window.clearTimeout(timerAssertive);
    };
  }, []);

  return React.createElement(
    'div',
    { className: 'sr-only', 'aria-hidden': 'false' },
    React.createElement(
      'div',
      { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' },
      mensajeCortesia
    ),
    React.createElement(
      'div',
      { role: 'alert', 'aria-live': 'assertive', 'aria-atomic': 'true' },
      mensajeUrgente
    )
  );
}

export default useA11yAnnouncer;
