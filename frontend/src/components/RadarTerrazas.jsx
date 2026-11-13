import React, { useEffect, useState } from 'react';
import { TERRAZAS } from '../data/terrazas';
import { api } from '../shared/services/api-client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Volume2, Users, Sun, CheckCircle2, ShieldCheck, MapPin, SlidersHorizontal, Droplets, Info } from 'lucide-react';

export function RadarTerrazas() {
  const [filtroRuido, setFiltroRuido] = useState('todos');
  const [soloEspacioDisponible, setSoloEspacioDisponible] = useState(false);
  const [terrazaSeleccionada, setTerrazaSeleccionada] = useState(null);
  const [backendPlacesCount, setBackendPlacesCount] = useState(null);

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

  const terrazasFiltradas = TERRAZAS.filter((terraza) => {
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
    return true;
  });

  return (
    <section id="terrazas" className="py-16 md:py-24 bg-[#FAF9FE] border-y border-slate-200/60">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        {/* Encabezado de la Sección */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#501228]">
              <ShieldCheck className="w-4 h-4" />
              <span>Verificación Continua de Espacios</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#111827] tracking-tight">
              Radar de Terrazas Pet-Friendly Certificadas
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Espacios gastronómicos en el GAM auditados en decibelios, temperatura de piso y fuentes de hidratación para tu perro.
            </p>
          </div>

          {/* Filtros simples */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 shadow-sm text-xs">
              <span className="px-2 font-medium text-slate-500">Ruido:</span>
              <button
                type="button"
                onClick={() => setFiltroRuido('todos')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filtroRuido === 'todos' ? 'bg-[#501228] text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFiltroRuido('silencioso')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filtroRuido === 'silencioso' ? 'bg-[#501228] text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                &lt; 50 dB
              </button>
              <button
                type="button"
                onClick={() => setFiltroRuido('moderado')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  filtroRuido === 'moderado' ? 'bg-[#501228] text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Moderado
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSoloEspacioDisponible(!soloEspacioDisponible)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                soloEspacioDisponible
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              Solo con aforo libre
            </button>
          </div>
        </div>

        {/* Grilla de Terrazas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {terrazasFiltradas.map((terraza) => {
            const espacioLibre = terraza.aforoCaninoMax - terraza.aforoCaninoActual;
            return (
              <Card key={terraza.id} className="flex flex-col justify-between overflow-hidden p-0 border-slate-200/80">
                <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                  <img
                    src={terraza.imagen}
                    alt={terraza.nombre}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                    <Badge variant="burdeos" className="bg-[#501228]/90 backdrop-blur-sm shadow-sm">
                      {terraza.insignia}
                    </Badge>
                  </div>
                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-semibold text-[#111827] shadow-sm flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-[#501228]" />
                    <span className="tabular-nums">{terraza.decibelios} dB</span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-serif text-xl font-bold text-[#111827]">
                        {terraza.nombre}
                      </h3>
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        ★ {terraza.puntuacionPet}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-[#501228]" />
                      <span>{terraza.zona}</span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed pt-1">
                      {terraza.descripcion}
                    </p>
                  </div>

                  {/* Indicadores Clave */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Aforo canino</span>
                      <div className="font-semibold text-slate-800 flex items-center justify-between">
                        <span>{terraza.aforoCaninoActual} / {terraza.aforoCaninoMax} perros</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${espacioLibre > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {espacioLibre > 0 ? `${espacioLibre} libres` : 'Lleno'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">Piso térmico</span>
                      <div className="font-semibold text-slate-800 flex items-center justify-between">
                        <span>{terraza.temperaturaPiso}</span>
                        <span className="text-[10px] text-emerald-700 font-normal">Sombra {terraza.sombraPorcentaje}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Servicios incluidos */}
                  <div className="flex flex-wrap gap-1.5">
                    {terraza.servicios.slice(0, 3).map((serv, i) => (
                      <span key={i} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                        {serv}
                      </span>
                    ))}
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full justify-center"
                    icon={Info}
                    onClick={() => setTerrazaSeleccionada(terraza)}
                  >
                    Ver Ficha de Verificación
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Modal de Detalle de Verificación */}
        {terrazaSeleccionada && (
          <Modal
            isOpen={!!terrazaSeleccionada}
            onClose={() => setTerrazaSeleccionada(null)}
            title={`Auditoría Urbana: ${terrazaSeleccionada.nombre}`}
          >
            <div className="space-y-4 text-sm text-slate-700">
              <div className="flex items-center justify-between p-3 bg-[#FDF2F4] rounded-xl border border-[#F9E2E8]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#501228]" />
                  <span className="font-semibold text-[#501228] text-xs sm:text-sm">
                    {terrazaSeleccionada.insignia}
                  </span>
                </div>
                <Badge variant="success">Auditado hoy</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-slate-500 block uppercase">Nivel acústico verificado</span>
                  <p className="font-bold text-base text-[#111827]">{terrazaSeleccionada.decibelios} dB ({terrazaSeleccionada.nivelRuido})</p>
                  <p className="text-slate-500">Apto para perros con ansiedad por ruido.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                  <span className="text-slate-500 block uppercase">Temperatura de calzada</span>
                  <p className="font-bold text-base text-[#111827]">{terrazaSeleccionada.temperaturaPiso}</p>
                  <p className="text-slate-500">Superficie protegida por {terrazaSeleccionada.sombraPorcentaje}% de sombra.</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-800">
                  Servicios y Protocolos Activos
                </h4>
                <ul className="space-y-1.5 text-xs">
                  {terrazaSeleccionada.servicios.map((s, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{s}</span>
                    </li>
                  ))}
                  <li className="flex items-center gap-2">
                    <Droplets className="w-3.5 h-3.5 text-blue-600" />
                    <span>Estación de hidratación continua con recambio cada 45 min</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Horario óptimo de paseo: <strong>{terrazaSeleccionada.horarioRecomendado}</strong></span>
                <Button size="sm" variant="primary" onClick={() => setTerrazaSeleccionada(null)}>
                  Entendido
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </section>
  );
}

