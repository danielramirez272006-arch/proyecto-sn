import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTema } from '../context/TemaContext';

/**
 * Interruptor sol / luna. Reutilizable en navbar y menú móvil.
 */
export function BotonTema({ className = '' }) {
  const { esOscuro, alternarTema } = useTema();
  const etiqueta = esOscuro ? 'Activar modo claro' : 'Activar modo oscuro';

  return (
    <button
      type="button"
      onClick={alternarTema}
      aria-label={etiqueta}
      title={etiqueta}
      aria-pressed={esOscuro}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:text-[#501228] hover:bg-[#FDF2F4] transition-colors ${className}`}
    >
      {esOscuro ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
