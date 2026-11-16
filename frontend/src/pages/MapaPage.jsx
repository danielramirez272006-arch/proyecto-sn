import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TERRAZAS } from '../data/terrazas';
import { PageWrapper } from '../components/PageWrapper';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useTelemetria } from '../hooks/useTelemetria';
import {
  MapPin,
  Volume2,
  Thermometer,
  ShieldCheck,
  Search,
  Layers,
  Compass,
  Users,
  Clock,
  Droplets,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Navigation,
  Coffee
} from 'lucide-react';
import { TRANSICION_SUAVE } from '../estilos/animaciones';

// Coordenadas relativas en la retícula urbana del GAM (San José Este / Centro)
const COORDENADAS_TERRAZAS = {
  'franco-cafe': { x: 68, y: 44, barrio: 'Barrio Escalante' },
  'arbol-de-seda': { x: 74, y: 53, barrio: 'Barrio Escalante Sur' },
  'apotecario': { x: 50, y: 64, barrio: 'Barrio California' },
  'cafe-miel': { x: 34, y: 35, barrio: 'Barrio Amón / Otoya' }
};

// Corredores acústicamente seguros (parques con arboleda densa y bajo bullicio)
const CORREDORES_VERDES = [
  { id: 'corredor-francia', nombre: 'Paseo Parque Francia - Escalante', x: 70, y: 48, decibelios: 42, sombra: '95%' },
  { id: 'corredor-nacional', nombre: 'Circuito Parque Nacional - Estación', x: 56, y: 40, decibelios: 48, sombra: '88%' },
  { id: 'corredor-espana', nombre: 'Arboleda Parque España - Amón', x: 38, y: 38, decibelios: 45, sombra: '90%' }
];

// Zonas con pavimento térmico crítico (> 28 °C en horas pico sin sombra)
const PUNTOS_CALIENTES = [
  { id: 'hot-avenida2', nombre: 'Cruce Avenida 2 / Calle 23 (Asfalto Expuesto)', x: 58, y: 72, temp: '32.4 °C', alerta: 'Evitar entre 11:30 y 14:00' },
  { id: 'hot-calle33', nombre: 'Intersección Rotonda Roosevelt', x: 82, y: 68, temp: '29.8 °C', alerta: 'Caminar por calzada este con arbolado' }
];

export function MapaPage() {
  const telemetria = useTelemetria();

  const [capaActiva, setCapaActiva] = useState('todas'); // 'todas' | 'silencioso' | 'corredores' | 'asfalto'
  const [busqueda, setBusqueda] = useState('');
  const [terrazaSeleccionada, setTerrazaSeleccionada] = useState(null);
  const [modalAuditoria, setModalAuditoria] = useState(null);
  const [zoom, setZoom] = useState(1);

  // Filtrado de terrazas en el mapa
  const terrazasVisibles = useMemo(() => {
    return TERRAZAS.filter((t) => {
      if (capaActiva === 'silencioso' && !t.nivelRuido.toLowerCase().includes('silencioso')) {
        return false;
      }
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        return (
          t.nombre.toLowerCase().includes(q) ||
          t.zona.toLowerCase().includes(q) ||
          t.categoria.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [capaActiva, busqueda]);

  const resetearVista = () => {
    setZoom(1);
    setTerrazaSeleccionada(null);
    setBusqueda('');
    setCapaActiva('todas');
  };

  return (
    <PageWrapper className="w-full space-y-6 pb-20">
      {/* ============================================================
          ENCABEZADO EDITORIAL DEL MAPA GAM
          ============================================================ */}
      <section className="relative overflow-hidden pt-8 pb-6 border-b border-white/5 bg-gradient-to-b from-[#111827] via-[#090D14] to-[#090D14]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-left">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#55152D]/35 text-[#F27B91] border border-[#F27B91]/30 text-xs font-semibold">
                <Compass className="w-3.5 h-3.5" />
                <span>Cartografía Urbana Satelital &bull; San José</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight">
                Mapa Interactivo GAM
              </h1>
              <p className="text-xs sm:text-sm text-[#94A3B8]">
                Navega las terrazas pet-friendly verificadas, corredores verdes libres de sobrecarga acústica y monitoreo de asfalto en tiempo real.
              </p>
            </div>

            {/* Telemetría Mini Flotante */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111827] border border-white/10 text-[#E8EDF5]">
                <Thermometer className="w-3.5 h-3.5 text-[#F27B91]" />
                <span>Asfalto: <strong className="text-white">{telemetria.temperaturaAsfalto} °C</strong></span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111827] border border-white/10 text-[#E8EDF5]">
                <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Ruido: <strong className="text-white">{telemetria.aforoAcusticoDb} dB</strong></span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111827] border border-white/10 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 gotox-radar-dot" />
                <span>{telemetria.ventanaSecaMinutos} min secos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          BARRA DE CONTROL Y CAPAS DEL MAPA
          ============================================================ */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#111827] border border-white/10 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          {/* Buscador Rápido en el Mapa */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar terraza o barrio en el mapa..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#162032] border border-white/10 text-xs text-[#E8EDF5] placeholder-[#64748b] focus:outline-none focus:border-[#F27B91]/50 focus:ring-1 focus:ring-[#F27B91]/30"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white"
              >
                &times;
              </button>
            )}
          </div>

          {/* Selector de Capas de Cartografía */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#162032] rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setCapaActiva('todas')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                capaActiva === 'todas'
                  ? 'bg-[#55152D] text-white shadow-xs'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Coffee className="w-3.5 h-3.5 text-[#F27B91]" />
              <span>Terrazas ({TERRAZAS.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setCapaActiva('silencioso')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                capaActiva === 'silencioso'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Silenciosas (&lt; 48 dB)</span>
            </button>

            <button
              type="button"
              onClick={() => setCapaActiva('corredores')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                capaActiva === 'corredores'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-blue-300" />
              <span>Rutas Verdes</span>
            </button>

            <button
              type="button"
              onClick={() => setCapaActiva('asfalto')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                capaActiva === 'asfalto'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
              <span>Riesgo Podal</span>
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================
          LIENZO DE CARTOGRAFÍA INTERACTIVA (MAPA URBANO GAM)
          ============================================================ */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="relative w-full h-[520px] sm:h-[600px] lg:h-[660px] rounded-3xl bg-[#090D14] border border-white/10 overflow-hidden shadow-2xl">
          {/* Controles de Zoom en Esquina Superior Derecha */}
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-1.5 bg-[#111827]/90 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-lg">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + 0.2, 1.8))}
              title="Acercar mapa"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[#E8EDF5] hover:bg-white/10 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - 0.2, 0.8))}
              title="Alejar mapa"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[#E8EDF5] hover:bg-white/10 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={resetearVista}
              title="Restablecer vista"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[#F27B91] hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Leyenda en Esquina Superior Izquierda */}
          <div className="absolute top-4 left-4 z-20 bg-[#111827]/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10 shadow-lg hidden sm:flex items-center gap-4 text-[11px] text-[#94A3B8]">
            <span className="flex items-center gap-1.5 font-bold text-[#E8EDF5]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F27B91]" />
              Terrazas Auditadas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              Corredor Acústico
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              Pavimento Caliente
            </span>
          </div>

          {/* Contenedor Escalable del Mapa (Vectorial Urbano) */}
          <motion.div
            animate={{ scale: zoom }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full h-full relative cursor-grab active:cursor-grabbing select-none"
          >
            {/* SVG Base: Calles, Avenidas y Áreas Verdes del GAM */}
            <svg
              viewBox="0 0 1000 700"
              className="w-full h-full object-cover pointer-events-none opacity-80"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <pattern id="gridUrbana" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
                </pattern>
                <radialGradient id="haloCentral" cx="60%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#55152D" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#090D14" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Fondo y Retícula */}
              <rect width="1000" height="700" fill="#090D14" />
              <rect width="1000" height="700" fill="url(#haloCentral)" />
              <rect width="1000" height="700" fill="url(#gridUrbana)" />

              {/* Trazado de Vías Principales (Paseo Colón, Avenida Segunda, Calle 33 Escalante) */}
              {/* Eje Este-Oeste: Avenida Segunda / Los Yoses */}
              <path d="M 50 360 Q 400 370 950 340" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="8" fill="none" />
              <path d="M 50 360 Q 400 370 950 340" stroke="rgba(242, 123, 145, 0.3)" strokeWidth="2" strokeDasharray="6 6" fill="none" />

              {/* Eje Norte-Sur: Calle 33 (Paseo Gastronómico Escalante) */}
              <path d="M 680 100 L 710 650" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="6" fill="none" />
              <path d="M 740 120 L 760 620" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="4" fill="none" />

              {/* Conexión Barrio California / La California */}
              <path d="M 460 200 L 530 650" stroke="rgba(255, 255, 255, 0.14)" strokeWidth="5" fill="none" />
              <path d="M 320 150 L 370 600" stroke="rgba(255, 255, 255, 0.14)" strokeWidth="5" fill="none" />

              {/* Calles secundarias de la cuadrícula */}
              <path d="M 200 220 L 900 210" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="3" fill="none" />
              <path d="M 220 480 L 920 460" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="3" fill="none" />
              <path d="M 240 580 L 880 560" stroke="rgba(255, 255, 255, 0.06)" strokeWidth="2" fill="none" />

              {/* Polígonos de Parques Sombreados (Parque Francia, Parque Nacional) */}
              {/* Parque Francia */}
              <rect x="670" y="320" width="60" height="45" rx="12" fill="rgba(16, 185, 129, 0.18)" stroke="rgba(16, 185, 129, 0.4)" strokeWidth="1.5" />
              <text x="700" y="347" fill="#6ee7b7" fontSize="10" textAnchor="middle" fontWeight="bold">Parque Francia</text>

              {/* Parque Nacional */}
              <rect x="530" y="270" width="75" height="55" rx="14" fill="rgba(16, 185, 129, 0.15)" stroke="rgba(16, 185, 129, 0.35)" strokeWidth="1.5" />
              <text x="567" y="302" fill="#6ee7b7" fontSize="10" textAnchor="middle" fontWeight="bold">Parque Nacional</text>

              {/* Parque España / Morazán */}
              <rect x="350" y="240" width="65" height="50" rx="12" fill="rgba(16, 185, 129, 0.14)" stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1.5" />
              <text x="382" y="270" fill="#6ee7b7" fontSize="9" textAnchor="middle" fontWeight="bold">Parque España</text>

              {/* Etiquetas de Barrios */}
              <text x="750" y="180" fill="rgba(232, 237, 245, 0.4)" fontSize="13" fontWeight="bold" letterSpacing="2">BARRIO ESCALANTE</text>
              <text x="470" y="160" fill="rgba(232, 237, 245, 0.35)" fontSize="12" fontWeight="bold" letterSpacing="2">BARRIO CALIFORNIA</text>
              <text x="300" y="130" fill="rgba(232, 237, 245, 0.35)" fontSize="12" fontWeight="bold" letterSpacing="2">BARRIO AMÓN / OTOYA</text>
            </svg>

            {/* PINES INTERACTIVOS DE TERRAZAS VERIFICADAS */}
            {(capaActiva === 'todas' || capaActiva === 'silencioso') &&
              terrazasVisibles.map((terraza) => {
                const coord = COORDENADAS_TERRAZAS[terraza.id] || { x: 50, y: 50 };
                const seleccionada = terrazaSeleccionada?.id === terraza.id;

                return (
                  <motion.div
                    key={terraza.id}
                    style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTerrazaSeleccionada(terraza)}
                  >
                    {/* Halo de pulso */}
                    <span className="absolute -inset-2 rounded-full bg-[#F27B91]/30 animate-ping opacity-60" />

                    {/* Botón Pin */}
                    <div
                      className={`relative px-3 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-xl border transition-all ${
                        seleccionada
                          ? 'bg-[#55152D] text-white border-[#F27B91] ring-2 ring-[#F27B91]/50 scale-110'
                          : 'bg-[#111827] text-[#E8EDF5] border-white/20 hover:border-[#F27B91]'
                      }`}
                    >
                      <MapPin className={`w-3.5 h-3.5 ${seleccionada ? 'text-white' : 'text-[#F27B91]'}`} />
                      <span className="text-xs font-bold whitespace-nowrap">{terraza.nombre}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 font-mono">
                        {terraza.decibelios}dB
                      </span>
                    </div>
                  </motion.div>
                );
              })}

            {/* PINES DE CORREDORES VERDES SEGUROS */}
            {(capaActiva === 'todas' || capaActiva === 'corredores') &&
              CORREDORES_VERDES.map((corredor) => (
                <div
                  key={corredor.id}
                  style={{ left: `${corredor.x}%`, top: `${corredor.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-25 pointer-events-auto"
                >
                  <div className="px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-semibold flex items-center gap-1 shadow-lg backdrop-blur-xs">
                    <Navigation className="w-3 h-3 text-emerald-400" />
                    <span>{corredor.nombre}</span>
                    <span className="text-white/60">({corredor.sombra})</span>
                  </div>
                </div>
              ))}

            {/* PINES DE ADVERTENCIA DE ASFALTO TÉRMICO */}
            {(capaActiva === 'todas' || capaActiva === 'asfalto') &&
              PUNTOS_CALIENTES.map((hot) => (
                <div
                  key={hot.id}
                  style={{ left: `${hot.x}%`, top: `${hot.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-25 pointer-events-auto"
                >
                  <div className="px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-300 text-[10px] font-semibold flex items-center gap-1 shadow-lg backdrop-blur-xs">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>{hot.temp}</span>
                    <span className="text-white/60 truncate max-w-[120px]">{hot.nombre}</span>
                  </div>
                </div>
              ))}
          </motion.div>

          {/* TARJETA FLOTANTE DETALLE DE TERRAZA SELECCIONADA */}
          <AnimatePresence>
            {terrazaSeleccionada && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={TRANSICION_SUAVE}
                className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-40 bg-[#111827]/95 backdrop-blur-xl border border-white/15 rounded-3xl p-5 shadow-2xl text-left space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={terrazaSeleccionada.imagen}
                      alt={terrazaSeleccionada.nombre}
                      className="w-14 h-14 rounded-2xl object-cover border border-white/10 shrink-0"
                    />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#F27B91] block">
                        {terrazaSeleccionada.categoria}
                      </span>
                      <h3 className="font-serif font-bold text-lg text-[#E8EDF5] leading-tight">
                        {terrazaSeleccionada.nombre}
                      </h3>
                      <p className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#F27B91]" />
                        <span>{terrazaSeleccionada.zona}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTerrazaSeleccionada(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    &times;
                  </button>
                </div>

                {/* Métricas Rápidas de la Terraza */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-[#162032] border border-white/5 space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-[#94A3B8] block">Acústica</span>
                    <p className="font-bold text-[#E8EDF5] tabular-nums">{terrazaSeleccionada.decibelios} dB</p>
                    <span className="text-[9px] text-emerald-400 block font-medium">{terrazaSeleccionada.nivelRuido}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-[#162032] border border-white/5 space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-[#94A3B8] block">Piso</span>
                    <p className="font-bold text-[#E8EDF5] tabular-nums">{terrazaSeleccionada.temperaturaPiso}</p>
                    <span className="text-[9px] text-[#94A3B8] block font-medium">{terrazaSeleccionada.sombraPorcentaje}% sombra</span>
                  </div>

                  <div className="p-2 rounded-xl bg-[#162032] border border-white/5 space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-[#94A3B8] block">Cupos</span>
                    <p className="font-bold text-[#E8EDF5] tabular-nums">{terrazaSeleccionada.aforoCaninoActual}/{terrazaSeleccionada.aforoCaninoMax}</p>
                    <span className="text-[9px] text-emerald-400 block font-medium">Libres</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[#94A3B8] truncate">
                    ★ {terrazaSeleccionada.puntuacionPet} &bull; {terrazaSeleccionada.insignia}
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setModalAuditoria(terrazaSeleccionada)}
                    icon={ArrowRight}
                    className="bg-[#55152D] hover:bg-[#6E1E3A] text-white text-xs font-semibold px-3 py-1.5"
                  >
                    Ver Auditoría
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ============================================================
          MODAL DE FICHA DE AUDITORÍA CON ANIMATE PRESENCE
          ============================================================ */}
      <AnimatePresence>
        {modalAuditoria && (
          <Modal
            isOpen={Boolean(modalAuditoria)}
            onClose={() => setModalAuditoria(null)}
            title={`Auditoría Urbana: ${modalAuditoria.nombre}`}
            size="lg"
          >
            <div className="space-y-5 text-[#E8EDF5] text-left">
              <div className="relative h-44 sm:h-52 rounded-2xl overflow-hidden border border-white/10">
                <img
                  src={modalAuditoria.imagen}
                  alt={modalAuditoria.nombre}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#F27B91]">
                    {modalAuditoria.categoria}
                  </span>
                  <p className="text-sm font-semibold text-white flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#F27B91]" />
                    {modalAuditoria.zona}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[#162032] rounded-2xl border border-white/10 text-xs">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold text-[#E8EDF5]">{modalAuditoria.insignia}</p>
                    <p className="text-[10px] text-[#94A3B8]">{modalAuditoria.procedenciaVerificacion}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Verificado Vigente
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#162032] rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#94A3B8] block">Presión Acústica</span>
                  <p className="font-bold text-base text-[#E8EDF5]">{modalAuditoria.decibelios} dB ({modalAuditoria.nivelRuido})</p>
                </div>
                <div className="p-3 bg-[#162032] rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#94A3B8] block">Temperatura Calzada</span>
                  <p className="font-bold text-base text-[#E8EDF5]">{modalAuditoria.temperaturaPiso}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-[#94A3B8]">Condiciones Pet-Friendly</h4>
                <p className="p-3 bg-[#162032] rounded-xl border border-white/5 text-slate-300 leading-relaxed">
                  {modalAuditoria.condicionesMascotas}
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setModalAuditoria(null)}
                  className="bg-[#55152D] hover:bg-[#6E1E3A] text-white"
                >
                  Entendido
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}

export default MapaPage;
