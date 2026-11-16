import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
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
  Shield
} from 'lucide-react';
import { useSesion } from '../hooks/useSesion';
import { useTema } from '../context/TemaContext';
import { ModalConfirmarCierre } from './ModalConfirmarCierre';
import { AnimacionCierreSesion } from './AnimacionCierreSesion';

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, usuario, cerrarSesion } = useSesion();
  const { tema, setTema } = useTema();

  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);
  const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false);
  const [animandoSalida, setAnimandoSalida] = useState(false);

  const enlacesNavegacion = [
    { nombre: 'Inicio', ruta: '/', icon: Home },
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

  // Contenido reutilizable del menú (usado en desktop fixed y drawer móvil)
  const ContenidoSidebar = ({ esMovil = false }) => (
    <div className="flex flex-col h-full justify-between bg-[#0D131F] text-[#E8EDF5]">
      {/* 1. CABECERA: Identidad de Marca */}
      <div>
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <Link
            to="/"
            onClick={() => esMovil && setMenuMovilAbierto(false)}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#501228] border border-[#F27B91]/30 flex items-center justify-center text-white shadow-md shadow-[#501228]/40 group-hover:bg-[#6E1E3A] group-hover:border-[#F27B91]/60 transition-all duration-200">
              <Dog className="w-5 h-5 text-[#FDF2F4]" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-black text-lg text-white tracking-tight flex items-center gap-2">
                GoToX
                <span className="text-[10px] uppercase font-sans font-semibold tracking-wider px-1.5 py-0.5 rounded bg-[#55152D] text-[#F27B91] border border-[#F27B91]/30">
                  PET OS
                </span>
              </span>
              <span className="text-[11px] text-slate-400 font-sans tracking-wide">
                San José • GAM
              </span>
            </div>
          </Link>

          {esMovil && (
            <button
              type="button"
              onClick={() => setMenuMovilAbierto(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 2. MENÚ DE ENLACES DE NAVEGACIÓN VERTICAL */}
        <nav className="p-3.5 space-y-1">
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
            Navegación
          </span>
          {enlacesNavegacion.map((enlace) => {
            const Icono = enlace.icon;
            const activa = esRutaActiva(enlace.ruta);
            return (
              <Link
                key={enlace.nombre}
                to={enlace.ruta}
                onClick={() => esMovil && setMenuMovilAbierto(false)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group ${
                  activa
                    ? 'bg-[#55152D] text-white font-semibold border border-[#F27B91]/40 shadow-sm shadow-[#55152D]/30'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icono
                    className={`w-4 h-4 transition-colors ${
                      activa ? 'text-[#F27B91]' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span>{enlace.nombre}</span>
                </div>
                {enlace.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                      activa
                        ? 'bg-[#F27B91]/20 text-[#F27B91] border border-[#F27B91]/40'
                        : 'bg-white/5 text-slate-400 border border-white/10'
                    }`}
                  >
                    {enlace.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Mini tarjeta informativa de Red GAM */}
        <div className="mx-3.5 mt-2 p-3 rounded-xl bg-[#111827] border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5 text-[11px]">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              Red GAM Activa
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Sincronización en vivo con sensores de pavimento y clima en San José.
          </p>
        </div>
      </div>

      {/* 3. ZONA INFERIOR / ACCIONES DE USUARIO */}
      <div className="p-4 border-t border-white/10 space-y-3 bg-[#090D14]/80 backdrop-blur-sm">
        {/* Selector de Tono de Pantalla */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
            Tono de Pantalla
          </span>
          <div className="grid grid-cols-3 gap-1 p-1 bg-[#111827] border border-white/10 rounded-xl">
            <button
              type="button"
              onClick={() => setTema('claro')}
              title="Modo Claro"
              className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-all ${
                tema === 'claro'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sun className="w-3 h-3 text-amber-400" />
              <span>Claro</span>
            </button>
            <button
              type="button"
              onClick={() => setTema('oscuro')}
              title="Modo Oscuro Puro"
              className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-all ${
                tema === 'oscuro'
                  ? 'bg-slate-800 text-white font-semibold border border-white/20 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Moon className="w-3 h-3 text-blue-400" />
              <span>Oscuro</span>
            </button>
            <button
              type="button"
              onClick={() => setTema('morado')}
              title="Modo Vino de GoToX"
              className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-all ${
                tema === 'morado'
                  ? 'bg-[#55152D] text-[#F27B91] font-semibold border border-[#F27B91]/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#F27B91]" />
              <span>Vino</span>
            </button>
          </div>
        </div>

        {/* Perfil de Usuario y Acciones */}
        {isLoggedIn ? (
          <div className="space-y-2">
            {/* Tarjeta de Mariana / Usuario */}
            <Link
              to="/perfil"
              onClick={() => esMovil && setMenuMovilAbierto(false)}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#111827] border border-white/10 hover:border-[#F27B91]/40 transition-all group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-[#501228] border border-[#F27B91]/30 text-white flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#6E1E3A] transition-colors">
                    {usuario?.nombre?.charAt(0) || 'M'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#111827]" />
                </div>
                <div className="truncate text-left">
                  <p className="text-xs font-bold text-white truncate group-hover:text-[#F27B91] transition-colors">
                    {usuario?.nombre || 'Mariana Rojas'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Tutor Certificado</span>
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#F27B91] group-hover:translate-x-0.5 transition-all" />
            </Link>

            {/* Botón Salir / Cerrar Sesión */}
            <button
              type="button"
              onClick={handleSolicitarCierre}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-3.5 h-3.5 text-rose-400 transition-transform group-hover:-translate-x-0.5" />
                <span>Cerrar Sesión</span>
              </div>
              <span className="text-[10px] text-rose-400/80 font-medium">Salir</span>
            </button>

            {/* Botón Principal Destacado: Entrar al Panel (solo con sesión activa) */}
            <Link
              to="/panel"
              onClick={() => esMovil && setMenuMovilAbierto(false)}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#501228] to-[#6E1E3A] hover:from-[#651733] hover:to-[#822345] border border-[#F27B91]/40 shadow-md shadow-[#501228]/30 transition-all active:scale-[0.98]"
            >
              <Activity className="w-4 h-4 text-[#F27B91]" />
              <span>Entrar al Panel</span>
            </Link>
          </div>
        ) : (
          /* Estado Sesión Cerrada: Botón Iniciar Sesión (NO muestra Entrar al Panel) */
          <Link
            to="/acceso"
            onClick={() => esMovil && setMenuMovilAbierto(false)}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#501228] to-[#6E1E3A] hover:from-[#651733] hover:to-[#822345] border border-[#F27B91]/40 shadow-md shadow-[#501228]/30 transition-all active:scale-[0.98]"
          >
            <LogIn className="w-4 h-4 text-[#F27B91]" />
            <span>Iniciar Sesión</span>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Modales globales de cierre de sesión */}
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
          1. BARRA SUPERIOR PARA PANTALLAS MÓVILES (< md)
          ============================================================ */}
      <header className="md:hidden sticky top-0 z-40 w-full h-16 bg-[#090D14]/95 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#501228] border border-[#F27B91]/30 flex items-center justify-center text-white">
            <Dog className="w-4 h-4 text-[#FDF2F4]" />
          </div>
          <span className="font-serif font-black text-base text-white tracking-tight flex items-center gap-1.5">
            GoToX
            <span className="text-[9px] uppercase font-sans font-semibold tracking-wider px-1 py-0.5 rounded bg-[#55152D] text-[#F27B91] border border-[#F27B91]/30">
              PET OS
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Link
              to="/panel"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-[#501228] border border-[#F27B91]/30"
            >
              <Activity className="w-3.5 h-3.5 text-[#F27B91]" />
              <span className="hidden xs:inline">Panel</span>
            </Link>
          ) : (
            <Link
              to="/acceso"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-[#501228] border border-[#F27B91]/30"
            >
              <LogIn className="w-3.5 h-3.5 text-[#F27B91]" />
              <span>Acceso</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMenuMovilAbierto(true)}
            className="p-2 rounded-xl bg-[#111827] border border-white/10 text-slate-300 hover:text-white"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Drawer móvil con animación */}
      <AnimatePresence>
        {menuMovilAbierto && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Fondo oscuro con desenfoque */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuMovilAbierto(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Panel lateral deslizable */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 overflow-y-auto gotox-scrollbar"
            >
              <ContenidoSidebar esMovil={true} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================
          2. SIDEBAR LATERAL FIJO EN DESKTOP (md: y superior)
          ============================================================ */}
      <aside className="hidden md:flex md:w-64 lg:w-72 fixed inset-y-0 left-0 z-40 border-r border-white/10 shadow-xl overflow-y-auto gotox-scrollbar flex-col">
        <ContenidoSidebar esMovil={false} />
      </aside>
    </>
  );
}

export default Sidebar;
