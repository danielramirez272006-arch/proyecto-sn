import React, { useState } from 'react';
import { ShieldCheck, Heart, QrCode, Phone, AlertCircle, Award, Sparkles, Dog } from 'lucide-react';
import { Badge } from './ui/Badge';

export function CarnetDigital({ mascota, interactivo = true }) {
  const [inclinacion, setInclinacion] = useState({ x: 0, y: 0 });
  const [volteado, setVolteado] = useState(false);

  const handleMouseMove = (e) => {
    if (!interactivo) return;
    const card = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - card.left;
    const mouseY = e.clientY - card.top;
    const rotateY = ((mouseX / card.width) - 0.5) * 16;
    const rotateX = -(((mouseY / card.height) - 0.5) * 16);
    setInclinacion({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setInclinacion({ x: 0, y: 0 });
  };

  return (
    <div className="perspective-1000 w-full max-w-md mx-auto select-none">
      <div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => interactivo && setVolteado(!volteado)}
        style={{
          transform: `rotateX(${inclinacion.x}deg) rotateY(${inclinacion.y}deg)`,
          transition: 'transform 0.15s ease-out'
        }}
        className={`relative w-full rounded-3xl p-6 shadow-xl border border-slate-200/90 text-slate-800 transition-all duration-300 ${
          interactivo ? 'cursor-pointer hover:shadow-2xl' : ''
        } bg-gradient-to-br from-white via-[#FCFAFE] to-[#F8F1F5]`}
      >
        {/* Marca de agua / textura de fondo */}
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Dog className="w-48 h-48 text-[#501228]" />
        </div>

        {/* Encabezado del Carnet */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200/60 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#501228] flex items-center justify-center text-white shadow-md">
              <Dog className="w-6 h-6 text-[#FDF2F4]" />
            </div>
            <div>
              <span className="text-[10px] tracking-widest uppercase font-semibold text-[#501228] block">
                Bóveda Biométrica &bull; GAM
              </span>
              <h3 className="font-serif font-black text-xl text-[#111827]">
                {mascota.nombre}
              </h3>
            </div>
          </div>

          <div className="text-right">
            <Badge variant="burdeos" className="text-[10px] shadow-2xs">
              Pet-OS Verificado
            </Badge>
            <span className="text-[9px] text-slate-400 block mt-1 tabular-nums">
              ID: {mascota.id.split('-').slice(-2).join('-')}
            </span>
          </div>
        </div>

        {/* Cuerpo del Carnet */}
        <div className="py-4 space-y-3.5 relative z-10 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Raza & Manto</span>
              <p className="font-bold text-slate-800 text-xs truncate">{mascota.raza}</p>
              <span className="text-[10px] text-slate-500">{mascota.colorManto}</span>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/60 shadow-2xs">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Biometría</span>
              <p className="font-bold text-slate-800 text-xs">{mascota.pesoKg} kg &bull; {mascota.edadAnos} años</p>
              <span className="text-[10px] text-emerald-700 font-medium">Sangre: {mascota.grupoSanguineo}</span>
            </div>
          </div>

          {/* Microchip */}
          <div className="bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-semibold text-slate-500 block">Microchip Universal</span>
              <span className="font-mono text-xs font-bold text-[#111827] tracking-wider">
                {mascota.microchipId}
              </span>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>

          {/* Póliza Médica */}
          <div className="bg-[#FDF2F4] p-3 rounded-xl border border-[#F9E2E8] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#501228] uppercase tracking-wide">
                {mascota.polizaMedica.aseguradora}
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-medium">
                Activa
              </span>
            </div>
            <p className="text-[11px] text-[#6E1E3A]">
              Póliza: <strong>{mascota.polizaMedica.numeroPoliza}</strong> &bull; Cobertura emergencias activa
            </p>
          </div>

          {/* Alergias / Alerta */}
          <div className="flex items-start gap-2 bg-amber-50/70 p-2 rounded-xl border border-amber-200/50 text-[11px] text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Alergias registradas:</span> {mascota.alergias.join(', ')}.
            </div>
          </div>
        </div>

        {/* Footer del Carnet */}
        <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 relative z-10">
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-[#501228]" />
            <span>Tutor: <strong>{mascota.tutor.telefono}</strong></span>
          </div>
          <span className="text-[10px] text-slate-400">
            {interactivo ? 'Haz click para alternar' : 'Válido en red GAM'}
          </span>
        </div>
      </div>
    </div>
  );
}

