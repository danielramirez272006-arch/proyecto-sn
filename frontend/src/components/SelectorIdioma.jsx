import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useIdioma } from '../context/IdiomaContext';
import { useTema } from '../context/TemaContext';

/**
 * Selector multilingüe reutilizable (ES, EN, FR, PT, DE, 中文, JA, KO, RU, IT).
 * Soporta variantes:
 * - 'grid'    : grilla de botones para el panel de accesibilidad/idioma.
 * - 'header'  : botón compacto con menú desplegable para barra móvil.
 * - 'sidebar' : botón anclado compatible con barra lateral expandida o colapsada.
 */
export function SelectorIdioma({
  variant = 'sidebar',
  compacto = false,
  className = '',
  clasesColapsoTexto = null,
  onSeleccionado = null
}) {
  const { idioma, idiomaActual, idiomas, setIdioma, t } = useIdioma();
  const { esClaro, esMorado } = useTema();
  const [abierto, setAbierto] = useState(false);
  const [posicionDropdown, setPosicionDropdown] = useState(null);
  const ref = useRef(null);

  const actualizarPosicion = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const alturaEstimada = Math.min(288, idiomas.length * 36 + 16);

    if (compacto) {
      // Sidebar cerrado / colapsado: el menú flota libremente a la derecha del botón (fuera del sidebar)
      let top = rect.bottom - alturaEstimada;
      if (top < 10) top = 10;
      if (top + alturaEstimada > window.innerHeight - 10) {
        top = Math.max(10, window.innerHeight - alturaEstimada - 10);
      }
      setPosicionDropdown({
        position: 'fixed',
        left: `${Math.round(rect.right + 10)}px`,
        top: `${Math.round(top)}px`,
        width: '230px',
        zIndex: 99999
      });
    } else {
      // Sidebar expandido: el menú flota encima del botón
      let top = rect.top - alturaEstimada - 8;
      if (top < 10) {
        top = rect.bottom + 8;
      }
      setPosicionDropdown({
        position: 'fixed',
        left: `${Math.round(Math.max(10, rect.left))}px`,
        top: `${Math.round(top)}px`,
        width: `${Math.round(Math.max(220, rect.width))}px`,
        zIndex: 99999
      });
    }
  }, [compacto, idiomas.length]);

  useEffect(() => {
    if (!abierto) {
      setPosicionDropdown(null);
      return undefined;
    }
    actualizarPosicion();
    window.addEventListener('resize', actualizarPosicion);
    window.addEventListener('scroll', actualizarPosicion, true);
    return () => {
      window.removeEventListener('resize', actualizarPosicion);
      window.removeEventListener('scroll', actualizarPosicion, true);
    };
  }, [abierto, actualizarPosicion]);

  useEffect(() => {
    if (!abierto) return undefined;
    const handleClickOutside = (e) => {
      if (ref.current && ref.current.contains(e.target)) return;
      const popup = document.querySelector('.selector-idioma-popup');
      if (popup && popup.contains(e.target)) return;
      setAbierto(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [abierto]);

  const seleccionar = (codigo) => {
    setIdioma(codigo);
    setAbierto(false);
    if (onSeleccionado) onSeleccionado(codigo);
  };

  if (variant === 'grid') {
    return (
      <div
        role="radiogroup"
        aria-label={t('a11y.idiomaSeccion')}
        className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${className}`}
      >
        {idiomas.map((item) => {
          const activo = idioma === item.codigo;
          return (
            <button
              key={item.codigo}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => seleccionar(item.codigo)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                activo
                  ? 'bg-[#501228] text-white border-[#F27B91]/60 shadow-sm font-bold'
                  : esClaro
                  ? 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-[#501228]/40'
                  : esMorado
                  ? 'bg-[#23121F] border-[#F27B91]/20 text-[#FDF2F6] hover:border-[#F27B91]/50'
                  : 'bg-[#162032] border-white/10 text-slate-200 hover:border-white/30'
              }`}
            >
              <div className="min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                      activo
                        ? 'bg-white/20 text-white'
                        : esClaro
                        ? 'bg-slate-200 text-slate-800'
                        : 'bg-white/10 text-slate-200'
                    }`}
                  >
                    {item.corto}
                  </span>
                  <span className="text-xs font-semibold truncate">{item.nombreNativo}</span>
                </div>
                <span className={`text-[10px] block truncate mt-0.5 ${activo ? 'text-white/80' : 'opacity-65'}`}>
                  {item.region}
                </span>
              </div>
              {activo && <Check className="w-3.5 h-3.5 shrink-0 text-[#F27B91]" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    );
  }

  const cajaMenu = esClaro
    ? 'bg-white border-slate-200 text-slate-900 shadow-2xl'
    : esMorado
    ? 'bg-[#1C0C16] border-[#F27B91]/35 text-[#FDF2F6] shadow-2xl'
    : 'bg-[#111827] border-white/15 text-white shadow-2xl';

  if (variant === 'header') {
    return (
      <div className={`relative ${className}`} ref={ref}>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-haspopup="listbox"
          aria-label={`${t('nav.idioma')}: ${idiomaActual.nombreNativo}`}
          title={`${t('nav.idioma')}: ${idiomaActual.nombreNativo}`}
          className={`inline-flex items-center gap-1 px-2 py-1.5 rounded-xl border text-[11px] font-bold transition-colors ${
            esClaro
              ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
              : esMorado
              ? 'bg-[#1F0E19] border-[#F27B91]/35 text-[#FDF2F6] hover:bg-[#55152D]/40'
              : 'bg-[#111827] border-white/20 text-slate-100 hover:bg-slate-800'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-[#F27B91] shrink-0" aria-hidden="true" />
          <span>{idiomaActual.corto}</span>
        </button>

        {abierto && (
          <div
            role="listbox"
            aria-label={t('a11y.idiomaSeccion')}
            className={`absolute right-0 mt-2 w-56 max-h-72 overflow-y-auto gotox-scrollbar rounded-2xl border p-1.5 z-[1400] ${cajaMenu}`}
          >
            {idiomas.map((item) => {
              const activo = item.codigo === idioma;
              return (
                <button
                  key={item.codigo}
                  type="button"
                  role="option"
                  aria-selected={activo}
                  onClick={() => seleccionar(item.codigo)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                    activo
                      ? 'bg-[#501228] text-white font-bold'
                      : esClaro
                      ? 'text-slate-800 hover:bg-slate-100'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-[10px] font-black w-8 text-left opacity-80 shrink-0">{item.corto}</span>
                    <span className="truncate">{item.nombreNativo}</span>
                  </span>
                  {activo && <Check className="w-3.5 h-3.5 text-[#F27B91] shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Variante 'sidebar'
  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="listbox"
        aria-label={`${t('nav.idioma')}: ${idiomaActual.nombreNativo}`}
        title={compacto ? `${t('nav.idioma')}: ${idiomaActual.nombreNativo}` : undefined}
        className={`w-full flex items-center justify-start pl-1.5 pr-2.5 py-0.5 rounded-xl border text-xs font-medium whitespace-nowrap overflow-hidden transition-colors ${
          esClaro
            ? 'bg-white border-slate-300 text-slate-800 hover:border-[#501228]/50'
            : esMorado
            ? 'bg-[#1F0E19] border-[#F27B91]/25 text-[#FDF2F6] hover:border-[#F27B91]/50'
            : 'bg-[#111827] border-white/15 text-slate-100 hover:border-white/30'
        }`}
      >
        <span className="w-10 h-8 shrink-0 flex items-center justify-center">
          <Globe className="w-4 h-4 text-[#F27B91] shrink-0" aria-hidden="true" />
        </span>
        <div
          className={`flex items-center justify-between flex-1 min-w-0 ${
            clasesColapsoTexto
              ? clasesColapsoTexto(compacto, 'max-w-[185px]')
              : compacto
              ? 'hidden'
              : ''
          }`}
        >
          <span className="truncate font-semibold">
            {t('nav.idioma')}: {idiomaActual.nombreNativo}
          </span>
          <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-bold uppercase opacity-75">
            <span>{idiomaActual.corto}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${abierto ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </span>
        </div>
      </button>

      {abierto && posicionDropdown && typeof document !== 'undefined' &&
        createPortal(
          <div
            role="listbox"
            aria-label={t('a11y.idiomaSeccion')}
            style={posicionDropdown}
            className={`selector-idioma-popup max-h-72 overflow-y-auto gotox-scrollbar rounded-2xl border p-1.5 shadow-2xl grid grid-cols-1 gap-0.5 ${cajaMenu}`}
          >
            {idiomas.map((item) => {
              const activo = item.codigo === idioma;
              return (
                <button
                  key={item.codigo}
                  type="button"
                  role="option"
                  aria-selected={activo}
                  onClick={() => seleccionar(item.codigo)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                    activo
                      ? 'bg-[#501228] text-white font-bold'
                      : esClaro
                      ? 'text-slate-800 hover:bg-slate-100'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-[10px] font-black uppercase w-8 text-left opacity-80 shrink-0">
                      {item.corto}
                    </span>
                    <span className="truncate">{item.nombreNativo}</span>
                  </span>
                  {activo && <Check className="w-3.5 h-3.5 shrink-0 text-[#F27B91]" aria-hidden="true" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

export default SelectorIdioma;
