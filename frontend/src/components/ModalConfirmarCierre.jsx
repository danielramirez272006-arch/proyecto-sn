import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, LogOut, X, ShieldAlert } from 'lucide-react';
import { Button } from './ui/Button';
import { useIdioma } from '../context/IdiomaContext';

/**
 * Modal de advertencia antes de cerrar sesión.
 * Usa createPortal hacia document.body para evitar que contenedores con backdrop-filter,
 * transform o sticky distorsionen o corten el centrado en pantalla.
 */
export function ModalConfirmarCierre({
  isOpen,
  visible,
  onClose,
  onCancelar,
  onConfirmar,
  nombreUsuario = 'Tutor'
}) {
  const { t } = useIdioma();
  const estaAbierto = Boolean(isOpen ?? visible);
  const handleCerrar = onClose || onCancelar || (() => {});

  // Manejo de tecla Escape y bloqueo de scroll
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

  if (!estaAbierto || typeof document === 'undefined') return null;

  const modalContenido = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-confirmar-cierre-titulo"
    >
      {/* Fondo con oscurecimiento cinematográfico y desenfoque */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-200"
        onClick={handleCerrar}
        aria-hidden="true"
      />

      {/* Contenedor del Diálogo Centrado Perfectamente */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#111827] border border-slate-200/90 dark:border-white/10 rounded-3xl shadow-2xl p-6 sm:p-7 z-10 transition-all transform duration-200 animate-in zoom-in-95 my-auto space-y-5 select-none">
        {/* Encabezado con Icono de Advertencia */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-700/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 block">
                {t('cerrarModal.seguridad')}
              </span>
              <h3
                id="modal-confirmar-cierre-titulo"
                className="font-serif font-bold text-xl text-[#111827] dark:text-[#E8EDF5] tracking-tight"
              >
                {t('cerrarModal.titulo')}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCerrar}
            aria-label={t('cerrarModal.cancelar')}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensaje descriptivo de la advertencia */}
        <div className="space-y-2 text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">
          <p>
            {t('cerrarModal.prefijo')}{' '}
            <strong className="text-slate-900 dark:text-[#E8EDF5] font-semibold">
              {nombreUsuario}
            </strong>
            .
          </p>
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#162032] border border-slate-200/70 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <span>
              {t('cerrarModal.nota')}
            </span>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCerrar}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#1e293b] hover:bg-slate-200 dark:hover:bg-[#273549] border border-slate-200/80 dark:border-white/10 transition-colors"
          >
            {t('cerrarModal.cancelar')}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] shadow-md shadow-rose-600/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>{t('cerrarModal.confirmar')}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContenido, document.body);
}

export default ModalConfirmarCierre;
