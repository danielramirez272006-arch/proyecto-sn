import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Dog, ArrowLeft, Shield, Bell, User, ExternalLink, Activity } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useSesion } from '../hooks/useSesion';

export function LayoutPanel({ children, tabs, tabActiva, onTabChange }) {
  const { usuario, isLoggedIn } = useSesion();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9FE] text-[#111827]">
      {/* Top Navigation flotante del panel - Sin sidebar */}
      <header className="sticky top-0 z-40 w-full px-4 sm:px-6 py-3">
        <div className="max-w-[1240px] mx-auto bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-md px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Lado Izquierdo: Marca y Enlace a Web Pública */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-[#501228] flex items-center justify-center text-white shadow-2xs group-hover:bg-[#6E1E3A] transition-colors">
                <Dog className="w-4 h-4 text-[#FDF2F4]" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-serif font-black text-sm text-[#111827] leading-tight">
                  GoToX <span className="text-[#501228] font-sans font-bold text-xs">CENTRO DE MANDO</span>
                </span>
                <span className="text-[10px] text-slate-500 -mt-0.5">San José Metropolitano</span>
              </div>
            </Link>

            <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#501228] px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Volver a</span> Web Pública
            </Link>
          </div>

          {/* Centro: Pestañas de Navegación del Panel si vienen por props */}
          {tabs && onTabChange && (
            <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 overflow-x-auto gotox-scrollbar max-w-full">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const activa = tabActiva === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                      activa
                        ? 'bg-white text-[#501228] shadow-sm font-semibold'
                        : 'text-slate-600 hover:text-[#111827] hover:bg-white/60'
                    }`}
                  >
                    {Icon && <Icon className={`w-3.5 h-3.5 ${activa ? 'text-[#501228]' : 'text-slate-400'}`} />}
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activa ? 'bg-[#FDF2F4] text-[#501228]' : 'bg-slate-200 text-slate-700'}`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Lado Derecho: Estado del Operador y Perfil */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600 bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 gotox-radar-dot" />
              <span>Red GAM Sincronizada</span>
            </div>

            <Link to="/perfil">
              <Button variant="secondary" size="sm" icon={User} className="text-xs py-1 px-3">
                <span className="hidden sm:inline">Bóveda Pet</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-[1240px] w-full mx-auto px-4 sm:px-6 py-6">
        {children || <Outlet />}
      </main>
    </div>
  );
}

