import React from 'react';
import { Thermometer, CloudRain, Volume2, ShieldCheck, Activity, ArrowRight, Wind, Sun } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { useTelemetria } from '../hooks/useTelemetria';

export function TelemetriaHero() {
  const telemetria = useTelemetria();

  const getRiesgoBadge = (riesgo) => {
    switch (riesgo) {
      case 'Seguro':
        return <Badge variant="success">Asfalto Seguro (Almohadillas Protegidas)</Badge>;
      case 'Precaución':
        return <Badge variant="warning">Precaución Térmica</Badge>;
      default:
        return <Badge variant="danger">Peligro: Asfalto Caliente</Badge>;
    }
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
      {/* Luz ambiental sutil */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#501228]/5 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200/80 shadow-sm text-xs text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 gotox-radar-dot" />
            <span className="font-semibold text-[#501228]">Telemetría en Vivo</span>
            <span className="text-slate-400">&bull;</span>
            <span className="text-slate-600">San José Este (Escalante / San Pedro)</span>
          </div>

          <h1 className="font-serif text-[clamp(2.5rem,5.5vw,4.5rem)] font-bold text-[#111827] leading-[1.08] tracking-tight">
            El sistema inteligente para pasear a tu mascota en el GAM
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-sans max-w-2xl mx-auto">
            Monitoreamos la temperatura real del pavimento, el confort acústico y las ventanas secas de lluvia para proteger la salud de tu compañero en San José.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <a href="#terrazas">
              <Button variant="primary" size="lg" icon={ArrowRight}>
                Ver Terrazas Verificadas
              </Button>
            </a>
            <a href="#copiloto">
              <Button variant="secondary" size="lg">
                Calcular Paseo con Bruno
              </Button>
            </a>
          </div>
        </div>

        {/* Tarjetas de Telemetría Urbana en Vivo */}
        <div className="mt-12 md:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Métrica 1: Temperatura Asfalto */}
          <Card className="relative overflow-hidden border-slate-200/90 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Pavimento Urbano
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif font-black text-4xl text-[#111827] tabular-nums">
                    {telemetria.temperaturaAsfalto}°C
                  </span>
                  <span className="text-xs text-slate-500 font-sans">
                    Ambiente {telemetria.temperaturaAmbiente}°C
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#FDF2F4] flex items-center justify-center text-[#501228]">
                <Thermometer className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              {getRiesgoBadge(telemetria.nivelRiesgoAsfalto)}
              <span className="text-[11px] text-slate-500 tabular-nums">
                Umbral seguro &lt; 26°C
              </span>
            </div>
          </Card>

          {/* Métrica 2: Ventana Seca Estimada */}
          <Card className="relative overflow-hidden border-slate-200/90 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Ventana Seca Estimada
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif font-black text-4xl text-[#111827] tabular-nums">
                    {telemetria.ventanaSecaMinutos} min
                  </span>
                  <span className="text-xs text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                    Sin lluvia
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
                <CloudRain className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>{telemetria.condicionClimatica}</span>
              </span>
              <span className="text-[11px] text-slate-500 tabular-nums">
                Humedad {telemetria.humedadRelativa}%
              </span>
            </div>
          </Card>

          {/* Métrica 3: Aforo Acústico */}
          <Card className="relative overflow-hidden border-slate-200/90 shadow-sm sm:col-span-2 lg:col-span-1">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Aforo Acústico Urbano
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif font-black text-4xl text-[#111827] tabular-nums">
                    {telemetria.aforoAcusticoDb} dB
                  </span>
                  <Badge variant="default" className="text-[11px]">
                    Zona Tranquila
                  </Badge>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-700">
                <Volume2 className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Sin detonaciones ni ruidos súbitos</span>
              </span>
              <span className="text-[11px] text-slate-500 tabular-nums">
                Aire: {telemetria.calidadAireIca} ICA
              </span>
            </div>
          </Card>
        </div>

        {/* Pie de Telemetría */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 px-1 gap-2">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#501228]" />
            <span>{telemetria.estacionActiva}</span>
          </div>
          <div className="tabular-nums">
            Sincronizado: {telemetria.ultimaActualizacion} &bull; Latencia &lt; 20ms
          </div>
        </div>
      </div>
    </section>
  );
}

