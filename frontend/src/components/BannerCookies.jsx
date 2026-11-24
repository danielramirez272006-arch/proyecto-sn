import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, ShieldCheck, Sliders, CheckCircle2, X, MapPin, Palette, Trash2 } from 'lucide-react';
import { useTema } from '../context/TemaContext';
import { useIdioma } from '../context/IdiomaContext';
import { ModalConfirmacion } from './ModalConfirmacion';
import {
  CLAVES_ALMACENAMIENTO,
  obtenerConsentimientoCookies,
  guardarConsentimientoCookies,
  borrarDatosLocales,
} from '../shared/utils/cookie-consent';

export function BannerCookies() {
  const { esClaro, esMorado } = useTema();
  const { t } = useIdioma();

  const categorias = [
    {
      id: 'necessary',
      titulo: t('cookies.necTitulo'),
      icono: ShieldCheck,
      fija: true,
      etiqueta: t('cookies.necEtiqueta'),
      claves: CLAVES_ALMACENAMIENTO.necessary,
      descripcion: t('cookies.necDesc')
    },
    {
      id: 'functional',
      titulo: t('cookies.funTitulo'),
      icono: Palette,
      fija: true,
      etiqueta: t('cookies.funEtiqueta'),
      claves: CLAVES_ALMACENAMIENTO.functional,
      descripcion: t('cookies.funDesc')
    },
    {
      id: 'geolocation',
      titulo: t('cookies.geoTitulo'),
      icono: MapPin,
      fija: false,
      claves: [t('cookies.geoClaves')],
      descripcion: t('cookies.geoDesc')
    }
  ];
  const [visible, setVisible] = useState(false);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const [geo, setGeo] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  useEffect(() => {
    const existente = obtenerConsentimientoCookies();
    if (!existente) {
      setVisible(true);
    } else {
      setGeo(Boolean(existente.geolocation));
    }

    const onOpenSettings = () => {
      const actual = obtenerConsentimientoCookies();
      setGeo(Boolean(actual?.geolocation));
      setMostrarDetalle(true);
      setVisible(true);
    };

    window.addEventListener('gotox:open-cookie-settings', onOpenSettings);
    return () => window.removeEventListener('gotox:open-cookie-settings', onOpenSettings);
  }, []);

  if (!visible) return null;

  const cerrar = () => {
    setVisible(false);
    setMostrarDetalle(false);
  };

  const decidir = (geolocation) => {
    guardarConsentimientoCookies({ geolocation });
    cerrar();
  };

  const handleBorrar = () => setConfirmarBorrado(true);

  const superficie = esClaro
    ? 'bg-white/95 border-slate-200 text-slate-900 shadow-2xl'
    : esMorado
    ? 'bg-[#180A14]/95 border-[#F27B91]/35 text-[#FDF2F6] shadow-2xl'
    : 'bg-[#0F172A]/95 border-white/15 text-[#E8EDF5] shadow-2xl';

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="gotox-cookie-title"
      className="fixed bottom-4 inset-x-4 z-[1400] max-w-4xl mx-auto pointer-events-none"
    >
      <div className={`pointer-events-auto rounded-3xl border backdrop-blur-xl p-5 sm:p-6 space-y-4 max-h-[85dvh] overflow-y-auto ${superficie}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#501228] text-white flex items-center justify-center shrink-0 border border-[#F27B91]/30">
              <Cookie className="w-5 h-5 text-[#F27B91]" />
            </div>
            <div className="space-y-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="gotox-cookie-title" className="font-serif font-bold text-base sm:text-lg">
                  {t('cookies.titulo')}
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#501228]/15 text-[#F27B91] border border-[#F27B91]/30">
                  {t('cookies.ley')}
                </span>
              </div>
              <p className="text-xs opacity-80 leading-relaxed">
                {t('cookies.descIntro')}{' '}
                <Link to="/terminos#cookies" onClick={cerrar} className="underline font-semibold text-[#F27B91] hover:opacity-90">
                  {t('cookies.politicaCookies')}
                </Link>
                .
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={cerrar}
            aria-label={t('cookies.cerrarAria')}
            className="p-1.5 rounded-xl border border-current/15 opacity-70 hover:opacity-100 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {mostrarDetalle && (
          <div className="grid grid-cols-1 gap-3 pt-2 border-t border-current/10 text-left">
            {categorias.map((cat) => {
              const Icono = cat.icono;
              return (
                <div key={cat.id} className="p-3.5 rounded-2xl border border-current/15 bg-current/5 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icono className="w-4 h-4 text-[#F27B91] shrink-0" />
                      <span className="font-bold text-xs">{cat.titulo}</span>
                    </div>
                    {cat.fija ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-500 shrink-0">
                        {cat.etiqueta}
                      </span>
                    ) : (
                      <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={geo}
                          onChange={() => setGeo((v) => !v)}
                          className="w-4 h-4 accent-[#501228]"
                        />
                        <span>{geo ? t('cookies.activada') : t('cookies.desactivada')}</span>
                      </label>
                    )}
                  </div>
                  <p className="text-[11px] opacity-80 leading-snug">{cat.descripcion}</p>
                  <p className="text-[10px] font-mono opacity-55 break-words">{t('cookies.clavesLabel')}: {cat.claves.join(', ')}</p>
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleBorrar}
              className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-500/40 text-rose-500 text-[11px] font-semibold hover:bg-rose-500/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('cookies.borrarDatos')}</span>
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-current/10">
          <button
            type="button"
            onClick={() => setMostrarDetalle((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-current/20 text-xs font-semibold hover:bg-current/10 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-[#F27B91]" />
            <span>{mostrarDetalle ? t('cookies.ocultarDetalle') : t('cookies.verPersonalizar')}</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => decidir(false)}
              className="px-3.5 py-2 rounded-xl border border-current/20 text-xs font-semibold hover:bg-current/10 transition-colors"
            >
              {t('cookies.soloNecesarias')}
            </button>
            {mostrarDetalle && (
              <button
                type="button"
                onClick={() => decidir(geo)}
                className="px-4 py-2 rounded-xl border border-[#F27B91]/40 bg-[#501228]/80 text-white text-xs font-bold hover:bg-[#501228] transition-colors"
              >
                {t('cookies.guardarEleccion')}
              </button>
            )}
            <button
              type="button"
              onClick={() => decidir(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#501228] text-white border border-[#F27B91]/40 text-xs font-bold hover:bg-[#681734] transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#F27B91]" />
              <span>{t('cookies.aceptarTodas')}</span>
            </button>
          </div>
        </div>
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
    </div>
  );
}
