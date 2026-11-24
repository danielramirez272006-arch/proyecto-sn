import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  Home,
  Map,
  Coffee,
  Sparkles,
  Users,
  ShieldCheck,
  Activity,
  LogIn,
  LogOut,
  Sun,
  Moon,
  Radio,
  Menu,
  X,
  ChevronRight,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  Accessibility
} from 'lucide-react';
import { useSesion } from '../hooks/useSesion';
import { useTema } from '../context/TemaContext';
import { useIdioma } from '../context/IdiomaContext';
import { ModalConfirmarCierre } from './ModalConfirmarCierre';
import { AnimacionCierreSesion } from './AnimacionCierreSesion';
import { LogoSynodos } from './LogoSynodos';
import { SelectorIdioma } from './SelectorIdioma';
import { abrirPanelAccesibilidad } from '../shared/components/layout/a11y-floating-dock';

export function Sidebar({ compacta = false, onToggleCompacta }) {
  const location = useLocation();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const { isLoggedIn, esAdmin, usuario, cerrarSesion } = useSesion();
  const { tema, setTema, esClaro, esMorado, esOscuro } = useTema();
  const { t } = useIdioma();

  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false);
  const [animandoSalida, setAnimandoSalida] = useState(false);

  const menuButtonRef = useRef(null);
  const closeDrawerButtonRef = useRef(null);
  const wasMobileOpenRef = useRef(false);

  const enlacesNavegacion = [
    { nombre: t('nav.inicio'), ruta: '/', icon: Home },
    { nombre: t('nav.mapa'), ruta: '/mapa', icon: Map, badge: 'GAM' },
    { nombre: t('nav.terrazas'), ruta: '/terrazas', icon: Coffee },
    { nombre: t('nav.copiloto'), ruta: '/copiloto', icon: Sparkles },
    { nombre: t('nav.nosotros'), ruta: '/nosotros', icon: Users },
    ...(isLoggedIn
      ? [{ nombre: t('nav.boveda'), ruta: '/usuario', icon: ShieldCheck, badge: t('nav.activoBadge') }]
      : [{ nombre: t('nav.boveda'), ruta: '/acceso', icon: ShieldCheck }])
  ];

  const esRutaActiva = (ruta) => {
    if (ruta === '/' && location.pathname !== '/') return false;
    return location.pathname === ruta || location.pathname.startsWith(`${ruta}/`);
  };

  // Gestión de foco, tecla Escape y bloqueo de scroll en el drawer móvil
  useEffect(() => {
    if (!menuMovilAbierto) {
      if (wasMobileOpenRef.current) {
        wasMobileOpenRef.current = false;
        menuButtonRef.current?.focus();
      }
      return undefined;
    }

    wasMobileOpenRef.current = true;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      closeDrawerButtonRef.current?.focus();
    }, 15);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuMovilAbierto(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [menuMovilAbierto]);

  const handleSolicitarCierre = () => {
    setMenuMovilAbierto(false);
    setModalConfirmacionAbierto(true);
  };

  const handleConfirmarSalida = () => {
    setModalConfirmacionAbierto(false);
    setAnimandoSalida(true);
  };

  const handleCompletarSalida = () => {
    cerrarSesion();
    setAnimandoSalida(false);
    navigate('/acceso');
  };

  const clasesTema = {
    contenedor: esClaro
      ? 'bg-white text-slate-900'
      : esMorado
        ? 'bg-[#140810] text-[#FDF2F6]'
        : 'bg-[#0D131F] text-[#E8EDF5]',

    bordeCabecera: esClaro
      ? 'border-b border-slate-200'
      : esMorado
        ? 'border-b border-[#F27B91]/20'
        : 'border-b border-white/10',

    textoMarca: esClaro
      ? 'text-[#111827]'
      : esMorado
        ? 'text-[#FDF2F6]'
        : 'text-white',

    badgePetOs: esClaro
      ? 'bg-[#FDF2F4] text-[#501228] border border-[#F9E2E8]'
      : esMorado
        ? 'bg-[#55152D] text-[#F27B91] border border-[#F27B91]/40'
        : 'bg-[#1E293B] text-slate-100 border border-white/20',

    subtexto: esClaro ? 'text-slate-600' : esMorado ? 'text-[#D2BBC7]' : 'text-slate-300',

    enlaceInactivo: esClaro
      ? 'text-slate-700 hover:text-[#501228] hover:bg-[#FDF2F4]'
      : esMorado
        ? 'text-[#E4D3DC] hover:text-[#FDF2F6] hover:bg-[#55152D]/35'
        : 'text-slate-200 hover:text-white hover:bg-white/10',

    enlaceActivo: esClaro
      ? 'bg-[#501228] text-white font-semibold shadow-sm'
      : esMorado
        ? 'bg-[#55152D] text-white font-semibold border border-[#F27B91]/50 shadow-sm shadow-[#55152D]/30'
        : 'bg-[#1E293B] text-white font-semibold border border-white/25 shadow-sm',

    indicadorActivo: esClaro ? 'bg-[#F27B91]' : esMorado ? 'bg-[#F27B91]' : 'bg-[#38BDF8]',

    iconoActivo: esClaro ? 'text-white' : esMorado ? 'text-[#F27B91]' : 'text-white',

    tarjetaRedGam: esClaro
      ? 'bg-slate-50 border-slate-200 text-slate-700'
      : esMorado
        ? 'bg-[#1F0E19] border-[#F27B91]/25 text-[#FDF2F6]'
        : 'bg-[#111827] border-white/15 text-slate-200',

    pieInferior: esClaro
      ? 'bg-slate-50/80 border-t border-slate-200'
      : esMorado
        ? 'bg-[#0E060B]/95 border-t border-[#F27B91]/20'
        : 'bg-[#090D14]/95 border-t border-white/15',

    selectorTonoCaja: esClaro
      ? 'bg-white border-slate-300'
      : esMorado
        ? 'bg-[#1F0E19] border-[#F27B91]/25'
        : 'bg-[#111827] border-white/15',

    tarjetaUsuario: esClaro
      ? 'bg-white border-slate-300 text-slate-900 hover:border-[#501228]/50'
      : esMorado
        ? 'bg-[#1F0E19] border-[#F27B91]/25 text-[#FDF2F6] hover:border-[#F27B91]/50'
        : 'bg-[#111827] border-white/15 text-white hover:border-white/30',

    botonCerrarSesion: esClaro
      ? 'text-rose-800 bg-rose-50 hover:bg-rose-100 border-rose-300'
      : esMorado
        ? 'text-rose-200 bg-[#2D0E19] hover:bg-[#3D1423] border-rose-700/50'
        : 'text-rose-200 bg-rose-950/40 hover:bg-rose-900/50 border-rose-800/60',

    botonPrincipal: esClaro
      ? 'bg-[#501228] hover:bg-[#6E1E3A] text-white shadow-sm'
      : esMorado
        ? 'bg-gradient-to-r from-[#501228] to-[#6E1E3A] hover:from-[#651733] hover:to-[#822345] text-white border border-[#F27B91]/40 shadow-md shadow-[#501228]/30'
        : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/25 shadow-md',

    tooltip: esClaro
      ? 'bg-slate-900 text-white border-slate-700'
      : esMorado
        ? 'bg-[#2D1222] text-[#FDF2F6] border-[#F27B91]/40'
        : 'bg-[#1E293B] text-white border-slate-500',

    focusRing:
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F27B91] focus-visible:ring-offset-1'
  };

  /**
   * Genera las clases CSS de transición para elementos colapsables manteniendo el DOM estable:
   * - Al cerrar: se desvanece rápido (opacity-0 duration-150) antes de que el panel se estreche.
   * - Al abrir: aparece con ligero retraso (opacity-100 duration-200 delay-100) cuando ya hay ancho.
   */
  const clasesColapsoTexto = (modoCompacto, maxWAbierto = 'max-w-[180px]') => {
    if (prefersReducedMotion) {
      return `whitespace-nowrap overflow-hidden ${modoCompacto ? 'opacity-0 max-w-0 pointer-events-none' : `opacity-100 ${maxWAbierto}`
        }`;
    }
    return `whitespace-nowrap overflow-hidden transition-[opacity,max-width] ease-[cubic-bezier(0.22,1,0.36,1)] ${modoCompacto
      ? 'opacity-0 max-w-0 duration-150 delay-0 pointer-events-none'
      : `opacity-100 ${maxWAbierto} duration-200 delay-100`
      }`;
  };

  const clasesColapsoSeccion = (modoCompacto, maxHAbierto = 'max-h-24') => {
    if (prefersReducedMotion) {
      return `overflow-hidden ${modoCompacto ? 'opacity-0 max-h-0 pointer-events-none' : `opacity-100 ${maxHAbierto}`
        }`;
    }
    return `overflow-hidden transition-[opacity,max-height,margin,padding] ease-[cubic-bezier(0.22,1,0.36,1)] ${modoCompacto
      ? 'opacity-0 max-h-0 duration-150 delay-0 pointer-events-none !my-0 !py-0 border-transparent'
      : `opacity-100 ${maxHAbierto} duration-200 delay-100`
      }`;
  };

  const ContenidoSidebar = ({ esMovil = false }) => {
    const modoCompacto = !esMovil && compacta;
    const nombreUsuarioMostrar = usuario?.nombre || 'Mariana Rojas';

    return (
      <div className={`flex flex-col h-full min-h-0 justify-between overflow-hidden ${clasesTema.contenedor}`}>
        {/* 1. CABECERA FIJA + 2. MENÚ DESLIZABLE CON SCROLL FLUIDO */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className={`relative px-3 py-3.5 shrink-0 ${clasesTema.bordeCabecera} flex items-center justify-between`}>
            {/* Logotipo anclado a la izquierda con contenedor fijo w-10 h-10 shrink-0 */}
            <Link
              to="/"
              onClick={() => esMovil && setMenuMovilAbierto(false)}
              title={t('navExt.irInicio')}
              aria-label={`Synodos Pet OS - ${t('nav.inicio')}`}
              className={`flex items-center justify-start shrink-0 group rounded-xl pl-1.5 ${clasesTema.focusRing}`}
            >
              <LogoSynodos size="md" alt="Synodos" />

              {/* Texto de marca siempre renderizado en el DOM; sin padding residual al colapsar */}
              <div
                className={`flex flex-col transition-[opacity,max-width,padding] ease-[cubic-bezier(0.22,1,0.36,1)] ${modoCompacto ? 'pl-0' : 'pl-3'
                  } ${clasesColapsoTexto(modoCompacto, 'max-w-[165px]')}`}
              >
                <span className={`font-serif font-black text-lg tracking-tight flex items-center gap-2 whitespace-nowrap ${clasesTema.textoMarca}`}>
                  Synodos
                  <span className={`text-[10px] uppercase font-sans font-semibold tracking-wider px-1.5 py-0.5 rounded whitespace-nowrap ${clasesTema.badgePetOs}`}>
                    PET OS
                  </span>
                </span>
                <span className={`text-[11px] font-sans tracking-wide whitespace-nowrap ${clasesTema.subtexto}`}>
                  San José &bull; GAM
                </span>
              </div>
            </Link>

            {esMovil && (
              <button
                ref={closeDrawerButtonRef}
                type="button"
                onClick={() => setMenuMovilAbierto(false)}
                className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-xl border transition-colors ${clasesTema.focusRing} ${esClaro
                  ? 'text-slate-700 border-slate-300 hover:bg-slate-100'
                  : 'text-slate-200 border-white/15 hover:text-white hover:bg-white/10'
                  }`}
                aria-label={t('nav.cerrarMenu')}
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* 2. MENÚ DE ENLACES DE NAVEGACIÓN VERTICAL (DOM ESTABLE, ICONOS ANCLADOS) */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden gotox-scrollbar py-2">
            <nav aria-label={t('navExt.navPrincipalAria')} className="px-3 space-y-1">
              {/* Etiqueta NAVEGACIÓN siempre en el DOM */}
              <div className={clasesColapsoSeccion(modoCompacto, 'max-h-7')}>
                <span className={`pl-2.5 text-[10px] font-bold uppercase tracking-wider block mb-1.5 whitespace-nowrap overflow-hidden ${clasesTema.subtexto}`}>
                  {t('navExt.navegacion')}
                </span>
              </div>

              {enlacesNavegacion.map((enlace) => {
                const Icono = enlace.icon;
                const activa = esRutaActiva(enlace.ruta);
                return (
                  <div key={enlace.nombre} className="relative group/nav">
                    <Link
                      to={enlace.ruta}
                      aria-current={activa ? 'page' : undefined}
                      aria-label={enlace.nombre}
                      title={modoCompacto ? enlace.nombre : undefined}
                      onClick={() => esMovil && setMenuMovilAbierto(false)}
                      className={`relative w-full flex items-center justify-start pl-1.5 pr-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap overflow-hidden transition-colors duration-150 group ${clasesTema.focusRing} ${activa ? clasesTema.enlaceActivo : clasesTema.enlaceInactivo
                        }`}
                    >
                      {/* Indicador animado de sección activa */}
                      {activa &&
                        (prefersReducedMotion ? (
                          <span
                            aria-hidden="true"
                            className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full ${clasesTema.indicadorActivo}`}
                          />
                        ) : (
                          <motion.span
                            layoutId={esMovil ? 'sidebar-active-mobile' : 'sidebar-active-desktop'}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            aria-hidden="true"
                            className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full ${clasesTema.indicadorActivo}`}
                          />
                        ))}

                      {/* Contenedor fijo w-10 h-10 shrink-0 para mantener el eje X del icono inmóvil */}
                      <span className="w-10 h-10 shrink-0 flex items-center justify-center">
                        <Icono
                          className={`w-4 h-4 shrink-0 transition-colors ${activa
                            ? clasesTema.iconoActivo
                            : esClaro
                              ? 'text-slate-600 group-hover:text-[#501228]'
                              : esMorado
                                ? 'text-[#D8C3CC] group-hover:text-[#FDF2F6]'
                                : 'text-slate-300 group-hover:text-white'
                            }`}
                          aria-hidden="true"
                        />
                      </span>

                      {/* Texto y badge siempre montados en el DOM */}
                      <div
                        className={`flex items-center justify-between flex-1 min-w-0 ${clasesColapsoTexto(
                          modoCompacto,
                          'max-w-[200px]'
                        )}`}
                      >
                        <span className="whitespace-nowrap truncate pr-2">
                          {enlace.nombre}
                        </span>

                        {enlace.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 whitespace-nowrap ${activa
                              ? esClaro
                                ? 'bg-white/20 text-white'
                                : 'bg-[#F27B91]/25 text-[#FDF2F6] border border-[#F27B91]/40'
                              : esClaro
                                ? 'bg-slate-100 text-slate-700 border border-slate-300'
                                : 'bg-white/10 text-slate-200 border border-white/15'
                              }`}
                          >
                            {enlace.badge}
                          </span>
                        )}
                      </div>
                    </Link>

                    {/* Tooltip accesible en modo compacto */}
                    {modoCompacto && (
                      <span
                        role="tooltip"
                        className={`pointer-events-none opacity-0 group-hover/nav:opacity-100 group-focus-within/nav:opacity-100 transition-opacity duration-150 fixed left-[5.25rem] -translate-y-8 z-50 px-2.5 py-1 rounded-lg border text-[11px] font-semibold whitespace-nowrap shadow-lg ${clasesTema.tooltip}`}
                      >
                        {enlace.nombre}
                      </span>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Mini tarjeta informativa de Red GAM siempre en el DOM */}
            <div className={`mx-3 mt-2.5 ${clasesColapsoSeccion(modoCompacto, 'max-h-24')}`}>
              <div className={`p-2.5 rounded-xl border space-y-0.5 whitespace-nowrap overflow-hidden ${clasesTema.tarjetaRedGam}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold flex items-center gap-1.5 text-[11px] whitespace-nowrap">
                    <Radio className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
                    <span>{t('nav.redGam')}</span>
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                </div>
                <p className={`text-[10px] leading-tight truncate ${clasesTema.subtexto}`}>
                  {t('nav.redGamSub')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. ZONA INFERIOR FIJA: Selector de idioma, tema y Perfil */}
        <div className={`shrink-0 px-3 py-3 space-y-2 ${clasesTema.pieInferior}`}>
          {/* Selector de Idioma */}
          <SelectorIdioma
            variant="sidebar"
            compacto={modoCompacto}
            clasesColapsoTexto={clasesColapsoTexto}
          />

          {/* Selector de Tono de Pantalla */}
          <div className="space-y-1">
            <div className={clasesColapsoSeccion(modoCompacto, 'max-h-6')}>
              <span className={`text-[10px] font-bold uppercase tracking-wider block pl-1.5 whitespace-nowrap overflow-hidden ${clasesTema.subtexto}`}>
                {t('nav.tonoPantalla')}
              </span>
            </div>

            <div
              className={`grid grid-cols-3 gap-1 p-1 border rounded-xl overflow-hidden ${clasesTema.selectorTonoCaja}`}
              role="group"
              aria-label={t('nav.tonoPantalla')}
            >
              <button
                type="button"
                onClick={() => setTema('claro')}
                aria-pressed={tema === 'claro'}
                aria-label={t('nav.claro')}
                title={t('nav.claro')}
                className={`flex items-center justify-center py-1.5 px-1 rounded-lg text-[11px] font-medium whitespace-nowrap overflow-hidden transition-colors ${clasesTema.focusRing} ${tema === 'claro'
                  ? 'bg-amber-100 text-amber-950 border border-amber-400 font-semibold'
                  : `${clasesTema.subtexto} hover:opacity-100`
                  }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                <span className={clasesColapsoTexto(modoCompacto, 'max-w-[60px] pl-1')}>{t('nav.claro')}</span>
              </button>

              <button
                type="button"
                onClick={() => setTema('oscuro')}
                aria-pressed={tema === 'oscuro'}
                aria-label={t('nav.oscuro')}
                title={t('nav.oscuro')}
                className={`flex items-center justify-center py-1.5 px-1 rounded-lg text-[11px] font-medium whitespace-nowrap overflow-hidden transition-colors ${clasesTema.focusRing} ${tema === 'oscuro'
                  ? 'bg-slate-800 text-white font-semibold border border-slate-500'
                  : `${clasesTema.subtexto} hover:opacity-100`
                  }`}
              >
                <Moon className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
                <span className={clasesColapsoTexto(modoCompacto, 'max-w-[60px] pl-1')}>{t('nav.oscuro')}</span>
              </button>

              <button
                type="button"
                onClick={() => setTema('morado')}
                aria-pressed={tema === 'morado'}
                aria-label={t('nav.vino')}
                title={t('nav.vino')}
                className={`flex items-center justify-center py-1.5 px-1 rounded-lg text-[11px] font-medium whitespace-nowrap overflow-hidden transition-colors ${clasesTema.focusRing} ${tema === 'morado'
                  ? 'bg-[#55152D] text-[#FDF2F6] font-semibold border border-[#F27B91]/60'
                  : `${clasesTema.subtexto} hover:opacity-100`
                  }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F27B91] shrink-0" aria-hidden="true" />
                <span className={clasesColapsoTexto(modoCompacto, 'max-w-[60px] pl-1')}>{t('nav.vino')}</span>
              </button>
            </div>
          </div>

          {/* Perfil de Usuario y Acciones con iconos anclados a la izquierda */}
          {isLoggedIn ? (
            <div className="space-y-1.5">
              <Link
                to={esAdmin ? '/panel' : '/usuario'}
                title={modoCompacto ? t('navExt.perfilDe', { nombre: nombreUsuarioMostrar }) : undefined}
                aria-label={t('navExt.perfilDe', { nombre: nombreUsuarioMostrar })}
                onClick={() => esMovil && setMenuMovilAbierto(false)}
                className={`w-full flex items-center justify-start pl-1.5 pr-2 py-1 rounded-xl border whitespace-nowrap overflow-hidden transition-colors group ${clasesTema.tarjetaUsuario} ${clasesTema.focusRing}`}
              >
                <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-[#501228] border border-[#F27B91]/35 text-white flex items-center justify-center font-bold text-xs">
                      {nombreUsuarioMostrar.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 ${esClaro ? 'border-white' : 'border-[#111827]'
                        }`}
                    />
                  </div>
                </div>

                <div
                  className={`flex items-center justify-between flex-1 min-w-0 ${clasesColapsoTexto(
                    modoCompacto,
                    'max-w-[190px]'
                  )}`}
                >
                  <div className="truncate text-left pr-2">
                    <p className="text-xs font-bold truncate whitespace-nowrap">
                      {nombreUsuarioMostrar}
                    </p>
                    <p className={`text-[10px] truncate flex items-center gap-1 whitespace-nowrap ${clasesTema.subtexto}`}>
                      <Shield className={`w-2.5 h-2.5 ${esAdmin ? 'text-[#F27B91]' : 'text-emerald-500'} shrink-0`} aria-hidden="true" />
                      <span>{esAdmin ? t('nav.adminExclusivo') : t('navExt.tutorCertificado')}</span>
                    </p>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${clasesTema.subtexto}`} aria-hidden="true" />
                </div>
              </Link>

              <button
                type="button"
                onClick={handleSolicitarCierre}
                title={modoCompacto ? t('nav.cerrarSesion') : undefined}
                aria-label={t('nav.cerrarSesion')}
                className={`w-full flex items-center justify-start pl-1.5 pr-2.5 py-0.5 rounded-xl text-xs font-semibold border whitespace-nowrap overflow-hidden transition-colors active:scale-[0.98] ${clasesTema.botonCerrarSesion} ${clasesTema.focusRing}`}
              >
                <span className="w-10 h-9 shrink-0 flex items-center justify-center">
                  <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                </span>
                <div
                  className={`flex items-center justify-between flex-1 min-w-0 ${clasesColapsoTexto(
                    modoCompacto,
                    'max-w-[190px]'
                  )}`}
                >
                  <span className="whitespace-nowrap">{t('nav.cerrarSesion')}</span>
                  <span className="text-[10px] opacity-85 font-medium whitespace-nowrap">{t('nav.salir')}</span>
                </div>
              </button>

              {esAdmin ? (
                <Link
                  to="/panel"
                  title={modoCompacto ? t('nav.entrarPanel') : undefined}
                  aria-label={t('nav.entrarPanel')}
                  onClick={() => esMovil && setMenuMovilAbierto(false)}
                  className={`w-full flex items-center justify-start pl-1.5 pr-2.5 py-0.5 rounded-xl text-xs font-bold whitespace-nowrap overflow-hidden transition-colors active:scale-[0.98] ${clasesTema.botonPrincipal} ${clasesTema.focusRing}`}
                >
                  <span className="w-10 h-9 shrink-0 flex items-center justify-center">
                    <Activity className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </span>
                  <span className={clasesColapsoTexto(modoCompacto, 'max-w-[190px]')}>
                    {t('nav.entrarPanel')}
                  </span>
                </Link>
              ) : (
                <Link
                  to="/usuario"
                  title={modoCompacto ? t('nav.entrarMiEspacio') : undefined}
                  aria-label={t('nav.entrarMiEspacio')}
                  onClick={() => esMovil && setMenuMovilAbierto(false)}
                  className={`w-full flex items-center justify-start pl-1.5 pr-2.5 py-0.5 rounded-xl text-xs font-bold whitespace-nowrap overflow-hidden transition-colors active:scale-[0.98] ${clasesTema.botonPrincipal} ${clasesTema.focusRing}`}
                >
                  <span className="w-10 h-9 shrink-0 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                  </span>
                  <span className={clasesColapsoTexto(modoCompacto, 'max-w-[190px]')}>
                    {t('nav.entrarMiEspacio')}
                  </span>
                </Link>
              )}
            </div>
          ) : (
            <Link
              to="/acceso"
              title={modoCompacto ? t('nav.iniciarSesion') : undefined}
              aria-label={t('nav.iniciarSesion')}
              onClick={() => esMovil && setMenuMovilAbierto(false)}
              className={`w-full flex items-center justify-start pl-1.5 pr-2.5 py-0.5 rounded-xl text-xs font-bold whitespace-nowrap overflow-hidden transition-colors active:scale-[0.98] ${clasesTema.botonPrincipal} ${clasesTema.focusRing}`}
            >
              <span className="w-10 h-9 shrink-0 flex items-center justify-center">
                <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
              </span>
              <span className={clasesColapsoTexto(modoCompacto, 'max-w-[190px]')}>
                {t('nav.iniciarSesion')}
              </span>
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <ModalConfirmarCierre
        isOpen={modalConfirmacionAbierto}
        onClose={() => setModalConfirmacionAbierto(false)}
        onConfirmar={handleConfirmarSalida}
        nombreUsuario={usuario?.nombre}
      />

      <AnimacionCierreSesion
        visible={animandoSalida}
        nombreUsuario={usuario?.nombre}
        onCompletado={handleCompletarSalida}
      />

      {/* 1. BARRA SUPERIOR PARA PANTALLAS MÓVILES (< md) */}
      <header
        className={`md:hidden sticky top-0 z-40 w-full h-16 px-4 flex items-center justify-between border-b backdrop-blur-md transition-colors duration-200 ${esClaro
          ? 'bg-white/95 border-slate-200 text-slate-900'
          : esMorado
            ? 'bg-[#140810]/95 border-[#F27B91]/25 text-[#FDF2F6]'
            : 'bg-[#090D14]/95 border-white/15 text-white'
          }`}
      >
        <Link to="/" className={`flex items-center gap-2.5 rounded-lg ${clasesTema.focusRing}`}>
          <LogoSynodos size="sm" alt="Synodos" />
          <span className={`font-serif font-black text-base tracking-tight flex items-center gap-1.5 ${clasesTema.textoMarca}`}>
            Synodos
            <span className={`text-[9px] uppercase font-sans font-semibold tracking-wider px-1 py-0.5 rounded ${clasesTema.badgePetOs}`}>
              PET OS
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={abrirPanelAccesibilidad}
            aria-label={t('nav.accesibilidad')}
            title={t('nav.accesibilidad')}
            className={`p-1.5 rounded-xl border transition-colors ${clasesTema.focusRing} ${esClaro
              ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-100'
              : esMorado
                ? 'bg-[#1F0E19] border-[#F27B91]/35 text-[#FDF2F6] hover:bg-[#55152D]/40'
                : 'bg-[#111827] border-white/20 text-slate-100 hover:bg-slate-800'
              }`}
          >
            <Accessibility className="w-4 h-4 text-[#F27B91]" aria-hidden="true" />
          </button>
          <SelectorIdioma variant="header" />
          {esAdmin ? (
            <Link
              to="/panel"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#501228] border border-[#F27B91]/35 ${clasesTema.focusRing}`}
            >
              <Activity className="w-3.5 h-3.5 text-[#F27B91]" aria-hidden="true" />
              <span className="hidden xs:inline">{t('nav.panelCorto')}</span>
            </Link>
          ) : isLoggedIn ? (
            <Link
              to="/usuario"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-[#501228] border border-[#F27B91]/30"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#F27B91]" />
              <span className="hidden xs:inline">{t('nav.miEspacioCorto')}</span>
            </Link>
          ) : (
            <Link
              to="/acceso"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#501228] border border-[#F27B91]/35 ${clasesTema.focusRing}`}
            >
              <LogIn className="w-3.5 h-3.5 text-[#F27B91]" aria-hidden="true" />
              <span>{t('nav.accesoCorto')}</span>
            </Link>
          )}

          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={menuMovilAbierto}
            onClick={() => setMenuMovilAbierto(true)}
            className={`p-2 rounded-xl border transition-colors ${clasesTema.focusRing} ${esClaro
              ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
              : 'bg-[#111827] border-white/15 text-slate-200 hover:text-white'
              }`}
            aria-label={t('nav.abrirMenu')}
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Drawer móvil deslizable */}
      <AnimatePresence>
        {menuMovilAbierto && (
          <div className="md:hidden fixed inset-0 z-[1300] flex" role="dialog" aria-modal="true" aria-label={t('navExt.menuNavAria')}>
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
              onClick={() => setMenuMovilAbierto(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.aside
              initial={prefersReducedMotion ? false : { x: '-100%' }}
              animate={{ x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { x: '-100%' }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className={`relative w-72 max-w-[85vw] h-full shadow-2xl z-10 overflow-y-auto gotox-scrollbar border-r ${esClaro ? 'border-slate-300' : esMorado ? 'border-[#F27B91]/25' : 'border-white/15'
                }`}
            >
              <ContenidoSidebar esMovil={true} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* 2. SIDEBAR LATERAL CONTRAÍBLE EN DESKTOP (md: y superior) */}
      <aside
        aria-label={t('navExt.barraLateralAria')}
        className={`hidden md:flex fixed inset-y-0 left-0 z-40 shadow-xl flex-col border-r will-change-[width] ${prefersReducedMotion
          ? ''
          : 'transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'
          } ${compacta ? 'w-20' : 'md:w-64 lg:w-72'} ${esClaro ? 'border-slate-200' : esMorado ? 'border-[#F27B91]/20' : 'border-white/15'
          }`}
      >
        {onToggleCompacta && (
          <button
            type="button"
            onClick={onToggleCompacta}
            aria-expanded={!compacta}
            aria-label={compacta ? t('nav.expandirSidebar') : t('nav.contraerSidebar')}
            title={compacta ? t('nav.expandirSidebar') : t('nav.contraerSidebar')}
            className={`absolute top-5 z-50 w-7 h-7 shrink-0 flex items-center justify-center rounded-lg border shadow-md ${prefersReducedMotion
              ? ''
              : 'transition-[right,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'
              } ${compacta ? '-right-3.5' : 'right-3'} ${clasesTema.focusRing} ${esClaro
                ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                : esMorado
                  ? 'bg-[#1F0E19] text-[#FDF2F6] border-[#F27B91]/40 hover:bg-[#55152D]'
                  : 'bg-[#111827] text-slate-200 border-white/20 hover:bg-slate-800 hover:text-white'
              }`}
          >
            {compacta ? (
              <PanelLeftOpen className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        )}
        <ContenidoSidebar esMovil={false} />
      </aside>
    </>
  );
}

export default Sidebar;
