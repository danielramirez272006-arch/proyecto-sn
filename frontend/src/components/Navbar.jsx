import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Shield, Activity, Sparkles, User, Dog } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { BotonTema } from './BotonTema';
import { useSesion } from '../hooks/useSesion';

export function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();
  const { isLoggedIn, usuario } = useSesion();

  const enlaces = [
    { nombre: 'Inicio', ruta: '/' },
    { nombre: 'Terrazas Verificadas', ruta: '/#terrazas' },
    { nombre: 'Copiloto Bruno', ruta: '/#copiloto' },
    { nombre: 'Sobre Nosotros', ruta: '/nosotros' },
    { nombre: 'Bóveda Pet', ruta: '/perfil' }
  ];

  const esRutaActiva = (ruta) => {
    if (ruta.startsWith('/#')) {
      return location.pathname === '/' && location.hash === ruta.replace('/', '');
    }
    return location.pathname === ruta;
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/85 border-b border-slate-200/70 transition-all duration-200">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        {/* Logotipo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-[#501228] flex items-center justify-center text-white shadow-sm group-hover:bg-[#6E1E3A] transition-colors">
            <Dog className="w-5 h-5 text-[#FDF2F4]" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-black text-lg text-[#111827] tracking-tight flex items-center gap-1.5">
              GoToX <span className="text-[#501228] text-xs px-1.5 py-0.5 font-sans font-semibold rounded bg-[#FDF2F4] border border-[#F9E2E8]">PET OS</span>
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
                className={`px-2 lg:px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activa
                    ? 'text-[#501228] bg-[#FDF2F4] font-semibold'
                    : 'text-slate-600 hover:text-[#111827] hover:bg-slate-100/60'
                }`}
              >
                {enlace.nombre}
              </Link>
            );
          })}
        </nav>

        {/* Acciones de la barra */}
        <div className="hidden lg:flex items-center gap-2.5">
          <BotonTema />
          <Link to="/acceso">
            <Button variant="secondary" size="sm" icon={User}>
              {isLoggedIn ? usuario.nombre.split(' ')[0] : 'Iniciar Sesión'}
            </Button>
          </Link>
          <Link to="/panel">
            <Button variant="primary" size="sm" icon={Activity}>
              Entrar al Panel
            </Button>
          </Link>
        </div>

        {/* Botón Móvil */}
        <div className="flex lg:hidden items-center gap-2">
          <BotonTema className="w-8 h-8" />
          <Link to="/panel">
            <Button variant="primary" size="sm" className="px-2.5 py-1 text-xs">
              Panel
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => setMenuAbierto(!menuAbierto)}
            aria-label="Abrir menú de navegación"
            className="p-2 rounded-xl text-slate-600 hover:text-[#501228] hover:bg-[#FDF2F4] transition-colors"
          >
            {menuAbierto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Menú Móvil Desplegable */}
      {menuAbierto && (
        <div className="lg:hidden border-b border-slate-200 bg-white/95 backdrop-blur-lg px-4 pt-2 pb-6 space-y-3">
          <div className="flex flex-col space-y-1">
            {enlaces.map((enlace) => (
              <Link
                key={enlace.nombre}
                to={enlace.ruta}
                onClick={() => setMenuAbierto(false)}
                className="px-3 py-2.5 rounded-xl text-base font-medium text-slate-700 hover:bg-[#FDF2F4] hover:text-[#501228] transition-colors"
              >
                {enlace.nombre}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <Link to="/acceso" onClick={() => setMenuAbierto(false)}>
              <Button variant="secondary" className="w-full justify-center">
                {isLoggedIn ? `Cuenta: ${usuario.nombre}` : 'Iniciar Sesión'}
              </Button>
            </Link>
            <Link to="/panel" onClick={() => setMenuAbierto(false)}>
              <Button variant="primary" className="w-full justify-center">
                Centro de Mando IA
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

