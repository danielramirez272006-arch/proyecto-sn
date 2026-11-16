import React, { useEffect } from 'react';
import { AlertTriangle, LogOut, X, ShieldAlert } from 'lucide-react';
import { Button } from './ui/Button';

/**
 * Modal de advertencia antes de cerrar sesión.
 * Pregunta confirmación al usuario para evitar salidas accidentales.
 */
export function ModalConfirmarCierre({
  isOpen,
  visible,
  onClose,
  onCancelar,
  onConfirmar,
  nombreUsuario = 'Tutor'
}) {
  const estaAbierto = Boolean(isOpen ?? visible);
  const handleCerrar = onClose || onCancelar || (() => {});

  // Manejo de tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && estaAbierto) {
        handleCerrar();
      }
    };
    if (estaAbierto) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [estaAbierto, handleCerrar]);

  if (!estaAbierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-confirmar-cierre-titulo"
    >
      {/* Fondo con desenfoque cinematográfico */}
      <div
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-md transition-opacity duration-200"
        onClick={handleCerrar}
        aria-hidden="true"
      />

      {/* Contenedor del Diálogo */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-7 z-10 transition-all transform duration-200 animate-in zoom-in-95 space-y-5">
        {/* Encabezado con Icono de Advertencia */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                Confirmación de Salida
              </span>
              <h3
                id="modal-confirmar-cierre-titulo"
                className="font-serif font-bold text-xl text-[#111827] dark:text-white tracking-tight"
              >
                ¿Cerrar sesión activa?
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCerrar}
            aria-label="Cancelar y cerrar modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensaje descriptivo de la advertencia */}
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            Estás a punto de salir de la cuenta de{' '}
            <strong className="text-slate-900 dark:text-white font-semibold">
              {nombreUsuario}
            </strong>
            .
          </p>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/70 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              La bóveda biométrica y telemetría de tu mascota quedarán protegidas. Deberás ingresar tus credenciales nuevamente para acceder.
            </span>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCerrar}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] shadow-md shadow-rose-600/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sí, Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
}
