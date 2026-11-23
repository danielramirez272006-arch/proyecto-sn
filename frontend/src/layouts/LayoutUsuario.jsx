import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  ArrowLeft,
  ShieldCheck,
  Menu,
  X,
  Sun,
  Moon,
  Sparkles,
  ChevronRight,
  LogOut,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  Accessibility
} from 'lucide-react';
import { BotonTema } from '../components/BotonTema';
import { AnimacionCierreSesion } from '../components/AnimacionCierreSesion';
import { ModalConfirmarCierre } from '../components/ModalConfirmarCierre';
import { LogoSynodos } from '../components/LogoSynodos';
import { useSesion } from '../hooks/useSesion';
import { useTema } from '../context/TemaContext';
import { useIdioma } from '../context/IdiomaContext';
import { SelectorIdioma } from '../components/SelectorIdioma';
import { EnlaceSaltarContenido } from '../components/EnlaceSaltarContenido';
import { abrirPanelAccesibilidad } from '../shared/components/layout/a11y-floating-dock';

/**
 * Layout dedicado exclusivamente para el Portal de Usuarios (/usuario).
 * Incluye barra lateral contraíble con DOM estable, iconos anclados en eje X y transición fluida.
 */
export function LayoutUsuario({ children, tabs, tabActiva, onTabChange }) {
  const { usuario, cerrarSesion } = useSesion();
  const { tema, setTema, esClaro, esMorado } = useTema();
  const { t } = useIdioma();
  const navigate = useNavigate();

  const [compacta, setCompacta] = useState(() => {
    try {
      return localStorage.getItem('gotox_sidebar_usuario_compacta') === 'true';
    } catch {
      return false;
    }
  });
  const [sidebarMovilAbierto, setSidebarMovilAbierto] = useState(false);
  const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false);
  const [animandoSalida, setAnimandoSalida] = useState(false);

  const toggleCompacta = () => {
    setCompacta((prev) => {
      const nuevo = !prev;
      try {
        localStorage.setItem('gotox_sidebar_usuario_compacta', String(nuevo));
      } catch {}
      return nuevo;
    });
  };

  const handleSolicitarCierre = () => {
    setSidebarMovilAbierto(false);
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

  const clasesColapsoTexto = (modoCompacto, maxWAbierto = 'max-w-[180px]') =>
    `whitespace-nowrap overflow-hidden transition-[opacity,max-width] ease-[cubic-bezier(0.22,1,0.36,1)] ${
      modoCompacto
        ? 'opacity-0 max-w-0 duration-150 delay-0 pointer-events-none'
        : `opacity-100 ${maxWAbierto} duration-200 delay-100`
    }`;

  const clasesColapsoSeccion = (modoCompacto, maxHAbierto = 'max-h-24') =>
    `overflow-hidden transition-[opacity,max-height,margin,padding] ease-[cubic-bezier(0.22,1,0.36,1)] ${
      modoCompacto
        ? 'opacity-0 max-h-0 duration-150 delay-0 pointer-events-none !my-0 !py-0 border-transparent'
        : `opacity-100 ${maxHAbierto} duration-200 delay-100`
    }`;

  const clasesTema = {
    contenedor: esClaro
      ? 'bg-[#FAF9FE] text-[#111827]'
      : esMorado
      ? 'bg-[#0E070C] text-[#FDF2F6]'
      : 'bg-[#090D14] text-[#E8EDF5]',

    sidebar: esClaro
      ? 'bg-white/95 border-slate-200/80 text-slate-800'
      : esMorado
      ? 'bg-[#140810]/95 border-[#F27B91]/15 text-[#FDF2F6]'
      : 'bg-[#0D131F]/95 border-white/10 text-[#E8EDF5]',

    cabeceraBorde: esClaro
      ? 'border-slate-100'
      : esMorado
      ? 'border-[#F27B91]/15'
      : 'border-white/10',

    textoMarca: esClaro
      ? 'text-[#111827]'
      : esMorado
      ? 'text-[#FDF2F6]'
      : 'text-white',

    badgeUsuario: esClaro
      ? 'bg-[#FDF2F4] text-[#501228] border border-[#F9E2E8]'
      : esMorado
      ? 'bg-[#55152D] text-[#F27B91] border border-[#F27B91]/30'
      : 'bg-[#1E293B] text-slate-200 border border-white/15',

    botonInicio: esClaro
      ? 'text-slate-600 bg-slate-50 hover:bg-[#FDF2F4] hover:text-[#501228] border-slate-200/60'
      : esMorado
      ? 'text-[#D8C3CC] bg-[#1F0E19] hover:bg-[#55152D]/30 hover:text-white border-[#F27B91]/20'
      : 'text-slate-300 bg-[#162032] hover:bg-white/10 hover:text-white border-white/10',

    tabInactiva: esClaro
      ? 'text-slate-600 hover:text-[#111827] hover:bg-slate-100/70'
      : esMorado
      ? 'text-[#D8C3CC] hover:text-[#FDF2F6] hover:bg-[#55152D]/25'
      : 'text-slate-400 hover:text-white hover:bg-white/5',

    tabActiva: esClaro
      ? 'bg-[#501228] text-white shadow-sm font-semibold'
      : esMorado
      ? 'bg-[#55152D] text-white font-semibold border border-[#F27B91]/40 shadow-sm shadow-[#55152D]/30'
      : 'bg-[#1E293B] text-white font-semibold border border-white/20 shadow-sm',

    badgeInactiva: esClaro
      ? 'bg-slate-200/80 text-slate-700'
      : esMorado
      ? 'bg-[#55152D]/50 text-[#F27B91] border border-[#F27B91]/20'
      : 'bg-white/10 text-slate-300 border border-white/10',

    tarjetaInfo: esClaro
      ? 'bg-slate-50 border-slate-200/70 text-slate-700'
      : esMorado
      ? 'bg-[#1F0E19] border-[#F27B91]/20 text-[#FDF2F6]'
      : 'bg-[#111827] border-white/10 text-slate-200',

    selectorTonoCaja: esClaro
      ? 'bg-white border-slate-200/80'
      : esMorado
      ? 'bg-[#1F0E19] border-[#F27B91]/20'
      : 'bg-[#111827] border-white/10',

    tarjetaUsuario: esClaro
      ? 'bg-white border-slate-200/70 text-[#111827]'
      : esMorado
      ? 'bg-[#1F0E19] border-[#F27B91]/20 text-[#FDF2F6]'
      : 'bg-[#111827] border-white/10 text-white',

    botonCerrarSesion: esClaro
      ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
      : esMorado
      ? 'text-rose-300 bg-[#2D0E19] hover:bg-[#3D1423] border-rose-800/40'
      : 'text-rose-300 bg-rose-950/30 hover:bg-rose-900/50 border-rose-900/50',

    focusRing:
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F27B91] focus-visible:ring-offset-1'
  };

  const nombreUsuarioMostrar = usuario?.nombre || 'Mariana Rojas';

  return (
    <div className={`usuario-portal min-h-screen flex flex-col md:flex-row transition-colors duration-200 ${clasesTema.contenedor}`}>
      <EnlaceSaltarContenido targetId="contenido-principal" />
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

      {/* ============================================================
          SIDEBAR DESKTOP EXCLUSIVO DE USUARIO (CONTRAÍBLE Y FLUIDO)
          ============================================================ */}
      <aside
        aria-label={t('navExt.barraUsuarioAria')}
        className={`hidden md:flex fixed inset-y-0 left-0 z-40 flex-col justify-between shrink-0 border-r backdrop-blur-md shadow-xl will-change-[width] transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          compacta ? 'w-20' : 'md:w-64 lg:w-72'
        } ${clasesTema.sidebar}`}
      >
        {/* Botón de abrir/cerrar anclado sin superponerse al logo */}
        <button
          type="button"
          onClick={toggleCompacta}
          aria-expanded={!compacta}
          aria-label={compacta ? t('nav.expandirSidebar') : t('nav.contraerSidebar')}
          title={compacta ? t('nav.expandirSidebar') : t('nav.contraerSidebar')}
          className={`absolute top-5 z-50 w-7 h-7 shrink-0 flex items-center justify-center rounded-lg border shadow-md transition-[right,background-color,border-color,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            compacta ? '-right-3.5' : 'right-3'
          } ${clasesTema.focusRing} ${
            esClaro
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

        <div className="flex flex-col h-full min-h-0 justify-between overflow-hidden">
          {/* Cabecera: Logo lleva a Página Principal (/) */}
          <div className={`px-3 py-3.5 border-b flex flex-col gap-2.5 shrink-0 ${clasesTema.cabeceraBorde}`}>
            <Link
              to="/"
              title={t('navExt.irPaginaPrincipalSynodos')}
              className={`flex items-center justify-start pl-1.5 shrink-0 group cursor-pointer rounded-xl ${clasesTema.focusRing}`}
            >
              <LogoSynodos size="md" alt="Synodos" />
              <div
                className={`flex flex-col transition-[opacity,max-width,padding] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  compacta ? 'pl-0' : 'pl-3'
                } ${clasesColapsoTexto(compacta, 'max-w-[165px]')}`}
              >
                <span className={`font-serif font-bold text-base leading-tight flex items-center gap-1.5 whitespace-nowrap ${clasesTema.textoMarca}`}>
                  Synodos
                  <span className={`text-[10px] uppercase font-sans font-semibold tracking-wider px-1.5 py-0.5 rounded whitespace-nowrap ${clasesTema.badgeUsuario}`}>
                    {t('nav.usuarioTag')}
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 font-sans whitespace-nowrap">{t('nav.miEspacioGam')}</span>
              </div>
            </Link>

            <Link
              to="/"
              title={compacta ? t('nav.paginaPrincipal') : undefined}
              className={`w-full flex items-center justify-start pl-1.5 pr-2.5 py-0.5 rounded-xl text-xs font-medium border whitespace-nowrap overflow-hidden transition-colors group ${clasesTema.botonInicio} ${clasesTema.focusRing}`}
            >
              <span className="w-10 h-9 shrink-0 flex items-center justify-center">
                <Home className="w-4 h-4 shrink-0 opacity-75 group-hover:opacity-100" aria-hidden="true" />
              </span>
              <div className={`flex items-center justify-between flex-1 min-w-0 ${clasesColapsoTexto(compacta, 'max-w-[180px]')}`}>
                <span className="whitespace-nowrap">{t('nav.paginaPrincipal')}</span>
                <ArrowLeft className="w-3.5 h-3.5 shrink-0 rotate-180 opacity-70 group-hover:opacity-100" aria-hidden="true" />
              </div>
            </Link>
          </div>

          {/* Navegación exclusiva de funciones de usuario */}
          <div className="flex-1 min-h-0 px-3 py-3 space-y-3 overflow-y-auto overflow-x-hidden gotox-scrollbar">
            <nav aria-label={t('nav.navPersonal')} className="space-y-1">
              <div className={clasesColapsoSeccion(compacta, 'max-h-7')}>
                <span className="pl-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 whitespace-nowrap overflow-hidden">
                  {t('nav.navPersonal')}
                </span>
              </div>

              {tabs &&
                tabs.map((tab) => {
                  const Icono = tab.icon || Compass;
                  const activa = tabActiva === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      aria-current={activa ? 'page' : undefined}
                      title={compacta ? tab.label : undefined}
                      onClick={() => onTabChange && onTabChange(tab.id)}
                      className={`w-full flex items-center justify-start pl-1.5 pr-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap overflow-hidden transition-colors duration-150 group ${
                        activa ? clasesTema.tabActiva : clasesTema.tabInactiva
                      } ${clasesTema.focusRing}`}
                    >
                      <span className="w-10 h-10 shrink-0 flex items-center justify-center">
                        <Icono
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            activa
                              ? esMorado
                                ? 'text-[#F27B91]'
                                : 'text-white'
                              : 'text-slate-400 group-hover:text-[#F27B91]'
                          }`}
                        />
                      </span>

                      <div className={`flex items-center justify-between flex-1 min-w-0 ${clasesColapsoTexto(compacta, 'max-w-[190px]')}`}>
                        <span className="tracking-tight whitespace-nowrap truncate pr-2">{tab.label}</span>
                        {tab.badge !== undefined && tab.badge !== null && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 whitespace-nowrap ${
                              activa ? 'bg-white/20 text-white' : clasesTema.badgeInactiva
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
            </nav>

            <div className={clasesColapsoSeccion(compacta, 'max-h-28')}>
              <div className={`p-3 rounded-2xl border space-y-1 whitespace-nowrap overflow-hidden ${clasesTema.tarjetaInfo}`}>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{t('navExt.cuentaVerificada')}</span>
                </div>
                <p className="text-[10px] opacity-75 leading-tight truncate">
                  {t('nav.sincronizadoSub')}
                </p>
              </div>
            </div>
          </div>

          {/* Pie del Sidebar: Idioma, Tema, Tarjeta Usuario y Cerrar Sesión */}
          <div className={`shrink-0 px-3 py-3 border-t space-y-2 bg-transparent ${clasesTema.cabeceraBorde}`}>
            <SelectorIdioma
              variant="sidebar"
              compacto={compacta}
              clasesColapsoTexto={clasesColapsoTexto}
            />

            <div className="space-y-1">
              <div className={clasesColapsoSeccion(compacta, 'max-h-6')}>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block pl-1.5 whitespace-nowrap overflow-hidden">
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
                  title={t('nav.claro')}
                  className={`flex items-center justify-center py-1.5 px-1 rounded-lg text-[11px] font-medium whitespace-nowrap overflow-hidden transition-colors ${
                    tema === 'claro'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden="true" />
                  <span className={clasesColapsoTexto(compacta, 'max-w-[60px] pl-1')}>{t('nav.claro')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTema('oscuro')}
                  aria-pressed={tema === 'oscuro'}
                  title={t('nav.oscuro')}
                  className={`flex items-center justify-center py-1.5 px-1 rounded-lg text-[11px] font-medium whitespace-nowrap overflow-hidden transition-colors ${
                    tema === 'oscuro'
                      ? 'bg-slate-800 text-white font-semibold border border-white/10'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-blue-400 shrink-0" aria-hidden="true" />
                  <span className={clasesColapsoTexto(compacta, 'max-w-[60px] pl-1')}>{t('nav.oscuro')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTema('morado')}
                  aria-pressed={tema === 'morado'}
                  title={t('nav.vino')}
                  className={`flex items-center justify-center py-1.5 px-1 rounded-lg text-[11px] font-medium whitespace-nowrap overflow-hidden transition-colors ${
                    tema === 'morado'
                      ? 'bg-[#501228] text-white font-semibold border border-[#F27B91]/30'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#f0a6be] shrink-0" aria-hidden="true" />
                  <span className={clasesColapsoTexto(compacta, 'max-w-[60px] pl-1')}>{t('nav.vino')}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                title={compacta ? `Perfil: ${nombreUsuarioMostrar}` : undefined}
                onClick={() => onTabChange && onTabChange('cuenta')}
                className={`w-full flex items-center justify-start pl-1.5 pr-2 py-1 rounded-xl border text-left whitespace-nowrap overflow-hidden transition-colors ${clasesTema.tarjetaUsuario} ${clasesTema.focusRing}`}
              >
                <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-[#501228] text-white flex items-center justify-center font-bold text-xs">
                      {nombreUsuarioMostrar.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-current" />
                  </div>
                </div>
                <div className={`flex items-center justify-between flex-1 min-w-0 ${clasesColapsoTexto(compacta, 'max-w-[185px]')}`}>
                  <div className="truncate pr-2">
                    <p className="text-xs font-bold truncate whitespace-nowrap">{nombreUsuarioMostrar}</p>
                    <p className="text-[10px] text-slate-400 truncate whitespace-nowrap">{t('nav.usuarioSynodos')}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                </div>
              </button>

              <button
                type="button"
                title={compacta ? t('nav.cerrarSesion') : undefined}
                onClick={handleSolicitarCierre}
                className={`btn-cerrar-sesion w-full flex items-center justify-start pl-1.5 pr-2.5 py-0.5 rounded-xl text-xs font-semibold border whitespace-nowrap overflow-hidden transition-colors active:scale-[0.98] ${clasesTema.botonCerrarSesion} ${clasesTema.focusRing}`}
              >
                <span className="w-10 h-9 shrink-0 flex items-center justify-center">
                  <LogOut className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                </span>
                <div className={`flex items-center justify-between flex-1 min-w-0 ${clasesColapsoTexto(compacta, 'max-w-[185px]')}`}>
                  <span className="whitespace-nowrap">{t('nav.cerrarSesion')}</span>
                  <span className="text-[10px] opacity-75 font-medium whitespace-nowrap">{t('nav.salir')}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ============================================================
          BARRA SUPERIOR MÓVIL (Logo lleva a Página Principal /)
          ============================================================ */}
      <header className={`md:hidden sticky top-0 z-40 border-b px-4 py-3 flex items-center justify-between backdrop-blur-md ${clasesTema.sidebar}`}>
        <Link to="/" title={t('navExt.irPaginaPrincipal')} className="flex items-center gap-2">
          <LogoSynodos size="sm" alt="Synodos" />
          <span className={`font-serif font-bold text-sm ${clasesTema.textoMarca}`}>Synodos</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={abrirPanelAccesibilidad}
            aria-label={t('nav.accesibilidad')}
            title={t('nav.accesibilidad')}
            className="p-1.5 rounded-xl border border-current/20 text-[#F27B91] hover:bg-current/5 transition-colors"
          >
            <Accessibility className="w-4 h-4" aria-hidden="true" />
          </button>
          <SelectorIdioma variant="header" />
          <BotonTema conMenu={true} className="w-8 h-8" />
          <button
            type="button"
            onClick={() => setSidebarMovilAbierto(!sidebarMovilAbierto)}
            className="p-2 rounded-xl text-slate-400 hover:text-white border border-current/20"
            aria-label={t('navExt.menuUsuario')}
          >
            {sidebarMovilAbierto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Drawer móvil */}
      {sidebarMovilAbierto && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex">
          <div className={`w-72 h-full p-4 flex flex-col justify-between shadow-2xl border-r ${clasesTema.sidebar}`}>
            <div className="space-y-4">
              <div className={`flex items-center justify-between pb-3 border-b ${clasesTema.cabeceraBorde}`}>
                <Link
                  to="/"
                  onClick={() => setSidebarMovilAbierto(false)}
                  className="flex items-center gap-2"
                >
                  <LogoSynodos size="sm" alt="Synodos" />
                  <span className={`font-serif font-bold text-sm ${clasesTema.textoMarca}`}>Synodos</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setSidebarMovilAbierto(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                {tabs &&
                  tabs.map((tab) => {
                    const Icono = tab.icon || Compass;
                    const activa = tabActiva === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          if (onTabChange) onTabChange(tab.id);
                          setSidebarMovilAbierto(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                          activa ? clasesTema.tabActiva : clasesTema.tabInactiva
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icono className="w-4 h-4" />
                          <span>{tab.label}</span>
                        </div>
                        {tab.badge !== undefined && tab.badge !== null && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${
                              activa ? 'bg-white/20 text-white' : clasesTema.badgeInactiva
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>

              <div className={`pt-3 border-t space-y-2 ${clasesTema.cabeceraBorde}`}>
                <Link
                  to="/"
                  onClick={() => setSidebarMovilAbierto(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs opacity-75 hover:opacity-100 rounded-xl"
                >
                  <Home className="w-4 h-4" />
                  <span>{t('navExt.irAPaginaPrincipal')}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSolicitarCierre}
                  className={`btn-cerrar-sesion w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold border rounded-xl transition-colors ${clasesTema.botonCerrarSesion}`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t('nav.cerrarSesion')}</span>
                </button>
              </div>
            </div>

            <div className={`pt-3 border-t ${clasesTema.cabeceraBorde}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                {t('nav.tonoPantalla')}
              </span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setTema('claro')}
                  className={`py-1 text-center text-xs rounded-lg ${
                    tema === 'claro' ? 'bg-amber-100 text-amber-900 font-bold' : 'text-slate-400'
                  }`}
                >
                  {t('nav.claro')}
                </button>
                <button
                  type="button"
                  onClick={() => setTema('oscuro')}
                  className={`py-1 text-center text-xs rounded-lg ${
                    tema === 'oscuro' ? 'bg-slate-800 text-white font-bold border border-white/20' : 'text-slate-400'
                  }`}
                >
                  {t('nav.oscuro')}
                </button>
                <button
                  type="button"
                  onClick={() => setTema('morado')}
                  className={`py-1 text-center text-xs rounded-lg ${
                    tema === 'morado' ? 'bg-[#501228] text-white font-bold border border-[#F27B91]/30' : 'text-slate-400'
                  }`}
                >
                  {t('nav.vino')}
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setSidebarMovilAbierto(false)} />
        </div>
      )}

      {/* ============================================================
          ÁREA PRINCIPAL DEL USUARIO (SINCRONIZADA CON EL ANCHO DEL ASIDE)
          ============================================================ */}
      <main
        id="contenido-principal"
        tabIndex={-1}
        className={`flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden min-h-screen outline-none transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[padding] ${
          compacta ? 'md:pl-24' : 'md:pl-72 lg:pl-80'
        }`}
      >
        <div className="max-w-[1280px] mx-auto space-y-6">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}

export default LayoutUsuario;
