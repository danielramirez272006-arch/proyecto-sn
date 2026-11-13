import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { QrCode, Download, Share2, ShieldAlert, Sparkles, Check, Phone, Heart } from 'lucide-react';

export function QrCollar({ mascota }) {
  const [copiado, setCopiado] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);

  const qrUrl = `https://gotox.cr/sos/${mascota.microchipId}`;

  const handleCopiarEnlace = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(qrUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  const handleSimularImpresion = () => {
    setImprimiendo(true);
    setTimeout(() => {
      setImprimiendo(false);
      alert(`Preparado archivo vectorial de placa para collar de ${mascota.nombre}. Resolución: 300 DPI.`);
    }, 800);
  };

  return (
    <Card className="border-slate-200/80 p-6 space-y-6 shadow-sm bg-gradient-to-br from-white via-white to-[#FAF9FE]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#501228]">
            <QrCode className="w-3.5 h-3.5" />
            <span>Collar Inteligente &bull; Placa NFC / QR</span>
          </div>
          <h3 className="font-serif font-bold text-xl text-[#111827]">
            Placa QR de Identificación Inmediata
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Cualquier persona que escanee la medalla con la cámara de su teléfono accede al historial médico y contacto de emergencia de {mascota.nombre} sin instalar apps.
          </p>
        </div>
        <Badge variant="burdeos">Nivel 1 SOS</Badge>
      </div>

      {/* Vista de la Medalla / Collar */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
        {/* Medalla física simulada */}
        <div className="qr-claro relative w-48 h-48 rounded-3xl bg-white border-4 border-[#501228] p-4 shadow-xl flex flex-col items-center justify-between">
          <div className="absolute -top-3 w-6 h-6 rounded-full bg-[#501228] border-2 border-white flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>

          <div className="text-[10px] font-black uppercase tracking-widest text-[#501228] pt-1">
            GOTOX PET OS
          </div>

          {/* Código QR Vectorial SVG del Collar */}
          <div className="w-28 h-28 bg-white p-1 rounded-xl border border-slate-100 flex items-center justify-center shadow-inner">
            <svg
              viewBox="0 0 100 100"
              className="w-full h-full text-[#501228]"
              fill="currentColor"
              aria-label="Código QR del collar canino"
            >
              {/* Marcadores de posición en esquinas (Finder patterns) */}
              <rect x="5" y="5" width="26" height="26" rx="4" fill="#501228" />
              <rect x="9" y="9" width="18" height="18" rx="2" fill="#FFFFFF" />
              <rect x="13" y="13" width="10" height="10" rx="1" fill="#501228" />

              <rect x="69" y="5" width="26" height="26" rx="4" fill="#501228" />
              <rect x="73" y="9" width="18" height="18" rx="2" fill="#FFFFFF" />
              <rect x="77" y="13" width="10" height="10" rx="1" fill="#501228" />

              <rect x="5" y="69" width="26" height="26" rx="4" fill="#501228" />
              <rect x="9" y="73" width="18" height="18" rx="2" fill="#FFFFFF" />
              <rect x="13" y="77" width="10" height="10" rx="1" fill="#501228" />

              {/* Patrones de sincronización y datos */}
              <rect x="35" y="15" width="6" height="6" rx="1" fill="#501228" />
              <rect x="45" y="15" width="6" height="6" rx="1" fill="#501228" />
              <rect x="55" y="15" width="6" height="6" rx="1" fill="#501228" />

              <rect x="15" y="35" width="6" height="6" rx="1" fill="#501228" />
              <rect x="15" y="45" width="6" height="6" rx="1" fill="#501228" />
              <rect x="15" y="55" width="6" height="6" rx="1" fill="#501228" />

              <rect x="35" y="35" width="8" height="8" rx="2" fill="#501228" />
              <rect x="48" y="35" width="6" height="6" rx="1" fill="#501228" />
              <rect x="58" y="35" width="6" height="6" rx="1" fill="#501228" />
              <rect x="35" y="48" width="6" height="6" rx="1" fill="#501228" />
              <rect x="45" y="45" width="12" height="12" rx="2" fill="#501228" />
              <rect x="62" y="48" width="6" height="6" rx="1" fill="#501228" />

              <rect x="35" y="65" width="6" height="6" rx="1" fill="#501228" />
              <rect x="45" y="62" width="8" height="8" rx="1" fill="#501228" />
              <rect x="58" y="65" width="6" height="6" rx="1" fill="#501228" />
              <rect x="70" y="50" width="8" height="8" rx="2" fill="#501228" />
              <rect x="82" y="50" width="6" height="6" rx="1" fill="#501228" />
              <rect x="70" y="65" width="6" height="6" rx="1" fill="#501228" />
              <rect x="80" y="62" width="10" height="10" rx="2" fill="#501228" />
              <rect x="70" y="78" width="8" height="8" rx="1" fill="#501228" />
              <rect x="82" y="78" width="6" height="6" rx="1" fill="#501228" />
              <rect x="45" y="78" width="6" height="6" rx="1" fill="#501228" />
              <rect x="55" y="78" width="8" height="8" rx="1" fill="#501228" />
            </svg>
          </div>

          <div className="text-center">
            <span className="text-[11px] font-bold text-[#111827] block">
              {mascota.nombre}
            </span>
            <span className="text-[9px] text-[#501228] font-mono">
              SOS: {mascota.tutor.telefono}
            </span>
          </div>
        </div>

        {/* Detalles de la Placa y Acciones */}
        <div className="space-y-3 flex-1 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 space-y-1">
            <span className="text-[10px] uppercase font-semibold text-slate-500 block">Enlace de Emergencia</span>
            <p className="font-mono text-[11px] text-[#501228] break-all">
              {qrUrl}
            </p>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Phone className="w-3.5 h-3.5 text-[#501228]" />
              <span>Conecta directo a llamada con <strong>{mascota.tutor.nombre}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Advierte de alergias y grupo sanguíneo antes de administrar fármacos</span>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={copiado ? Check : Share2}
              onClick={handleCopiarEnlace}
            >
              {copiado ? 'Enlace Copiado' : 'Copiar URL SOS'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Download}
              disabled={imprimiendo}
              onClick={handleSimularImpresion}
            >
              {imprimiendo ? 'Generando...' : 'Descargar SVG de Placa'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

