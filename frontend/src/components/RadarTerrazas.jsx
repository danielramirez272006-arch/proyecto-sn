import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TERRAZAS } from '../data/terrazas';
import { api } from '../shared/services/api-client';
import { useResolvedPlacePhotos } from '../shared/services/place-photos-service';
import { LugarFoto } from './LugarFoto';
import { useIdioma } from '../context/IdiomaContext';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import {
  Volume2,
  Users,
  Sun,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  SlidersHorizontal,
  Droplets,
  Info,
  Sparkles,
  Search,
  Filter,
  Clock,
  HeartHandshake
} from 'lucide-react';

export function RadarTerrazas() {
  const { t } = useIdioma();
  const [filtroRuido, setFiltroRuido] = useState('todos'); // 'todos' | 'silencioso' | 'moderado'
  const [soloEspacioDisponible, setSoloEspacioDisponible] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [terrazaSeleccionada, setTerrazaSeleccionada] = useState(null);
  const [backendPlacesCount, setBackendPlacesCount] = useState(null);
  const { lugaresConFotos: terrazasConFotos, cargandoFotos } = useResolvedPlacePhotos(TERRAZAS);

  useEffect(() => {
    let activo = true;
    api.get('/places?limit=20')
      .then((places) => {
        if (activo && Array.isArray(places)) {
          setBackendPlacesCount(places.length);
        }
      })
      .catch(() => {
        // Modo local sin backend activo
      });
    return () => { activo = false; };
  }, []);

  const terrazasFiltradas = terrazasConFotos.filter((terraza) => {
    if (filtroRuido !== 'todos') {
      if (filtroRuido === 'silencioso' && !terraza.nivelRuido.toLowerCase().includes('silencioso')) {
        return false;
      }
      if (filtroRuido === 'moderado' && terraza.nivelRuido.toLowerCase() !== 'moderado') {
        return false;
      }
    }
    if (soloEspacioDisponible && terraza.aforoCaninoActual >= terraza.aforoCaninoMax) {
      return false;
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      const coincide =
        terraza.nombre.toLowerCase().includes(q) ||
        terraza.zona.toLowerCase().includes(q) ||
        terraza.categoria.toLowerCase().includes(q);
      if (!coincide) return false;
    }
    return true;
  }).sort((a, b) => (b.imagen ? 1 : 0) - (a.imagen ? 1 : 0));

  return (
    <section id="terrazas" className="py-16 md:py-24 relative overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 space-y-10">
        {/* ============================================================
            ENCABEZADO DE SECCIÓN
            ============================================================ */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
          <div className="space-y-2 max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111827] border border-white/10 text-xs font-semibold text-[#F27B91]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t('radar.badge')}</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#E8EDF5] tracking-tight">
              {t('radar.titulo')}
            </h2>
            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
              {t('radar.subtitulo')}
            </p>
          </div>

          {backendPlacesCount && (
            <div className="text-xs text-[#94A3B8] bg-[#111827] px-3.5 py-1.5 rounded-xl border border-white/10 self-start md:self-auto flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{t('radar.lugaresRed', { n: backendPlacesCount })}</span>
            </div>
          )}
        </div>

        {/* ============================================================
            BARRA DE FILTROS Y BÚSQUEDA REDISEÑADA (Chips Premium)
            ============================================================ */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-3 rounded-2xl bg-[#111827] border border-white/10 shadow-sm">
          {/* Campo de búsqueda */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label={t('radar.buscarPh')}
              placeholder={t('radar.buscarPh')}
              className="w-full bg-[#162032] text-xs text-[#E8EDF5] placeholder-[#94A3B8]/60 pl-10 pr-3 py-2.5 rounded-xl border border-white/5 focus:outline-none focus:border-[#F27B91] transition-colors"
            />
          </div>

          {/* Chips de filtro por ruido */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-[#94A3B8] px-2 hidden lg:inline">
              {t('terrazas.ruido')}:
            </span>
            <button
              type="button"
              onClick={() => setFiltroRuido('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filtroRuido === 'todos'
                  ? 'bg-[#55152D] text-white shadow-xs'
                  : 'bg-[#162032] text-[#94A3B8] hover:text-[#E8EDF5] border border-white/5'
              }`}
            >
              {t('terrazas.todos')}
            </button>
            <button
              type="button"
              onClick={() => setFiltroRuido('silencioso')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filtroRuido === 'silencioso'
                  ? 'bg-[#55152D] text-white shadow-xs'
                  : 'bg-[#162032] text-[#94A3B8] hover:text-[#E8EDF5] border border-white/5'
              }`}
            >
              {t('radar.silencioso50')}
            </button>
            <button
              type="button"
              onClick={() => setFiltroRuido('moderado')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                filtroRuido === 'moderado'
                  ? 'bg-[#55152D] text-white shadow-xs'
                  : 'bg-[#162032] text-[#94A3B8] hover:text-[#E8EDF5] border border-white/5'
              }`}
            >
              {t('radar.moderado')}
            </button>

            {/* Toggle de aforo libre */}
            <button
              type="button"
              onClick={() => setSoloEspacioDisponible(!soloEspacioDisponible)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                soloEspacioDisponible
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-[#162032] text-[#94A3B8] hover:text-[#E8EDF5] border-white/5'
              }`}
            >
              {t('radar.soloCupos')}
            </button>
          </div>
        </div>

        {/* ============================================================
            GRILLA DE FICHAS DE ESTABLECIMIENTOS (Jerarquía Premium)
            ============================================================ */}
        {terrazasFiltradas.length === 0 ? (
          <div className="p-12 rounded-3xl bg-[#111827] border border-white/10 text-center space-y-3">
            <SlidersHorizontal className="w-8 h-8 text-[#94A3B8] mx-auto" />
            <h3 className="font-serif font-bold text-lg text-[#E8EDF5]">
              {t('radar.sinResultadosTitulo')}
            </h3>
            <p className="text-xs text-[#94A3B8]">
              {t('radar.sinResultadosSub')}
            </p>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setFiltroRuido('todos');
                setSoloEspacioDisponible(false);
                setBusqueda('');
              }}
              className="bg-[#162032] text-[#E8EDF5] border-white/10 hover:border-[#F27B91]/30"
            >
              {t('radar.restablecerFiltros')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 sm:gap-8">
            {terrazasFiltradas.map((terraza) => {
              const espacioLibre = terraza.aforoCaninoMax - terraza.aforoCaninoActual;
              return (
                <Card
                  key={terraza.id}
                  className="p-0 bg-[#111827] border-white/10 rounded-3xl overflow-hidden flex flex-col justify-between hover:border-[#F27B91]/30 transition-all duration-300 shadow-md group"
                >
                  {/* Fotografía Real (Google Places) o marcador sin fotografía */}
                  <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-slate-900">
                    <LugarFoto
                      src={terraza.imagen}
                      alt={t('radar.altTerraza', { nombre: terraza.nombre })}
                      photoMeta={terraza.photoMeta}
                      cargando={cargandoFotos}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-black/20 to-transparent pointer-events-none" />

                    {/* Badge de Verificación y Procedencia */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#55152D]/90 text-white backdrop-blur-md border border-[#F27B91]/30 shadow-md">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#F27B91]" />
                        {terraza.insignia}
                      </span>
                      {terraza.procedenciaVerificacion && (
                        <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-medium bg-[#111827]/80 backdrop-blur-md text-[#94A3B8] border border-white/10">
                          {terraza.procedenciaVerificacion}
                        </span>
                      )}
                    </div>

                    {/* Nivel de Decibelios */}
                    <div className="absolute bottom-3 right-3 bg-[#111827]/90 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs font-semibold text-[#E8EDF5] border border-white/10 shadow-sm flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-[#F27B91]" />
                      <span className="tabular-nums">{terraza.decibelios} dB</span>
                      <span className="text-[10px] text-[#94A3B8]">({terraza.nivelRuido})</span>
                    </div>
                  </div>

                  {/* Cuerpo de la Ficha */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4 text-left">
                    <div className="space-y-2">
                      {/* Categoría y Calificación */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase font-semibold tracking-wider text-[#F27B91]">
                          {terraza.categoria}
                        </span>
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          ★ {terraza.puntuacionPet}
                        </span>
                      </div>

                      {/* Nombre Principal */}
                      <h3 className="font-serif text-2xl font-bold text-[#E8EDF5] group-hover:text-white transition-colors">
                        {terraza.nombre}
                      </h3>

                      {/* Ubicación */}
                      <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                        <MapPin className="w-3.5 h-3.5 text-[#F27B91] shrink-0" />
                        <span>{terraza.zona}</span>
                      </div>

                      {/* Descripción breve */}
                      <p className="text-xs sm:text-sm text-[#94A3B8] line-clamp-2 leading-relaxed pt-1">
                        {terraza.descripcion}
                      </p>
                    </div>

                    {/* Condiciones para Mascotas */}
                    {terraza.condicionesMascotas && (
                      <div className="p-3 rounded-2xl bg-[#162032] border border-white/5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          {t('radar.condicionesMascotas')}
                        </span>
                        <p className="text-xs text-[#E8EDF5] leading-relaxed">
                          {terraza.condicionesMascotas}
                        </p>
                      </div>
                    )}

                    {/* Indicadores Clave: Aforo y Piso Térmico */}
                    <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-white/5 text-xs">
                      <div className="bg-[#162032] p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] text-[#94A3B8] block uppercase font-medium">{t('radar.aforoCanino')}</span>
                        <div className="font-semibold text-[#E8EDF5] flex items-center justify-between mt-0.5">
                          <span>{terraza.aforoCaninoActual} / {terraza.aforoCaninoMax}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                              espacioLibre > 0
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-rose-500/15 text-rose-300'
                            }`}
                          >
                            {espacioLibre > 0 ? t('comun.libresCount', { n: espacioLibre }) : t('comun.lleno')}
                          </span>
                        </div>
                      </div>

                      <div className="bg-[#162032] p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] text-[#94A3B8] block uppercase font-medium">{t('radar.pisoTermico')}</span>
                        <div className="font-semibold text-[#E8EDF5] flex items-center justify-between mt-0.5">
                          <span>{terraza.temperaturaPiso}</span>
                          <span className="text-[10px] text-emerald-400 font-normal">{t('radar.sombraPct', { pct: terraza.sombraPorcentaje })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Servicios incluidos */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {terraza.servicios.slice(0, 3).map((serv, i) => (
                        <span
                          key={i}
                          className="text-[11px] bg-[#162032] text-[#94A3B8] px-2.5 py-0.5 rounded-lg border border-white/5"
                        >
                          {serv}
                        </span>
                      ))}
                    </div>

                    {/* Botón de Ficha de Verificación */}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full justify-center bg-[#162032] hover:bg-[#1e293b] text-[#E8EDF5] border-white/10 hover:border-[#F27B91]/30 transition-all"
                      icon={Info}
                      onClick={() => setTerrazaSeleccionada(terraza)}
                    >
                      {t('radar.verFicha')}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Acceso a la Página Independiente de Terrazas */}
        <div className="pt-4 flex justify-center">
          <Link to="/terrazas">
            <Button
              variant="secondary"
              size="lg"
              className="bg-[#111827] text-[#E8EDF5] hover:text-[#F27B91] border-white/10 hover:border-[#F27B91]/30 shadow-md font-semibold"
            >
              {t('radar.explorarCompleto')}
            </Button>
          </Link>
        </div>

        {/* ============================================================
            MODAL DE FICHA DE VERIFICACIÓN
            ============================================================ */}
        {terrazaSeleccionada && (
          <Modal
            isOpen={!!terrazaSeleccionada}
            onClose={() => setTerrazaSeleccionada(null)}
            title={t('radar.modalTitulo', { nombre: terrazaSeleccionada.nombre })}
          >
            <div className="space-y-4 text-xs sm:text-sm text-[#CBD5E1] text-left">
              {/* Header de verificación */}
              <div className="flex items-center justify-between p-3.5 bg-[#55152D]/25 rounded-2xl border border-[#F27B91]/25">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#F27B91]" />
                  <div>
                    <span className="font-semibold text-[#E8EDF5] block">
                      {terrazaSeleccionada.insignia}
                    </span>
                    <span className="text-[10px] text-[#94A3B8]">
                      {terrazaSeleccionada.procedenciaVerificacion || t('radar.auditoriaDefault')}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                  {t('radar.auditadoVigente')}
                </span>
              </div>

              {/* Métricas acústicas y térmicas */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#162032] rounded-xl border border-white/5 space-y-1">
                  <span className="text-[#94A3B8] block uppercase text-[10px]">{t('radar.nivelAcustico')}</span>
                  <p className="font-bold text-base text-[#E8EDF5]">
                    {terrazaSeleccionada.decibelios} dB ({terrazaSeleccionada.nivelRuido})
                  </p>
                  <p className="text-[11px] text-[#94A3B8]">{t('radar.aptoSensibles')}</p>
                </div>
                <div className="p-3 bg-[#162032] rounded-xl border border-white/5 space-y-1">
                  <span className="text-[#94A3B8] block uppercase text-[10px]">{t('radar.tempCalzada')}</span>
                  <p className="font-bold text-base text-[#E8EDF5]">
                    {terrazaSeleccionada.temperaturaPiso}
                  </p>
                  <p className="text-[11px] text-[#94A3B8]">
                    {t('radar.sombraContinuaDesc', { pct: terrazaSeleccionada.sombraPorcentaje })}
                  </p>
                </div>
              </div>

              {/* Condiciones y Protocolos */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  {t('radar.serviciosProtocolos')}
                </h4>
                <ul className="space-y-1.5 text-xs">
                  {terrazaSeleccionada.servicios.map((s, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-2">
                    <Droplets className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{t('radar.hidratacionContinua')}</span>
                  </li>
                </ul>
              </div>

              {/* Horario y Cierre */}
              <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <span className="text-[#94A3B8]">
                  {t('radar.horarioOptimo')} <strong className="text-[#E8EDF5]">{terrazaSeleccionada.horarioRecomendado}</strong>
                </span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setTerrazaSeleccionada(null)}
                  className="bg-[#55152D] hover:bg-[#6E1E3A] text-white"
                >
                  {t('radar.entendido')}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </section>
  );
}
