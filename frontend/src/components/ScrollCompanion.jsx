import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useReducedMotion } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { ChevronUp, Compass } from 'lucide-react';

const SECCIONES_INICIO = [
  { id: 'descubrimiento', selector: 'main section:nth-of-type(1)', label: 'Descubrimiento & Buscador' },
  { id: 'telemetria', selector: '#telemetria', label: 'Telemetría Urbana GAM' },
  { id: 'ruleta-videos', selector: '.ruleta-videos-section', label: 'Ruleta de Videos' },
  { id: 'terrazas', selector: '#terrazas', label: 'Terrazas Verificadas' },
  { id: 'copiloto', selector: '#copiloto', label: 'Copiloto Argos IA' }
];

/**
 * Sistema de Scroll inspirado en Linear.app, Lenis y Magic UI:
 * 1. Barra superior de progreso con física spring (useScroll + useSpring).
 * 2. Botón flotante de retorno arriba con anillo circular SVG del % recorrido.
 * 3. Índice flotante de salto rápido entre secciones en la página principal.
 */
export function ScrollCompanion() {
  const prefersReducedMotion = useReducedMotion();
  const location = useLocation();
  const esHome = location.pathname === '/';

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    restDelta: 0.001
  });

  const [porcentaje, setPorcentaje] = useState(0);
  const [visible, setVisible] = useState(false);
  const [menuSeccionesAbierto, setMenuSeccionesAbierto] = useState(false);

  useEffect(() => {
    let rafId = null;

    const actualizarScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const pct = docHeight > 0 ? Math.min(100, Math.round((scrollTop / docHeight) * 100)) : 0;

      setPorcentaje(pct);
      setVisible(scrollTop > 260);
      rafId = null;
    };

    const onScroll = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(actualizarScroll);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    actualizarScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, [location.pathname]);

  const irArriba = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });
    setMenuSeccionesAbierto(false);
  }, [prefersReducedMotion]);

  const irASeccion = useCallback(
    (sec, idx) => {
      const el =
        document.getElementById(sec.id) ||
        (sec.selector ? document.querySelector(sec.selector) : null) ||
        document.querySelectorAll('main section')[idx];

      if (el) {
        el.scrollIntoView({
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
          block: 'start'
        });
      }
      setMenuSeccionesAbierto(false);
    },
    [prefersReducedMotion]
  );

  const radio = 18;
  const circunferencia = 2 * Math.PI * radio;
  const strokeDashoffset = circunferencia - (porcentaje / 100) * circunferencia;

  return (
    <>
      {/* 1. Barra Superior de Progreso de Lectura/Scroll (60fps GPU scaleX) */}
      <motion.div
        aria-hidden="true"
        style={{
          scaleX: prefersReducedMotion ? scrollYProgress : scaleX,
          transformOrigin: '0%'
        }}
        className="fixed top-0 left-0 right-0 h-[3px] z-[9999] pointer-events-none bg-gradient-to-r from-[#501228] via-[#e11d48] to-[#F27B91] shadow-[0_0_12px_rgba(242,123,145,0.65)]"
      />

      {/* 2. Control Flotante Inteligente (encima del botón de Accesibilidad) */}
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.92 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-[4.75rem] right-5 z-[9980] flex flex-col items-end gap-2"
          >
            {/* Menú desplegable de salto rápido entre secciones */}
            <AnimatePresence>
              {esHome && menuSeccionesAbierto && (
                <motion.nav
                  aria-label="Salto rápido de secciones"
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="p-2 rounded-2xl bg-[#180A14]/95 backdrop-blur-xl border border-[#F27B91]/30 shadow-2xl min-w-[205px] space-y-1 text-left"
                >
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#F27B91] flex items-center justify-between border-b border-white/10">
                    <span>Ir a sección</span>
                    <span className="tabular-nums">{porcentaje}%</span>
                  </div>
                  {SECCIONES_INICIO.map((sec, idx) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => irASeccion(sec, idx)}
                      className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#FDF2F6] hover:bg-[#55152D]/70 hover:text-white transition-colors"
                    >
                      {sec.label}
                    </button>
                  ))}
                </motion.nav>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-1.5">
              {esHome && (
                <button
                  type="button"
                  onClick={() => setMenuSeccionesAbierto((prev) => !prev)}
                  aria-label="Abrir índice rápido de secciones"
                  title="Saltar a sección"
                  className="h-9 px-3 rounded-full bg-[#180A14]/90 hover:bg-[#501228] text-[#FDF2F6] border border-[#F27B91]/30 backdrop-blur-md shadow-lg text-[11px] font-bold tabular-nums flex items-center gap-1.5 transition-colors"
                >
                  <Compass className="w-3.5 h-3.5 text-[#F27B91]" />
                  <span>{porcentaje}%</span>
                </button>
              )}

              {/* Botón circular Scroll to Top con anillo SVG de progreso */}
              <button
                type="button"
                onClick={irArriba}
                aria-label={`Volver arriba (${porcentaje}% recorrido)`}
                title={`Volver arriba (${porcentaje}%)`}
                className="relative w-11 h-11 rounded-full bg-[#180A14]/90 hover:bg-[#501228] text-white border border-[#F27B91]/25 backdrop-blur-md shadow-xl flex items-center justify-center transition-transform active:scale-95 group"
              >
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 44 44"
                  className="absolute inset-0 -rotate-90 pointer-events-none"
                >
                  <circle
                    cx="22"
                    cy="22"
                    r={radio}
                    fill="none"
                    stroke="rgba(242, 123, 145, 0.16)"
                    strokeWidth="2.4"
                  />
                  <circle
                    cx="22"
                    cy="22"
                    r={radio}
                    fill="none"
                    stroke="#F27B91"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeDasharray={circunferencia}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 120ms ease-out' }}
                  />
                </svg>
                <ChevronUp className="w-4 h-4 text-[#FDF2F6] group-hover:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ScrollCompanion;
