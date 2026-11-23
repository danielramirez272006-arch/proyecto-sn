import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TERRAZAS } from '../data/terrazas';
import { api } from '../shared/services/api-client';
import { useResolvedPlacePhotos } from '../shared/services/place-photos-service';
import { LugarFoto } from '../components/LugarFoto';
import { PageWrapper } from '../components/PageWrapper';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useIdioma } from '../context/IdiomaContext';
import {
  ShieldCheck,
  Search,
  Filter,
  Volume2,
  Thermometer,
  Users,
  MapPin,
  Clock,
  Droplets,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Sun,
  Award,
  Layers,
  SlidersHorizontal,
  RotateCcw,
  Compass
} from 'lucide-react';
import { containerStagger, itemStagger, TRANSICION_SUAVE } from '../estilos/animaciones';

export function TerrazasPage() {
  const { t } = useIdioma();
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRuido, setFiltroRuido] = useState('todos'); // 'todos' | 'silencioso' | 'moderado'
  const [filtroZona, setFiltroZona] = useState('todas');
  const [soloEspacioDisponible, setSoloEspacioDisponible] = useState(false);
  const [terrazaSeleccionada, setTerrazaSeleccionada] = useState(null);
  const [backendPlacesCount, setBackendPlacesCount] = useState(null);
  const { lugaresConFotos: terrazasConFotos, cargandoFotos } = useResolvedPlacePhotos(TERRAZAS);

  // Simulación de carga inicial para stagger suave
  useEffect(() => {
    const timer = setTimeout(() => setCargando(false), 280);
    return () => clearTimeout(timer);
  }, []);

  // Consulta de lugares reales conectados en backend
  useEffect(() => {
    let activo = true;
    api.get('/places?limit=20')
      .then((places) => {
        if (activo && Array.isArray(places)) {
          setBackendPlacesCount(places.length);
        }
      })
      .catch(() => {});
    return () => { activo = false; };
  }, []);

  // Zonas únicas detectadas de los datos
  const zonasDisponibles = useMemo(() => {
    const set = new Set();
    TERRAZAS.forEach(t => {
      const parteZona = t.zona.split(',')[0].trim();
      set.add(parteZona);
    });
    return Array.from(set);
  }, []);

  // Filtrado reactivo de terrazas
  const terrazasFiltradas = useMemo(() => {
    return terrazasConFotos.filter((t) => {
      if (filtroRuido !== 'todos') {
        if (filtroRuido === 'silencioso' && !t.nivelRuido.toLowerCase().includes('silencioso')) {
          return false;
        }
        if (filtroRuido === 'moderado' && t.nivelRuido.toLowerCase() !== 'moderado') {
          return false;
        }
      }
      if (filtroZona !== 'todas') {
        if (!t.zona.toLowerCase().includes(filtroZona.toLowerCase())) {
          return false;
        }
      }
      if (soloEspacioDisponible && t.aforoCaninoActual >= t.aforoCaninoMax) {
        return false;
      }
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const coincide =
          t.nombre.toLowerCase().includes(q) ||
          t.zona.toLowerCase().includes(q) ||
          t.categoria.toLowerCase().includes(q) ||
          t.descripcion.toLowerCase().includes(q);
        if (!coincide) return false;
      }
      return true;
    }).sort((a, b) => (b.imagen ? 1 : 0) - (a.imagen ? 1 : 0));
  }, [terrazasConFotos, busqueda, filtroRuido, filtroZona, soloEspacioDisponible]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroRuido('todos');
    setFiltroZona('todas');
    setSoloEspacioDisponible(false);
  };

  return (
    <PageWrapper className="w-full space-y-12 pb-20">
      {/* ============================================================
          HERO EDITORIAL PROTAGONISTA DE TERRAZAS VERIFICADAS
          ============================================================ */}
      <section className="gotox-hero-section relative overflow-hidden pt-8 pb-14 md:py-16 border-b border-white/5 bg-gradient-to-b from-[#111827] via-[#090D14] to-[#090D14]">
        {/* Efecto de resplandor ambiental */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#55152D]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Lado Izquierdo: Titular Editorial y Propósito */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] }}
              className="lg:col-span-7 space-y-5 text-left"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#55152D]/35 text-[#F27B91] border border-[#F27B91]/30 text-xs font-semibold backdrop-blur-md">
                <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('terrazas.badge')}</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-[#E8EDF5] tracking-tight leading-[1.12]">
                {t('terrazas.titulo')}
              </h1>

              <p className="text-base sm:text-lg text-[#94A3B8] font-sans leading-relaxed max-w-2xl">
                {t('terrazas.subtitulo')}
              </p>

              {/* Métricas Rápidas de Verificación */}
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-[#94A3B8]">
                <div className="flex items-center gap-2 bg-[#111827] px-3.5 py-2 rounded-xl border border-white/10 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 gotox-radar-dot" aria-hidden="true" />
                  <span className="font-semibold text-[#E8EDF5]">{TERRAZAS.length} {t('terrazas.auditadas')}</span>
                </div>
                <div className="flex items-center gap-2 bg-[#111827] px-3.5 py-2 rounded-xl border border-white/10 shadow-2xs">
                  <Volume2 className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
                  <span>{t('terrazas.ruidoProm')}</span>
                </div>
                <div className="flex items-center gap-2 bg-[#111827] px-3.5 py-2 rounded-xl border border-white/10 shadow-2xs">
                  <Thermometer className="w-3.5 h-3.5 text-[#F27B91]" aria-hidden="true" />
                  <span>{t('terrazas.pavimento')}</span>
                </div>
                {backendPlacesCount && (
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span>&bull;</span>
                    <span>{backendPlacesCount} {t('terrazas.nodosRed')}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Lado Derecho: Fotografía Protagonista con Efecto Zoom Lento */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1.0] }}
              className="lg:col-span-5 relative"
            >
              <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl group bg-[#111827]">
                <motion.img
                  src="/imagenes/terrazas-verificadas.jpg"
                  alt="Terraza Pet-Friendly Verificada en Barrio Escalante, Costa Rica"
                  className="w-full h-72 sm:h-84 object-cover object-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#090D14] via-transparent to-transparent opacity-80" />

                {/* Badge Flotante sobre la Foto */}
                <div className="absolute bottom-4 left-4 right-4 p-3 rounded-2xl bg-[#111827]/90 backdrop-blur-md border border-white/15 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#55152D] text-[#F27B91] flex items-center justify-center font-bold text-xs">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#E8EDF5]">{t('terrazas.estandar')}</p>
                      <p className="text-[10px] text-[#94A3B8]">{t('terrazas.aguaSombra')}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {t('terrazas.certificado')}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================
          BUSCADOR DESTACADO & FILTROS CON INTERACCIÓN MODERNA
          ============================================================ */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="p-4 sm:p-5 rounded-3xl bg-[#111827] border border-white/10 shadow-lg space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Input de Búsqueda Destacado */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" aria-hidden="true" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                aria-label={t('terrazas.buscarPlaceholder')}
                placeholder={t('terrazas.buscarPlaceholder')}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#162032] border border-white/10 text-xs sm:text-sm text-[#E8EDF5] placeholder-[#64748b] focus:outline-none focus:border-[#F27B91]/50 focus:ring-1 focus:ring-[#F27B91]/30 transition-all"
              />
              {busqueda && (
                <button
                  type="button"
                  aria-label={t('home.limpiar')}
                  onClick={() => setBusqueda('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8] hover:text-[#E8EDF5]"
                >
                  &times;
                </button>
              )}
            </div>

            {/* Selector de Nivel Acústico */}
            <div className="flex items-center gap-1.5 p-1 bg-[#162032] rounded-xl border border-white/10 shrink-0">
              <span className="text-[10px] uppercase font-bold text-[#94A3B8] px-2 flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-blue-400" aria-hidden="true" />
                {t('terrazas.ruido')}
              </span>
              <button
                type="button"
                aria-pressed={filtroRuido === 'todos'}
                onClick={() => setFiltroRuido('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroRuido === 'todos'
                    ? 'bg-[#55152D] text-white shadow-xs'
                    : 'text-[#94A3B8] hover:text-[#E8EDF5]'
                }`}
              >
                {t('terrazas.todos')}
              </button>
              <button
                type="button"
                aria-pressed={filtroRuido === 'silencioso'}
                onClick={() => setFiltroRuido('silencioso')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroRuido === 'silencioso'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-[#94A3B8] hover:text-[#E8EDF5]'
                }`}
              >
                {t('terrazas.silencioso')}
              </button>
              <button
                type="button"
                onClick={() => setFiltroRuido('moderado')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroRuido === 'moderado'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-[#94A3B8] hover:text-[#E8EDF5]'
                }`}
              >
                Moderado
              </button>
            </div>
          </div>

          {/* Segunda Fila: Filtro por Zona y Toggle de Aforo */}
          <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[#94A3B8] text-[11px] font-semibold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#F27B91]" />
                Zona:
              </span>
              <button
                type="button"
                onClick={() => setFiltroZona('todas')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filtroZona === 'todas'
                    ? 'bg-white/10 text-white font-bold border border-white/15'
                    : 'text-[#94A3B8] hover:text-[#E8EDF5]'
                }`}
              >
                Todas las zonas
              </button>
              {zonasDisponibles.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setFiltroZona(z)}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    filtroZona === z
                      ? 'bg-white/10 text-white font-bold border border-white/15'
                      : 'text-[#94A3B8] hover:text-[#E8EDF5]'
                  }`}
                >
                  {z}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none text-[#94A3B8] hover:text-[#E8EDF5]">
                <input
                  type="checkbox"
                  checked={soloEspacioDisponible}
                  onChange={(e) => setSoloEspacioDisponible(e.target.checked)}
                  className="rounded bg-[#162032] border-white/20 text-[#55152D] focus:ring-0 focus:ring-offset-0"
                />
                <span>Solo con cupos libres</span>
              </label>

              {(busqueda || filtroRuido !== 'todos' || filtroZona !== 'todas' || soloEspacioDisponible) && (
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F27B91] hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restablecer
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          CATÁLOGO DE TARJETAS PREMIUM DE DESCUBRIMIENTO
          ============================================================ */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex items-center justify-between text-xs text-[#94A3B8]">
          <span>
            Mostrando <strong>{terrazasFiltradas.length}</strong> de {TERRAZAS.length} terrazas auditadas
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Sensores actualizados
          </span>
        </div>

        {/* Skeletons de carga inicial */}
        {cargando ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-96 rounded-3xl bg-[#111827] border border-white/10 animate-pulse" />
            ))}
          </div>
        ) : terrazasFiltradas.length === 0 ? (
          /* Estado Vacío cuando los filtros no coinciden */
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-12 rounded-3xl bg-[#111827] border border-white/10 text-center space-y-4 max-w-lg mx-auto"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#162032] text-[#F27B91] flex items-center justify-center mx-auto border border-white/10">
              <Compass className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-xl font-bold text-[#E8EDF5]">
              No se encontraron terrazas
            </h3>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              No hay establecimientos verificados que coincidan con los filtros aplicados. Intenta ampliar los decibelios o seleccionar todas las zonas.
            </p>
            <Button variant="secondary" size="sm" onClick={limpiarFiltros} icon={RotateCcw}>
              Restablecer Filtros
            </Button>
          </motion.div>
        ) : (
          /* Grilla de Tarjetas de Terrazas con Stagger y Hover Zoom */
          <motion.div
            variants={containerStagger}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 md:grid-cols-2 gap-7"
          >
            {terrazasFiltradas.map((terraza) => {
              const aforoPorcentaje = Math.round((terraza.aforoCaninoActual / terraza.aforoCaninoMax) * 100);
              const cuposLibres = terraza.aforoCaninoMax - terraza.aforoCaninoActual;

              return (
                <motion.article
                  key={terraza.id}
                  variants={itemStagger}
                  layout
                  className="rounded-3xl bg-[#111827] border border-white/10 overflow-hidden shadow-xl hover:shadow-2xl hover:border-[#F27B91]/30 transition-all flex flex-col group text-left"
                >
                  {/* Fotografía Real o marcador sin fotografía */}
                  <div className="relative h-60 sm:h-64 overflow-hidden bg-[#FAF5F8]">
                    <LugarFoto
                      src={terraza.imagen}
                      alt={terraza.nombre}
                      photoMeta={terraza.photoMeta}
                      cargando={cargandoFotos}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-black/30 pointer-events-none" />

                    {/* Insignia Superior */}
                    <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-[#55152D]/90 text-white backdrop-blur-md border border-white/20 shadow-md">
                        {terraza.insignia}
                      </span>
                    </div>

                    {/* Puntuación Pet Superior Derecha */}
                    <div className="absolute top-3.5 right-3.5 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-300 flex items-center gap-1 shadow-md">
                      <span>★</span>
                      <span>{terraza.puntuacionPet}</span>
                    </div>

                    {/* Información Básica sobre la Imagen */}
                    <div className="absolute bottom-3 left-4 right-4">
                      <span className="text-[11px] font-semibold text-[#F27B91] uppercase tracking-wider block">
                        {terraza.categoria}
                      </span>
                      <h3 className="font-serif text-2xl font-bold text-[#E8EDF5] tracking-tight">
                        {terraza.nombre}
                      </h3>
                      <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#F27B91]" />
                        <span>{terraza.zona}</span>
                      </p>
                    </div>
                  </div>

                  {/* Cuerpo de la Ficha con Métricas Reales */}
                  <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <p className="text-xs text-[#94A3B8] leading-relaxed line-clamp-2">
                      {terraza.descripcion}
                    </p>

                    {/* Fila de Tres Indicadores Ambientales */}
                    <div className="grid grid-cols-3 gap-2.5 pt-2">
                      {/* 1. Nivel Sonoro */}
                      <div className="p-2.5 rounded-xl bg-[#162032] border border-white/5 space-y-0.5 text-left">
                        <span className="text-[10px] uppercase font-semibold text-[#94A3B8] flex items-center gap-1">
                          <Volume2 className="w-3 h-3 text-blue-400" />
                          Acústica
                        </span>
                        <p className="font-bold text-xs sm:text-sm text-[#E8EDF5] tabular-nums">
                          {terraza.decibelios} dB
                        </p>
                        <span className="text-[9px] text-emerald-400 block font-medium">
                          {terraza.nivelRuido}
                        </span>
                      </div>

                      {/* 2. Temperatura de Piso */}
                      <div className="p-2.5 rounded-xl bg-[#162032] border border-white/5 space-y-0.5 text-left">
                        <span className="text-[10px] uppercase font-semibold text-[#94A3B8] flex items-center gap-1">
                          <Thermometer className="w-3 h-3 text-[#F27B91]" />
                          Piso
                        </span>
                        <p className="font-bold text-xs sm:text-sm text-[#E8EDF5] tabular-nums">
                          {terraza.temperaturaPiso}
                        </p>
                        <span className="text-[9px] text-[#94A3B8] block font-medium">
                          {terraza.sombraPorcentaje}% sombra
                        </span>
                      </div>

                      {/* 3. Aforo Canino en Vivo */}
                      <div className="p-2.5 rounded-xl bg-[#162032] border border-white/5 space-y-0.5 text-left">
                        <span className="text-[10px] uppercase font-semibold text-[#94A3B8] flex items-center gap-1">
                          <Users className="w-3 h-3 text-amber-400" />
                          Aforo Canino
                        </span>
                        <p className="font-bold text-xs sm:text-sm text-[#E8EDF5] tabular-nums">
                          {terraza.aforoCaninoActual}/{terraza.aforoCaninoMax}
                        </p>
                        <span className={`text-[9px] block font-medium ${cuposLibres > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {cuposLibres > 0 ? `${cuposLibres} libres` : 'Lleno'}
                        </span>
                      </div>
                    </div>

                    {/* Chips de Servicios Verificados */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {terraza.servicios.slice(0, 3).map((srv, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#162032] text-slate-300 border border-white/5"
                        >
                          &bull; {srv}
                        </span>
                      ))}
                      {terraza.servicios.length > 3 && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] text-[#94A3B8]">
                          +{terraza.servicios.length - 3} más
                        </span>
                      )}
                    </div>

                    {/* Botón de Auditoría Completa */}
                    <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-[#94A3B8] truncate">
                        {terraza.procedenciaVerificacion}
                      </span>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setTerrazaSeleccionada(terraza)}
                          icon={ArrowRight}
                          className="bg-[#162032] text-[#E8EDF5] hover:text-[#F27B91] border-white/10 hover:border-[#F27B91]/30 text-xs font-semibold"
                        >
                          Ver Auditoría
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </motion.div>
        )}
      </section>

      {/* ============================================================
          SECCIÓN EXPLICATIVA: CÓMO SE VERIFICAN LAS TERRAZAS
          ============================================================ */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 pt-10">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-[#111827] via-[#162032] to-[#111827] border border-white/10 space-y-8 text-left">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F27B91] block">
              Protocolo de Certificación Urbana
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#E8EDF5] tracking-tight">
              ¿Cómo audita GoToX los espacios gastronómicos?
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              No otorgamos insignias simbólicas. Nuestro equipo técnico evalúa rigurosamente 3 factores fisiológicos y ambientales para garantizar bienestar canino absoluto.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-[#090D14]/80 border border-white/5 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#55152D] text-[#F27B91] flex items-center justify-center font-bold text-sm">
                <Volume2 className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#E8EDF5]">
                1. Mapeo de Decibelios
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Medición continua de presión acústica. Las terrazas deben mantenerse bajo 60 dB en horas pico para evitar pánico y sobreestimulación auditiva.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#090D14]/80 border border-white/5 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#55152D] text-[#F27B91] flex items-center justify-center font-bold text-sm">
                <Thermometer className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#E8EDF5]">
                2. Termografía Podal
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Inspección térmica del pavimento con sensores infrarrojos. Se exige al menos 75% de cobertura sombreada para evitar quemaduras en almohadillas.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#090D14]/80 border border-white/5 space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#55152D] text-[#F27B91] flex items-center justify-center font-bold text-sm">
                <Droplets className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-bold text-base text-[#E8EDF5]">
                3. Hidratación & Anclajes
              </h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Protocolos estrictos de tazones de acero inoxidable o cerámica con recambio periódico de agua filtrada y puntos de sujeción ergonómicos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          MODAL DE DETALLE DE AUDITORÍA CON ANIMATE PRESENCE
          ============================================================ */}
      <AnimatePresence>
        {terrazaSeleccionada && (
          <Modal
            isOpen={Boolean(terrazaSeleccionada)}
            onClose={() => setTerrazaSeleccionada(null)}
            title={terrazaSeleccionada.nombre}
            size="lg"
          >
            <div className="space-y-6 text-[#E8EDF5] text-left">
              {/* Foto Principal en el Modal */}
              <div className="relative h-48 sm:h-56 rounded-2xl overflow-hidden border border-white/10">
                <LugarFoto
                  src={terrazaSeleccionada.imagen}
                  alt={terrazaSeleccionada.nombre}
                  photoMeta={terrazaSeleccionada.photoMeta}
                  cargando={cargandoFotos}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#F27B91]">
                    {terrazaSeleccionada.categoria}
                  </span>
                  <p className="text-sm font-semibold text-white flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#F27B91]" />
                    {terrazaSeleccionada.zona}
                  </p>
                </div>
              </div>

              {/* Insignia y Procedencia */}
              <div className="flex items-center justify-between p-3.5 bg-[#162032] rounded-2xl border border-white/10">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#E8EDF5]">
                      {terrazaSeleccionada.insignia}
                    </p>
                    <p className="text-[10px] text-[#94A3B8]">
                      {terrazaSeleccionada.procedenciaVerificacion}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Auditado Vigente
                </span>
              </div>

              {/* Métricas Acústicas y Térmicas Detalladas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-[#162032] rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Nivel Acústico</span>
                  <p className="font-bold text-base text-[#E8EDF5]">
                    {terrazaSeleccionada.decibelios} dB ({terrazaSeleccionada.nivelRuido})
                  </p>
                  <p className="text-[11px] text-[#94A3B8]">
                    Aislamiento acústico apto para caninos reactivos a sobrecargas sonoras urbanas.
                  </p>
                </div>

                <div className="p-3.5 bg-[#162032] rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Temperatura de Calzada</span>
                  <p className="font-bold text-base text-[#E8EDF5]">
                    {terrazaSeleccionada.temperaturaPiso}
                  </p>
                  <p className="text-[11px] text-[#94A3B8]">
                    {terrazaSeleccionada.sombraPorcentaje}% de sombra natural o techo térmico continuo.
                  </p>
                </div>
              </div>

              {/* Condiciones y Protocolos para Mascotas */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                  Condiciones Pet-Friendly Certificadas
                </h4>
                <div className="p-3.5 bg-[#162032] rounded-2xl border border-white/5 text-xs text-slate-300 leading-relaxed">
                  {terrazaSeleccionada.condicionesMascotas}
                </div>
              </div>

              {/* Lista de Servicios */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                  Equipamiento en Local
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {terrazaSeleccionada.servicios.map((srv, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-[#162032] border border-white/5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{srv}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Horario Óptimo Recomendado */}
              <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-[#94A3B8]">
                  <Clock className="w-4 h-4 text-[#F27B91]" />
                  <span>
                    Horario sugerido: <strong className="text-[#E8EDF5]">{terrazaSeleccionada.horarioRecomendado}</strong>
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setTerrazaSeleccionada(null)}
                  className="bg-[#55152D] hover:bg-[#6E1E3A] text-white"
                >
                  Cerrar Auditoría
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}

export default TerrazasPage;
