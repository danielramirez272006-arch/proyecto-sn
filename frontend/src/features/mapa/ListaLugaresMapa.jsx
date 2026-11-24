import React, { useState } from 'react';
import {
  Search,
  X,
  Check,
  MapPin,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  PawPrint,
  Trees,
  Navigation,
  Volume2,
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { etiquetaEstadoMascota } from './adaptadorLugares';
import { useIdioma } from '../../context/IdiomaContext';

function IconoEstadoMascota({ estado }) {
  if (estado === 'permitido') return <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
  if (estado === 'no_permitido') return <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
  return <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
}

export function ListaLugaresMapa({
  tokens,
  lugares,
  busqueda,
  onBusquedaChange,
  cargandoBusqueda = false,
  filtros,
  onFiltrosChange,
  orden,
  onOrdenChange,
  onLimpiarFiltros,
  lugarSeleccionado,
  onSeleccionarLugar,
  compacto = false
}) {
  const { t } = useIdioma();
  const [masFiltrosAbierto, setMasFiltrosAbierto] = useState(false);

  const etiquetaProcedenciaCorta = (lugar) => {
    if (lugar.confirmadoPorEstablecimiento) return t('mapaExt.confirmadoLocal');
    if (lugar.esDemo) return t('mapaExt.demoEditorial');
    return t('mapaExt.senalExternaPend');
  };

  const cantidadFiltrosActivos =
    (filtros.soloPermitidos ? 1 : 0) +
    (filtros.conTerraza ? 1 : 0) +
    (filtros.soloTranquilos ? 1 : 0) +
    (!filtros.incluirDesconocidos ? 1 : 0) +
    (orden === 'distancia' ? 1 : 0);

  const hayBusquedaOFiltros = Boolean(busqueda.trim()) || cantidadFiltrosActivos > 0 || orden !== 'relevancia';

  const obtenerClaseBadgeMascota = (estado) => {
    if (estado === 'permitido') return tokens.badgePermitido;
    if (estado === 'no_permitido') return tokens.badgeNoPermitido;
    return tokens.badgeDesconocido;
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Buscador Principal */}
      <div className="space-y-2.5 shrink-0">
        <div className="relative">
          <Search
            className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${tokens.textoMuted}`}
            aria-hidden="true"
          />
          <label htmlFor="mapa-buscador" className="sr-only">
            {t('mapaExt.buscarPh')}
          </label>
          <input
            id="mapa-buscador"
            type="search"
            value={busqueda}
            onChange={(e) => onBusquedaChange(e.target.value)}
            placeholder={t('mapaExt.buscarPh')}
            className={`w-full pl-10 pr-16 py-2.5 rounded-2xl border text-xs sm:text-[13px] transition-colors ${tokens.inputClase}`}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {cargandoBusqueda && (
              <span
                aria-label={t('mapaExt.buscandoLugares')}
                className={`p-1 ${tokens.textoMuted}`}
              >
                <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin" aria-hidden="true" />
              </span>
            )}
            {busqueda && (
              <button
                type="button"
                onClick={() => onBusquedaChange('')}
                aria-label={t('mapaExt.borrarBusqueda')}
                className={`p-1 rounded-lg transition-transform active:scale-95 ${tokens.textoMuted} hover:opacity-80 ${tokens.focusRing}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filtros Principales + Más filtros */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('mapaExt.filtrosAria')}>
            <button
              type="button"
              aria-pressed={filtros.soloPermitidos}
              onClick={() =>
                onFiltrosChange((prev) => ({ ...prev, soloPermitidos: !prev.soloPermitidos }))
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all active:scale-[0.98] ${tokens.focusRing} ${
                filtros.soloPermitidos ? tokens.chipActivo : tokens.chipInactivo
              }`}
            >
              <PawPrint className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t('mapaExt.mascotasChip')}</span>
              {filtros.soloPermitidos && <Check className="w-3 h-3 shrink-0" aria-hidden="true" />}
            </button>

            <button
              type="button"
              aria-pressed={orden === 'distancia'}
              onClick={() => onOrdenChange(orden === 'distancia' ? 'relevancia' : 'distancia')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all active:scale-[0.98] ${tokens.focusRing} ${
                orden === 'distancia' ? tokens.chipActivo : tokens.chipInactivo
              }`}
            >
              <Navigation className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t('mapaExt.cercanosChip')}</span>
              {orden === 'distancia' && <Check className="w-3 h-3 shrink-0" aria-hidden="true" />}
            </button>

            <button
              type="button"
              aria-pressed={filtros.conTerraza}
              onClick={() =>
                onFiltrosChange((prev) => ({ ...prev, conTerraza: !prev.conTerraza }))
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all active:scale-[0.98] ${tokens.focusRing} ${
                filtros.conTerraza ? tokens.chipActivo : tokens.chipInactivo
              }`}
            >
              <Trees className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t('mapaExt.terrazaChip')}</span>
              {filtros.conTerraza && <Check className="w-3 h-3 shrink-0" aria-hidden="true" />}
            </button>

            <button
              type="button"
              aria-expanded={masFiltrosAbierto}
              onClick={() => setMasFiltrosAbierto((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all active:scale-[0.98] ${tokens.focusRing} ${
                masFiltrosAbierto || filtros.soloTranquilos || !filtros.incluirDesconocidos
                  ? tokens.chipActivo
                  : tokens.chipInactivo
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t('mapaExt.masFiltros')}</span>
              {masFiltrosAbierto ? (
                <ChevronUp className="w-3 h-3 shrink-0" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-3 h-3 shrink-0" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Panel desplegable de Más filtros */}
          {masFiltrosAbierto && (
            <div className={`p-3 rounded-2xl border space-y-2.5 ${tokens.superficieSecundaria}`}>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  aria-pressed={filtros.soloTranquilos}
                  onClick={() =>
                    onFiltrosChange((prev) => ({ ...prev, soloTranquilos: !prev.soloTranquilos }))
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-colors ${tokens.focusRing} ${
                    filtros.soloTranquilos ? tokens.chipActivo : tokens.chipInactivo
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{t('mapaExt.tranquilosChip')}</span>
                  {filtros.soloTranquilos && <Check className="w-3 h-3 shrink-0" aria-hidden="true" />}
                </button>

                <button
                  type="button"
                  aria-pressed={filtros.incluirDesconocidos}
                  onClick={() =>
                    onFiltrosChange((prev) => ({
                      ...prev,
                      incluirDesconocidos: !prev.incluirDesconocidos
                    }))
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-colors ${tokens.focusRing} ${
                    filtros.incluirDesconocidos ? tokens.chipActivo : tokens.chipInactivo
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{t('mapaExt.incluirDesconocidos')}</span>
                  {filtros.incluirDesconocidos && <Check className="w-3 h-3 shrink-0" aria-hidden="true" />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="mapa-orden" className={`text-[11px] font-semibold shrink-0 ${tokens.textoCuerpo}`}>
                  {t('mapaExt.ordenarPor')}
                </label>
                <select
                  id="mapa-orden"
                  value={orden}
                  onChange={(e) => onOrdenChange(e.target.value)}
                  className={`flex-1 min-w-0 px-2.5 py-1.5 rounded-xl border text-xs font-medium ${tokens.inputClase}`}
                >
                  <option value="relevancia">{t('mapaExt.ordRelevancia')}</option>
                  <option value="distancia">{t('mapaExt.ordDistancia')}</option>
                  <option value="tranquilidad">{t('mapaExt.ordTranquilidad')}</option>
                  <option value="nombre">{t('mapaExt.ordNombre')}</option>
                </select>
              </div>
            </div>
          )}

          {/* Resumen de filtros aplicados y botón limpiar */}
          {hayBusquedaOFiltros && (
            <div className="flex items-center justify-between gap-2 text-[11px] px-0.5">
              <span className={tokens.textoMuted}>
                {lugares.length} {lugares.length === 1 ? t('mapaExt.resultadoSing') : t('mapaExt.resultadoPlur')}
                {cantidadFiltrosActivos > 0 ? ` ${t('mapaExt.filtrosCount', { n: cantidadFiltrosActivos })}` : ''}
              </span>
              <button
                type="button"
                onClick={onLimpiarFiltros}
                className={`font-semibold underline underline-offset-2 ${tokens.textoTitulo} hover:opacity-80 ${tokens.focusRing}`}
              >
                {t('mapaExt.limpiarFiltros')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lista de tarjetas simplificadas */}
      <div
        className={`flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5 ${
          compacto ? 'overscroll-contain' : ''
        }`}
      >
        {lugares.length === 0 ? (
          <div className={`p-5 rounded-2xl border text-center space-y-2 ${tokens.superficieSecundaria}`}>
            <ShieldAlert className={`w-6 h-6 mx-auto ${tokens.textoMuted}`} aria-hidden="true" />
            <p className={`text-xs font-semibold ${tokens.textoTitulo}`}>
              {t('mapaExt.sinCoincidencias')}
            </p>
            <p className={`text-[11px] ${tokens.textoMuted}`}>
              {t('mapaExt.sinCoincidenciasSub')}
            </p>
            {hayBusquedaOFiltros && (
              <button
                type="button"
                onClick={onLimpiarFiltros}
                className={`mt-1 inline-flex items-center px-3 py-1.5 rounded-xl border text-xs font-semibold ${tokens.botonSecundario} ${tokens.focusRing}`}
              >
                {t('mapaExt.limpiarFiltros')}
              </button>
            )}
          </div>
        ) : (
          lugares.map((lugar) => {
            const seleccionado = lugarSeleccionado?.id === lugar.id;
            return (
              <button
                key={lugar.id}
                type="button"
                aria-pressed={seleccionado}
                onClick={(e) => onSeleccionarLugar(lugar, e.currentTarget)}
                className={`w-full p-3 rounded-2xl border transition-all duration-150 text-left flex items-start gap-3 active:scale-[0.99] ${tokens.focusRing} ${
                  seleccionado
                    ? `${tokens.tarjetaSeleccionada} shadow-md -translate-y-0.5`
                    : `${tokens.tarjeta} hover:shadow-sm`
                }`}
              >
                {/* Miniatura real si existe, o marcador sin foto */}
                <div
                  className={`w-14 h-14 rounded-xl border shrink-0 overflow-hidden flex items-center justify-center ${tokens.superficieSecundaria}`}
                >
                  {lugar.imagen ? (
                    <img
                      src={lugar.imagen}
                      alt={lugar.nombre}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <MapPin className={`w-5 h-5 ${tokens.textoMuted}`} aria-hidden="true" />
                  )}
                </div>

                {/* Jerarquía limpia: Nombre, distancia y acceso con mascotas */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`font-serif font-bold text-sm leading-snug truncate ${tokens.textoTitulo}`}>
                      {lugar.nombre}
                    </h3>
                    {lugar.distanciaKm !== null && (
                      <span className={`text-[11px] font-mono font-semibold shrink-0 ${tokens.textoCuerpo}`}>
                        {lugar.distanciaKm.toFixed(1)} km
                      </span>
                    )}
                  </div>

                  <p className={`text-[11px] truncate ${tokens.textoMuted}`}>
                    {lugar.zona}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${obtenerClaseBadgeMascota(
                        lugar.petStatus
                      )}`}
                    >
                      <IconoEstadoMascota estado={lugar.petStatus} />
                      <span>{etiquetaEstadoMascota(lugar.petStatus, t)}</span>
                    </span>
                    <span className={`text-[10px] font-medium ${tokens.textoMuted}`}>
                      {etiquetaProcedenciaCorta(lugar)}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
