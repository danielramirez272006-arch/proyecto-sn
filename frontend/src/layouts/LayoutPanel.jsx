import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import {
  Dog,
  ArrowLeft,
  Shield,
  Bell,
  User,
  ExternalLink,
  Activity,
  Menu,
  X,
  Globe,
  Radio,
  Sliders,
  Sun,
  Moon,
  Sparkles,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { BotonTema } from '../components/BotonTema';
import { AnimacionCierreSesion } from '../components/AnimacionCierreSesion';
import { ModalConfirmarCierre } from '../components/ModalConfirmarCierre';
import { useSesion } from '../hooks/useSesion';
import { useTema } from '../context/TemaContext';

export function LayoutPanel({ children, tabs, tabActiva, onTabChange }) {
  const { usuario, isLoggedIn, cerrarSesion } = useSesion();
  const { tema, setTema, esClaro, esMorado, esOscuro } = useTema();
  const navigate = useNavigate();
  const [sidebarMovilAbierto, setSidebarMovilAbierto] = useState(false);
  const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false);
  const [animandoSalida, setAnimandoSalida] = useState(false);

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

    badgePanel: esClaro
      ? 'bg-[#FDF2F4] text-[#501228] border border-[#F9E2E8]'
      : esMorado
      ? 'bg-[#55152D] text-[#F27B91] border border-[#F27B91]/30'
      : 'bg-[#1E293B] text-slate-200 border border-white/15',

    botonWebPublica: esClaro
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

    tarjetaRedGam: esClaro
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
  };

  return (
    <div className={`panel-admin min-h-screen flex flex-col md:flex-row transition-colors duration-200 ${clasesTema.contenedor}`}>
      {/* Modal de confirmación y advertencia */}
      <ModalConfirmarCierre
        isOpen={modalConfirmacionAbierto}
        onClose={() => setModalConfirmacionAbierto(false)}
        onConfirmar={handleConfirmarSalida}
        nombreUsuario={usuario?.nombre}
      />

      {/* Animación de cierre de sesión hacia /acceso */}
      <AnimacionCierreSesion
        visible={animandoSalida}
        nombreUsuario={usuario?.nombre}
        onCompletado={handleCompletarSalida}
      />
      {/* ============================================================
          SIDEBAR DESKTOP & TABLET (Lateral Izquierdo)
          ============================================================ */}
      <aside className={`hidden md:flex md:w-64 lg:w-72 flex-col justify-between shrink-0 border-r backdrop-blur-md min-h-screen sticky top-0 z-30 shadow-xs transition-colors ${clasesTema.sidebar}`}>
        {/* Cabecera del Sidebar con Logotipo y Marca */}
        <div className={`p-5 border-b flex flex-col gap-4 ${clasesTema.cabeceraBorde}`}>
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-[#501228] flex items-center justify-center text-white shadow-sm group-hover:bg-[#6E1E3A] transition-colors">
                <Dog className="w-5 h-5 text-[#FDF2F4]" />
              </div>
              <div className="flex flex-col">
                <span className={`font-serif font-bold text-base leading-tight flex items-center gap-1.5 ${clasesTema.textoMarca}`}>
                  GoToX
                  <span className={`text-[10px] uppercase font-sans font-semibold tracking-wider px-1.5 py-0.5 rounded ${clasesTema.badgePanel}`}>
                    Panel
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 font-sans -mt-0.5">Centro de Mando GAM</span>
              </div>
            </Link>
          </div>

          {/* Enlace rápido a la Web Pública */}
          <Link
            to="/"
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium border transition-colors group ${clasesTema.botonWebPublica}`}
          >
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100" />
              <span>Ver Web Pública</span>
            </div>
            <ArrowLeft className="w-3.5 h-3.5 rotate-180 opacity-70 group-hover:opacity-100 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Navegación Principal con Iconos Bonitos y Badges */}
        <div className="flex-1 p-4 space-y-6 overflow-y-auto gotox-scrollbar">
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Módulos de Gestión
            </span>
            {tabs &&
              tabs.map((tab) => {
                const Icono = tab.icon || Activity;
                const activa = tabActiva === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange && onTabChange(tab.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                      activa ? clasesTema.tabActiva : clasesTema.tabInactiva
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icono
                        className={`w-4 h-4 transition-colors ${
                          activa ? 'text-white' : 'opacity-70 group-hover:opacity-100'
                        }`}
                      />
                      <span className="tracking-tight">{tab.label}</span>
                    </div>
                    {tab.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          activa
                            ? 'bg-white/20 text-white'
                            : clasesTema.badgeInactiva
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>

          {/* Tarjeta de Telemetría Urbana Operativa */}
          <div className={`p-3.5 rounded-2xl border space-y-2 ${clasesTema.tarjetaRedGam}`}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-500" />
                Red GAM Activa
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 gotox-radar-dot" />
            </div>
            <p className="text-[11px] opacity-75 leading-tight">
              Sincronización en vivo con sensores de pavimento y clima en San José.
            </p>
          </div>
        </div>

        {/* Sección Inferior del Sidebar: Selector de 3 Temas y Perfil */}
        <div className={`panel-sidebar-pie p-4 border-t space-y-3 bg-transparent ${clasesTema.cabeceraBorde}`}>
          {/* Selector Segmentado de los 3 Temas */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
              Tono de Pantalla
            </span>
            <div className={`grid grid-cols-3 gap-1 p-1 border rounded-xl shadow-2xs ${clasesTema.selectorTonoCaja}`}>
              <button
                type="button"
                onClick={() => setTema('claro')}
                title="Modo Claro"
                className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  tema === 'claro'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-semibold shadow-2xs'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Sun className="w-3 h-3 text-amber-500" />
                <span>Claro</span>
              </button>
              <button
                type="button"
                onClick={() => setTema('oscuro')}
                title="Modo Oscuro Puro Neutro"
                className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  tema === 'oscuro'
                    ? 'bg-slate-800 text-white font-semibold shadow-2xs border border-white/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-3 h-3 text-blue-400" />
                <span>Oscuro</span>
              </button>
              <button
                type="button"
                onClick={() => setTema('morado')}
                title="Modo Morado Vino Marca"
                className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  tema === 'morado'
                    ? 'bg-[#501228] text-white font-semibold shadow-2xs border border-[#F27B91]/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#f0a6be]" />
                <span>Vino</span>
              </button>
            </div>
          </div>

          {/* Tarjeta del Operador y Cerrar Sesión */}
          <div className="space-y-2">
            <div className={`flex items-center justify-between p-2.5 rounded-xl border shadow-2xs ${clasesTema.tarjetaUsuario}`}>
              <Link to="/usuario?tab=cuenta" className="flex items-center gap-2.5 min-w-0 group flex-1">
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-[#501228] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs group-hover:bg-[#6E1E3A] transition-colors">
                    {usuario?.nombre?.charAt(0) || 'U'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-current" />
                </div>
                <div className="truncate text-left">
                  <p className="text-xs font-bold truncate group-hover:text-[#F27B91] transition-colors">
                    {usuario?.nombre || 'Administrador'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 text-emerald-500" />
                    <span>Administrador Exclusivo</span>
                  </p>
                </div>
              </Link>
              <Link
                to="/usuario?tab=cuenta"
                title="Ir a Mi Cuenta"
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Botón Cerrar Sesión en Sidebar */}
            <button
              type="button"
              onClick={handleSolicitarCierre}
              className={`btn-cerrar-sesion w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all shadow-2xs group active:scale-[0.98] ${clasesTema.botonCerrarSesion}`}
              title="Cerrar sesión activa y volver al acceso"
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                <span>Cerrar Sesión</span>
              </div>
              <span className="text-[10px] opacity-75 font-medium">Salir</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================
          BARRA SUPERIOR EN DISPOSITIVOS MÓVILES
          ============================================================ */}
      <header className={`md:hidden sticky top-0 z-40 border-b px-4 py-3 flex items-center justify-between backdrop-blur-md ${clasesTema.sidebar}`}>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#501228] flex items-center justify-center text-white">
            <Dog className="w-4 h-4 text-[#FDF2F4]" />
          </div>
          <div>
            <span className={`font-serif font-bold text-sm ${clasesTema.textoMarca}`}>GoToX Panel</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <BotonTema conMenu={true} className="w-8 h-8" />
          <button
            type="button"
            onClick={() => setSidebarMovilAbierto(!sidebarMovilAbierto)}
            className="p-2 rounded-xl text-slate-400 hover:text-white border border-current/20"
            aria-label="Menú de Navegación del Panel"
          >
            {sidebarMovilAbierto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* DRAWER MÓVIL */}
      {sidebarMovilAbierto && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex">
          <div className={`w-72 h-full p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200 border-r ${clasesTema.sidebar}`}>
            <div className="space-y-4">
              <div className={`flex items-center justify-between pb-3 border-b ${clasesTema.cabeceraBorde}`}>
                <span className={`font-serif font-bold text-sm ${clasesTema.textoMarca}`}>Centro de Mando</span>
                <button
                  type="button"
                  onClick={() => setSidebarMovilAbierto(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs en Móvil */}
              <div className="space-y-1">
                {tabs &&
                  tabs.map((tab) => {
                    const Icono = tab.icon || Activity;
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
                        {tab.badge && (
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
                  <Globe className="w-4 h-4" />
                  <span>Volver a Web Pública</span>
                </Link>
                <Link
                  to="/usuario?tab=cuenta"
                  onClick={() => setSidebarMovilAbierto(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs opacity-75 hover:opacity-100 rounded-xl"
                >
                  <User className="w-4 h-4" />
                  <span>Bóveda Pet</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSolicitarCierre}
                  className={`btn-cerrar-sesion w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold border rounded-xl transition-colors ${clasesTema.botonCerrarSesion}`}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>

            <div className={`pt-3 border-t ${clasesTema.cabeceraBorde}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Tema de Interfaz
              </span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setTema('claro')}
                  className={`py-1 text-center text-xs rounded-lg transition-colors ${
                    tema === 'claro' ? 'bg-amber-100 text-amber-900 font-bold' : 'text-slate-400'
                  }`}
                >
                  Claro
                </button>
                <button
                  type="button"
                  onClick={() => setTema('oscuro')}
                  className={`py-1 text-center text-xs rounded-lg transition-colors ${
                    tema === 'oscuro' ? 'bg-slate-800 text-white font-bold border border-white/20' : 'text-slate-400'
                  }`}
                >
                  Oscuro
                </button>
                <button
                  type="button"
                  onClick={() => setTema('morado')}
                  className={`py-1 text-center text-xs rounded-lg transition-colors ${
                    tema === 'morado' ? 'bg-[#501228] text-white font-bold border border-[#F27B91]/30' : 'text-slate-400'
                  }`}
                >
                  Vino
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1" onClick={() => setSidebarMovilAbierto(false)} />
        </div>
      )}

      {/* ============================================================
          ÁREA PRINCIPAL DE CONTENIDO
          ============================================================ */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden min-h-screen">
        <div className="max-w-[1280px] mx-auto space-y-6">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}
