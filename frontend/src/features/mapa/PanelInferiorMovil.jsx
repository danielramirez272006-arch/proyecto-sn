import React, { useRef, useState } from 'react';
import { ChevronUp, ChevronDown, GripHorizontal } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useIdioma } from '../../context/IdiomaContext';

export const ALTURA_COLAPSADA_PX = 138;

export function PanelInferiorMovil({
  tokens,
  expandido,
  onToggleExpandido,
  totalResultados,
  children
}) {
  const { t } = useIdioma();
  const prefersReducedMotion = useReducedMotion();
  const dragStartYRef = useRef(null);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);

  const handlePointerDown = (e) => {
    // Solo permitir arrastre desde el tirador/cabecera (nunca desde el scroll de tarjetas)
    if (e.target.closest('button, input, select, a')) return;
    dragStartYRef.current = e.clientY;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (dragStartYRef.current === null) return;
    const delta = e.clientY - dragStartYRef.current;
    // Limitar desplazamiento visual durante el arrastre
    setDragOffsetPx(Math.max(-90, Math.min(90, delta)));
  };

  const handlePointerUp = () => {
    if (dragStartYRef.current === null) return;
    if (dragOffsetPx < -32 && !expandido) {
      onToggleExpandido(true);
    } else if (dragOffsetPx > 32 && expandido) {
      onToggleExpandido(false);
    }
    dragStartYRef.current = null;
    setDragOffsetPx(0);
  };

  const alturaEstilo = expandido ? 'min(66dvh, 500px)' : `${ALTURA_COLAPSADA_PX}px`;

  return (
    <section
      aria-label={t('mapaExt.panelCercanosAria')}
      style={{
        height: alturaEstilo,
        transform: dragOffsetPx !== 0 ? `translateY(${dragOffsetPx * 0.25}px)` : undefined,
        transition: prefersReducedMotion || dragOffsetPx !== 0 ? 'none' : 'height 220ms ease'
      }}
      className={`w-full rounded-t-3xl border-t border-x flex flex-col overflow-hidden shadow-2xl ${tokens.superficiePrincipal}`}
    >
      {/* Cabecera / Tirador: única zona habilitada para arrastrar */}
      <div
        data-drag-handle="true"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`shrink-0 px-4 pt-2.5 pb-2.5 border-b select-none touch-none cursor-grab active:cursor-grabbing ${tokens.bordeSuave}`}
      >
        <div className="flex justify-center mb-1.5" aria-hidden="true">
          <GripHorizontal className={`w-6 h-4 ${tokens.textoMuted}`} />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 text-left">
            <h2 className={`font-serif font-bold text-sm truncate ${tokens.textoTitulo}`}>
              {t('mapaExt.lugaresEnVista', { n: totalResultados })}
            </h2>
            <p className={`text-[11px] truncate ${tokens.textoMuted}`}>
              {expandido ? t('mapaExt.deslizaExplorar') : t('mapaExt.tocaExpandir')}
            </p>
          </div>

          <button
            type="button"
            aria-expanded={expandido}
            onClick={() => onToggleExpandido(!expandido)}
            className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-semibold ${tokens.botonSecundario} ${tokens.focusRing}`}
          >
            {expandido ? (
              <>
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
                <span>{t('mapaExt.contraer')}</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
                <span>{t('mapaExt.expandir')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cuerpo scrollable: no captura arrastre del panel */}
      <div className="flex-1 min-h-0 p-3 overflow-hidden flex flex-col">
        {children}
      </div>
    </section>
  );
}
