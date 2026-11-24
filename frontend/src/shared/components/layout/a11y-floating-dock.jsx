import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Accessibility,
  X,
  Type,
  Eye,
  Sparkles,
  ZapOff,
  Link2,
  Volume2,
  Square,
  RotateCcw,
  Globe
} from 'lucide-react';
import { useAccesibilidad } from '../../../context/AccesibilidadContext';
import { useIdioma } from '../../../context/IdiomaContext';
import { useTema } from '../../../context/TemaContext';
import { SelectorIdioma } from '../../../components/SelectorIdioma';

export const EVENTO_ABRIR_ACCESIBILIDAD = 'synodos:open-a11y';

export function abrirPanelAccesibilidad() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_ACCESIBILIDAD));
  }
}

/**
 * Centro Universal de Accesibilidad e Idioma (WCAG 2.1 AA/AAA).
 * Accesible mediante el botón flotante, los menús laterales o Alt + A.
 */
export function A11yFloatingDock() {
  const {
    prefs,
    leyendoVoz,
    hayAjustesActivos,
    soportaVoz,
    setEscalaTexto,
    toggleAltoContraste,
    toggleLecturaFacil,
    toggleReducirMovimiento,
    toggleResaltarEnlaces,
    alternarLecturaVoz,
    restablecer
  } = useAccesibilidad();
  const { idioma, idiomaActual, t } = useIdioma();
  const { esClaro, esMorado } = useTema();

  const [abierto, setAbierto] = useState(false);
  const triggerRef = useRef(null);
  const closeRef = useRef(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const onOpen = () => setAbierto(true);
    const onKeyDown = (e) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setAbierto((prev) => !prev);
      } else if (e.key === 'Escape' && abierto) {
        e.preventDefault();
        setAbierto(false);
      }
    };

    window.addEventListener(EVENTO_ABRIR_ACCESIBILIDAD, onOpen);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener(EVENTO_ABRIR_ACCESIBILIDAD, onOpen);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [abierto]);

  useEffect(() => {
    if (abierto) {
      wasOpenRef.current = true;
      const timer = window.setTimeout(() => closeRef.current?.focus(), 40);
      return () => window.clearTimeout(timer);
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
    return undefined;
  }, [abierto]);

  const panelTema = esClaro
    ? 'bg-white border-slate-200 text-slate-900'
    : esMorado
    ? 'bg-[#180A14] border-[#F27B91]/35 text-[#FDF2F6]'
    : 'bg-[#111827] border-white/15 text-[#E8EDF5]';

  const tarjetaItem = esClaro
    ? 'bg-slate-50 border-slate-200 hover:border-[#501228]/40'
    : esMorado
    ? 'bg-[#23121F] border-[#F27B91]/20 hover:border-[#F27B91]/45'
    : 'bg-[#162032] border-white/10 hover:border-white/25';

  const switches = [
    {
      id: 'contraste',
      activo: prefs.altoContraste,
      onToggle: () => toggleAltoContraste(t('a11y.altoContraste')),
      titulo: t('a11y.altoContraste'),
      desc: t('a11y.altoContrasteDesc'),
      icon: Eye
    },
    {
      id: 'lectura',
      activo: prefs.lecturaFacil,
      onToggle: () => toggleLecturaFacil(t('a11y.lecturaFacil')),
      titulo: t('a11y.lecturaFacil'),
      desc: t('a11y.lecturaFacilDesc'),
      icon: Sparkles
    },
    {
      id: 'movimiento',
      activo: prefs.reducirMovimiento,
      onToggle: () => toggleReducirMovimiento(t('a11y.reducirMovimiento')),
      titulo: t('a11y.reducirMovimiento'),
      desc: t('a11y.reducirMovimientoDesc'),
      icon: ZapOff
    },
    {
      id: 'enlaces',
      activo: prefs.resaltarEnlaces,
      onToggle: () => toggleResaltarEnlaces(t('a11y.resaltarEnlaces')),
      titulo: t('a11y.resaltarEnlaces'),
      desc: t('a11y.resaltarEnlacesDesc'),
      icon: Link2
    }
  ];

  const escalas = [
    { id: 'normal', label: t('a11y.escalaNormal') },
    { id: 'grande', label: t('a11y.escalaGrande') },
    { id: 'extra', label: t('a11y.escalaExtra') }
  ];

  const dockContent = (
    <>
      {/* Botón Flotante Universal (escritorio bottom-right; en móvil vive en la cabecera superior) */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        aria-label={`${t('a11y.botonDock')} (${idiomaActual.corto})`}
        title={`${t('a11y.botonDock')} • Alt + A`}
        className={`hidden md:inline-flex fixed bottom-5 right-5 z-[1350] items-center gap-2 px-3.5 py-2.5 rounded-2xl border shadow-xl transition-transform active:scale-95 ${
          esClaro
            ? 'bg-[#501228] text-white border-[#F27B91]/40 hover:bg-[#6E1E3A]'
            : esMorado
            ? 'bg-[#55152D] text-white border-[#F27B91]/55 hover:bg-[#6E1E3A]'
            : 'bg-[#111827] text-white border-[#F27B91]/45 hover:bg-[#1E293B]'
        }`}
      >
        <Accessibility className="w-5 h-5 text-[#F27B91] shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline text-xs font-bold tracking-tight">
          {t('nav.accesibilidad')}
        </span>
        <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-white/15 text-white">
          {idiomaActual.corto}
        </span>
        {(hayAjustesActivos || leyendoVoz) && (
          <span
            className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#090D14] shrink-0"
            aria-hidden="true"
          />
        )}
      </button>

      {/* Panel / Modal de Accesibilidad e Idioma */}
      {abierto && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="synodos-a11y-title"
        >
          <div
            className="fixed inset-0"
            onClick={() => setAbierto(false)}
            aria-hidden="true"
          />
          <div
            className={`relative z-10 w-full max-w-2xl max-h-[90dvh] overflow-y-auto gotox-scrollbar rounded-3xl border p-6 sm:p-7 shadow-2xl space-y-6 ${panelTema}`}
          >
            {/* Cabecera */}
            <div className="flex items-start justify-between gap-4 border-b border-current/10 pb-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#501228] border border-[#F27B91]/40 text-white flex items-center justify-center shrink-0">
                  <Accessibility className="w-6 h-6 text-[#F27B91]" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h2 id="synodos-a11y-title" className="font-serif text-xl sm:text-2xl font-bold leading-tight">
                    {t('a11y.titulo')}
                  </h2>
                  <p className="text-xs opacity-75 leading-relaxed">
                    {t('a11y.subtitulo')}
                  </p>
                  <p className="text-[11px] font-semibold text-[#F27B91]">
                    {t('a11y.atajoTeclado')}
                  </p>
                </div>
              </div>

              <button
                ref={closeRef}
                type="button"
                onClick={() => setAbierto(false)}
                aria-label={t('a11y.cerrar')}
                className="p-2 rounded-xl border border-current/15 opacity-75 hover:opacity-100 hover:bg-current/5 transition-colors shrink-0"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* 1. Selector de Idioma (6 idiomas principales) */}
            <section className="space-y-2.5" aria-labelledby="a11y-lang-heading">
              <h3 id="a11y-lang-heading" className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#F27B91]" aria-hidden="true" />
                <span>{t('a11y.idiomaSeccion')}</span>
              </h3>
              <SelectorIdioma variant="grid" />
            </section>

            {/* 2. Tamaño de Texto */}
            <section className="space-y-2.5" aria-labelledby="a11y-textsize-heading">
              <h3 id="a11y-textsize-heading" className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Type className="w-4 h-4 text-[#F27B91]" aria-hidden="true" />
                <span>{t('a11y.tamanoTexto')}</span>
              </h3>
              <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="a11y-textsize-heading">
                {escalas.map((esc) => {
                  const activo = prefs.escalaTexto === esc.id;
                  return (
                    <button
                      key={esc.id}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => setEscalaTexto(esc.id, `${t('a11y.tamanoTexto')}: ${esc.label}`)}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                        activo
                          ? 'bg-[#501228] text-white border-[#F27B91]/60 shadow-sm font-bold'
                          : `${tarjetaItem}`
                      }`}
                    >
                      {esc.label}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 3. Asistencia Auditiva / Lectura en Voz Alta */}
            {soportaVoz && (
              <section className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${tarjetaItem}`}>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Volume2 className="w-4 h-4 text-[#F27B91]" aria-hidden="true" />
                    <span>{t('a11y.leerPagina')}</span>
                  </div>
                  <p className="text-[11px] opacity-75 leading-snug">
                    {t('a11y.leerPaginaDesc')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => alternarLecturaVoz(idioma)}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    leyendoVoz
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : 'bg-[#501228] text-white hover:bg-[#6E1E3A] border border-[#F27B91]/40'
                  }`}
                >
                  {leyendoVoz ? (
                    <>
                      <Square className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t('a11y.detenerLectura')}</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t('a11y.leerPagina')}</span>
                    </>
                  )}
                </button>
              </section>
            )}

            {/* 4. Opciones Inclusivas (Contraste, Dislexia, Movimiento, Enlaces) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {switches.map((sw) => {
                const Icono = sw.icon;
                return (
                  <button
                    key={sw.id}
                    type="button"
                    role="switch"
                    aria-checked={sw.activo}
                    onClick={sw.onToggle}
                    className={`p-3.5 rounded-2xl border text-left flex items-start justify-between gap-3 transition-all ${
                      sw.activo
                        ? 'bg-[#501228]/15 border-[#F27B91] shadow-sm'
                        : tarjetaItem
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <Icono className="w-4 h-4 text-[#F27B91] shrink-0" aria-hidden="true" />
                        <span>{sw.titulo}</span>
                      </div>
                      <p className="text-[11px] opacity-75 leading-snug">{sw.desc}</p>
                    </div>
                    <span
                      aria-hidden="true"
                      className={`mt-0.5 w-10 h-5 rounded-full shrink-0 p-0.5 transition-colors flex items-center ${
                        sw.activo
                          ? 'bg-emerald-500 justify-end'
                          : esClaro
                          ? 'bg-slate-300 justify-start'
                          : 'bg-slate-700 justify-start'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Pie del diálogo */}
            <div className="pt-3 border-t border-current/10 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => restablecer(t('a11y.anuncioRestablecido'))}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-current/20 text-xs font-semibold hover:bg-current/5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('a11y.restablecer')}</span>
              </button>

              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="px-5 py-2 rounded-xl bg-[#501228] hover:bg-[#6E1E3A] text-white text-xs font-bold border border-[#F27B91]/40 transition-colors"
              >
                {t('a11y.cerrar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(dockContent, document.body);
}

export default A11yFloatingDock;
