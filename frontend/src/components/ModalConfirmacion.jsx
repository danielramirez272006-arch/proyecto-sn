import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, HelpCircle } from 'lucide-react';
import { useTema } from '../context/TemaContext';
import { useIdioma } from '../context/IdiomaContext';

/**
 * Diálogo de confirmación propio (reemplaza window.confirm del navegador).
 * - Accesible: role="alertdialog", foco inicial en «Cancelar», Escape cancela, el foco queda atrapado.
 * - Respeta los temas Claro / Oscuro / Vino.
 */
export function ModalConfirmacion({
  abierto,
  titulo,
  mensaje,
  detalles = [],
  textoConfirmar,
  textoCancelar,
  peligroso = false,
  onConfirmar,
  onCancelar
}) {
  const { esClaro, esMorado } = useTema();
  const { t } = useIdioma();
  const etiquetaConfirmar = textoConfirmar || t('confirmModal.confirmar');
  const etiquetaCancelar = textoCancelar || t('confirmModal.cancelar');
  const cancelarRef = useRef(null);
  const panelRef = useRef(null);
  const previoRef = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    previoRef.current = document.activeElement;
    const t = setTimeout(() => cancelarRef.current?.focus(), 20);

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancelar?.();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focos = panelRef.current.querySelectorAll('button:not([disabled])');
        if (focos.length === 0) return;
        const primero = focos[0];
        const ultimo = focos[focos.length - 1];
        if (e.shiftKey && document.activeElement === primero) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }
    };

    window.addEventListener('keydown', onKey);
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowPrevio;
      previoRef.current?.focus?.();
    };
  }, [abierto, onCancelar]);

  if (!abierto) return null;

  const superficie = esClaro
    ? 'bg-white text-slate-900 border-slate-200'
    : esMorado
    ? 'bg-[#1C0D17] text-[#FDF2F6] border-[#F27B91]/30'
    : 'bg-[#0F172A] text-[#E8EDF5] border-white/15';

  const Icono = peligroso ? AlertTriangle : HelpCircle;
  const acento = peligroso ? 'text-rose-500 bg-rose-500/10 border-rose-500/30' : 'text-[#F27B91] bg-[#501228]/20 border-[#F27B91]/30';

  return createPortal(
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancelar?.();
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="gotox-confirm-titulo"
        aria-describedby="gotox-confirm-mensaje"
        className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-5 text-left ${superficie}`}
      >
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${acento}`}>
            <Icono className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1.5 min-w-0">
            <h2 id="gotox-confirm-titulo" className="font-serif font-bold text-lg leading-snug">
              {titulo}
            </h2>
            <p id="gotox-confirm-mensaje" className="text-sm opacity-80 leading-relaxed">
              {mensaje}
            </p>
          </div>
        </div>

        {detalles.length > 0 && (
          <ul className="space-y-1.5 text-xs rounded-2xl border border-current/15 bg-current/5 p-3.5">
            {detalles.map((d) => (
              <li key={d} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#F27B91] shrink-0" aria-hidden="true" />
                <span className="opacity-90">{d}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-1">
          <button
            ref={cancelarRef}
            type="button"
            onClick={onCancelar}
            className="px-4 py-2.5 rounded-xl border border-current/20 text-sm font-semibold hover:bg-current/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F27B91]"
          >
            {etiquetaCancelar}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              peligroso
                ? 'bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-400'
                : 'bg-[#501228] hover:bg-[#681734] focus-visible:ring-[#F27B91]'
            }`}
          >
            {peligroso && <Trash2 className="w-4 h-4" aria-hidden="true" />}
            <span>{etiquetaConfirmar}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ModalConfirmacion;
