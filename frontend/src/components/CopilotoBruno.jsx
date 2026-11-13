import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Dog, Droplets, Thermometer, Clock, ShieldAlert, Sparkles, Navigation, AlertTriangle, CheckCircle } from 'lucide-react';
import { useTelemetria } from '../hooks/useTelemetria';

const RAZAS = [
  { id: 'golden', nombre: 'Golden Retriever', categoria: 'Grande / Manto Doble', factorTermico: 1.1, pesoPromedio: 30, sensibilidadAsfalto: 'Media' },
  { id: 'frenchie', nombre: 'Bulldog Francés', categoria: 'Braquicéfalo / Riesgo Alto', factorTermico: 1.8, pesoPromedio: 12, sensibilidadAsfalto: 'Muy Alta' },
  { id: 'poodle', nombre: 'Poodle Mediano', categoria: 'Mediano / Manto Rizado', factorTermico: 0.9, pesoPromedio: 14, sensibilidadAsfalto: 'Baja' },
  { id: 'pastor', nombre: 'Pastor Alemán', categoria: 'Grande / Atlético', factorTermico: 1.2, pesoPromedio: 34, sensibilidadAsfalto: 'Media' },
  { id: 'chihuahua', nombre: 'Chihuahua', categoria: 'Miniatura / Rápida Deshidratación', factorTermico: 1.4, pesoPromedio: 2.8, sensibilidadAsfalto: 'Alta' },
  { id: 'husky', nombre: 'Husky Siberiano', categoria: 'Nórdico / Sensible a Calor Tropical', factorTermico: 2.0, pesoPromedio: 25, sensibilidadAsfalto: 'Extrema' }
];

export function CopilotoBruno() {
  const telemetria = useTelemetria();
  const [razaSeleccionada, setRazaSeleccionada] = useState(RAZAS[0]);
  const [duracionMinutos, setDuracionMinutos] = useState(30);
  const [terreno, setTerreno] = useState('asfalto-mixto'); // 'asfalto-mixto' | 'parque-cesped' | 'sombra-completa'

  // Cálculos dinámicos del Copiloto Bruno
  const factorTerreno = terreno === 'parque-cesped' ? 0.7 : terreno === 'sombra-completa' ? 0.8 : 1.2;
  const riesgoPuntuacion = Math.round(
    (telemetria.temperaturaAsfalto / 20) * razaSeleccionada.factorTermico * factorTerreno * (duracionMinutos / 25) * 10
  );

  let estadoRiesgo = 'Bajo & Seguro';
  let badgeVariant = 'success';
  let consejoBruno = 'Condiciones idóneas para caminata continua. El pavimento está a temperatura fresca para las almohadillas.';

  if (riesgoPuntuacion >= 22) {
    estadoRiesgo = 'Riesgo Térmico Elevado';
    badgeVariant = 'danger';
    consejoBruno = `¡Atención! Para un ${razaSeleccionada.nombre}, la combinación de tiempo y temperatura de calzada puede inducir sobrecalentamiento. Reduce el paseo a máximo 15 minutos en sombra.`;
  } else if (riesgoPuntuacion >= 14) {
    estadoRiesgo = 'Precaución Moderada';
    badgeVariant = 'warning';
    consejoBruno = `Camina por tramos arbolados de Barrio Escalante o Parque Francia. Haz pausas de hidratación cada 10 minutos.`;
  }

  // Cuota de agua estimada en ml
  const cuotaAguaMl = Math.round(razaSeleccionada.pesoPromedio * (duracionMinutos / 30) * 12 * (telemetria.temperaturaAmbiente / 20));

  return (
    <section id="copiloto" className="py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF2F4] text-[#501228] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Asistente Inteligente de Paseo</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#111827]">
            Copiloto Bruno
          </h2>
          <p className="text-slate-600 text-sm sm:text-base">
            Calcula la tolerancia fisiológica de tu perro antes de salir, cruzando su raza con la telemetría actual de San José.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Panel Izquierdo: Configuración del Paseo */}
          <div className="lg:col-span-5 space-y-5">
            <Card className="border-slate-200/80 p-6 space-y-5 shadow-sm">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  1. Selecciona la raza o morfología
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {RAZAS.map((r) => {
                    const activa = razaSeleccionada.id === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRazaSeleccionada(r)}
                        className={`p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                          activa
                            ? 'bg-[#501228] text-white border-[#501228] shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="font-semibold">{r.nombre}</span>
                        <span className={`text-[10px] mt-1 ${activa ? 'text-pink-100' : 'text-slate-400'}`}>
                          {r.pesoPromedio} kg aprox.
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duración */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase tracking-wider text-slate-700">
                    2. Duración estimada
                  </span>
                  <span className="font-bold text-[#501228] tabular-nums text-sm">
                    {duracionMinutos} minutos
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="5"
                  value={duracionMinutos}
                  onChange={(e) => setDuracionMinutos(Number(e.target.value))}
                  className="w-full accent-[#501228] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>10 min (Rápido)</span>
                  <span>45 min (Estándar)</span>
                  <span>90 min (Aventura)</span>
                </div>
              </div>

              {/* Tipo de Superficie */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  3. Entorno de recorrido
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setTerreno('asfalto-mixto')}
                    className={`p-2 rounded-xl border text-center font-medium transition-colors ${
                      terreno === 'asfalto-mixto'
                        ? 'bg-[#501228] text-white border-[#501228]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Aceras GAM
                  </button>
                  <button
                    type="button"
                    onClick={() => setTerreno('parque-cesped')}
                    className={`p-2 rounded-xl border text-center font-medium transition-colors ${
                      terreno === 'parque-cesped'
                        ? 'bg-[#501228] text-white border-[#501228]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Parque / Césped
                  </button>
                  <button
                    type="button"
                    onClick={() => setTerreno('sombra-completa')}
                    className={`p-2 rounded-xl border text-center font-medium transition-colors ${
                      terreno === 'sombra-completa'
                        ? 'bg-[#501228] text-white border-[#501228]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Arboleda Continua
                  </button>
                </div>
              </div>
            </Card>
          </div>

          {/* Panel Derecho: Veredicto del Copiloto */}
          <div className="lg:col-span-7 space-y-5">
            <Card className="border-slate-200/90 p-6 bg-gradient-to-br from-white to-[#FAF9FE] shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#501228] text-white flex items-center justify-center font-serif font-black text-xl shadow-sm">
                    🐾
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#111827]">
                      Veredicto Bioclimático para {razaSeleccionada.nombre}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Cálculo con asfalto a {telemetria.temperaturaAsfalto}°C en San José Este
                    </p>
                  </div>
                </div>

                <div>
                  <Badge variant={badgeVariant} className="text-xs py-1 px-3">
                    {estadoRiesgo}
                  </Badge>
                </div>
              </div>

              {/* Métricas Calculadas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Droplets className="w-4 h-4 text-blue-600" />
                    <span>Hidratación Mínima</span>
                  </div>
                  <div className="font-serif font-bold text-2xl text-[#111827] tabular-nums">
                    {cuotaAguaMl} ml
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Llevar botella con bebedero
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Thermometer className="w-4 h-4 text-[#501228]" />
                    <span>Carga en Almohadillas</span>
                  </div>
                  <div className="font-serif font-bold text-2xl text-[#111827]">
                    {razaSeleccionada.sensibilidadAsfalto}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Pavimento en {telemetria.temperaturaAsfalto}°C
                  </span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200/70 shadow-2xs space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Límite Seguro</span>
                  </div>
                  <div className="font-serif font-bold text-2xl text-[#111827] tabular-nums">
                    {duracionMinutos > 45 && razaSeleccionada.id === 'frenchie' ? '20 min max' : `${duracionMinutos} min`}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Ventana seca: {telemetria.ventanaSecaMinutos} min
                  </span>
                </div>
              </div>

              {/* Recomendación de Bruno */}
              <div className="p-4 rounded-xl bg-[#FDF2F4] border border-[#F9E2E8] space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-[#501228]">
                  <Sparkles className="w-4 h-4" />
                  <span>Recomendación del Copiloto Bruno:</span>
                </div>
                <p className="text-[#6E1E3A] leading-relaxed">
                  {consejoBruno}
                </p>
              </div>

              {/* Ruta Recomendada por cercanía */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-3">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#501228]" />
                  <span>Ruta óptima sugerida: <strong>Circuito Parque Francia hacia El Árbol de Seda (85% sombra)</strong></span>
                </div>
                <a href="#terrazas">
                  <Button size="sm" variant="secondary">
                    Ver Terrazas del Circuito
                  </Button>
                </a>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

