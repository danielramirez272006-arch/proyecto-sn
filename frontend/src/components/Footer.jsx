import React from 'react';
import { Link } from 'react-router-dom';
import { useSesion } from '../hooks/useSesion';
import { useIdioma } from '../context/IdiomaContext';
import { abrirConfiguracionCookies } from '../shared/utils/cookie-consent';
import { LogoSynodos } from './LogoSynodos';
import { ShieldCheck, Heart, MapPin, Cookie } from 'lucide-react';

export function Footer() {
  const { isLoggedIn, esAdmin } = useSesion();
  const { t } = useIdioma();
  return (
    <footer className="border-t border-slate-200/80 bg-white/60 mt-20 pt-16 pb-12 text-sm text-slate-600">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Columna Marca */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <LogoSynodos size="sm" alt="Synodos Pet OS" />
              <span className="font-serif font-black text-lg text-[#111827]">
                Synodos Pet OS
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t('footer.desc')}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-1">
              <MapPin className="w-3.5 h-3.5 text-[#501228]" aria-hidden="true" />
              <span>San José, Costa Rica</span>
            </div>
          </div>

          {/* Columna Navegación */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#111827]">
              {t('footer.explorar')}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-[#501228] transition-colors">
                  {t('footer.inicioTel')}
                </Link>
              </li>
              <li>
                <Link to="/mapa" className="hover:text-[#501228] transition-colors">
                  {t('footer.mapaGam')}
                </Link>
              </li>
              <li>
                <Link to="/terrazas" className="hover:text-[#501228] transition-colors">
                  {t('footer.radarTerrazas')}
                </Link>
              </li>
              <li>
                <Link to="/copiloto" className="hover:text-[#501228] transition-colors">
                  {t('footer.copilotoAi')}
                </Link>
              </li>
              <li>
                <Link to={isLoggedIn ? "/usuario?tab=cuenta" : "/acceso"} className="hover:text-[#501228] transition-colors">
                  {t('footer.bovedaPasaporte')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna Sistema & Gobernanza */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#111827]">
              {t('footer.sistema')}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to={esAdmin ? "/panel" : isLoggedIn ? "/usuario" : "/acceso"} className="hover:text-[#501228] transition-colors">
                  {esAdmin ? t('footer.panelAdmin') : isLoggedIn ? t('footer.miEspacio') : t('footer.accesoUsuarios')}
                </Link>
              </li>
              <li>
                <Link to="/nosotros" className="hover:text-[#501228] transition-colors">
                  {t('footer.equipoArq')}
                </Link>
              </li>
              <li>
                <Link to="/terminos" className="hover:text-[#501228] transition-colors font-semibold">
                  {t('footer.terminosNav')}
                </Link>
              </li>
              <li>
                <span className="text-slate-400">{t('footer.sensores')}</span>
              </li>
              <li>
                <span className="text-slate-400">{t('footer.flotaSos')}</span>
              </li>
            </ul>
          </div>

          {/* Columna Certificaciones */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#111827]">
              {t('footer.compromiso')}
            </h4>
            <div className="p-3 bg-[#FDF2F4] rounded-xl border border-[#F9E2E8] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#501228]">
                <ShieldCheck className="w-4 h-4 text-[#501228]" aria-hidden="true" />
                <span>{t('footer.protocolo')}</span>
              </div>
              <p className="text-[11px] text-[#6E1E3A] leading-tight">
                {t('footer.protocoloDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="pt-8 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-3">
            <p>
              &copy; {new Date().getFullYear()} Synodos Pet OS. {t('footer.derechos')}
            </p>
            <span>&bull;</span>
            <Link to="/terminos" className="underline hover:text-[#501228] transition-colors font-medium">
              {t('footer.terminosLey')}
            </Link>
            <span>&bull;</span>
            <button
              type="button"
              onClick={abrirConfiguracionCookies}
              className="inline-flex items-center gap-1 underline hover:text-[#501228] transition-colors font-medium cursor-pointer"
            >
              <Cookie className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t('footer.preferenciasCookies')}</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span>{t('footer.hechoCon')}</span>
            <Heart className="w-3.5 h-3.5 text-[#501228] fill-[#501228]" aria-hidden="true" />
            <span>{t('footer.paraCR')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
