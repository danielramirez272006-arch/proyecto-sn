import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  X,
  Shield,
  Activity,
  Sparkles,
  User,
  Dog,
  LogIn,
  LogOut,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { BotonTema } from './BotonTema';
import { AnimacionCierreSesion } from './AnimacionCierreSesion';
import { ModalConfirmarCierre } from './ModalConfirmarCierre';
import { useSesion } from '../hooks/useSesion';

export function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [usuarioMenuAbierto, setUsuarioMenuAbierto] = useState(false);
  const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false);
  const [animandoSalida, setAnimandoSalida] = useState(false);
  const menuRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, usuario, mascota, cerrarSesion } = useSesion();

  // Cerrar menú de usuario al hacer clic afuera
  useEffect(() => {
    function manejarClicAfuera(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUsuarioMenuAbierto(false);
      }
    }
    if (usuarioMenuAbierto) {
      document.addEventListener('mousedown', manejarClicAfuera);
      return () => document.removeEventListener('mousedown', manejarClicAfuera);
    }
  }, [usuarioMenuAbierto]);

  const enlaces = [
    { nombre: 'Inicio', ruta: '/' },
    { nombre: 'Terrazas Verificadas', ruta: '/terrazas' },
    { nombre: 'Copiloto Bruno', ruta: '/copiloto' },
    { nombre: 'Sobre Nosotros', ruta: '/nosotros' },
    { nombre: 'Bóveda Pet', ruta: '/perfil' }
  ];

  const esRutaActiva = (ruta) => {
    return location.pathname === ruta;
  };

  const handleSolicitarCierre = () => {
    setUsuarioMenuAbierto(false);
    setMenuAbierto(false);
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
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/70 dark:border-slate-800 transition-all duration-200">
      {/* Modal de confirmación y advertencia */}
      <ModalConfirmarCierre
        isOpen={modalConfirmacionAbierto}
        onClose={() => setModalConfirmacionAbierto(false)}
        onConfirmar={handleConfirmarSalida}
        nombreUsuario={usuario?.nombre}
      />

      {/* Animación fluida de cierre de sesión hacia /acceso */}
      <AnimacionCierreSesion
        visible={animandoSalida}
        nombreUsuario={usuario?.nombre}
        onCompletado={handleCompletarSalida}
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        {/* Logotipo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-[#501228] flex items-center justify-center text-white shadow-sm group-hover:bg-[#6E1E3A] transition-colors">
            <Dog className="w-5 h-5 text-[#FDF2F4]" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-black text-lg text-[#111827] dark:text-slate-100 tracking-tight flex items-center gap-1.5">
              GoToX <span className="text-[#501228] dark:text-[#f0a6be] text-xs px-1.5 py-0.5 font-sans font-semibold rounded bg-[#FDF2F4] dark:bg-slate-800 border border-[#F9E2E8] dark:border-slate-700">PET OS</span>
            </span>
            <span className="text-[10px] text-slate-500 font-sans tracking-wide -mt-0.5">
              San José &bull; GAM
            </span>
          </div>
        </Link>

        {/* Enlaces de Navegación Desktop */}
        <nav className="hidden lg:flex items-center space-x-1 lg:space-x-2">
          {enlaces.map((enlace) => {
            const activa = esRutaActiva(enlace.ruta);
            return (
              <Link
                key={enlace.nombre}
                to={enlace.ruta}
                className={`px-2.5 lg:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activa
                    ? 'text-[#501228] dark:text-[#f0a6be] bg-[#FDF2F4] dark:bg-slate-800 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#111827] dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                }`}
              >
                {enlace.nombre}
              </Link>
            );
          })}
        </nav>

        {/* Acciones de la barra */}
        <div className="hidden lg:flex items-center gap-2.5">
          <BotonTema conMenu={true} />

          {/* Menú de Usuario Logueado o Botón de Iniciar Sesión */}
          {isLoggedIn ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setUsuarioMenuAbierto(!usuarioMenuAbierto)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#FDF2F4]/60 dark:hover:bg-slate-700/60 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-2xs transition-all active:scale-[0.98]"
                aria-expanded={usuarioMenuAbierto}
                aria-haspopup="true"
              >
                <div className="relative">
                  <div className="w-6 h-6 rounded-lg bg-[#501228] text-white flex items-center justify-center font-bold text-[11px]">
                    {usuario?.nombre?.charAt(0) || 'U'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
                </div>
                <span className="truncate max-w-[100px]">{usuario?.nombre?.split(' ')[0] || 'Usuario'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${usuarioMenuAbierto ? 'rotate-180' : ''}`} />
              </button>

              {/* Menú Desplegable con Cerrar Sesión */}
              {usuarioMenuAbierto && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3">
                  {/* Encabezado del usuario */}
                  <div className="flex items-start gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-9 h-9 rounded-xl bg-[#501228] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                      {usuario?.nombre?.charAt(0) || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#111827] dark:text-white truncate">
                        {usuario?.nombre || 'Mariana Rojas'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {usuario?.correo || 'mariana.rojas@gotox.cr'}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200/60 dark:border-emerald-800">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        Tutor Certificado
                      </span>
                    </div>
                  </div>

                  {/* Resumen de mascota activa */}
                  {mascota && (
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-[11px] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Dog className="w-3.5 h-3.5 text-[#501228] dark:text-[#f0a6be]" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{mascota.nombre}</span>
                        <span className="text-slate-400">({mascota.raza})</span>
                      </div>
                      <Link
                        to="/perfil"
                        onClick={() => setUsuarioMenuAbierto(false)}
                        className="text-[10px] text-[#501228] dark:text-[#f0a6be] font-bold hover:underline"
                      >
                        Ver
                      </Link>
                    </div>
                  )}

                  {/* Enlaces rápidos */}
                  <div className="space-y-1">
                    <Link
                      to="/perfil"
                      onClick={() => setUsuarioMenuAbierto(false)}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-[#FDF2F4] dark:hover:bg-slate-800 hover:text-[#501228] dark:hover:text-[#f0a6be] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Bóveda Pet & Carnet</span>
                      </div>
                    </Link>
                    <Link
                      to="/panel"
                      onClick={() => setUsuarioMenuAbierto(false)}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-[#FDF2F4] dark:hover:bg-slate-800 hover:text-[#501228] dark:hover:text-[#f0a6be] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-slate-400" />
                        <span>Centro de Mando IA</span>
                      </div>
                    </Link>
                  </div>

                  {/* Botón de Cerrar Sesión Destacado */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleSolicitarCierre}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/70 dark:border-rose-800 transition-all group active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-2">
                        <LogOut className="w-3.5 h-3.5 text-rose-600 transition-transform group-hover:-translate-x-0.5" />
                        <span>Cerrar Sesión</span>
                      </div>
                      <span className="text-[10px] text-rose-500 font-medium">Salir</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/acceso">
              <Button variant="secondary" size="sm" icon={LogIn}>
                Iniciar Sesión
              </Button>
            </Link>
          )}

          <Link to="/panel">
            <Button variant="primary" size="sm" icon={Activity}>
              Entrar al Panel
            </Button>
          </Link>
        </div>

        {/* Botón Móvil */}
        <div className="flex lg:hidden items-center gap-2">
          <BotonTema conMenu={true} className="w-8 h-8" />
          <Link to="/panel">
            <Button variant="primary" size="sm" className="px-2.5 py-1 text-xs">
              Panel
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-label="Abrir menú de navegación"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-[#501228] dark:hover:text-[#f0a6be] hover:bg-[#FDF2F4] dark:hover:bg-slate-800 transition-colors"
          >
            {menuAbierto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Menú Móvil Desplegable */}
      {menuAbierto && (
        <div className="lg:hidden border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg px-4 pt-2 pb-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col space-y-1">
            {enlaces.map((enlace) => (
              <Link
                key={enlace.nombre}
                to={enlace.ruta}
                onClick={() => setMenuAbierto(false)}
                className="px-3 py-2.5 rounded-xl text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-[#FDF2F4] dark:hover:bg-slate-800 hover:text-[#501228] dark:hover:text-[#f0a6be] transition-colors"
              >
                {enlace.nombre}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
            {isLoggedIn ? (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#501228] text-white flex items-center justify-center font-bold text-sm">
                    {usuario?.nombre?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#111827] dark:text-white truncate">
                      {usuario?.nombre}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {usuario?.correo}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link to="/perfil" onClick={() => setMenuAbierto(false)}>
                    <Button variant="secondary" size="sm" className="w-full justify-center text-xs">
                      Bóveda Pet
                    </Button>
                  </Link>
                  <Link to="/panel" onClick={() => setMenuAbierto(false)}>
                    <Button variant="primary" size="sm" className="w-full justify-center text-xs">
                      Centro de Mando
                    </Button>
                  </Link>
                </div>

                <button
                  type="button"
                  onClick={handleSolicitarCierre}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-600" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            ) : (
              <>
                <Link to="/acceso" onClick={() => setMenuAbierto(false)}>
                  <Button variant="secondary" className="w-full justify-center" icon={LogIn}>
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link to="/panel" onClick={() => setMenuAbierto(false)}>
                  <Button variant="primary" className="w-full justify-center">
                    Centro de Mando IA
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
