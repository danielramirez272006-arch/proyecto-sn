import React from 'react';
import { Link } from 'react-router-dom';
import { useSesion } from '../hooks/useSesion';
import { abrirConfiguracionCookies } from '../shared/utils/cookie-consent';
import { Dog, ShieldCheck, Heart, MapPin, Cookie } from 'lucide-react';

export function Footer() {
  const { isLoggedIn, esAdmin } = useSesion();
  return (
    <footer className="border-t border-slate-200/80 bg-white/60 mt-20 pt-16 pb-12 text-sm text-slate-600">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Columna Marca */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#501228] flex items-center justify-center text-white">
                <Dog className="w-4 h-4 text-[#FDF2F4]" />
              </div>
              <span className="font-serif font-black text-lg text-[#111827]">
                Synodos Pet OS
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Synodos (Σύνοδος — Caminar juntos): sistema operativo urbano inteligente para planes compartidos y bienestar animal en el Gran Área Metropolitana de Costa Rica.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
              <MapPin className="w-3.5 h-3.5 text-[#501228]" />
              <span>San José, Costa Rica</span>
            </div>
          </div>

          {/* Columna Navegación */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#111827]">
              Explorar
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-[#501228] transition-colors">
                  Inicio & Telemetría
                </Link>
              </li>
              <li>
                <Link to="/mapa" className="hover:text-[#501228] transition-colors">
                  Mapa Interactivo GAM
                </Link>
              </li>
              <li>
                <Link to="/terrazas" className="hover:text-[#501228] transition-colors">
                  Radar de Terrazas Verificadas
                </Link>
              </li>
              <li>
                <Link to="/copiloto" className="hover:text-[#501228] transition-colors">
                  Copiloto Argos (Asistente IA)
                </Link>
              </li>
              <li>
                <Link to={isLoggedIn ? "/usuario?tab=cuenta" : "/acceso"} className="hover:text-[#501228] transition-colors">
                  Bóveda Pet & Pasaporte
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna Sistema & Gobernanza */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#111827]">
              Sistema & IA
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to={esAdmin ? "/panel" : isLoggedIn ? "/usuario" : "/acceso"} className="hover:text-[#501228] transition-colors">
                  {esAdmin ? 'Panel de Administración' : isLoggedIn ? 'Mi Espacio de Usuario' : 'Acceso de Usuarios'}
                </Link>
              </li>
              <li>
                <Link to="/nosotros" className="hover:text-[#501228] transition-colors">
                  Equipo & Arquitectura
                </Link>
              </li>
              <li>
                <Link to="/terminos" className="hover:text-[#501228] transition-colors font-semibold">
                  Términos, Condiciones y Privacidad
                </Link>
              </li>
              <li>
                <span className="text-slate-400">Sensores Térmicos de Calzada</span>
              </li>
              <li>
                <span className="text-slate-400">Flota Móvil SOS San José</span>
              </li>
            </ul>
          </div>

          {/* Columna Certificaciones */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#111827]">
              Compromiso Cívico
            </h4>
            <div className="p-3 bg-[#FDF2F4] rounded-xl border border-[#F9E2E8] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#501228]">
                <ShieldCheck className="w-4 h-4 text-[#501228]" />
                <span>Protocolo Pet-OS GAM</span>
              </div>
              <p className="text-[11px] text-[#6E1E3A] leading-tight">
                Verificación acústica por debajo de 55 dB y medición térmica en aceras de Barrio Escalante, Rohrmoser y La Sabana.
              </p>
            </div>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="pt-8 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <p>
              &copy; {new Date().getFullYear()} Synodos Pet OS. Diseñado con calidez para caminar juntos en el GAM.
            </p>
            <span>&bull;</span>
            <Link to="/terminos" className="underline hover:text-[#501228] transition-colors font-medium">
              Términos y Condiciones (Ley N° 8968 CR)
            </Link>
            <span>&bull;</span>
            <button
              type="button"
              onClick={abrirConfiguracionCookies}
              className="inline-flex items-center gap-1 underline hover:text-[#501228] transition-colors font-medium cursor-pointer"
            >
              <Cookie className="w-3.5 h-3.5" />
              <span>Preferencias de Cookies</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span>Hecho con</span>
            <Heart className="w-3.5 h-3.5 text-[#501228] fill-[#501228]" />
            <span>para San José, Costa Rica</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
