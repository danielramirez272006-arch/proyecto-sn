import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, Sparkles, Check } from 'lucide-react';
import { useTema } from '../context/TemaContext';

/**
 * Selector de 3 temas visuales:
 * - Claro (Día / Marfil)
 * - Oscuro (Black / Slate Puro)
 * - Morado (Vino / Burgundy Marca)
 */
export function BotonTema({ className = '', conMenu = false }) {
  const { tema, setTema, alternarTema } = useTema();
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef(null);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    function manejarClicAfuera(e) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setAbierto(false);
      }
    }
    if (abierto) {
      document.addEventListener('mousedown', manejarClicAfuera);
      return () => document.removeEventListener('mousedown', manejarClicAfuera);
    }
  }, [abierto]);

  const opciones = [
    { id: 'claro', etiqueta: 'Modo Claro', icon: Sun, color: 'text-amber-500' },
    { id: 'oscuro', etiqueta: 'Modo Oscuro', icon: Moon, color: 'text-blue-400' },
    { id: 'morado', etiqueta: 'Modo Morado (Vino)', icon: Sparkles, color: 'text-[#f0a6be]' }
  ];

  const opcionActual = opciones.find((o) => o.id === tema) || opciones[0];
  const IconoActual = opcionActual.icon;

  const siguienteEtiqueta =
    tema === 'claro'
      ? 'Cambiar a modo oscuro'
      : tema === 'oscuro'
      ? 'Cambiar a modo morado'
      : 'Cambiar a modo claro';

  return (
    <div className={`relative inline-block ${className}`} ref={contenedorRef}>
      <button
        type="button"
        onClick={() => {
          if (conMenu) {
            setAbierto(!abierto);
          } else {
            alternarTema();
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setAbierto(!abierto);
        }}
        aria-label={`${opcionActual.etiqueta} (${siguienteEtiqueta})`}
        title={`${opcionActual.etiqueta} • Clic para alternar, clic derecho para menú`}
        className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200/80 bg-white text-slate-700 hover:text-[#501228] hover:bg-[#FDF2F4] transition-all shadow-2xs"
      >
        <IconoActual className={`w-4 h-4 ${opcionActual.color}`} />
      </button>

      {/* Menú flotante de los 3 temas si se abre */}
      {abierto && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-slate-200/90 shadow-xl py-1.5 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1 text-[10px] font-semibold tracking-wider uppercase text-slate-400 border-b border-slate-100 mb-1">
            Paleta de Tema
          </div>
          {opciones.map((op) => {
            const Icono = op.icon;
            const seleccionado = tema === op.id;
            return (
              <button
                key={op.id}
                type="button"
                onClick={() => {
                  setTema(op.id);
                  setAbierto(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
                  seleccionado
                    ? 'bg-[#FDF2F4] text-[#501228] font-semibold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icono className={`w-3.5 h-3.5 ${op.color}`} />
                  <span>{op.etiqueta}</span>
                </div>
                {seleccionado && <Check className="w-3.5 h-3.5 text-[#501228]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
