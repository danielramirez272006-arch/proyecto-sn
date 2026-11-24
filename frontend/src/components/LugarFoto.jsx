import React, { useState, useEffect } from 'react';
import { Camera, ExternalLink, Loader2, Utensils, Sparkles } from 'lucide-react';
import { useTema } from '../context/TemaContext';
import { useIdioma } from '../context/IdiomaContext';

function etiquetaProveedor(provider) {
  if (provider === 'wikimedia_commons') return 'Wikimedia Commons';
  if (provider === 'foursquare') return 'Foursquare';
  return 'Google Places';
}

/**
 * Renderiza la fotografía real de un establecimiento o una portada editorial cálida
 * cuando no hay fotografía verificada disponible.
 */
export function LugarFoto({
  src,
  alt,
  photoMeta = null,
  cargando = false,
  className = 'w-full h-full object-cover',
  compacto = false
}) {
  const { esClaro, esMorado } = useTema();
  const { t } = useIdioma();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const fondoEditorial = esClaro
    ? 'bg-gradient-to-br from-[#FDF2F6] via-[#FAF5F8] to-[#F3E4EC] border-b border-[#F2E2E9]'
    : esMorado
    ? 'bg-gradient-to-br from-[#2B1221] via-[#1E0C17] to-[#14070F] border-b border-[#F27B91]/20'
    : 'bg-gradient-to-br from-[#1E293B] via-[#162032] to-[#0F172A] border-b border-white/10';

  const colorTextoInline = esClaro ? '#501228' : esMorado ? '#FDF2F6' : '#E2E8F0';
  const colorSubtextoInline = esClaro ? '#64748B' : esMorado ? '#D2BBC7' : '#94A3B8';
  const fondoBadgeIcono = esClaro
    ? 'bg-white/85 border-[#E9D3DD] shadow-xs'
    : esMorado
    ? 'bg-[#351728] border-[#F27B91]/30'
    : 'bg-[#0F172A]/80 border-white/15';

  if (cargando && !src) {
    return (
      <div
        style={{ color: colorTextoInline }}
        className={`w-full h-full flex flex-col items-center justify-center gap-1.5 p-3 text-center ${fondoEditorial}`}
      >
        <Loader2 className="w-5 h-5 motion-safe:animate-spin text-[#F27B91]" aria-hidden="true" />
        {!compacto && <span className="text-[11px] font-medium">{t('fotoLugar.consultando')}</span>}
      </div>
    );
  }

  if (!src || imgError) {
    const mensajeEstado =
      photoMeta?.status === 'ambiguous'
        ? t('fotoLugar.vinculacionPendiente')
        : t('fotoLugar.sinFoto');

    return (
      <div
        role="img"
        aria-label={`${alt || t('fotoLugar.establecimientoDefault')}: ${mensajeEstado}`}
        style={{ color: colorTextoInline }}
        className={`relative w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center overflow-hidden ${fondoEditorial}`}
      >
        {/* Decoración editorial sutil */}
        <div
          aria-hidden="true"
          className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-[#F27B91]/10 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -left-6 -bottom-6 w-20 h-20 rounded-full bg-[#501228]/10 pointer-events-none"
        />

        <div className={`relative w-10 h-10 rounded-2xl border flex items-center justify-center ${fondoBadgeIcono}`}>
          <Utensils className="w-4 h-4" style={{ color: colorTextoInline }} aria-hidden="true" />
          <Sparkles className="w-2.5 h-2.5 text-[#F27B91] absolute -top-1 -right-1" aria-hidden="true" />
        </div>

        <span className="relative text-xs font-semibold tracking-tight">{mensajeEstado}</span>
        {!compacto && photoMeta?.status === 'ambiguous' && photoMeta?.reason && (
          <span className="relative text-[10px] max-w-xs line-clamp-2" style={{ color: colorSubtextoInline }}>
            {photoMeta.reason}
          </span>
        )}
      </div>
    );
  }

  const primerAutor = photoMeta?.attributions?.[0];
  const nombreProveedor = etiquetaProveedor(photoMeta?.provider);
  const textoCredito = primerAutor?.displayName
    ? `${primerAutor.displayName} · ${nombreProveedor}`
    : t('fotoLugar.creditoFoto', { proveedor: nombreProveedor });

  return (
    <div className="relative w-full h-full">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setImgError(true)}
        className={className}
      />

      {/* Atribuciones y procedencia */}
      <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] backdrop-blur-xs max-w-[85%]">
        <Camera className="w-3 h-3 shrink-0 text-[#F27B91]" aria-hidden="true" />
        <span className="truncate">{textoCredito}</span>
        {photoMeta?.sourceUrl && (
          <a
            href={photoMeta.sourceUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={t('fotoLugar.verFuente', { proveedor: nombreProveedor })}
            title={t('fotoLugar.verEn', { proveedor: nombreProveedor })}
            className="text-sky-300 hover:text-white shrink-0"
          >
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}
