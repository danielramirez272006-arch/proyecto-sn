import React, { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  X,
  MapPin,
  Volume2,
  Thermometer,
  Clock,
  Phone,
  ExternalLink,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Info,
  Crosshair
} from 'lucide-react';
import {
  etiquetaEstadoMascota,
  etiquetaTerraza,
  etiquetaTranquilidad
} from './adaptadorLugares';

export function PanelDetalleLugar({
  lugar,
  tokens,
  modo = 'columna', // 'columna' | 'modal'
  onCerrar,
  onCentrarEnMapa,
  triggerRef
}) {
  const closeButtonRef = useRef(null);
  const panelRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  // Foco inicial, tecla Escape y devolución del foco al cerrar
  useEffect(() => {
    if (!lugar) return undefined;

    const timer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 10);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCerrar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Bloquear scroll de la página de fondo solo en modo modal móvil/tablet
    const prevOverflow = document.body.style.overflow;
    if (modo === 'modal') {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      if (modo === 'modal') {
        document.body.style.overflow = prevOverflow;
      }
      if (triggerRef?.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    };
  }, [lugar, modo, onCerrar, triggerRef]);

  if (!lugar) return null;

  const badgeMascota =
    lugar.petStatus === 'permitido'
      ? tokens.badgePermitido
      : lugar.petStatus === 'no_permitido'
      ? tokens.badgeNoPermitido
      : tokens.badgeDesconocido;

  const IconoMascota =
    lugar.petStatus === 'permitido'
      ? CheckCircle2
      : lugar.petStatus === 'no_permitido'
      ? XCircle
      : HelpCircle;

  const contenido = (
    <motion.div
      ref={panelRef}
      initial={prefersReducedMotion ? false : { opacity: 0, y: modo === 'modal' ? 16 : 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: 'easeOut' }}
      role={modo === 'modal' ? 'dialog' : 'region'}
      aria-modal={modo === 'modal' ? 'true' : undefined}
      aria-labelledby="detalle-lugar-titulo"
      className={`flex flex-col h-full min-h-0 rounded-2xl border p-4 space-y-3.5 text-left ${tokens.superficiePrincipal}`}
    >
      {/* Cabecera con botón de cierre visible */}
      <div className="flex items-start justify-between gap-3 shrink-0">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                lugar.esDemo ? tokens.badgeDemo : tokens.badgeDesconocido
              }`}
            >
              <Info className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>{lugar.esDemo ? 'Demo Editorial' : 'Señal Externa'}</span>
            </span>
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${tokens.textoMuted}`}>
              {lugar.categoria}
            </span>
          </div>

          <h2 id="detalle-lugar-titulo" className={`font-serif font-bold text-lg leading-snug ${tokens.textoTitulo}`}>
            {lugar.nombre}
          </h2>

          <p className={`text-xs flex items-start gap-1.5 ${tokens.textoCuerpo}`}>
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {lugar.direccion}
              {lugar.distanciaKm !== null ? ` · ~${lugar.distanciaKm.toFixed(1)} km (estimado)` : ''}
            </span>
          </p>
        </div>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar detalle del lugar"
          className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-semibold ${tokens.botonSecundario} ${tokens.focusRing}`}
        >
          <X className="w-4 h-4" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Cerrar</span>
        </button>
      </div>

      {/* Cuerpo scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 overscroll-contain">
        {lugar.imagen && (
          <div className={`rounded-xl overflow-hidden border ${tokens.bordeSuave}`}>
            <img
              src={lugar.imagen}
              alt={lugar.nombre}
              loading="lazy"
              className="w-full h-36 object-cover"
            />
            {lugar.fotoCredito && (
              <p className={`px-2.5 py-1 text-[10px] ${tokens.textoMuted}`}>
                Fotografía: {lugar.fotoCredito}
              </p>
            )}
          </div>
        )}

        {/* Aviso explícito de procedencia / no verificación oficial */}
        <div className={`p-3 rounded-xl border text-xs space-y-1 ${tokens.superficieSecundaria}`}>
          <p className={`font-bold ${tokens.textoTitulo}`}>Procedencia de la información</p>
          <p className={tokens.textoCuerpo}>{lugar.etiquetaProcedencia}</p>
          <p className={`text-[11px] ${tokens.textoMuted}`}>Fuente: {lugar.fuente}</p>
        </div>

        {/* Estado de compatibilidad y condiciones */}
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${badgeMascota}`}>
            <IconoMascota className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{etiquetaEstadoMascota(lugar.petStatus)}</span>
          </span>

          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${tokens.badgeDesconocido}`}>
            <Volume2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{etiquetaTranquilidad(lugar.tranquilidad, lugar.decibelios)}</span>
          </span>

          <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${tokens.badgeDesconocido}`}>
            {etiquetaTerraza(lugar.terraza)}
          </span>
        </div>

        {lugar.descripcion && (
          <p className={`text-xs leading-relaxed ${tokens.textoCuerpo}`}>{lugar.descripcion}</p>
        )}

        {lugar.condicionesMascotas && (
          <div className={`p-3 rounded-xl border text-xs space-y-1 ${tokens.superficieSecundaria}`}>
            <span className={`font-bold block ${tokens.textoTitulo}`}>Notas registradas (demo)</span>
            <p className={tokens.textoCuerpo}>{lugar.condicionesMascotas}</p>
          </div>
        )}

        {(lugar.temperaturaPiso || lugar.horarioRecomendado || lugar.telefono) && (
          <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${tokens.superficieSecundaria}`}>
            {lugar.temperaturaPiso && (
              <p className={`flex items-center gap-2 ${tokens.textoCuerpo}`}>
                <Thermometer className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Calzada estimada (demo): {lugar.temperaturaPiso}</span>
              </p>
            )}
            {lugar.horarioRecomendado && (
              <p className={`flex items-center gap-2 ${tokens.textoCuerpo}`}>
                <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Horario: {lugar.horarioRecomendado}</span>
              </p>
            )}
            {lugar.telefono && (
              <p className={`flex items-center gap-2 ${tokens.textoCuerpo}`}>
                <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{lugar.telefono}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className={`pt-2 border-t flex flex-wrap items-center justify-between gap-2 shrink-0 ${tokens.bordeSuave}`}>
        <button
          type="button"
          onClick={() => onCentrarEnMapa(lugar)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold ${tokens.botonSecundario} ${tokens.focusRing}`}
        >
          <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Centrar en mapa</span>
        </button>

        {Number.isFinite(lugar.lat) && Number.isFinite(lugar.lng) && (
          <a
            href={`https://www.openstreetmap.org/?mlat=${lugar.lat}&mlon=${lugar.lng}#map=17/${lugar.lat}/${lugar.lng}`}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold ${tokens.botonPrimario} ${tokens.focusRing}`}
          >
            <span>Ver en OpenStreetMap</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>
        )}
      </div>
    </motion.div>
  );

  if (modo === 'modal') {
    return (
      <div
        className="fixed inset-0 z-[1200] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onCerrar();
        }}
      >
        <div className="w-full sm:max-w-lg max-h-[88dvh] flex flex-col">
          {contenido}
        </div>
      </div>
    );
  }

  return contenido;
}
