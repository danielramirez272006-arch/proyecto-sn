import React from 'react';
import { TelemetriaHero } from '../components/TelemetriaHero';
import { RadarTerrazas } from '../components/RadarTerrazas';
import { CopilotoBruno } from '../components/CopilotoBruno';
import { RuletaVideos } from '../components/RuletaVideos';
import { PageWrapper } from '../components/PageWrapper';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ShieldCheck, Navigation, Award, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  return (
    <PageWrapper className="space-y-4">
      {/* 1. Hero Editorial y Telemetría Urbana en Vivo */}
      <TelemetriaHero />

      {/* 2. Recomendación de videos educativos de cuidado veterinario */}
      <RuletaVideos />

      {/* 3. Sección Informativa de los Tres Pilares Urbanos de GoToX */}
      <section className="py-14 border-y border-white/5 bg-[#111827]/70">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="flex items-start gap-4 p-5 rounded-3xl bg-[#162032] border border-white/5 hover:border-[#F27B91]/30 transition-colors shadow-sm">
              <div className="w-11 h-11 rounded-2xl bg-[#55152D] text-[#F27B91] border border-[#F27B91]/25 flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif font-bold text-lg text-[#E8EDF5]">
                  Protección Podal Canina
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  El asfalto oscuro en San José puede superar 50 °C al mediodía. Alertamos cuando excede el umbral seguro de 26 °C.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-3xl bg-[#162032] border border-white/5 hover:border-[#F27B91]/30 transition-colors shadow-sm">
              <div className="w-11 h-11 rounded-2xl bg-[#55152D] text-[#F27B91] border border-[#F27B91]/25 flex items-center justify-center shrink-0 shadow-xs">
                <Navigation className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif font-bold text-lg text-[#E8EDF5]">
                  Rutas Acústicamente Limpias
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Cartografía de decibelios para evitar escapes por pánico o estrés auditivo en zonas de alta congestión del GAM.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-5 rounded-3xl bg-[#162032] border border-white/5 hover:border-[#F27B91]/30 transition-colors shadow-sm">
              <div className="w-11 h-11 rounded-2xl bg-[#55152D] text-[#F27B91] border border-[#F27B91]/25 flex items-center justify-center shrink-0 shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif font-bold text-lg text-[#E8EDF5]">
                  Certificación en Terrazas
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Cada local auditado garantiza tazones higienizados, agua fría de recambio continuo y anclajes seguros en mesa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Radar de Terrazas Verificadas */}
      <RadarTerrazas />

      {/* 5. Copiloto Bruno */}
      <CopilotoBruno />

      {/* 6. Banner de Llamado a la Acción hacia Bóveda Pet */}
      <section className="py-16 md:py-20 relative overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="relative rounded-3xl p-8 sm:p-12 overflow-hidden border border-[#F27B91]/25 bg-gradient-to-r from-[#55152D] via-[#3d0f20] to-[#111827] text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 text-left">
            <div className="max-w-xl space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-semibold tracking-wide uppercase text-[#F27B91] border border-white/15">
                <Sparkles className="w-3 h-3" />
                Registro Único GAM
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#E8EDF5]">
                Lleva el carnet médico de tu perro en tu teléfono
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Genera la medalla QR para el collar inteligente de tu mascota, sincronizada con pólizas del INS y su historial de vacunación.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              <Link to="/perfil" className="w-full sm:w-auto">
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto justify-center bg-white text-[#55152D] hover:bg-slate-100 border-transparent font-bold shadow-md"
                >
                  Ver Bóveda de Bruno
                </Button>
              </Link>
              <Link to="/acceso" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto justify-center border-white/30 text-[#E8EDF5] hover:bg-white/10"
                >
                  Crear Perfil de Mascota
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
