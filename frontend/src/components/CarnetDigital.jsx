import React, { useState } from 'react';
import { ShieldCheck, Heart, QrCode, Phone, AlertCircle, Award, Sparkles, Dog } from 'lucide-react';
import { Badge } from './ui/Badge';
import { useTema } from '../context/TemaContext';
import { useIdioma } from '../context/IdiomaContext';

export function CarnetDigital({ mascota, interactivo = true }) {
  const { esClaro, esMorado, esOscuro } = useTema();
  const { t } = useIdioma();
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

  const clasesCarnet = {
    tarjeta: esClaro
      ? 'bg-gradient-to-br from-white via-[#FCFAFE] to-[#F8F1F5] border-slate-200/90 text-slate-800'
      : esMorado
      ? 'bg-gradient-to-br from-[#1E0C17] via-[#160811] to-[#10050C] border-[#F27B91]/30 text-[#FDF2F6]'
      : 'bg-gradient-to-br from-[#111827] via-[#131d2e] to-[#0d131f] border-white/10 text-[#E8EDF5]',

    bordeInterno: esClaro
      ? 'border-slate-200/60'
      : esMorado
      ? 'border-[#F27B91]/20'
      : 'border-white/10',

    marcaAgua: esClaro ? 'text-[#501228] opacity-5' : esMorado ? 'text-[#F27B91] opacity-10' : 'text-white opacity-5',

    iconoHeader: esClaro ? 'bg-[#501228] text-white' : esMorado ? 'bg-[#55152D] text-white' : 'bg-[#1E293B] text-white',

    subtituloHeader: esClaro ? 'text-[#501228]' : esMorado ? 'text-[#F27B91]' : 'text-slate-400',

    titulo: esClaro ? 'text-[#111827]' : esMorado ? 'text-white' : 'text-white',

    cajaDato: esClaro
      ? 'bg-white/80 border-slate-200/60'
      : esMorado
      ? 'bg-[#24111E] border-[#F27B91]/20'
      : 'bg-[#162032] border-white/10',

    cajaMicrochip: esClaro
      ? 'bg-slate-50/90 border-slate-200/70 text-[#111827]'
      : esMorado
      ? 'bg-[#24111E] border-[#F27B91]/25 text-[#FDF2F6]'
      : 'bg-[#162032] border-white/10 text-[#E8EDF5]',

    cajaPoliza: esClaro
      ? 'bg-[#FDF2F4] border-[#F9E2E8]'
      : esMorado
      ? 'bg-[#2F1323] border-[#F27B91]/30'
      : 'bg-[#162032] border-white/10',

    cajaAlergias: esClaro
      ? 'bg-amber-50/70 border-amber-200/50 text-amber-900'
      : esMorado
      ? 'bg-[#2B1410] border-amber-500/30 text-amber-200'
      : 'bg-amber-950/25 border-amber-800/40 text-amber-300',

    textoPie: esClaro ? 'text-slate-500' : esMorado ? 'text-[#D8C3CC]' : 'text-slate-400',
  };

  const fotoMascota = mascota?.foto || mascota?.photoUrl || mascota?.photo_url || null;
  const idCorto = String(mascota?.id || 'PET-CR-0001').split('-').slice(-2).join('-');
  const alergiasTexto = Array.isArray(mascota?.alergias)
    ? mascota.alergias.join(', ')
    : typeof mascota?.alergias === 'string'
    ? mascota.alergias
    : '';
  const nombreMascota = mascota?.nombre || t('comun.miMascotaDefault');
  const aseguradora = mascota?.polizaMedica?.aseguradora || t('carnet.aseguradoraDefault');
  const numeroPoliza = mascota?.polizaMedica?.numeroPoliza || t('carnet.polizaDefault');
  const telefonoTutor = mascota?.tutor?.telefono || t('comun.sinRegistrar');

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
        className={`carnet-digital-card relative w-full overflow-hidden rounded-3xl p-6 shadow-xl border transition-all duration-300 ${
          interactivo ? 'cursor-pointer hover:shadow-2xl' : ''
        } ${clasesCarnet.tarjeta}`}
      >
        {/* Marca de agua / textura de fondo */}
        <div className={`absolute top-0 right-0 p-8 pointer-events-none ${clasesCarnet.marcaAgua}`}>
          <Dog className="w-48 h-48" />
        </div>

        {/* Encabezado del Carnet */}
        <div className={`flex items-start justify-between pb-4 border-b relative z-10 ${clasesCarnet.bordeInterno}`}>
          <div className="flex items-center gap-3 min-w-0">
            {fotoMascota ? (
              <div
                style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px' }}
                className="w-12 h-12 rounded-2xl overflow-hidden shadow-md border-2 border-[#F27B91]/40 shrink-0 bg-slate-800"
              >
                <img
                  src={fotoMascota}
                  alt={nombreMascota}
                  style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                  className="w-12 h-12 object-cover block"
                />
              </div>
            ) : (
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shrink-0 ${clasesCarnet.iconoHeader}`}>
                <Dog className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0">
              <span className={`text-[10px] tracking-widest uppercase font-semibold block truncate ${clasesCarnet.subtituloHeader}`}>
                {t('carnet.bovedaGam')}
              </span>
              <h3 className={`font-serif font-black text-xl truncate ${clasesCarnet.titulo}`}>
                {nombreMascota}
              </h3>
            </div>
          </div>

          <div className="text-right">
            <Badge variant="burdeos" className="text-[10px] shadow-2xs">
              {t('carnet.verificado')}
            </Badge>
            <span className="text-[9px] opacity-60 block mt-1 tabular-nums">
              ID: {idCorto}
            </span>
          </div>
        </div>

        {/* Cuerpo del Carnet */}
        <div className="py-4 space-y-3.5 relative z-10 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-2.5 rounded-xl border shadow-2xs ${clasesCarnet.cajaDato}`}>
              <span className="text-[10px] uppercase font-semibold opacity-60 block">{t('carnet.razaManto')}</span>
              <p className="font-bold text-xs truncate mt-0.5">{mascota?.raza || t('carnet.mestizo')}</p>
              <span className="text-[10px] opacity-75">{mascota?.colorManto || t('carnet.variado')}</span>
            </div>

            <div className={`p-2.5 rounded-xl border shadow-2xs ${clasesCarnet.cajaDato}`}>
              <span className="text-[10px] uppercase font-semibold opacity-60 block">{t('carnet.biometria')}</span>
              <p className="font-bold text-xs mt-0.5">{t('carnet.pesoEdad', { peso: mascota?.pesoKg || 15, edad: mascota?.edadAnos || 2 })}</p>
              <span className="text-[10px] text-emerald-500 font-medium">{t('carnet.sangre', { grupo: mascota?.grupoSanguineo || t('carnet.porDefinir') })}</span>
            </div>
          </div>

          {/* Microchip */}
          <div className={`p-2.5 rounded-xl border flex items-center justify-between ${clasesCarnet.cajaMicrochip}`}>
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-semibold opacity-60 block">{t('carnet.microchipUniversal')}</span>
              <span className="font-mono text-xs font-bold tracking-wider">
                {mascota?.microchipId || t('comun.enTramite')}
              </span>
            </div>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>

          {/* Póliza Médica */}
          <div className={`p-3 rounded-xl border space-y-1 ${clasesCarnet.cajaPoliza}`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-wide ${esClaro ? 'text-[#501228]' : 'text-[#F27B91]'}`}>
                {aseguradora}
              </span>
              <span className="text-[10px] text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium border border-emerald-500/20">
                {t('carnet.activa')}
              </span>
            </div>
            <p className="text-[11px] opacity-90">
              {t('carnet.registroCobertura', { poliza: numeroPoliza })}
            </p>
          </div>

          {/* Alergias / Alerta */}
          <div className={`carnet-alergias flex items-start gap-2 p-2 rounded-xl border text-[11px] ${clasesCarnet.cajaAlergias}`}>
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 opacity-80" />
            <div>
              <span className="font-semibold">{t('carnet.alergiasLabel')}</span> {alergiasTexto || t('carnet.ningunaAlergia')}.
            </div>
          </div>
        </div>

        {/* Footer del Carnet */}
        <div className={`pt-3 border-t flex items-center justify-between text-[11px] relative z-10 ${clasesCarnet.bordeInterno} ${clasesCarnet.textoPie}`}>
          <div className="flex items-center gap-1.5">
            <Phone className={`w-3.5 h-3.5 ${esClaro ? 'text-[#501228]' : 'text-[#F27B91]'}`} />
            <span>{t('carnet.tutorLabel')} <strong>{telefonoTutor}</strong></span>
          </div>
          <span className="text-[10px] opacity-60">
            {interactivo ? t('carnet.alternar') : t('carnet.validoGam')}
          </span>
        </div>
      </div>
    </div>
  );
}
export default CarnetDigital;
