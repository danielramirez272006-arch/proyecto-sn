import React from 'react';
import { MIEMBROS_EQUIPO } from '../data/equipo';
import { RobinCat } from '../components/avatares/RobinCat';
import { DeadpoolCat } from '../components/avatares/DeadpoolCat';
import { ChatGptCat } from '../components/avatares/ChatGptCat';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ShieldCheck, Heart, Sparkles, MapPin, Award, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Nosotros() {
  const renderAvatar = (tipoAvatar) => {
    switch (tipoAvatar) {
      case 'robin':
        return <RobinCat className="w-24 h-24 sm:w-28 sm:h-28" />;
      case 'deadpool':
        return <DeadpoolCat className="w-24 h-24 sm:w-28 sm:h-28" />;
      case 'chatgpt':
        return <ChatGptCat className="w-24 h-24 sm:w-28 sm:h-28" />;
      default:
        return <RobinCat className="w-24 h-24" />;
    }
  };

  return (
    <div className="w-full py-12 md:py-20">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-16">
        {/* Encabezado Editorial */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF2F4] text-[#501228] text-xs font-semibold">
            <Heart className="w-3.5 h-3.5 fill-[#501228]" />
            <span>Manifiesto GoToX Pet OS</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-[#111827] tracking-tight">
            Ciudades diseñadas para convivir en cuatro patas
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            GoToX Pet OS nació en San José, Costa Rica, para resolver un vacío crítico: la falta de datos ambientales en tiempo real adaptados a la fisonomía de las mascotas que transitan por nuestras calles.
          </p>
        </div>

        {/* Misión y Valores en Grilla */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 border-slate-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FDF2F4] text-[#501228] flex items-center justify-center font-bold">
              01
            </div>
            <h3 className="font-serif font-bold text-xl text-[#111827]">
              Bienestar Podal & Térmico
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Nuestras mascotas no llevan suelas protectoras. Desarrollamos algoritmos que analizan la retención térmica de la mezcla asfáltica bajo el sol tropical de San José Este y Oeste.
            </p>
          </Card>

          <Card className="p-6 border-slate-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FDF2F4] text-[#501228] flex items-center justify-center font-bold">
              02
            </div>
            <h3 className="font-serif font-bold text-xl text-[#111827]">
              Respeto Acústico Canino
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              El oído canino percibe frecuencias de hasta 45,000 Hz. Auditamos terrazas y bulevares para garantizar que no excedan umbrales detonantes de taquicardia o pánico.
            </p>
          </Card>

          <Card className="p-6 border-slate-200/80 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FDF2F4] text-[#501228] flex items-center justify-center font-bold">
              03
            </div>
            <h3 className="font-serif font-bold text-xl text-[#111827]">
              Soberanía de Datos Médicos
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Un estándar abierto de identificación donde el historial de vacunación, pólizas y contactos de emergencia se resuelven en milisegundos mediante chips universales y códigos QR locales.
            </p>
          </Card>
        </div>

        {/* Sección de Liderazgo y Equipo */}
        <div className="space-y-8 pt-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <Badge variant="burdeos">Arquitectura & Liderazgo</Badge>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#111827]">
              El Equipo Detrás del Sistema Operativo
            </h2>
            <p className="text-sm text-slate-600">
              Ilustraciones exclusivas tipo avatar felino en homenaje al espíritu guardián del ecosistema urbano.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {MIEMBROS_EQUIPO.map((miembro) => (
              <Card
                key={miembro.id}
                className="p-6 border-slate-200/80 flex flex-col items-center text-center space-y-4 bg-gradient-to-b from-white to-[#FAF9FE] gotox-card-hover"
              >
                {/* Ilustración de Avatar de Gato SVG */}
                <div className="relative p-2 rounded-3xl bg-slate-50 border border-slate-200/60 shadow-inner">
                  {renderAvatar(miembro.tipoAvatar)}
                </div>

                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-xl text-[#111827]">
                    {miembro.nombre}
                  </h3>
                  <p className="text-xs font-semibold text-[#501228] uppercase tracking-wide">
                    {miembro.rol}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {miembro.subtitulo}
                  </p>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {miembro.bio}
                </p>

                <div className="pt-3 border-t border-slate-100 w-full text-left">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
                    Enfoque Operativo
                  </span>
                  <p className="text-[11px] text-slate-700 leading-tight">
                    {miembro.enfoque}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Alianza con el Gran Área Metropolitana */}
        <div className="p-8 rounded-3xl bg-[#FAF9FE] border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <h3 className="font-serif text-2xl font-bold text-[#111827]">
              ¿Gestionas un espacio gastronómico en el GAM?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600">
              Solicita la inspección acústica y térmica oficial de GoToX Pet OS para obtener la certificación física e integrarte a nuestro radar satelital.
            </p>
          </div>
          <Link to="/panel">
            <Button variant="primary" icon={ArrowRight}>
              Ver Locales Auditados
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

