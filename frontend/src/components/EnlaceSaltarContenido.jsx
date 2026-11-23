import React from 'react';
import { useIdioma } from '../context/IdiomaContext';

/**
 * Enlace accesible de salto rápido al contenido principal (#contenido-principal) para teclado.
 */
export function EnlaceSaltarContenido({ targetId = 'contenido-principal' }) {
  const { t } = useIdioma();

  const handleClick = (e) => {
    const objetivo = document.getElementById(targetId);
    if (objetivo) {
      e.preventDefault();
      objetivo.focus({ preventScroll: false });
      objetivo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a href={`#${targetId}`} onClick={handleClick} className="gotox-skip-link">
      {t('a11y.skipToContent')}
    </a>
  );
}

export default EnlaceSaltarContenido;
