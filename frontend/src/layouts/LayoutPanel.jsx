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
  const { tema, setTema } = useTema();
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

  return (
    <div className="panel-admin min-h-screen flex flex-col md:flex-row bg-[#FAF9FE] text-[#111827] transition-colors duration-200">
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
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col justify-between shrink-0 border-r border-slate-200/80 bg-white/95 backdrop-blur-md min-h-screen sticky top-0 z-30 shadow-xs">
        {/* Cabecera del Sidebar con Logotipo y Marca */}
        <div className="p-5 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-[#501228] flex items-center justify-center text-white shadow-sm group-hover:bg-[#6E1E3A] transition-colors">
                <Dog className="w-5 h-5 text-[#FDF2F4]" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif font-bold text-base text-[#111827] leading-tight flex items-center gap-1.5">
                  GoToX
                  <span className="text-[10px] uppercase font-sans font-semibold tracking-wider px-1.5 py-0.5 rounded bg-[#FDF2F4] text-[#501228] border border-[#F9E2E8]">
                    Panel
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 font-sans -mt-0.5">Centro de Mando GAM</span>
              </div>
            </Link>
          </div>

          {/* Enlace rápido a la Web Pública */}
          <Link
            to="/"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 bg-slate-50 hover:bg-[#FDF2F4] hover:text-[#501228] border border-slate-200/60 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#501228]" />
              <span>Ver Web Pública</span>
            </div>
            <ArrowLeft className="w-3.5 h-3.5 rotate-180 text-slate-400 group-hover:text-[#501228] transition-transform group-hover:translate-x-0.5" />
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
                      activa
                        ? 'bg-[#501228] text-white shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-[#111827] hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icono
                        className={`w-4 h-4 transition-colors ${
                          activa ? 'text-white' : 'text-slate-400 group-hover:text-[#501228]'
                        }`}
                      />
                      <span className="tracking-tight">{tab.label}</span>
                    </div>
                    {tab.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          activa
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200/80 text-slate-700'
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
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-600" />
                Red GAM Activa
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 gotox-radar-dot" />
            </div>
            <p className="text-[11px] text-slate-500 leading-tight">
              Sincronización en vivo con sensores de pavimento y clima en San José.
            </p>
          </div>
        </div>

        {/* Sección Inferior del Sidebar: Selector de 3 Temas y Perfil */}
        <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/50">
          {/* Selector Segmentado de los 3 Temas */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
              Tono de Pantalla
            </span>
            <div className="grid grid-cols-3 gap-1 p-1 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setTema('claro')}
                title="Modo Claro"
                className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  tema === 'claro'
                    ? 'bg-amber-50 text-amber-900 border border-amber-200/70 font-semibold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
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
                    ? 'bg-slate-800 text-white font-semibold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
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
                    ? 'bg-[#501228] text-white font-semibold shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#f0a6be]" />
                <span>Vino</span>
              </button>
            </div>
          </div>

          {/* Tarjeta del Operador y Cerrar Sesión */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
              <Link to="/perfil" className="flex items-center gap-2.5 min-w-0 group flex-1">
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-[#501228] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs group-hover:bg-[#6E1E3A] transition-colors">
                    {usuario?.nombre?.charAt(0) || 'U'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                </div>
                <div className="truncate text-left">
                  <p className="text-xs font-bold text-[#111827] truncate group-hover:text-[#501228] transition-colors">
                    {usuario?.nombre || 'Mariana Rojas'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 text-emerald-600" />
                    <span>Operador Nivel 1</span>
                  </p>
                </div>
              </Link>
              <Link
                to="/perfil"
                title="Ir a Bóveda Pet"
                className="p-1 rounded-lg text-slate-400 hover:text-[#501228] hover:bg-slate-100 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Botón Cerrar Sesión en Sidebar */}
            <button
              type="button"
              onClick={handleSolicitarCierre}
              className="btn-cerrar-sesion w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50/80 hover:bg-rose-100/90 border border-rose-200/70 transition-all shadow-2xs group active:scale-[0.98]"
              title="Cerrar sesión activa y volver al acceso"
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center group-hover:bg-rose-200 transition-colors">
                  <LogOut className="w-3 h-3 text-rose-600 group-hover:-translate-x-0.5 transition-transform" />
                </div>
                <span>Cerrar Sesión</span>
              </div>
              <span className="text-[10px] text-rose-500 font-medium">Salir</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ============================================================
          BARRA SUPERIOR EN DISPOSITIVOS MÓVILES
          ============================================================ */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#501228] flex items-center justify-center text-white">
            <Dog className="w-4 h-4 text-[#FDF2F4]" />
          </div>
          <div>
            <span className="font-serif font-bold text-sm text-[#111827]">GoToX Panel</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <BotonTema conMenu={true} className="w-8 h-8" />
          <button
            type="button"
            onClick={() => setSidebarMovilAbierto(!sidebarMovilAbierto)}
            className="p-2 rounded-xl text-slate-600 hover:text-[#501228] hover:bg-[#FDF2F4] border border-slate-200/70"
            aria-label="Menú de Navegación del Panel"
          >
            {sidebarMovilAbierto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* DRAWER MÓVIL */}
      {sidebarMovilAbierto && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex">
          <div className="w-72 bg-white h-full p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-serif font-bold text-sm text-[#111827]">Centro de Mando</span>
                <button
                  type="button"
                  onClick={() => setSidebarMovilAbierto(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
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
                          activa
                            ? 'bg-[#501228] text-white shadow-sm font-semibold'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icono className="w-4 h-4" />
                          <span>{tab.label}</span>
                        </div>
                        {tab.badge && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full ${
                              activa ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-2">
                <Link
                  to="/"
                  onClick={() => setSidebarMovilAbierto(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:text-[#501228] rounded-xl hover:bg-slate-50"
                >
                  <Globe className="w-4 h-4" />
                  <span>Volver a Web Pública</span>
                </Link>
                <Link
                  to="/perfil"
                  onClick={() => setSidebarMovilAbierto(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:text-[#501228] rounded-xl hover:bg-slate-50"
                >
                  <User className="w-4 h-4" />
                  <span>Bóveda Pet</span>
                </Link>
                <button
                  type="button"
                  onClick={handleSolicitarCierre}
                  className="btn-cerrar-sesion w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Tema de Interfaz
              </span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setTema('claro')}
                  className={`py-1 text-center text-xs rounded-lg ${
                    tema === 'claro' ? 'bg-amber-100 text-amber-900 font-bold' : 'text-slate-600'
                  }`}
                >
                  Claro
                </button>
                <button
                  type="button"
                  onClick={() => setTema('oscuro')}
                  className={`py-1 text-center text-xs rounded-lg ${
                    tema === 'oscuro' ? 'bg-slate-800 text-white font-bold' : 'text-slate-600'
                  }`}
                >
                  Oscuro
                </button>
                <button
                  type="button"
                  onClick={() => setTema('morado')}
                  className={`py-1 text-center text-xs rounded-lg ${
                    tema === 'morado' ? 'bg-[#501228] text-white font-bold' : 'text-slate-600'
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
