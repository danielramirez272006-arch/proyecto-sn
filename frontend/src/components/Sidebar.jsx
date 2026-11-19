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
  Dog,
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
  Compass,
  Calendar,
  Heart,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useSesion } from '../hooks/useSesion';
import { useTema } from '../context/TemaContext';
import { ModalConfirmarCierre } from './ModalConfirmarCierre';
import { AnimacionCierreSesion } from './AnimacionCierreSesion';

export function Sidebar({ compacta = false, onToggleCompacta }) {
  const location = useLocation();
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const { isLoggedIn, usuario, cerrarSesion } = useSesion();
  const { tema, setTema, esClaro, esMorado } = useTema();

  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false);
  const [animandoSalida, setAnimandoSalida] = useState(false);

  const menuButtonRef = useRef(null);
  const closeDrawerButtonRef = useRef(null);
  const wasMobileOpenRef = useRef(false);

  const enlacesNavegacion = [
    { nombre: 'Inicio', ruta: '/', icon: Home },
    { nombre: 'Explorar', ruta: '/explorar', icon: Compass },
    { nombre: 'Mis Planes', ruta: '/mis-planes', icon: Calendar },
    { nombre: 'Favoritos', ruta: '/favoritos', icon: Heart },
    { nombre: 'Mi Mascota', ruta: '/mi-mascota', icon: Dog },
    { nombre: 'Mapa Interactivo', ruta: '/mapa', icon: Map, badge: 'GAM' },
    { nombre: 'Terrazas Verificadas', ruta: '/terrazas', icon: Coffee },
    { nombre: 'Copiloto Bruno', ruta: '/copiloto', icon: Sparkles },
    { nombre: 'Sobre Nosotros', ruta: '/nosotros', icon: Users },
    ...(isLoggedIn
      ? [{ nombre: 'Bóveda Pet', ruta: '/perfil', icon: ShieldCheck, badge: 'Activo' }]
      : [{ nombre: 'Bóveda Pet', ruta: '/acceso', icon: ShieldCheck }])
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

  const transicionTexto = prefersReducedMotion
    ? ''
    : 'transition-opacity duration-200 ease-out';

  const ContenidoSidebar = ({ esMovil = false }) => {
    const modoCompacto = !esMovil && compacta;

    return (
      <div className={`flex flex-col h-full justify-between ${clasesTema.contenedor}`}>
        {/* 1. CABECERA: Identidad de Marca + Botón Contraer/Expandir */}
        <div>
          <div
            className={`px-3.5 py-4 ${clasesTema.bordeCabecera} flex items-center ${
              modoCompacto ? 'flex-col gap-2.5 justify-center' : 'justify-between gap-2'
            }`}
          >
            <Link
              to="/"
              onClick={() => esMovil && setMenuMovilAbierto(false)}
              title="Ir al inicio de GoToX"
              aria-label="GoToX Pet OS - Inicio"
              className={`flex items-center gap-3 group rounded-xl ${clasesTema.focusRing}`}
            >
              <div className="w-10 h-10 rounded-xl bg-[#501228] border border-[#F27B91]/35 flex items-center justify-center text-white shadow-md shadow-[#501228]/35 group-hover:bg-[#6E1E3A] transition-colors shrink-0">
                <Dog className="w-5 h-5 text-[#FDF2F4]" aria-hidden="true" />
              </div>

              {!modoCompacto && (
                <div className={`flex flex-col whitespace-nowrap overflow-hidden ${transicionTexto}`}>
                  <span className={`font-serif font-black text-lg tracking-tight flex items-center gap-2 ${clasesTema.textoMarca}`}>
                    GoToX
                    <span className={`text-[10px] uppercase font-sans font-semibold tracking-wider px-1.5 py-0.5 rounded ${clasesTema.badgePetOs}`}>
                      PET OS
                    </span>
                  </span>
                  <span className={`text-[11px] font-sans tracking-wide ${clasesTema.subtexto}`}>
                    San José &bull; GAM
                  </span>
                </div>
              )}
            </Link>

            {esMovil ? (
              <button
                ref={closeDrawerButtonRef}
                type="button"
                onClick={() => setMenuMovilAbierto(false)}
                className={`p-2 rounded-xl border transition-colors ${clasesTema.focusRing} ${
                  esClaro
                    ? 'text-slate-700 border-slate-300 hover:bg-slate-100'
                    : 'text-slate-200 border-white/15 hover:text-white hover:bg-white/10'
                }`}
                aria-label="Cerrar menú de navegación"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            ) : (
              onToggleCompacta && (
                <button
                  type="button"
                  onClick={onToggleCompacta}
                  aria-expanded={!modoCompacto}
                  aria-label={modoCompacto ? 'Expandir barra lateral' : 'Contraer barra lateral'}
                  title={modoCompacto ? 'Expandir barra lateral' : 'Contraer barra lateral'}
                  className={`p-2 rounded-xl border transition-colors ${clasesTema.focusRing} ${
                    esClaro
                      ? 'text-slate-700 border-slate-300 hover:bg-slate-100'
                      : esMorado
                      ? 'text-[#FDF2F6] border-[#F27B91]/30 hover:bg-[#55152D]/40'
                      : 'text-slate-200 border-white/15 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {modoCompacto ? (
                    <PanelLeftOpen className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <PanelLeftClose className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              )
            )}
          </div>

          {/* 2. MENÚ DE ENLACES DE NAVEGACIÓN VERTICAL */}
          <nav aria-label="Navegación principal" className="p-2.5 space-y-1">
            {!modoCompacto && (
              <span className={`px-3 text-[10px] font-bold uppercase tracking-wider block mb-2 whitespace-nowrap ${clasesTema.subtexto}`}>
                Navegación
              </span>
            )}
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
                    className={`relative w-full flex items-center ${
                      modoCompacto ? 'justify-center px-2 py-2.5' : 'justify-between px-3.5 py-2.5'
                    } rounded-xl text-xs font-medium transition-colors duration-150 group ${clasesTema.focusRing} ${
                      activa ? clasesTema.enlaceActivo : clasesTema.enlaceInactivo
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
                          transition={{ duration: 0.22, ease: 'easeOut' }}
                          aria-hidden="true"
                          className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full ${clasesTema.indicadorActivo}`}
                        />
                      ))}

                    <div className={`flex items-center ${modoCompacto ? 'justify-center' : 'gap-3 min-w-0'}`}>
                      <Icono
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          activa
                            ? clasesTema.iconoActivo
                            : esClaro
                            ? 'text-slate-600 group-hover:text-[#501228]'
                            : esMorado
                            ? 'text-[#D8C3CC] group-hover:text-[#FDF2F6]'
                            : 'text-slate-300 group-hover:text-white'
                        }`}
                        aria-hidden="true"
                      />
                      {!modoCompacto && (
                        <span className={`whitespace-nowrap truncate ${transicionTexto}`}>
                          {enlace.nombre}
                        </span>
                      )}
                    </div>

                    {!modoCompacto && enlace.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${
                          activa
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

          {/* Mini tarjeta informativa de Red GAM (oculta en modo compacto) */}
          {!modoCompacto && (
            <div className={`mx-3 mt-2 p-3 rounded-xl border space-y-1 ${clasesTema.tarjetaRedGam}`}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold flex items-center gap-1.5 text-[11px]">
                  <Radio className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                  Red GAM Activa
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
              </div>
              <p className={`text-[10px] leading-tight ${clasesTema.subtexto}`}>
                Sensores urbanos y clima en San José.
              </p>
            </div>
          )}
        </div>

        {/* 3. ZONA INFERIOR: Selector de tema y Perfil */}
        <div className={`${modoCompacto ? 'p-2.5' : 'p-3.5'} space-y-3 ${clasesTema.pieInferior}`}>
          {/* Selector de Tono de Pantalla */}
          <div className="space-y-1.5">
            {!modoCompacto && (
              <span className={`text-[10px] font-bold uppercase tracking-wider block px-1 ${clasesTema.subtexto}`}>
                Tono de Pantalla
              </span>
            )}
            <div
              className={`grid ${modoCompacto ? 'grid-cols-1 gap-1' : 'grid-cols-3 gap-1'} p-1 border rounded-xl ${clasesTema.selectorTonoCaja}`}
              role="group"
              aria-label="Selector de tema visual"
            >
              <button
                type="button"
                onClick={() => setTema('claro')}
                aria-pressed={tema === 'claro'}
                aria-label="Tema Claro"
                title="Modo Claro"
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${clasesTema.focusRing} ${
                  tema === 'claro'
                    ? 'bg-amber-100 text-amber-950 border border-amber-400 font-semibold'
                    : `${clasesTema.subtexto} hover:opacity-100`
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                {!modoCompacto && <span>Claro</span>}
              </button>
              <button
                type="button"
                onClick={() => setTema('oscuro')}
                aria-pressed={tema === 'oscuro'}
                aria-label="Tema Oscuro"
                title="Modo Oscuro"
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${clasesTema.focusRing} ${
                  tema === 'oscuro'
                    ? 'bg-slate-800 text-white font-semibold border border-slate-500'
                    : `${clasesTema.subtexto} hover:opacity-100`
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
                {!modoCompacto && <span>Oscuro</span>}
              </button>
              <button
                type="button"
                onClick={() => setTema('morado')}
                aria-pressed={tema === 'morado'}
                aria-label="Tema Vino"
                title="Modo Vino"
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${clasesTema.focusRing} ${
                  tema === 'morado'
                    ? 'bg-[#55152D] text-[#FDF2F6] font-semibold border border-[#F27B91]/60'
                    : `${clasesTema.subtexto} hover:opacity-100`
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F27B91] shrink-0" aria-hidden="true" />
                {!modoCompacto && <span>Vino</span>}
              </button>
            </div>
          </div>

          {/* Perfil de Usuario y Acciones */}
          {isLoggedIn ? (
            <div className="space-y-2">
              <Link
                to="/perfil"
                title={modoCompacto ? `Perfil: ${usuario?.nombre || 'Mariana Rojas'}` : undefined}
                aria-label={`Perfil de ${usuario?.nombre || 'Mariana Rojas'}`}
                onClick={() => esMovil && setMenuMovilAbierto(false)}
                className={`flex items-center ${
                  modoCompacto ? 'justify-center p-2' : 'justify-between p-2.5'
                } rounded-xl border transition-colors group ${clasesTema.tarjetaUsuario} ${clasesTema.focusRing}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-[#501228] border border-[#F27B91]/35 text-white flex items-center justify-center font-bold text-xs">
                      {usuario?.nombre?.charAt(0) || 'M'}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 ${
                        esClaro ? 'border-white' : 'border-[#111827]'
                      }`}
                    />
                  </div>
                  {!modoCompacto && (
                    <div className="truncate text-left">
                      <p className="text-xs font-bold truncate">
                        {usuario?.nombre || 'Mariana Rojas'}
                      </p>
                      <p className={`text-[10px] truncate flex items-center gap-1 ${clasesTema.subtexto}`}>
                        <Shield className="w-2.5 h-2.5 text-emerald-500 shrink-0" aria-hidden="true" />
                        <span>Tutor Certificado</span>
                      </p>
                    </div>
                  )}
                </div>
                {!modoCompacto && (
                  <ChevronRight className={`w-4 h-4 shrink-0 ${clasesTema.subtexto}`} aria-hidden="true" />
                )}
              </Link>

              <button
                type="button"
                onClick={handleSolicitarCierre}
                title={modoCompacto ? 'Cerrar Sesión' : undefined}
                aria-label="Cerrar Sesión"
                className={`w-full flex items-center ${
                  modoCompacto ? 'justify-center p-2' : 'justify-between px-3 py-2'
                } rounded-xl text-xs font-semibold border transition-colors active:scale-[0.98] ${clasesTema.botonCerrarSesion} ${clasesTema.focusRing}`}
              >
                <div className="flex items-center gap-2">
                  <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  {!modoCompacto && <span>Cerrar Sesión</span>}
                </div>
                {!modoCompacto && <span className="text-[10px] opacity-85 font-medium">Salir</span>}
              </button>

              <Link
                to="/panel"
                title={modoCompacto ? 'Entrar al Panel' : undefined}
                aria-label="Entrar al Panel"
                onClick={() => esMovil && setMenuMovilAbierto(false)}
                className={`w-full flex items-center justify-center gap-2 ${
                  modoCompacto ? 'p-2.5' : 'px-3.5 py-2.5'
                } rounded-xl text-xs font-bold transition-colors active:scale-[0.98] ${clasesTema.botonPrincipal} ${clasesTema.focusRing}`}
              >
                <Activity className="w-4 h-4 shrink-0" aria-hidden="true" />
                {!modoCompacto && <span>Entrar al Panel</span>}
              </Link>
            </div>
          ) : (
            <Link
              to="/acceso"
              title={modoCompacto ? 'Iniciar Sesión' : undefined}
              aria-label="Iniciar Sesión"
              onClick={() => esMovil && setMenuMovilAbierto(false)}
              className={`w-full flex items-center justify-center gap-2 ${
                modoCompacto ? 'p-2.5' : 'px-3.5 py-2.5'
              } rounded-xl text-xs font-bold transition-colors active:scale-[0.98] ${clasesTema.botonPrincipal} ${clasesTema.focusRing}`}
            >
              <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
              {!modoCompacto && <span>Iniciar Sesión</span>}
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
        className={`md:hidden sticky top-0 z-40 w-full h-16 px-4 flex items-center justify-between border-b backdrop-blur-md transition-colors duration-200 ${
          esClaro
            ? 'bg-white/95 border-slate-200 text-slate-900'
            : esMorado
            ? 'bg-[#140810]/95 border-[#F27B91]/25 text-[#FDF2F6]'
            : 'bg-[#090D14]/95 border-white/15 text-white'
        }`}
      >
        <Link to="/" className={`flex items-center gap-2.5 rounded-lg ${clasesTema.focusRing}`}>
          <div className="w-8 h-8 rounded-lg bg-[#501228] border border-[#F27B91]/35 flex items-center justify-center text-white">
            <Dog className="w-4 h-4 text-[#FDF2F4]" aria-hidden="true" />
          </div>
          <span className={`font-serif font-black text-base tracking-tight flex items-center gap-1.5 ${clasesTema.textoMarca}`}>
            GoToX
            <span className={`text-[9px] uppercase font-sans font-semibold tracking-wider px-1 py-0.5 rounded ${clasesTema.badgePetOs}`}>
              PET OS
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Link
              to="/panel"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#501228] border border-[#F27B91]/35 ${clasesTema.focusRing}`}
            >
              <Activity className="w-3.5 h-3.5 text-[#F27B91]" aria-hidden="true" />
              <span className="hidden xs:inline">Panel</span>
            </Link>
          ) : (
            <Link
              to="/acceso"
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#501228] border border-[#F27B91]/35 ${clasesTema.focusRing}`}
            >
              <LogIn className="w-3.5 h-3.5 text-[#F27B91]" aria-hidden="true" />
              <span>Acceso</span>
            </Link>
          )}

          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={menuMovilAbierto}
            onClick={() => setMenuMovilAbierto(true)}
            className={`p-2 rounded-xl border transition-colors ${clasesTema.focusRing} ${
              esClaro
                ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                : 'bg-[#111827] border-white/15 text-slate-200 hover:text-white'
            }`}
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Drawer móvil deslizable */}
      <AnimatePresence>
        {menuMovilAbierto && (
          <div className="md:hidden fixed inset-0 z-[1300] flex" role="dialog" aria-modal="true" aria-label="Menú de navegación">
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
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.24, ease: [0.25, 0.1, 0.25, 1] }}
              className={`relative w-72 max-w-[85vw] h-full shadow-2xl z-10 overflow-y-auto gotox-scrollbar border-r ${
                esClaro ? 'border-slate-300' : esMorado ? 'border-[#F27B91]/25' : 'border-white/15'
              }`}
            >
              <ContenidoSidebar esMovil={true} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* 2. SIDEBAR LATERAL CONTRAÍBLE EN DESKTOP (md: y superior) */}
      <aside
        aria-label="Barra lateral de navegación"
        className={`hidden md:flex fixed inset-y-0 left-0 z-40 shadow-xl overflow-y-auto overflow-x-hidden gotox-scrollbar flex-col border-r ${
          prefersReducedMotion ? '' : 'transition-[width] duration-[250ms] ease-out'
        } ${compacta ? 'w-20' : 'md:w-64 lg:w-72'} ${
          esClaro ? 'border-slate-200' : esMorado ? 'border-[#F27B91]/20' : 'border-white/15'
        }`}
      >
        <ContenidoSidebar esMovil={false} />
      </aside>
    </>
  );
}

export default Sidebar;
