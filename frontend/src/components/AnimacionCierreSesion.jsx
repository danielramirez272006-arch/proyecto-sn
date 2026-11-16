import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, ShieldCheck, Dog, Sparkles } from 'lucide-react';

/**
 * Modal animado de cierre de sesión con estética minimalista premium (Apple-like).
 * Muestra el cifrado seguro de la bóveda biométrica antes de redirigir al login (/acceso).
 * Usa createPortal hacia document.body para garantizar centrado perfecto en pantalla completa.
 */
export function AnimacionCierreSesion({ visible, nombreUsuario = 'Tutor', onCompletado }) {
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    if (!visible) {
      setProgreso(0);
      return;
    }

    // Inicia la barra de progreso
    const timeoutInicio = setTimeout(() => {
      setProgreso(100);
    }, 50);

    // Completa la animación y ejecuta la redirección
    const timeoutFin = setTimeout(() => {
      if (onCompletado) {
        onCompletado();
      }
    }, 900);

    return () => {
      clearTimeout(timeoutInicio);
      clearTimeout(timeoutFin);
    };
  }, [visible, onCompletado]);

  if (!visible || typeof document === 'undefined') return null;

  const animacionContenido = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-all duration-300 animate-in fade-in"
      role="status"
      aria-live="polite"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-white/95 dark:bg-[#111827] backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-2xl p-7 text-center space-y-5 animate-in zoom-in-95 duration-200 select-none my-auto">
        {/* Luz ambiental sutil */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-20 bg-[#55152D]/25 dark:bg-[#F27B91]/15 rounded-full blur-2xl pointer-events-none" />

        {/* Icono con halo pulsante */}
        <div className="relative w-20 h-20 mx-auto">
          {/* Anillo de pulso exterior */}
          <div className="absolute inset-0 rounded-3xl bg-[#55152D]/20 dark:bg-[#F27B91]/20 animate-ping opacity-40" />

          {/* Caja principal del icono */}
          <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-[#55152D] to-[#6E1E3A] text-white flex items-center justify-center shadow-lg shadow-[#55152D]/35">
            <Lock className="w-9 h-9 text-[#FDF2F4] animate-pulse" />

            {/* Insignia pequeña de mascota */}
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-[#111827] text-[#55152D] dark:text-[#F27B91] border-2 border-white dark:border-[#111827] flex items-center justify-center shadow-sm">
              <Dog className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Títulos y mensajes */}
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#55152D] dark:text-[#F27B91]">
            <ShieldCheck className="w-3.5 h-3.5" />
            Bóveda Pet-OS
          </span>
          <h3 className="font-serif font-bold text-2xl text-[#111827] dark:text-[#E8EDF5] tracking-tight">
            Cerrando Sesión
          </h3>
          <p className="text-xs text-slate-600 dark:text-[#94A3B8]">
            ¡Hasta pronto, <strong className="text-slate-900 dark:text-[#E8EDF5]">{nombreUsuario}</strong>! 🐾
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-0.5">
            Cifrando tus datos biométricos y volviendo al acceso...
          </p>
        </div>

        {/* Barra de progreso fluida */}
        <div className="w-full bg-slate-100 dark:bg-[#162032] rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#55152D] to-[#F27B91] rounded-full transition-all duration-800 ease-out"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(animacionContenido, document.body);
}

export default AnimacionCierreSesion;
