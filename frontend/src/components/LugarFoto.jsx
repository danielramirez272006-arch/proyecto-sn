import React, { useState, useEffect } from 'react';
import {
  Camera,
  ExternalLink,
  Loader2,
  Utensils,
  Sparkles,
  Coffee,
  Trees,
  Landmark,
  ShieldCheck
} from 'lucide-react';
import { useTema } from '../context/TemaContext';
import { useIdioma } from '../context/IdiomaContext';

function etiquetaProveedor(provider) {
  if (
    provider === 'supabase_database' ||
    provider === 'own_catalog' ||
    provider === 'supabase_storage' ||
    provider === 'synodos_db' ||
    provider === 'academic_dataset' ||
    provider === 'curated_local' ||
    provider === 'admin_upload'
  ) {
    return 'Catálogo Synodos';
  }
  if (provider === 'wikimedia_commons') return 'Wikimedia Commons';
  if (provider === 'foursquare') return 'Foursquare';
  return 'Catálogo Synodos';
}

/**
 * Selecciona el estilo visual e ícono editorial según el nombre del establecimiento
 * cuando no tiene una fotografía externa cargada.
 */
function resolverEstiloEditorialPorNombre(altText = '', esClaro = false, esMorado = false) {
  const texto = String(altText).toLowerCase();

  if (texto.includes('café') || texto.includes('cafe') || texto.includes('coffee') || texto.includes('bakery')) {
    return {
      Icono: Coffee,
      etiquetaEs: 'Cafetería & Terraza GAM',
      etiquetaEn: 'Specialty Coffee & Terrace',
      gradiente: esClaro
        ? 'from-[#FDF2F6] via-[#F9E6EE] to-[#F2D5E2]'
        : esMorado
        ? 'from-[#3D1428] via-[#260D1A] to-[#15070E]'
        : 'from-[#2A1826] via-[#1A162B] to-[#0F172A]'
    };
  }

  if (texto.includes('parque') || texto.includes('park') || texto.includes('sabana') || texto.includes('jardín')) {
    return {
      Icono: Trees,
      etiquetaEs: 'Espacio Verde & Sendero GAM',
      etiquetaEn: 'Urban Park & Green Trail',
      gradiente: esClaro
        ? 'from-emerald-50 via-teal-50/80 to-emerald-100/70'
        : 'from-[#0D2821] via-[#0F1E26] to-[#09131C]'
    };
  }

  if (texto.includes('museo') || texto.includes('teatro') || texto.includes('galería') || texto.includes('cultura')) {
    return {
      Icono: Landmark,
      etiquetaEs: 'Patrimonio & Cultura GAM',
      etiquetaEn: 'Cultural Venue & Heritage',
      gradiente: esClaro
        ? 'from-amber-50 via-[#FAF5F8] to-[#F3E4EC]'
        : 'from-[#2D1B2E] via-[#1C162A] to-[#0F172A]'
    };
  }

  return {
    Icono: Utensils,
    etiquetaEs: 'Gastronomía & Terraza Verificada',
    etiquetaEn: 'Verified Dining & Terrace',
    gradiente: esClaro
      ? 'from-[#FDF2F6] via-[#FAF5F8] to-[#F3E4EC]'
      : esMorado
      ? 'from-[#351324] via-[#210D18] to-[#14070F]'
      : 'from-[#1E293B] via-[#162032] to-[#0F172A]'
  };
}

/**
 * Renderiza la fotografía real de un establecimiento o una portada editorial ilustrada por categoría
 * cuando no hay fotografía externa disponible.
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
  const { idioma, t } = useIdioma();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const estiloEditorial = resolverEstiloEditorialPorNombre(alt, esClaro, esMorado);
  const IconoCategoria = estiloEditorial.Icono;

  const colorTextoInline = esClaro ? '#501228' : esMorado ? '#FDF2F6' : '#F1F5F9';
  const colorSubtextoInline = esClaro ? '#64748B' : esMorado ? '#F27B91' : '#FDA4AF';
  const fondoBadgeIcono = esClaro
    ? 'bg-white/90 border-[#E9D3DD] shadow-sm'
    : esMorado
    ? 'bg-[#46182E]/90 border-[#F27B91]/35 shadow-md'
    : 'bg-[#0F172A]/85 border-white/15 shadow-md';

  if (cargando && !src) {
    return (
      <div
        style={{ color: colorTextoInline }}
        className={`w-full h-full flex flex-col items-center justify-center gap-1.5 p-3 text-center bg-gradient-to-br ${estiloEditorial.gradiente}`}
      >
        <Loader2 className="w-5 h-5 motion-safe:animate-spin text-[#F27B91]" aria-hidden="true" />
        {!compacto && <span className="text-[11px] font-medium">{t('fotoLugar.consultando')}</span>}
      </div>
    );
  }

  if (!src || imgError) {
    const nombreLimpio = String(alt || t('fotoLugar.establecimientoDefault'))
      .replace(/^Fotografía de\s+/i, '')
      .replace(/^Photo of\s+/i, '')
      .trim();
    const subtituloEditorial =
      idioma === 'en' ? estiloEditorial.etiquetaEn : estiloEditorial.etiquetaEs;

    return (
      <div
        role="img"
        aria-label={`${nombreLimpio} — ${subtituloEditorial}`}
        style={{ color: colorTextoInline }}
        className={`relative w-full h-full flex flex-col items-center justify-center gap-2 p-5 text-center overflow-hidden bg-gradient-to-br ${estiloEditorial.gradiente} border-b border-white/10`}
      >
        {/* Círculos arquitectónicos decorativos */}
        <div
          aria-hidden="true"
          className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-[#F27B91]/15 blur-xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -left-8 -bottom-8 w-28 h-28 rounded-full bg-[#501228]/25 blur-lg pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute inset-3 rounded-2xl border border-current/10 pointer-events-none"
        />

        <div className={`relative w-11 h-11 rounded-2xl border flex items-center justify-center ${fondoBadgeIcono}`}>
          <IconoCategoria className="w-5 h-5" style={{ color: colorTextoInline }} aria-hidden="true" />
          <Sparkles className="w-3 h-3 text-[#F27B91] absolute -top-1 -right-1" aria-hidden="true" />
        </div>

        {!compacto && (
          <div className="relative space-y-0.5 max-w-[85%]">
            <p className="font-serif font-bold text-sm leading-snug line-clamp-1">
              {nombreLimpio}
            </p>
            <p
              className="text-[10px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1"
              style={{ color: colorSubtextoInline }}
            >
              <ShieldCheck className="w-3 h-3 shrink-0" />
              <span>{subtituloEditorial}</span>
            </p>
          </div>
        )}
      </div>
    );
  }

  const primerAutor = photoMeta?.attributions?.[0];
  const nombreProveedor = etiquetaProveedor(photoMeta?.provider);
  const autorLimpio = primerAutor?.displayName
    ? String(primerAutor.displayName).split('Fuente:')[0].trim().replace(/\.$/, '')
    : '';
  const textoCredito = autorLimpio
    ? `${autorLimpio} · ${nombreProveedor}`
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
      <div
        style={{ color: '#FFFFFF' }}
        className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/75 text-white text-[10px] backdrop-blur-xs max-w-[75%]"
      >
        <Camera className="w-3 h-3 shrink-0 text-[#F27B91]" aria-hidden="true" />
        <span className="truncate" style={{ color: '#FFFFFF' }}>{textoCredito}</span>
        {photoMeta?.sourceUrl && (
          <a
            href={photoMeta.sourceUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label={t('fotoLugar.verFuente', { proveedor: nombreProveedor })}
            title={t('fotoLugar.verEn', { proveedor: nombreProveedor })}
            style={{ color: '#7DD3FC' }}
            className="text-sky-300 hover:text-white shrink-0"
          >
            <ExternalLink className="w-3 h-3" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}
