import React from 'react';
import { TelemetriaHero } from '../components/TelemetriaHero';
import { RadarTerrazas } from '../components/RadarTerrazas';
import { CopilotoBruno } from '../components/CopilotoBruno';
import { RuletaVideos } from '../components/RuletaVideos';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ShieldCheck, Heart, Sparkles, Navigation, Award, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="w-full">
      {/* 1. Hero Editorial y Telemetría en Vivo */}
      <TelemetriaHero />

      {/* 2. Recomendación de videos (arco infinito, solo el video central se reproduce) */}
      <RuletaVideos />

      {/* 3. Sección Informativa de los Tres Pilares Urbanos */}
      <section className="py-12 border-b border-slate-200/60 bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#FAF9FE] border border-slate-200/60">
              <div className="w-10 h-10 rounded-xl bg-[#501228] text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-[#FDF2F4]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-base text-[#111827]">
                  Protección Podal Canina
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  El asfalto oscuro en San José puede alcanzar 55 °C al mediodía. Alertamos cuando supera el umbral seguro de 26 °C.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#FAF9FE] border border-slate-200/60">
              <div className="w-10 h-10 rounded-xl bg-[#501228] text-white flex items-center justify-center shrink-0">
                <Navigation className="w-5 h-5 text-[#FDF2F4]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-base text-[#111827]">
                  Rutas Acústicamente Limpias
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cartografía de decibelios para evitar escapes por pánico o estrés auditivo en zonas de alta congestión vehicular.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#FAF9FE] border border-slate-200/60">
              <div className="w-10 h-10 rounded-xl bg-[#501228] text-white flex items-center justify-center shrink-0">
                <Award className="w-5 h-5 text-[#FDF2F4]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif font-bold text-base text-[#111827]">
                  Certificación Oro en Terrazas
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cada local auditado garantiza tazones higienizados, agua fría de recambio continuo y anclajes certificados en mesa.
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
      <section className="py-16 bg-gradient-to-r from-[#501228] to-[#6E1E3A] text-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-3 text-center md:text-left">
            <Badge variant="default" className="bg-white/10 text-pink-100 border-white/20">
              Registro Único GAM
            </Badge>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
              Lleva el carnet médico de tu perro en tu teléfono
            </h2>
            <p className="text-pink-100/90 text-sm leading-relaxed">
              Genera la placa QR para el collar inteligente de tu mascota, sincronizada con pólizas del INS y su historial de vacunación.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/perfil">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Ver Bóveda de Bruno
              </Button>
            </Link>
            <Link to="/acceso">
              <Button variant="outline" size="lg" className="w-full sm:w-auto border-white text-white hover:bg-white/10">
                Crear Perfil de Mascota
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

