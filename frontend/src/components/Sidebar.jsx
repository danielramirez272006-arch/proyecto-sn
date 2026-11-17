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
  const { isLoggedIn, esAdmin, usuario, cerrarSesion } = useSesion();
  const { tema, setTema, esClaro, esMorado, esOscuro } = useTema();

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
      ? [{ nombre: 'Bóveda Pet', ruta: '/usuario', icon: ShieldCheck, badge: 'Activo' }]
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

  // Clases dinámicas por tema
  const clasesTema = {
    contenedor: esClaro
      ? 'bg-white text-slate-800'
      : esMorado
      ? 'bg-[#140810] text-[#FDF2F6]'
      : 'bg-[#0D131F] text-[#E8EDF5]',

    bordeCabecera: esClaro
      ? 'border-b border-slate-100'
      : esMorado
      ? 'border-b border-[#F27B91]/15'
      : 'border-b border-white/10',

    textoMarca: esClaro
      ? 'text-[#111827]'
      : esMorado
      ? 'text-[#FDF2F6]'
      : 'text-white',

    badgePetOs: esClaro
      ? 'bg-[#FDF2F4] text-[#501228] border border-[#F9E2E8]'
      : esMorado
      ? 'bg-[#55152D] text-[#F27B91] border border-[#F27B91]/30'
      : 'bg-[#1E293B] text-slate-200 border border-white/15',

    subtexto: esClaro ? 'text-slate-500' : 'text-slate-400',

    enlaceInactivo: esClaro
      ? 'text-slate-600 hover:text-[#501228] hover:bg-[#FDF2F4]'
      : esMorado
      ? 'text-[#D8C3CC] hover:text-[#FDF2F6] hover:bg-[#55152D]/25'
      : 'text-slate-300 hover:text-white hover:bg-white/5',

    enlaceActivo: esClaro
      ? 'bg-[#501228] text-white font-semibold shadow-sm'
      : esMorado
      ? 'bg-[#55152D] text-white font-semibold border border-[#F27B91]/40 shadow-sm shadow-[#55152D]/30'
      : 'bg-[#1E293B] text-white font-semibold border border-white/20 shadow-sm',

    iconoActivo: esClaro ? 'text-white' : esMorado ? 'text-[#F27B91]' : 'text-white',

    tarjetaRedGam: esClaro
      ? 'bg-slate-50 border-slate-200/80 text-slate-700'
      : esMorado
      ? 'bg-[#1F0E19] border-[#F27B91]/20 text-[#FDF2F6]'
      : 'bg-[#111827] border-white/10 text-slate-200',

    pieInferior: esClaro
      ? 'bg-slate-50/70 border-t border-slate-200/80'
      : esMorado
      ? 'bg-[#0E060B]/90 border-t border-[#F27B91]/15 backdrop-blur-sm'
      : 'bg-[#090D14]/90 border-t border-white/10 backdrop-blur-sm',

    selectorTonoCaja: esClaro
      ? 'bg-white border-slate-200/80'
      : esMorado
      ? 'bg-[#1F0E19] border-[#F27B91]/20'
      : 'bg-[#111827] border-white/10',

    tarjetaUsuario: esClaro
      ? 'bg-white border-slate-200/80 text-slate-800 hover:border-[#501228]/30'
      : esMorado
      ? 'bg-[#1F0E19] border-[#F27B91]/20 text-[#FDF2F6] hover:border-[#F27B91]/40'
      : 'bg-[#111827] border-white/10 text-white hover:border-white/20',

    botonCerrarSesion: esClaro
      ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
      : esMorado
      ? 'text-rose-300 bg-[#2D0E19] hover:bg-[#3D1423] border-rose-800/40'
      : 'text-rose-300 bg-rose-950/30 hover:bg-rose-900/50 border-rose-900/50',

    botonPrincipal: esClaro
      ? 'bg-[#501228] hover:bg-[#6E1E3A] text-white shadow-sm'
      : esMorado
      ? 'bg-gradient-to-r from-[#501228] to-[#6E1E3A] hover:from-[#651733] hover:to-[#822345] text-white border border-[#F27B91]/40 shadow-md shadow-[#501228]/30'
      : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/20 shadow-md'
  };

  // Contenido reutilizable del menú (usado en desktop fixed y drawer móvil)
  const ContenidoSidebar = ({ esMovil = false }) => (
    <div className={`flex flex-col h-full justify-between transition-colors duration-200 ${clasesTema.contenedor}`}>
      {/* 1. CABECERA: Identidad de Marca */}
      <div>
        <div className={`p-5 ${clasesTema.bordeCabecera} flex items-center justify-between`}>
          <Link
            to="/"
            onClick={() => esMovil && setMenuMovilAbierto(false)}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#501228] border border-[#F27B91]/30 flex items-center justify-center text-white shadow-md shadow-[#501228]/40 group-hover:bg-[#6E1E3A] transition-all duration-200">
              <Dog className="w-5 h-5 text-[#FDF2F4]" />
            </div>
            <div className="flex flex-col">
              <span className={`font-serif font-black text-lg tracking-tight flex items-center gap-2 ${clasesTema.textoMarca}`}>
                GoToX
                <span className={`text-[10px] uppercase font-sans font-semibold tracking-wider px-1.5 py-0.5 rounded ${clasesTema.badgePetOs}`}>
                  PET OS
                </span>
              </span>
              <span className={`text-[11px] font-sans tracking-wide ${clasesTema.subtexto}`}>
                San José • GAM
              </span>
            </div>
          </Link>

          {esMovil && (
            <button
              type="button"
              onClick={() => setMenuMovilAbierto(false)}
              className={`p-1.5 rounded-lg transition-colors ${
                esClaro ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 2. MENÚ DE ENLACES DE NAVEGACIÓN VERTICAL */}
        <nav className="p-3.5 space-y-1">
          <span className={`px-3 text-[10px] font-bold uppercase tracking-wider block mb-2 ${clasesTema.subtexto}`}>
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
                  activa ? clasesTema.enlaceActivo : clasesTema.enlaceInactivo
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icono
                    className={`w-4 h-4 transition-colors ${
                      activa ? clasesTema.iconoActivo : esClaro ? 'text-slate-400 group-hover:text-[#501228]' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span>{enlace.nombre}</span>
                </div>
                {enlace.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                      activa
                        ? esClaro
                          ? 'bg-white/20 text-white'
                          : 'bg-[#F27B91]/20 text-[#F27B91] border border-[#F27B91]/40'
                        : esClaro
                        ? 'bg-slate-100 text-slate-600 border border-slate-200'
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
        <div className={`mx-3.5 mt-2 p-3 rounded-xl border space-y-1.5 ${clasesTema.tarjetaRedGam}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-1.5 text-[11px]">
              <Radio className="w-3.5 h-3.5 text-emerald-500" />
              Red GAM Activa
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className={`text-[10px] leading-tight ${clasesTema.subtexto}`}>
            Sincronización en vivo con sensores de pavimento y clima en San José.
          </p>
        </div>
      </div>

      {/* 3. ZONA INFERIOR / ACCIONES DE USUARIO */}
      <div className={`p-4 space-y-3 ${clasesTema.pieInferior}`}>
        {/* Selector de Tono de Pantalla */}
        <div className="space-y-1.5">
          <span className={`text-[10px] font-bold uppercase tracking-wider block px-1 ${clasesTema.subtexto}`}>
            Tono de Pantalla
          </span>
          <div className={`grid grid-cols-3 gap-1 p-1 border rounded-xl ${clasesTema.selectorTonoCaja}`}>
            <button
              type="button"
              onClick={() => setTema('claro')}
              title="Modo Claro"
              className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-medium transition-all ${
                tema === 'claro'
                  ? 'bg-amber-50 text-amber-900 border border-amber-300 font-semibold shadow-xs'
                  : clasesTema.subtexto + ' hover:opacity-100'
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
                  ? 'bg-slate-800 text-white font-semibold border border-slate-700 shadow-xs'
                  : clasesTema.subtexto + ' hover:opacity-100'
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
                  : clasesTema.subtexto + ' hover:opacity-100'
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
            {/* Tarjeta de Usuario */}
            <Link
              to={esAdmin ? '/panel' : '/usuario'}
              onClick={() => esMovil && setMenuMovilAbierto(false)}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all group ${clasesTema.tarjetaUsuario}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-[#501228] border border-[#F27B91]/30 text-white flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#6E1E3A] transition-colors">
                    {usuario?.nombre?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 ${esClaro ? 'border-white' : 'border-[#111827]'}`} />
                </div>
                <div className="truncate text-left">
                  <p className="text-xs font-bold truncate group-hover:text-[#501228] transition-colors">
                    {usuario?.nombre || 'Usuario GoToX'}
                  </p>
                  <p className={`text-[10px] truncate flex items-center gap-1 ${clasesTema.subtexto}`}>
                    <Shield className={`w-2.5 h-2.5 ${esAdmin ? 'text-[#F27B91]' : 'text-emerald-500'}`} />
                    <span>{esAdmin ? 'Administrador Exclusivo' : 'Usuario GoToX'}</span>
                  </p>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 transition-all group-hover:translate-x-0.5 ${clasesTema.subtexto}`} />
            </Link>

            {/* Botón Salir / Cerrar Sesión */}
            <button
              type="button"
              onClick={handleSolicitarCierre}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-all group active:scale-[0.98] ${clasesTema.botonCerrarSesion}`}
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                <span>Cerrar Sesión</span>
              </div>
              <span className="text-[10px] opacity-80 font-medium">Salir</span>
            </button>

            {/* Botón Principal Destacado según Rol */}
            {esAdmin ? (
              <Link
                to="/panel"
                onClick={() => esMovil && setMenuMovilAbierto(false)}
                className={`w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] ${clasesTema.botonPrincipal}`}
              >
                <Activity className="w-4 h-4" />
                <span>Entrar al Panel</span>
              </Link>
            ) : (
              <Link
                to="/usuario"
                onClick={() => esMovil && setMenuMovilAbierto(false)}
                className={`w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] ${clasesTema.botonPrincipal}`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Entrar a Mi Espacio</span>
              </Link>
            )}
          </div>
        ) : (
          /* Estado Sesión Cerrada: Botón Iniciar Sesión */
          <Link
            to="/acceso"
            onClick={() => esMovil && setMenuMovilAbierto(false)}
            className={`w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] ${clasesTema.botonPrincipal}`}
          >
            <LogIn className="w-4 h-4" />
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
      <header
        className={`md:hidden sticky top-0 z-40 w-full h-16 px-4 flex items-center justify-between border-b backdrop-blur-md transition-colors duration-200 ${
          esClaro
            ? 'bg-white/95 border-slate-200/80 text-slate-800'
            : esMorado
            ? 'bg-[#140810]/95 border-[#F27B91]/20 text-[#FDF2F6]'
            : 'bg-[#090D14]/95 border-white/10 text-white'
        }`}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#501228] border border-[#F27B91]/30 flex items-center justify-center text-white">
            <Dog className="w-4 h-4 text-[#FDF2F4]" />
          </div>
          <span className={`font-serif font-black text-base tracking-tight flex items-center gap-1.5 ${clasesTema.textoMarca}`}>
            GoToX
            <span className={`text-[9px] uppercase font-sans font-semibold tracking-wider px-1 py-0.5 rounded ${clasesTema.badgePetOs}`}>
              PET OS
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {esAdmin ? (
            <Link
              to="/panel"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-[#501228] border border-[#F27B91]/30"
            >
              <Activity className="w-3.5 h-3.5 text-[#F27B91]" />
              <span className="hidden xs:inline">Panel</span>
            </Link>
          ) : isLoggedIn ? (
            <Link
              to="/usuario"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-[#501228] border border-[#F27B91]/30"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#F27B91]" />
              <span className="hidden xs:inline">Mi Espacio</span>
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
            className={`p-2 rounded-xl border transition-colors ${
              esClaro
                ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                : 'bg-[#111827] border-white/10 text-slate-300 hover:text-white'
            }`}
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
              className={`relative w-72 max-w-[85vw] h-full shadow-2xl z-10 overflow-y-auto gotox-scrollbar border-r ${
                esClaro ? 'border-slate-200' : esMorado ? 'border-[#F27B91]/20' : 'border-white/10'
              }`}
            >
              <ContenidoSidebar esMovil={true} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================
          2. SIDEBAR LATERAL FIJO EN DESKTOP (md: y superior)
          ============================================================ */}
      <aside
        className={`hidden md:flex md:w-64 lg:w-72 fixed inset-y-0 left-0 z-40 shadow-xl overflow-y-auto gotox-scrollbar flex-col border-r transition-colors duration-200 ${
          esClaro ? 'border-slate-200/80' : esMorado ? 'border-[#F27B91]/15' : 'border-white/10'
        }`}
      >
        <ContenidoSidebar esMovil={false} />
      </aside>
    </>
  );
}

export default Sidebar;
