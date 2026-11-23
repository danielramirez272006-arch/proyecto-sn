import React from 'react';
import { Link } from 'react-router-dom';
import {
  Thermometer,
  CloudRain,
  Volume2,
  ShieldCheck,
  Activity,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Sun,
  MapPin,
  Clock,
  Compass
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { useTelemetria } from '../hooks/useTelemetria';
import { useIdioma } from '../context/IdiomaContext';

export function TelemetriaHero() {
  const { t } = useIdioma();
  const telemetria = useTelemetria();
  const {
    temperaturaAsfalto,
    temperaturaAmbiente,
    ventanaSecaMinutos,
    aforoAcusticoDb,
    nivelRiesgoAsfalto,
    condicionClimatica,
    humedadRelativa,
    ultimaActualizacion,
    estacionActiva,
    cargando,
    error,
    hayDatos
  } = telemetria;

  const nombreEstacion =
    !estacionActiva || estacionActiva === 'Sensor San José Este - Estación Escalante Metropolitano'
      ? t('telemetriaHero.estacionDefault')
      : estacionActiva;

  const getRiesgoBadge = (riesgo) => {
    switch (riesgo) {
      case 'Seguro':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {t('telemetriaHero.riesgoSeguro')}
          </span>
        );
      case 'Precaución':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {t('telemetriaHero.riesgoPrecaucion')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            {t('telemetriaHero.riesgoPeligro')}
          </span>
        );
    }
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-16 md:pt-16 md:pb-24">
      {/* Resplandor ambiental borgoña/rosado sutil de identidad de marca */}
      <div
        className="absolute top-0 right-1/4 w-[620px] h-[360px] rounded-full blur-[120px] pointer-events-none -z-10 opacity-30"
        style={{ background: 'radial-gradient(circle, #55152D 0%, rgba(242, 123, 145, 0.15) 50%, transparent 80%)' }}
      />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 space-y-14 md:space-y-20">
        {/* ============================================================
            HERO PRINCIPAL (Composición 50/50 en Desktop / Vertical en Móvil)
            ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Columna Izquierda: Identidad, Titular Editorial y Acciones */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* Identidad de Synodos */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#111827] border border-white/10 shadow-xs text-xs">
              <span className="w-2 h-2 rounded-full bg-[#F27B91] animate-pulse" />
              <span className="font-semibold text-[#E8EDF5] tracking-wide">Synodos Pet OS (Σύνοδος)</span>
              <span className="text-slate-500">&bull;</span>
              <span className="text-[#94A3B8] text-[11px]">{t('telemetriaHero.ubicacionHeader')}</span>
            </div>

            {/* Titular Editorial Protagonista */}
            <h1 className="font-serif text-[clamp(2.4rem,4.8vw,4.2rem)] font-bold text-[#E8EDF5] leading-[1.08] tracking-tight">
              {t('telemetriaHero.titulo')}
            </h1>

            {/* Descripción Breve del Propósito */}
            <p className="text-base sm:text-lg text-[#94A3B8] leading-relaxed font-sans max-w-xl">
              {t('telemetriaHero.subtitulo')}
            </p>

            {/* Botones de Acción */}
            <div className="pt-2 flex flex-wrap items-center gap-3.5">
              <Link to="/terrazas" className="w-full sm:w-auto">
                <Button
                  variant="primary"
                  size="lg"
                  icon={ArrowRight}
                  className="w-full sm:w-auto justify-center bg-[#55152D] hover:bg-[#6E1E3A] text-white border-transparent shadow-md hover:shadow-lg transition-all"
                >
                  {t('telemetriaHero.explorarTerrazas')}
                </Button>
              </Link>
              <Link to="/copiloto" className="w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="lg"
                  icon={Sparkles}
                  className="w-full sm:w-auto justify-center bg-[#111827] text-[#E8EDF5] hover:text-[#F27B91] border-white/10 hover:border-[#F27B91]/30 transition-all"
                >
                  {t('telemetriaHero.consultarArgos')}
                </Button>
              </Link>
            </div>

            {/* Indicador Ambiental Rápido si hay datos */}
            {hayDatos && (
              <div className="pt-2 flex items-center gap-3 text-xs text-[#94A3B8]">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#F27B91]" />
                  <span>{nombreEstacion}</span>
                </div>
                <span>&bull;</span>
                <span className="tabular-nums">{t('telemetriaHero.actualizado', { hora: ultimaActualizacion })}</span>
              </div>
            )}
          </div>

          {/* Columna Derecha: Fotografía de la Mascota como Elemento Visual Principal */}
          <div className="lg:col-span-6">
            <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#111827] group">
              <div className="relative aspect-[4/3] sm:aspect-[16/11] w-full overflow-hidden">
                <img
                  src="/imagenes/hero-escalante.jpg"
                  alt={t('telemetriaHero.heroAlt')}
                  className="w-full h-full object-cover object-center group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                  loading="eager"
                />
                {/* Degradado cinematográfico inferior suave */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#090D14]/90 via-[#090D14]/25 to-transparent pointer-events-none" />

                {/* Tarjeta flotante con contexto real sobre la imagen */}
                <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 p-4 rounded-2xl bg-[#111827]/85 backdrop-blur-md border border-white/10 text-white flex items-center justify-between gap-3 shadow-lg">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-[#F27B91]">
                        {t('telemetriaHero.corredorTag')}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-[#E8EDF5] truncate">
                      {t('telemetriaHero.heroCardSub')}
                    </p>
                  </div>
                  <Link to="/terrazas" className="shrink-0">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#E8EDF5] transition-colors border border-white/15">
                      {t('telemetriaHero.verLocales')}
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================
            SECCIÓN DE TELEMETRÍA (Indicadores Ambientales Prioritarios)
            ============================================================ */}
        <div id="telemetria" className="space-y-6 pt-6 border-t border-white/5">
          {/* Encabezado de Telemetría */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F27B91]">
                <Activity className="w-4 h-4" />
                <span>{t('telemetriaHero.monitoreoVivo')}</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#E8EDF5] tracking-tight">
                {t('telemetriaHero.telemetriaTitulo')}
              </h2>
              <p className="text-xs sm:text-sm text-[#94A3B8]">
                {t('telemetriaHero.telemetriaSub')}
              </p>
            </div>

            {/* Metadatos y Estado de Actualización */}
            <div className="text-xs text-[#94A3B8] flex items-center gap-2 self-start sm:self-auto bg-[#111827] px-3.5 py-1.5 rounded-xl border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 gotox-radar-dot" />
              <span>{nombreEstacion}</span>
              <span className="text-slate-600">&bull;</span>
              <span className="tabular-nums font-mono text-[11px] text-[#E8EDF5]">{ultimaActualizacion}</span>
            </div>
          </div>

          {/* Manejo de Estados: Error, Carga o Ausencia de Datos */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="flex-1">
                <span className="font-semibold block">{t('telemetriaHero.errorSync')}</span>
                <span>{error.message || t('telemetriaHero.errorConexion')}</span>
              </div>
            </div>
          )}

          {!hayDatos && !cargando && !error && (
            <div className="p-8 rounded-2xl bg-[#111827] border border-white/10 text-center space-y-2">
              <Compass className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-[#E8EDF5]">{t('telemetriaHero.sinDatos')}</p>
              <p className="text-xs text-[#94A3B8]">
                {t('telemetriaHero.sinDatosSub')}
              </p>
            </div>
          )}

          {/* Grilla de los 3 Indicadores Clave Prioritarios */}
          {hayDatos && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 1. PRIORIDAD: Temperatura del Pavimento */}
              <Card className="p-5 sm:p-6 bg-[#111827] border-white/10 rounded-2xl space-y-4 hover:border-[#F27B91]/30 transition-colors shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] block">
                      {t('telemetriaHero.card1Titulo')}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif font-bold text-3xl sm:text-4xl text-[#E8EDF5] tabular-nums">
                        {temperaturaAsfalto}
                      </span>
                      <span className="text-sm font-semibold text-[#F27B91] font-sans">°C</span>
                      <span className="text-xs text-[#94A3B8] font-sans">
                        ({t('telemetriaHero.ambiente', { temp: temperaturaAmbiente })})
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#55152D]/40 text-[#F27B91] border border-[#F27B91]/20 flex items-center justify-center shrink-0">
                    <Thermometer className="w-5 h-5" />
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#94A3B8]">{t('telemetriaHero.evaluacionRiesgo')}</span>
                    {getRiesgoBadge(nivelRiesgoAsfalto)}
                  </div>
                  <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                    {t('telemetriaHero.card1Desc')}
                  </p>
                </div>
              </Card>

              {/* 2. PRIORIDAD: Condiciones de Lluvia y Ventana Seca */}
              <Card className="p-5 sm:p-6 bg-[#111827] border-white/10 rounded-2xl space-y-4 hover:border-blue-400/30 transition-colors shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] block">
                      {t('telemetriaHero.card2Titulo')}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif font-bold text-3xl sm:text-4xl text-[#E8EDF5] tabular-nums">
                        {ventanaSecaMinutos}
                      </span>
                      <span className="text-sm font-semibold text-blue-400 font-sans">{t('telemetriaHero.minutos')}</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <CloudRain className="w-5 h-5" />
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#94A3B8]">{t('telemetriaHero.estadoActual')}</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      <Sun className="w-3 h-3 text-amber-400" />
                      {condicionClimatica === 'Nubosidad parcial fresca'
                        ? t('telemetriaHero.condNubosidad')
                        : condicionClimatica}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                    {t('telemetriaHero.card2Desc', { humedad: humedadRelativa })}
                  </p>
                </div>
              </Card>

              {/* 3. PRIORIDAD: Confort Acústico Urbano */}
              <Card className="p-5 sm:p-6 bg-[#111827] border-white/10 rounded-2xl space-y-4 hover:border-purple-400/30 transition-colors shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] block">
                      {t('telemetriaHero.card3Titulo')}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="font-serif font-bold text-3xl sm:text-4xl text-[#E8EDF5] tabular-nums">
                        {aforoAcusticoDb}
                      </span>
                      <span className="text-sm font-semibold text-purple-400 font-sans">dB</span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                    <Volume2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#94A3B8]">{t('telemetriaHero.indiceRuido')}</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      {t('telemetriaHero.zonaTranquila')}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                    {t('telemetriaHero.card3Desc')}
                  </p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
