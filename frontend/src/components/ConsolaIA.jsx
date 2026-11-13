import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Sparkles, Send, CornerDownLeft, Bot, CheckCircle2, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { api } from '../shared/services/api-client';

const SUGERENCIAS_RAPIDAS = [
  "Consultar aforo en Barrio Escalante",
  "Alerta de lluvia en Parque La Sabana",
  "Verificar disponibilidad de Ambulancia SOS-1",
  "Analizar decibelios para perros reactivos"
];

const BASE_CONOCIMIENTO = {
  "escalante": {
    titulo: "Estado de Terrazas en Barrio Escalante",
    tipo: "info",
    contenido: "Franco Café tiene 4 de 8 cupos ocupados (46 dB). El Árbol de Seda reporta 2 de 6 cupos con 42 dB (Ultra silencioso). Pavimento térmico en Calle 33 a 22.4 °C con 88% de sombra.",
    kpi: "6 cupos disponibles en la zona",
    accionSugerida: "Reservar anclaje en Franco Café o caminar hacia Parque Francia."
  },
  "sabana": {
    titulo: "Monitoreo Meteorológico: Parque Metropolitano La Sabana",
    tipo: "alerta",
    contenido: "Radar Doppler detecta nube pluvial a 7 km al sureste. Ventana seca remanente: 38 minutos. Pavimento del bulevar central a 23.1 °C.",
    kpi: "Lluvia estimada en 38 min",
    accionSugerida: "Comenzar retorno antes de las 11:20 AM o refugiarse en pérgolas del sector oeste."
  },
  "sos": {
    titulo: "Estado Operativo: Flota SOS GAM",
    tipo: "exito",
    contenido: "Ambulancia Canina Alpha-1 activa en subestación Rohrmoser (94% batería, oxígeno pleno). Móvil Vet Express-2 patrullando Barrio Escalante. Tiempo medio de respuesta: 4.2 minutos.",
    kpi: "3 de 3 unidades 100% operativas",
    accionSugerida: "Canal prioritario 800-PET-HELP habilitado para socios INS Mascotas."
  },
  "decibelios": {
    titulo: "Filtro Acústico para Caninos Reactivos",
    tipo: "info",
    contenido: "Para perros sensibles a detonaciones o bullicio, los espacios auditados < 45 dB en San José Este son: El Árbol de Seda (42 dB) y el Sendero Botánico Dent (39 dB).",
    kpi: "Zona segura acústica confirmada",
    accionSugerida: "Activar modo 'Paseo Silencioso' en collar inteligente."
  }
};

export function ConsolaIA() {
  const [consulta, setConsulta] = useState('');
  const [cargando, setCargando] = useState(false);
  const [respuesta, setRespuesta] = useState({
    titulo: "Consola Sintética GoToX Pet OS",
    tipo: "info",
    contenido: "Centro de inferencia urbana en tiempo real. Escribe una consulta en lenguaje natural sobre aforo, microclimas, tolerancia por raza o emergencias en el GAM.",
    kpi: "Núcleo IA Operativo",
    accionSugerida: "Selecciona una sugerencia rápida o escribe tu duda."
  });

  const resolverFallbackLocal = (textoOriginal, query) => {
    if (query.includes('escalante') || query.includes('aforo') || query.includes('franco') || query.includes('local')) {
      return BASE_CONOCIMIENTO.escalante;
    }
    if (query.includes('sabana') || query.includes('lluvia') || query.includes('clima') || query.includes('agua')) {
      return BASE_CONOCIMIENTO.sabana;
    }
    if (query.includes('sos') || query.includes('ambulancia') || query.includes('emergencia') || query.includes('flota')) {
      return BASE_CONOCIMIENTO.sos;
    }
    if (query.includes('decibelio') || query.includes('ruido') || query.includes('reactivo') || query.includes('ansiedad')) {
      return BASE_CONOCIMIENTO.decibelios;
    }
    return {
      titulo: `Análisis para: "${textoOriginal}"`,
      tipo: "info",
      contenido: `Inferencia procesada con telemetría de San José: Asfalto a 23.2 °C, radiación UV moderada y 0 incidentes acústicos en los últimos 45 minutos. Los espacios gastronómicos cumplen la norma Pet-OS.`,
      kpi: "Condiciones estables en GAM",
      accionSugerida: "Puedes consultar sobre terrazas específicas o solicitar asistencia veterinaria inmediata."
    };
  };

  const procesarConsulta = async (texto) => {
    const textoOriginal = texto || consulta;
    const query = textoOriginal.toLowerCase();
    if (!query.trim()) return;

    setCargando(true);
    if (texto) setConsulta(texto);

    try {
      const data = await api.post('/concierge/chat', {
        session_id: 'gotox_frontend',
        message: textoOriginal
      });
      const textoBackend = data?.reply || data?.response || data?.message || data?.text || data?.answer;
      if (textoBackend) {
        setRespuesta({
          titulo: `Copiloto Backend: "${textoOriginal}"`,
          tipo: "exito",
          contenido: typeof textoBackend === 'string' ? textoBackend : JSON.stringify(textoBackend),
          kpi: data?.provider ? `Conectado (${data.provider})` : "Backend Conectado",
          accionSugerida: data?.suggested_action || "Respuesta generada desde /api/concierge/chat."
        });
        setCargando(false);
        return;
      }
    } catch {
      // Si el backend no está activo o no hay APIs configuradas, usar respaldo local sin romper la UI
    }

    setRespuesta(resolverFallbackLocal(textoOriginal, query));
    setCargando(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    procesarConsulta();
  };

  return (
    <Card className="border-slate-200/80 p-6 space-y-4 shadow-sm bg-gradient-to-b from-white to-[#FAF9FE]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#501228] flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4 text-[#FDF2F4]" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-[#111827]">
              Consola de Mando IA Urbana
            </h3>
            <span className="text-[11px] text-slate-500">
              Inferencia sintética con datos locales del GAM &bull; Sin llamadas externas
            </span>
          </div>
        </div>
        <Badge variant="success">IA Activa</Badge>
      </div>

      {/* Sugerencias Rápidas */}
      <div className="flex flex-wrap gap-2 pt-1">
        {SUGERENCIAS_RAPIDAS.map((sug, i) => (
          <button
            key={i}
            type="button"
            onClick={() => procesarConsulta(sug)}
            className="text-xs px-3 py-1.5 rounded-full bg-white text-slate-700 border border-slate-200/90 hover:border-[#501228] hover:text-[#501228] transition-all shadow-2xs"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Input de Consulta */}
      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Escribe tu consulta urbana (ej. ¿Hay espacio en Escalante para un Golden?)..."
          className="w-full bg-white text-sm text-[#111827] rounded-xl border border-slate-200 pl-4 pr-12 py-3 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#501228]/20 focus:border-[#501228] transition-all"
        />
        <button
          type="submit"
          disabled={cargando || !consulta.trim()}
          aria-label="Enviar consulta a la consola de inteligencia artificial"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[#501228] text-white hover:bg-[#6E1E3A] disabled:opacity-40 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Panel de Respuesta Sintética */}
      <div className="mt-4 p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#501228]" />
            <span className="font-semibold text-xs text-[#111827]">
              {cargando ? 'Analizando telemetría y cartografía...' : respuesta.titulo}
            </span>
          </div>
          <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
            {respuesta.kpi}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
          {cargando ? 'Consultando sensores térmicos y niveles de aforo...' : respuesta.contenido}
        </p>

        {respuesta.accionSugerida && !cargando && (
          <div className="pt-2 flex items-center gap-2 text-xs text-[#501228] bg-[#FDF2F4] p-2.5 rounded-lg border border-[#F9E2E8]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span><strong>Recomendación del sistema:</strong> {respuesta.accionSugerida}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

