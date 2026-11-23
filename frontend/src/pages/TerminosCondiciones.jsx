import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PageWrapper } from '../components/PageWrapper';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useTema } from '../context/TemaContext';
import { useIdioma } from '../context/IdiomaContext';
import { ModalConfirmacion } from '../components/ModalConfirmacion';
import {
  obtenerConsentimientoCookies,
  abrirConfiguracionCookies,
  borrarDatosLocales,
  CLAVES_ALMACENAMIENTO,
} from '../shared/utils/cookie-consent';
import {
  ShieldCheck,
  Scale,
  FileText,
  Lock,
  Stethoscope,
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Cookie,
  UserCheck,
  Network,
  RefreshCw,
  Trash2,
  ListChecks
} from 'lucide-react';

const VERSION_DOCUMENTO = 'Noviembre 2026 (v2)';
// Canal oficial de contacto para ejercer derechos. Debe definirlo el equipo antes de publicar.
const CONTACTO_PRIVACIDAD = null;

const ICONOS_SECCION = {
  alcance: MapPin,
  cuenta: UserCheck,
  veterinaria: Stethoscope,
  datos: Lock,
  terceros: Network,
  convivencia: ShieldCheck,
  fotografias: Camera,
  finanzas: Scale,
  cookies: Cookie,
  cambios: RefreshCw
};

const TABLA_CLAVES_COOKIES = [
  CLAVES_ALMACENAMIENTO.necessary,
  CLAVES_ALMACENAMIENTO.functional,
  ['gotox_cookie_consent (cookie)', 'gotox_cookie_consent_v1', 'gotox_terminos_aceptados_v1'],
  null
];

export function TerminosCondiciones() {
  const { esClaro, esMorado } = useTema();
  const { t } = useIdioma();
  const { hash } = useLocation();
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [consentimiento, setConsentimiento] = useState(() => obtenerConsentimientoCookies());
  const [aceptadoLocal, setAceptadoLocal] = useState(() => {
    try {
      return localStorage.getItem('gotox_terminos_aceptados_v1') === VERSION_DOCUMENTO;
    } catch {
      return false;
    }
  });

  // Mantener el estado del consentimiento sincronizado con el banner
  useEffect(() => {
    const onUpdate = () => setConsentimiento(obtenerConsentimientoCookies());
    window.addEventListener('gotox:cookie-consent-updated', onUpdate);
    return () => window.removeEventListener('gotox:cookie-consent-updated', onUpdate);
  }, []);

  // Soporte de enlaces con ancla (p. ej. /terminos#cookies)
  useEffect(() => {
    if (!hash) return;
    setFiltroCategoria('todas');
    const id = hash.replace('#', '');
    const timer = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => clearTimeout(timer);
  }, [hash]);

  const clausulasTraducidas = Array.isArray(t('terminos.clausulas'))
    ? t('terminos.clausulas')
    : [];
  const filasCookies = Array.isArray(t('terminos.filasCookies'))
    ? t('terminos.filasCookies')
    : [];
  const resumenItems = Array.isArray(t('terminos.resumenItems'))
    ? t('terminos.resumenItems')
    : [];
  const filtrosTraducidos = [
    { id: 'todas', label: t('terminos.catTodas') },
    { id: 'uso', label: t('terminos.catUso') },
    { id: 'salud', label: t('terminos.catSalud') },
    { id: 'privacidad', label: t('terminos.catPrivacidad') },
    { id: 'propiedad', label: t('terminos.catFotos') }
  ];

  const seccionesFiltradas = clausulasTraducidas.filter(
    (s) => filtroCategoria === 'todas' || s.categoria === filtroCategoria
  );

  const handleConfirmarLectura = () => {
    const nuevoEstado = !aceptadoLocal;
    setAceptadoLocal(nuevoEstado);
    try {
      if (nuevoEstado) localStorage.setItem('gotox_terminos_aceptados_v1', VERSION_DOCUMENTO);
      else localStorage.removeItem('gotox_terminos_aceptados_v1');
    } catch {
      // Ignorar si localStorage no está disponible
    }
  };

  const handleBorrar = () => setConfirmarBorrado(true);

  const estadoGeo = !consentimiento
    ? t('terminos.prefSinDecidir')
    : consentimiento.geolocation
    ? t('terminos.prefActivada')
    : t('terminos.prefDesactivada');

  const versionVisible = t('terminos.versionDoc');

  return (
    <PageWrapper className="py-10 md:py-16">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 space-y-8 text-left">
        {/* Encabezado */}
        <div className="space-y-4 border-b border-current/10 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#501228] text-white border border-[#F27B91]/30 text-xs font-semibold">
              <Scale className="w-3.5 h-3.5 text-[#F27B91]" />
              <span>{t('terminos.tag')}</span>
            </div>
            <Badge variant="success">{t('terminos.versionBadge', { v: versionVisible })}</Badge>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            {t('terminos.titulo')}
          </h1>

          <p className="text-sm sm:text-base opacity-80 leading-relaxed max-w-3xl font-sans">
            {t('terminos.intro')}
          </p>
        </div>

        {/* Resumen rápido */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-[#F27B91]" />
            <h2 className="font-serif font-bold text-base">{t('terminos.resumenTitulo')}</h2>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-sm">
            {resumenItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#F27B91] shrink-0 mt-0.5" />
                <span className="opacity-90">{item}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Índice + filtros */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {filtrosTraducidos.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFiltroCategoria(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  filtroCategoria === tab.id
                    ? 'bg-[#501228] text-white border-[#F27B91]/40 shadow-xs'
                    : 'border-current/15 opacity-75 hover:opacity-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <nav aria-label={t('terminos.indiceAria')} className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {clausulasTraducidas.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setFiltroCategoria('todas');
                  setTimeout(() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                }}
                className="underline-offset-2 hover:underline opacity-80 hover:opacity-100"
              >
                {s.numero}. {s.titulo.split(' (')[0].split('（')[0]}
              </a>
            ))}
          </nav>
        </div>

        {/* Aviso de transparencia */}
        <Card
          className={`p-5 border flex items-start gap-3 ${
            esClaro
              ? 'bg-[#FDF2F4] border-[#F9E2E8] text-[#501228]'
              : esMorado
              ? 'bg-[#24101C] border-[#F27B91]/30 text-[#FDF2F6]'
              : 'bg-[#162032] border-white/10 text-[#E8EDF5]'
          }`}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#F27B91]" />
          <div className="space-y-1 text-xs">
            <p className="font-bold text-sm">{t('terminos.transparenciaTitulo')}</p>
            <p className="opacity-85 leading-relaxed">
              {t('terminos.transparenciaDesc')}
            </p>
          </div>
        </Card>

        {/* Cláusulas */}
        <div className="grid grid-cols-1 gap-6">
          {seccionesFiltradas.map((sec) => {
            const Icono = ICONOS_SECCION[sec.id] || ShieldCheck;
            return (
              <Card key={sec.id} id={sec.id} className="p-6 space-y-4 scroll-mt-24">
                <div className="flex items-start justify-between gap-4 border-b border-current/10 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#501228] text-white flex items-center justify-center shrink-0 font-bold text-xs">
                      {sec.numero}
                    </div>
                    <div>
                      <h2 className="font-serif font-bold text-lg sm:text-xl">{sec.titulo}</h2>
                      <p className="text-xs opacity-70 mt-0.5">{sec.resumen}</p>
                    </div>
                  </div>
                  <Icono className="w-5 h-5 text-[#F27B91] shrink-0 hidden sm:block" />
                </div>

                <ul className="space-y-2.5 text-xs sm:text-sm leading-relaxed">
                  {sec.puntos.map((punto, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#F27B91] shrink-0 mt-1" />
                      <span className="opacity-90">{punto}</span>
                    </li>
                  ))}
                </ul>

                {sec.id === 'cookies' && filasCookies.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-current/15">
                    <table className="w-full text-left text-[11px] sm:text-xs">
                      <thead className="bg-current/5">
                        <tr>
                          <th className="p-2.5 font-bold">{t('terminos.thCat')}</th>
                          <th className="p-2.5 font-bold">{t('terminos.thClaves')}</th>
                          <th className="p-2.5 font-bold">{t('terminos.thFin')}</th>
                          <th className="p-2.5 font-bold">{t('terminos.thDur')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filasCookies.map((fila, idx) => {
                          const clavesFila = TABLA_CLAVES_COOKIES[idx] || [fila.claves].filter(Boolean);
                          return (
                            <tr key={fila.cat} className="border-t border-current/10 align-top">
                              <td className="p-2.5 font-semibold whitespace-nowrap">{fila.cat}</td>
                              <td className="p-2.5 font-mono opacity-80 break-all">{clavesFila.join(', ')}</td>
                              <td className="p-2.5 opacity-90">{fila.fin}</td>
                              <td className="p-2.5 opacity-90">{fila.dur}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {sec.id === 'datos' && (
                  <div className="p-3.5 rounded-xl border border-current/15 bg-current/5 text-xs space-y-1">
                    <p className="font-bold">{t('terminos.contactoTitulo')}</p>
                    <p className="opacity-85">
                      {CONTACTO_PRIVACIDAD || t('terminos.contactoPendiente')}
                    </p>
                  </div>
                )}

                {sec.id === 'cookies' && (
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Button variant="secondary" size="sm" icon={Cookie} onClick={abrirConfiguracionCookies}>
                      {t('terminos.prefCookiesBtn', { estado: estadoGeo })}
                    </Button>
                    <Button variant="secondary" size="sm" icon={Trash2} onClick={handleBorrar}>
                      {t('terminos.borrarDatosBtn')}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Constancia de lectura */}
        <Card className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-current/15">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#F27B91]" />
              <span className="font-serif font-bold text-base">{t('terminos.constanciaTitulo')}</span>
            </div>
            <p className="text-xs opacity-75">
              {aceptadoLocal
                ? t('terminos.constanciaActiva', { v: versionVisible })
                : t('terminos.constanciaInactiva')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link to="/acceso">
              <Button variant="secondary" size="sm" icon={ArrowLeft}>
                {t('terminos.btnIrAcceso')}
              </Button>
            </Link>
            <Button
              variant={aceptadoLocal ? 'secondary' : 'primary'}
              size="sm"
              icon={CheckCircle2}
              onClick={handleConfirmarLectura}
            >
              {aceptadoLocal ? t('terminos.btnLecturaRegistrada') : t('terminos.btnRegistrarLectura')}
            </Button>
          </div>
        </Card>
      </div>

      <ModalConfirmacion
        abierto={confirmarBorrado}
        peligroso
        titulo={t('cookies.confirmTitulo')}
        mensaje={t('cookies.confirmMensaje')}
        detalles={[
          t('cookies.confirmDet1'),
          t('cookies.confirmDet2'),
          t('cookies.confirmDet3'),
          t('cookies.confirmDet4')
        ]}
        textoConfirmar={t('cookies.confirmSi')}
        textoCancelar={t('confirmModal.cancelar')}
        onCancelar={() => setConfirmarBorrado(false)}
        onConfirmar={() => {
          setConfirmarBorrado(false);
          borrarDatosLocales();
        }}
      />
    </PageWrapper>
  );
}

export default TerminosCondiciones;
