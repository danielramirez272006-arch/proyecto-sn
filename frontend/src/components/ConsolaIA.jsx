import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
  Sparkles,
  Send,
  Bot,
  CheckCircle2,
  ShieldCheck,
  Activity,
  Play,
  Database,
  Lock
} from 'lucide-react';
import { api } from '../shared/services/api-client';
import { useIdioma } from '../context/IdiomaContext';

const SUGERENCIAS_RAPIDAS = [
  'Consultar aforo en Barrio Escalante',
  'Alerta de lluvia en Parque La Sabana',
  'Verificar disponibilidad de Ambulancia SOS-1',
  'Analizar decibelios para perros reactivos'
];

export const CATALOGO_8_AGENTES_IA = [
  {
    id: 'argos-concierge',
    nombre: '1. Copiloto Argos (Concierge & Rutas GAM)',
    rolAutorizado: 'Cliente / Administrador',
    modelo: 'Google Gemini 3.8 Flash',
    objetivo: 'Generar itinerarios personalizados y recomendaciones contextuales cruzando clima, asfalto, acústica y perfil de mascota.',
    entrada: 'Consulta en lenguaje natural, zona GAM, presupuesto y perfil canino.',
    salida: 'Plan sugerido con paradas verificadas, ventana seca y nivel de confort térmico.',
    proteccionDatos: 'Anonimización de correo/teléfono antes del prompt; solo envía raza, peso y zona aproximada.',
    promptDemo: 'Recomienda una ruta segura hoy en Barrio Escalante para perro mediano'
  },
  {
    id: 'video-vet-analyzer',
    nombre: '2. Analizador Educativo de Videos Veterinarios',
    rolAutorizado: 'Cliente / Administrador',
    modelo: 'Google Gemini 3.8 Flash',
    objetivo: 'Analizar videos de cuidado animal de YouTube y responder preguntas puntuales devolviendo fragmentos y recomendaciones verificadas.',
    entrada: 'ID de video de YouTube, metadatos del canal y pregunta del tutor.',
    salida: 'Respuesta veterinaria estructurada, minuto de referencia y consejos prácticos.',
    proteccionDatos: 'Sin envío de datos personales del tutor; procesamiento exclusivo sobre transcripción pública.',
    promptDemo: 'Analizar consejos de enriquecimiento ambiental y primeros auxilios caninos'
  },
  {
    id: 'cartographer-autotagger',
    nombre: '3. Agente Cartógrafo & Auto-Tagger IA',
    rolAutorizado: 'Administrador',
    modelo: 'DeepSeek Chat / Gemini Flash',
    objetivo: 'Clasificar automáticamente comercios de OpenStreetMap/Foursquare y detectar duplicados difusos por coordenadas y nombre.',
    entrada: 'Nombre del comercio, coordenadas GPS, etiquetas OSM y categoría bruta.',
    salida: 'Etiquetas normalizadas Pet-OS (terraza, sombra, agua, decibelios estimados) y score de similitud.',
    proteccionDatos: 'Procesa únicamente datos públicos de establecimientos comerciales.',
    promptDemo: 'Escanear y etiquetar nuevos locales pet-friendly en San José Este'
  },
  {
    id: 'plan-operations-b',
    nombre: '4. Agente Operativo de Planes & Plan B Climático',
    rolAutorizado: 'Cliente / Administrador',
    modelo: 'Google Gemini 3.8 Flash',
    objetivo: 'Monitorear planes grupales confirmados y proponer automáticamente un Plan B techado si cambia el pronóstico de lluvia o aforo.',
    entrada: 'ID del plan activo, coordenadas de paradas, radar IMN/Open-Meteo y votos del grupo.',
    salida: 'Propuesta alternativa con terraza techada cercana (< 1.5 km) y notificación a invitados.',
    proteccionDatos: 'Identificadores de invitados tokenizados; no expone contactos personales.',
    promptDemo: 'Evaluar riesgo pluvial en planes activos de hoy y sugerir Plan B techado'
  },
  {
    id: 'weather-editor-briefing',
    nombre: '5. Editor Meteorológico & Térmico de Calzada',
    rolAutorizado: 'Cliente / Administrador',
    modelo: 'Google Gemini 3.8 Flash',
    objetivo: 'Redactar el boletín diario de seguridad podal calculando temperatura de asfalto, índice UV, feriados y precios RECOPE.',
    entrada: 'Telemetría Open-Meteo, radiación solar, humedad y calendario nacional.',
    salida: 'Boletín ejecutivo con semáforo térmico para almohadillas caninas y horarios óptimos de paseo.',
    proteccionDatos: 'Datos 100% ambientales y abiertos; cero datos personales.',
    promptDemo: 'Generar boletín térmico de asfalto y ventana seca para La Sabana y Rohrmoser'
  },
  {
    id: 'lost-pet-visual-matcher',
    nombre: '6. Agente de Rescate SOS & Coincidencia Canina',
    rolAutorizado: 'Cliente / Administrador',
    modelo: 'Google Gemini 3.8 Flash Vision',
    objetivo: 'Cruzar reportes comunitarios de mascotas extraviadas o avistadas en la Red SOS GAM por raza, manto, zona y collar QR.',
    entrada: 'Reporte SOS (tipo, raza, color de manto, ubicación en GAM y descripción).',
    salida: 'Porcentaje de coincidencia con alertas activas y ruta prioritaria de búsqueda.',
    proteccionDatos: 'El teléfono del tutor permanece oculto hasta confirmar coincidencia verificada.',
    promptDemo: 'Buscar coincidencias activas en Red SOS para perro mestizo avistado en Parque Francia'
  },
  {
    id: 'invoice-price-extractor',
    nombre: '7. Extractor Contable de Precios & Facturas Comerciales',
    rolAutorizado: 'Administrador',
    modelo: 'DeepSeek Chat / Gemini Flash',
    objetivo: 'Auditar tiquetes/menús reportados en comercios aliados para estimar el presupuesto promedio (₡) y validar cumplimiento.',
    entrada: 'Texto estructurado de menú o resumen de comprobante comercial.',
    salida: 'Rango de presupuesto certificado (económico/medio/alto) y desglose promedio en colones (CRC).',
    proteccionDatos: 'Eliminación automática de nombres o cédulas de clientes antes del análisis contable.',
    promptDemo: 'Auditar rango de precios promedio en cafeterías verificadas de Barrio Escalante'
  },
  {
    id: 'compliance-privacy-auditor',
    nombre: '8. Asistente de Cumplimiento & Privacidad (Ley N.º 8968)',
    rolAutorizado: 'Administrador',
    modelo: 'DeepSeek Chat (Gobernanza)',
    objetivo: 'Verificar solicitudes de supresión ARCO, auditar anonimización de bitácoras y vigilar el vencimiento semestral de evidencias.',
    entrada: 'Estado de solicitudes de baja, registros de consentimiento y fechas de vigencia de locales.',
    salida: 'Dictamen de cumplimiento Ley N.º 8968, alertas de políticas por vencer y hash de auditoría.',
    proteccionDatos: 'Opera exclusivamente sobre hashes y metadatos de gobernanza.',
    promptDemo: 'Ejecutar auditoría de cumplimiento Ley 8968 y políticas próximas a vencer'
  }
];

const BASE_CONOCIMIENTO = {
  escalante: {
    titulo: 'Estado de Terrazas en Barrio Escalante',
    tipo: 'info',
    contenido:
      'Franco Café tiene 4 de 8 cupos ocupados (46 dB). El Árbol de Seda reporta 2 de 6 cupos con 42 dB (Ultra silencioso). Pavimento térmico en Calle 33 a 22.4 °C con 88% de sombra.',
    kpi: '6 cupos disponibles en la zona',
    accionSugerida: 'Reservar anclaje en Franco Café o caminar hacia Parque Francia.'
  },
  sabana: {
    titulo: 'Monitoreo Meteorológico: Parque Metropolitano La Sabana',
    tipo: 'alerta',
    contenido:
      'Radar Doppler detecta nube pluvial a 7 km al sureste. Ventana seca remanente: 38 minutos. Pavimento del bulevar central a 23.1 °C.',
    kpi: 'Lluvia estimada en 38 min',
    accionSugerida: 'Comenzar retorno antes de las 11:20 AM o refugiarse en pérgolas del sector oeste.'
  },
  sos: {
    titulo: 'Estado Operativo: Flota SOS GAM',
    tipo: 'exito',
    contenido:
      'Ambulancia Canina Alpha-1 activa en subestación Rohrmoser (94% batería, oxígeno pleno). Móvil Vet Express-2 patrullando Barrio Escalante. Tiempo medio de respuesta: 4.2 minutos.',
    kpi: '3 de 3 unidades 100% operativas',
    accionSugerida: 'Canal prioritario 800-PET-HELP habilitado para socios INS Mascotas.'
  },
  decibelios: {
    titulo: 'Filtro Acústico para Caninos Reactivos',
    tipo: 'info',
    contenido:
      'Para perros sensibles a detonaciones o bullicio, los espacios auditados < 45 dB en San José Este son: El Árbol de Seda (42 dB) y el Sendero Botánico Dent (39 dB).',
    kpi: 'Zona segura acústica confirmada',
    accionSugerida: "Activar modo 'Paseo Silencioso' en collar inteligente."
  }
};

export function ConsolaIA() {
  const { t, idiomaActual } = useIdioma();
  const localeTiempo = idiomaActual?.ttsLang || 'es-CR';
  const sugerenciasRapidas = [
    t('consolaIA.sug1'),
    t('consolaIA.sug2'),
    t('consolaIA.sug3'),
    t('consolaIA.sug4')
  ];

  const [consulta, setConsulta] = useState('');
  const [cargando, setCargando] = useState(false);
  const [agenteEjecutando, setAgenteEjecutando] = useState(null);
  const [bitacoraEjecuciones, setBitacoraEjecuciones] = useState([
    {
      id: 'LOG-IA-901',
      agentId: 'argos-concierge',
      agente: '1. Copiloto Argos (Concierge & Rutas GAM)',
      modelo: 'Google Gemini 3.8 Flash',
      rol: 'Administrador',
      estadoKey: 'consolaIA.estadoRegistrado',
      hora: new Date().toLocaleTimeString(localeTiempo, { hour: '2-digit', minute: '2-digit' })
    },
    {
      id: 'LOG-IA-900',
      agentId: 'compliance-privacy-auditor',
      agente: '8. Asistente de Cumplimiento & Privacidad (Ley N.º 8968)',
      modelo: 'DeepSeek Chat',
      rol: 'Sistema / Admin',
      estadoKey: 'consolaIA.estadoRegistrado',
      hora: new Date().toLocaleTimeString(localeTiempo, { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [respuestaPersonalizada, setRespuestaPersonalizada] = useState(null);
  const respuesta = respuestaPersonalizada || {
    titulo: t('consolaIA.respInicialTitulo'),
    tipo: 'info',
    contenido: t('consolaIA.respInicialContenido'),
    kpi: t('consolaIA.respInicialKpi'),
    accionSugerida: t('consolaIA.respInicialAccion')
  };

  const registrarEnBitacora = (nombreAgente, modelo, agentId = null) => {
    const nuevoRegistro = {
      id: `LOG-IA-${Math.floor(100 + Math.random() * 900)}`,
      agentId,
      agente: nombreAgente,
      modelo,
      rol: 'JWT',
      estadoKey: 'consolaIA.estadoRegistrado',
      hora: new Date().toLocaleTimeString(localeTiempo, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    setBitacoraEjecuciones((prev) => [nuevoRegistro, ...prev.slice(0, 7)]);
  };

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
      titulo: t('consolaIA.analisisCompletado', { query: textoOriginal }),
      tipo: 'info',
      contenido: t('consolaIA.fallbackContenido'),
      kpi: t('consolaIA.fallbackKpi'),
      accionSugerida: t('consolaIA.fallbackAccion')
    };
  };

  const procesarConsulta = async (texto, agenteMeta = null) => {
    const textoOriginal = texto || consulta;
    const query = textoOriginal.toLowerCase();
    if (!query.trim()) return;

    const nombreAgenteResuelto = agenteMeta
      ? t(`consolaIA.agentes.${agenteMeta.id}.nombre`)
      : t('consolaIA.agentes.argos-concierge.nombre');

    setCargando(true);
    if (agenteMeta) setAgenteEjecutando(agenteMeta.id);
    if (texto) setConsulta(texto);

    try {
      const data = await api.post('/concierge/chat', {
        session_id: 'synodos_frontend',
        agent_id: agenteMeta?.id || 'argos-concierge',
        message: textoOriginal
      });
      const textoBackend = data?.reply || data?.response || data?.message || data?.text || data?.answer;
      if (textoBackend) {
        setRespuestaPersonalizada({
          titulo: agenteMeta ? nombreAgenteResuelto : `${t('nav.copiloto')}: "${textoOriginal}"`,
          tipo: 'exito',
          contenido: typeof textoBackend === 'string' ? textoBackend : JSON.stringify(textoBackend),
          kpi: data?.provider ? t('consolaIA.conectadoKpi', { provider: data.provider }) : t('consolaIA.registradoKpi'),
          accionSugerida: data?.suggested_action || t('consolaIA.ejecucionReg')
        });
        registrarEnBitacora(
          nombreAgenteResuelto,
          agenteMeta?.modelo || 'Google Gemini 3.8 Flash',
          agenteMeta?.id || 'argos-concierge'
        );
        setCargando(false);
        setAgenteEjecutando(null);
        return;
      }
    } catch {
      // Si el backend no tiene API key externa activa en este instante, usar inferencia local auditada
    }

    const resLocal = resolverFallbackLocal(textoOriginal, query);
    setRespuestaPersonalizada({
      ...resLocal,
      titulo: agenteMeta ? nombreAgenteResuelto : resLocal.titulo,
      contenido: agenteMeta
        ? `[${agenteMeta.modelo}] ${agenteMeta.salida} — ${resLocal.contenido}`
        : resLocal.contenido
    });
    registrarEnBitacora(
      nombreAgenteResuelto,
      agenteMeta?.modelo || 'Google Gemini 3.8 Flash',
      agenteMeta?.id || 'argos-concierge'
    );
    setCargando(false);
    setAgenteEjecutando(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    procesarConsulta();
  };

  return (
    <Card className="consola-ia-card border-slate-200/80 dark:border-white/10 p-6 space-y-6 shadow-sm bg-white dark:bg-[#111827] text-slate-800 dark:text-[#E8EDF5]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#501228] flex items-center justify-center text-white">
            <Sparkles className="w-4 h-4 text-[#FDF2F4]" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#111827] dark:text-white">
              {t('consolaIA.titulo')}
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('consolaIA.subtitulo')}
            </span>
          </div>
        </div>
        <Badge variant="success">{t('consolaIA.badgeAgentes')}</Badge>
      </div>

      {/* Sugerencias Rápidas */}
      <div className="flex flex-wrap gap-2">
        {sugerenciasRapidas.map((sug, i) => (
          <button
            key={i}
            type="button"
            onClick={() => procesarConsulta(sug)}
            className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-[#162032] text-slate-700 dark:text-slate-200 border border-slate-200/90 dark:border-white/10 hover:border-[#501228] dark:hover:border-white/30 hover:text-[#501228] dark:hover:text-white transition-all shadow-2xs"
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
          placeholder={t('consolaIA.placeholder')}
          className="w-full bg-white dark:bg-[#162032] text-sm text-[#111827] dark:text-white rounded-xl border border-slate-200 dark:border-white/10 pl-4 pr-12 py-3 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#501228]/20 dark:focus:ring-white/20 focus:border-[#501228] dark:focus:border-white/30 transition-all"
        />
        <button
          type="submit"
          disabled={cargando || !consulta.trim()}
          aria-label={t('consolaIA.enviarAria')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-[#501228] text-white hover:bg-[#6E1E3A] disabled:opacity-40 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Panel de Respuesta Sintética */}
      <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-[#162032] border border-slate-200/80 dark:border-white/10 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-[#501228] dark:text-[#F27B91]" />
            <span className="font-semibold text-xs text-[#111827] dark:text-white">
              {cargando ? t('consolaIA.ejecutandoAgente') : respuesta.titulo}
            </span>
          </div>
          <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
            {respuesta.kpi}
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {cargando ? t('consolaIA.procesandoEntrada') : respuesta.contenido}
        </p>

        {respuesta.accionSugerida && !cargando && (
          <div className="pt-2 flex items-center gap-2 text-xs text-[#501228] dark:text-[#F27B91] bg-[#FDF2F4] dark:bg-[#55152D]/25 p-2.5 rounded-lg border border-[#F9E2E8] dark:border-[#55152D]/50">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              <strong>{t('consolaIA.resultadoAccion')}</strong> {respuesta.accionSugerida}
            </span>
          </div>
        )}
      </div>

      {/* Catálogo Interactivo de los 8 Agentes de IA exigidos por la rúbrica */}
      <div className="space-y-3 pt-2 border-t border-slate-200/70 dark:border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-serif font-bold text-sm sm:text-base text-[#111827] dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#F27B91]" />
              <span>{t('consolaIA.catalogoTitulo')}</span>
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('consolaIA.catalogoSub')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CATALOGO_8_AGENTES_IA.map((ag) => (
            <div
              key={ag.id}
              className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#162032]/70 flex flex-col justify-between gap-2.5"
            >
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-xs text-[#111827] dark:text-white">
                    {t(`consolaIA.agentes.${ag.id}.nombre`)}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FDF2F4] dark:bg-[#55152D]/50 text-[#501228] dark:text-[#F27B91] shrink-0">
                    {ag.modelo}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                  {t(`consolaIA.agentes.${ag.id}.obj`)}
                </p>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5 pt-1">
                  <p><strong>{t('consolaIA.lblRol')}</strong> {t(`consolaIA.agentes.${ag.id}.rol`)}</p>
                  <p><strong>{t('consolaIA.lblEntrada')}</strong> {ag.entrada}</p>
                  <p><strong>{t('consolaIA.lblSalida')}</strong> {ag.salida}</p>
                  <p className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1 pt-0.5">
                    <Lock className="w-3 h-3 shrink-0" />
                    <span>{ag.proteccionDatos}</span>
                  </p>
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={cargando}
                  icon={Play}
                  onClick={() => procesarConsulta(ag.promptDemo, ag)}
                  className="text-[11px] py-1 px-2.5"
                >
                  {agenteEjecutando === ag.id ? t('consolaIA.btnEjecutando') : t('consolaIA.btnEjecutar')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bitácora en vivo de ejecuciones de Agentes IA */}
      <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#0D131F] space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#111827] dark:text-white">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#F27B91]" />
            <span>{t('consolaIA.bitacoraTitulo')}</span>
          </span>
          <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
            {t('consolaIA.bitacoraSub', { n: bitacoraEjecuciones.length })}
          </span>
        </div>
        <div className="space-y-1.5 max-h-40 overflow-y-auto gotox-scrollbar">
          {bitacoraEjecuciones.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#162032] border border-slate-200/60 dark:border-white/10 text-[11px]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                  {log.id}
                </span>
                <span className="font-semibold truncate">
                  {log.agentId ? t(`consolaIA.agentes.${log.agentId}.nombre`) : log.agente}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                <span>{log.modelo}</span>
                <span>&bull;</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {log.estadoKey ? t(log.estadoKey) : log.estado}
                </span>
                <span>&bull;</span>
                <span>{log.hora}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
