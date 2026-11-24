import React from 'react';

const TAMANOS = {
  xs: { caja: 'w-7 h-7 rounded-full p-1', img: 'w-full h-full' },
  sm: { caja: 'w-8 h-8 rounded-lg p-1', img: 'w-full h-full' },
  md: { caja: 'w-10 h-10 rounded-xl p-1', img: 'w-full h-full' },
  lg: { caja: 'w-12 h-12 rounded-2xl p-1.5', img: 'w-full h-full' }
};

/**
 * Logo oficial de Synodos (pin borgoña con taza pet-friendly y base esmeralda).
 */
export function LogoSynodos({
  size = 'md',
  variant = 'tile',
  className = '',
  alt = 'Logo de Synodos Pet OS'
}) {
  const cfg = TAMANOS[size] || TAMANOS.md;
  const estiloContenedor =
    variant === 'transparent'
      ? 'bg-transparent'
      : 'bg-[#0E0F11] border border-[#F27B91]/35 shadow-md shadow-[#501228]/25 group-hover:border-[#F27B91]/60';

  return (
    <div
      className={`shrink-0 flex items-center justify-center overflow-hidden transition-all ${cfg.caja} ${estiloContenedor} ${className}`}
    >
      <img
        src="/imagenes/synodos-logo.png"
        alt={alt}
        className={`${cfg.img} object-contain select-none`}
        draggable={false}
      />
    </div>
  );
}

export default LogoSynodos;
