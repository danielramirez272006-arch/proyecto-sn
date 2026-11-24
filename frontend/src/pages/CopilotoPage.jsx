import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PageWrapper } from '../components/PageWrapper';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Sparkles,
  Send,
  Thermometer,
  CloudRain,
  Volume2,
  Clock,
  ShieldCheck,
  Bot,
  User,
  Sliders,
  MessageSquare,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  CornerDownLeft,
  RefreshCw,
  Compass,
  ArrowRight,
  Droplets,
  Heart,
  Mic,
  MicOff,
  VolumeX,
  Square
} from 'lucide-react';
import { useTelemetria } from '../hooks/useTelemetria';
import { useSesion } from '../hooks/useSesion';
import { useIdioma } from '../context/IdiomaContext';
import { api } from '../shared/services/api-client';
import {
  hablarComoBruno,
  detenerVozBruno,
  iniciarEscuchaVoz,
  soportaVozEntrada,
  soportaVozSalida,
  construirConsultaChequeo,
  generarRespuestaFallbackBruno
} from '../utils/brunoAsistente';
import { containerStagger, itemStagger, TRANSICION_SUAVE } from '../estilos/animaciones';

const RAZAS = [
  { id: 'golden', nombre: 'Golden Retriever', categoria: 'Grande / Manto Doble', factorTermico: 1.1, pesoPromedio: 30, sensibilidadAsfalto: 'Media' },
  { id: 'frenchie', nombre: 'Bulldog Francés', categoria: 'Braquicéfalo / Riesgo Alto', factorTermico: 1.8, pesoPromedio: 12, sensibilidadAsfalto: 'Muy Alta' },
  { id: 'poodle', nombre: 'Poodle Mediano', categoria: 'Mediano / Manto Rizado', factorTermico: 0.9, pesoPromedio: 14, sensibilidadAsfalto: 'Baja' },
  { id: 'pastor', nombre: 'Pastor Alemán', categoria: 'Grande / Atlético', factorTermico: 1.2, pesoPromedio: 34, sensibilidadAsfalto: 'Media' },
  { id: 'chihuahua', nombre: 'Chihuahua', categoria: 'Miniatura / Rápida Deshidratación', factorTermico: 1.4, pesoPromedio: 2.8, sensibilidadAsfalto: 'Alta' },
  { id: 'husky', nombre: 'Husky Siberiano', categoria: 'Nórdico / Sensible al Calor', factorTermico: 2.0, pesoPromedio: 25, sensibilidadAsfalto: 'Extrema' }
];

const PREGUNTAS_SUGERIDAS = [
  "¿Cómo está mi mascota hoy? Dame recomendaciones",
  "Mi perro está un poco decaído y casi no quiere comer",
  "¿Es seguro el asfalto para pasear ahora en San José?",
  "¿Cuánta agua debo llevar para un paseo de 45 minutos?"
];

export function CopilotoPage() {
  const telemetria = useTelemetria();
  const { mascota } = useSesion();
  const { idioma, idiomaActual, t } = useIdioma();
  const ttsLang = idiomaActual?.ttsLang || 'es-CR';
  const finHistorialRef = useRef(null);
  const contenedorChatRef = useRef(null);
  const haInteractuadoRef = useRef(false);
  const recognitionRef = useRef(null);

  const preguntasSugeridas = [
    t('copilotoExt.preg1'),
    t('copilotoExt.preg2'),
    t('copilotoExt.preg3'),
    t('copilotoExt.preg4')
  ];

  const [modoVista, setModoVista] = useState('chat'); // 'chat' | 'calculador'
  const [consultaTexto, setConsultaTexto] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const [errorServicio, setErrorServicio] = useState(null);
  const [vozActiva, setVozActiva] = useState(true);
  const [hablando, setHablando] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [chequeoAbierto, setChequeoAbierto] = useState(false);
  const [energia, setEnergia] = useState('Activo');
  const [apetito, setApetito] = useState('Normal');
  const [hidratacion, setHidratacion] = useState('Hidratado');

  useEffect(() => {
    return () => {
      detenerVozBruno();
      recognitionRef.current?.stop?.();
    };
  }, []);

  // Estado del Calculador Fisiológico
  const [razaSeleccionada, setRazaSeleccionada] = useState(RAZAS[0]);
  const [duracionMinutos, setDuracionMinutos] = useState(30);
  const [terreno, setTerreno] = useState('asfalto-mixto'); // 'asfalto-mixto' | 'parque-cesped' | 'sombra-completa'

  // Historial de conversación
  const [mensajes, setMensajes] = useState(() => [
    {
      id: 'bienvenida',
      remitente: 'bruno',
      texto: t('copilotoExt.bienvenidaTexto', {
        asfalto: telemetria.temperaturaAsfalto,
        ventana: telemetria.ventanaSecaMinutos
      }),
      hora: t('copilotoExt.ahora'),
      recomendaciones: [
        { tipo: 'asfalto', texto: t('copilotoExt.recPavimento', { asfalto: telemetria.temperaturaAsfalto }) },
        { tipo: 'clima', texto: t('copilotoExt.recVentana', { ventana: telemetria.ventanaSecaMinutos }) },
        { tipo: 'acustica', texto: t('copilotoExt.recRuido', { db: telemetria.aforoAcusticoDb }) }
      ]
    }
  ]);

  useEffect(() => {
    setMensajes((prev) =>
      prev.map((m) =>
        m.id === 'bienvenida'
          ? {
              ...m,
              texto: t('copilotoExt.bienvenidaTexto', {
                asfalto: telemetria.temperaturaAsfalto,
                ventana: telemetria.ventanaSecaMinutos
              }),
              hora: t('copilotoExt.ahora'),
              recomendaciones: [
                { tipo: 'asfalto', texto: t('copilotoExt.recPavimento', { asfalto: telemetria.temperaturaAsfalto }) },
                { tipo: 'clima', texto: t('copilotoExt.recVentana', { ventana: telemetria.ventanaSecaMinutos }) },
                { tipo: 'acustica', texto: t('copilotoExt.recRuido', { db: telemetria.aforoAcusticoDb }) }
              ]
            }
          : m
      )
    );
  }, [idioma, t, telemetria.temperaturaAsfalto, telemetria.ventanaSecaMinutos, telemetria.aforoAcusticoDb]);

  // Cálculos dinámicos del Copiloto Argos
  const factorTerreno = terreno === 'parque-cesped' ? 0.7 : terreno === 'sombra-completa' ? 0.8 : 1.2;
  const riesgoPuntuacion = Math.round(
    (telemetria.temperaturaAsfalto / 20) * razaSeleccionada.factorTermico * factorTerreno * (duracionMinutos / 25) * 10
  );

  let estadoRiesgo = t('copilotoExt.riesgoBajo');
  let badgeRiesgoClase = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
  let consejoBruno = t('copilotoExt.consejoBajo');

  if (riesgoPuntuacion >= 22) {
    estadoRiesgo = t('copilotoExt.riesgoElevado');
    badgeRiesgoClase = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    consejoBruno = t('copilotoExt.consejoElevado', { raza: razaSeleccionada.nombre });
  } else if (riesgoPuntuacion >= 14) {
    estadoRiesgo = t('copilotoExt.riesgoModerado');
    badgeRiesgoClase = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    consejoBruno = t('copilotoExt.consejoModerado');
  }

  const cuotaAguaMl = Math.round(
    razaSeleccionada.pesoPromedio * (duracionMinutos / 30) * 12 * (telemetria.temperaturaAmbiente / 20)
  );

  const traducirSensibilidad = (nivel) => {
    if (nivel === 'Baja') return t('copilotoExt.sensBaja');
    if (nivel === 'Media') return t('copilotoExt.sensMedia');
    if (nivel === 'Alta') return t('copilotoExt.sensAlta');
    if (nivel === 'Muy Alta') return t('copilotoExt.sensMuyAlta');
    if (nivel === 'Extrema') return t('copilotoExt.sensExtrema');
    return nivel;
  };

  // Auto-scroll suave al último mensaje (solo en el contenedor interno, sin alterar scroll de la ventana)
  useEffect(() => {
    if (!haInteractuadoRef.current) return;
    if (modoVista === 'chat' && contenedorChatRef.current) {
      contenedorChatRef.current.scrollTo({
        top: contenedorChatRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [mensajes, escribiendo, modoVista]);

  // Enviar mensaje al asistente
  const handleEnviarConsulta = async (textoAEnviar) => {
    haInteractuadoRef.current = true;
    const texto = (textoAEnviar || consultaTexto).trim();
    if (!texto) return;

    setErrorServicio(null);
    const horaActual = new Date().toLocaleTimeString(ttsLang, { hour: '2-digit', minute: '2-digit' });

    // Mensaje de usuario
    const nuevoMensajeUsuario = {
      id: 'usr_' + Date.now(),
      remitente: 'usuario',
      texto,
      hora: horaActual
    };

    setMensajes(prev => [...prev, nuevoMensajeUsuario]);
    setConsultaTexto('');
    setEscribiendo(true);

    let respuestaTexto = '';
    let recomendaciones = [];

    try {
      // 1. Intento con backend real (/api/concierge/chat) con perfil de mascota y telemetría
      const data = await api.post('/concierge/chat', {
        session_id: 'gotox_bruno_web',
        message: texto,
        language: idioma,
        pet_profile: {
          nombre: mascota?.nombre,
          raza: mascota?.raza,
          pesoKg: mascota?.pesoKg,
          edadAnos: mascota?.edadAnos,
          alergias: mascota?.alergias
        },
        telemetry: {
          temperaturaAsfalto: telemetria.temperaturaAsfalto,
          temperaturaAmbiente: telemetria.temperaturaAmbiente,
          ventanaSecaMinutos: telemetria.ventanaSecaMinutos,
          aforoAcusticoDb: telemetria.aforoAcusticoDb
        }
      });

      const respuestaBackend = data?.response || data?.reply || data?.message || data?.text || data?.answer;

      if (respuestaBackend && typeof respuestaBackend === 'string') {
        respuestaTexto = respuestaBackend;
        if (Array.isArray(data?.suggested_actions) && data.suggested_actions.length > 0) {
          recomendaciones = data.suggested_actions.map(act => ({ tipo: 'accion', texto: act }));
        }
      } else {
        throw new Error('Formato no reconocido');
      }
    } catch {
      const fallback = generarRespuestaFallbackBruno(texto, { telemetria, mascota, idioma });
      respuestaTexto = fallback.respuestaTexto;
      recomendaciones = fallback.recomendaciones;
    }

    setEscribiendo(false);
    setMensajes(prev => [
      ...prev,
      {
        id: 'bruno_' + Date.now(),
        remitente: 'bruno',
        texto: respuestaTexto,
        hora: new Date().toLocaleTimeString(ttsLang, { hour: '2-digit', minute: '2-digit' }),
        recomendaciones
      }
    ]);

    if (vozActiva && soportaVozSalida()) {
      hablarComoBruno(respuestaTexto, {
        ttsLang,
        onStart: () => setHablando(true),
        onEnd: () => setHablando(false),
        onError: () => setHablando(false)
      });
    }
  };

  const toggleMicrofono = () => {
    if (escuchando) {
      recognitionRef.current?.stop?.();
      setEscuchando(false);
      return;
    }
    detenerVozBruno();
    setHablando(false);
    recognitionRef.current = iniciarEscuchaVoz({
      ttsLang,
      onStart: () => setEscuchando(true),
      onEnd: () => setEscuchando(false),
      onError: () => setEscuchando(false),
      onTranscript: (textoHablado) => {
        setConsultaTexto(textoHablado);
        handleEnviarConsulta(textoHablado);
      }
    });
  };

  const enviarChequeoMascota = () => {
    const mapaE = { Activo: t('copilotoExt.energiaActivo'), Cansado: t('copilotoExt.energiaCansado'), Decaído: t('copilotoExt.energiaDecaido') };
    const mapaA = { Normal: t('copilotoExt.apetitoNormal'), 'Poco apetito': t('copilotoExt.apetitoPoco'), 'No quiere comer': t('copilotoExt.apetitoNoCome') };
    const mapaH = { Hidratado: t('copilotoExt.aguaHidratado'), Sediento: t('copilotoExt.aguaSediento'), 'Toma poca agua': t('copilotoExt.aguaPoca') };
    const prompt = construirConsultaChequeo(
      { energia: mapaE[energia] || energia, apetito: mapaA[apetito] || apetito, hidratacion: mapaH[hidratacion] || hidratacion, idioma },
      mascota
    );
    setChequeoAbierto(false);
    handleEnviarConsulta(prompt);
  };

  const nombreMascotaVisible = mascota?.nombre || t('comun.tuMascotaDefault');

  return (
    <PageWrapper className="w-full space-y-8 pb-20">
      {/* ============================================================
          ENCABEZADO DE IDENTIDAD VISUAL DE BRUNO
          ============================================================ */}
      <section className="gotox-hero-section relative overflow-hidden pt-8 pb-10 border-b border-white/5 bg-gradient-to-b from-[#111827] via-[#090D14] to-[#090D14]">
        {/* Resplandor ambiental suave */}
        <div className="absolute top-0 left-1/3 w-80 h-80 bg-[#F27B91]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 text-center md:text-left">
            {/* Avatar 3D de Bruno con Movimiento Flotante Continuo */}
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-[#F27B91]/40 shadow-2xl bg-[#111827]">
                  <img
                    src="/imagenes/copiloto-bruno.jpg"
                    alt={t('copilotoExt.avatarAlt')}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Dot de estado en vivo */}
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#090D14] flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                </span>
              </motion.div>

              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#55152D]/35 text-[#F27B91] border border-[#F27B91]/30 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t('copiloto.badge')}</span>
                </div>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight">
                  {t('copiloto.titulo')}
                </h1>
                <p className="text-xs sm:text-sm text-[#94A3B8] max-w-xl">
                  {t('copiloto.subtitulo')}
                </p>
              </div>
            </div>

            {/* Selector de Modo: Chat vs Calculador */}
            <div className="flex items-center gap-1 p-1 bg-[#111827] rounded-2xl border border-white/10 shrink-0 shadow-sm">
              <button
                type="button"
                aria-pressed={modoVista === 'chat'}
                onClick={() => setModoVista('chat')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  modoVista === 'chat'
                    ? 'bg-[#55152D] text-white shadow-xs font-bold'
                    : 'text-[#94A3B8] hover:text-[#E8EDF5]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('copiloto.chat')}</span>
              </button>
              <button
                type="button"
                aria-pressed={modoVista === 'calculador'}
                onClick={() => setModoVista('calculador')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  modoVista === 'calculador'
                    ? 'bg-[#55152D] text-white shadow-xs font-bold'
                    : 'text-[#94A3B8] hover:text-[#E8EDF5]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{t('copiloto.calculador')}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          ÁREA PRINCIPAL DE CONTENIDO (CHAT O CALCULADOR)
          ============================================================ */}
      <section className="max-w-[1100px] mx-auto px-4 sm:px-6">
        <AnimatePresence mode="wait">
          {modoVista === 'chat' ? (
            /* VISTA DE CHAT CONVERSACIONAL */
            <motion.div
              key="chat"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={TRANSICION_SUAVE}
              className="rounded-3xl bg-[#111827] border border-white/10 shadow-2xl flex flex-col overflow-hidden h-[640px] sm:h-[680px]"
            >
              {/* Barra Superior del Chat con Telemetría, Voz y Chequeo */}
              <div className="px-5 py-3.5 border-b border-white/5 bg-[#162032]/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 gotox-radar-dot" />
                  <span className="font-semibold text-[#E8EDF5]">
                    Argos &bull; {nombreMascotaVisible}
                  </span>
                  <span className="hidden md:inline text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#94A3B8] border border-white/10">
                    {t('copiloto.noVet')}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[#94A3B8]">
                  <button
                    type="button"
                    onClick={() => setChequeoAbierto((v) => !v)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-colors flex items-center gap-1 ${
                      chequeoAbierto
                        ? 'bg-[#55152D] text-white border-[#F27B91]/50'
                        : 'bg-[#111827] text-[#F27B91] border-white/10 hover:border-[#F27B91]/40'
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>{t('copilotoExt.chequeoBtn', { nombre: mascota?.nombre || t('copilotoExt.chequeoMascotaDefault') })}</span>
                  </button>

                  {soportaVozSalida() && (
                    <button
                      type="button"
                      onClick={() => {
                        if (hablando) {
                          detenerVozBruno();
                          setHablando(false);
                        } else {
                          setVozActiva((v) => !v);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-colors flex items-center gap-1 ${
                        hablando
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : vozActiva
                          ? 'bg-[#111827] text-emerald-300 border-emerald-500/30'
                          : 'bg-[#111827] text-[#94A3B8] border-white/10'
                      }`}
                    >
                      {hablando ? (
                        <>
                          <Square className="w-3 h-3 fill-current" />
                          <span>{t('copilotoExt.detenerVoz')}</span>
                        </>
                      ) : vozActiva ? (
                        <>
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>{t('copilotoExt.vozActiva')}</span>
                        </>
                      ) : (
                        <>
                          <VolumeX className="w-3.5 h-3.5" />
                          <span>{t('copilotoExt.sinVoz')}</span>
                        </>
                      )}
                    </button>
                  )}

                  <span className="hidden lg:flex items-center gap-1 text-[#F27B91] font-semibold tabular-nums">
                    <Thermometer className="w-3.5 h-3.5" />
                    {telemetria.temperaturaAsfalto} °C
                  </span>
                </div>
              </div>

              {chequeoAbierto && (
                <div className="p-3.5 sm:px-5 border-b border-white/10 bg-[#162032]/95 space-y-2.5 text-xs text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#E8EDF5]">
                      {t('copilotoExt.comoEstaHoy', { nombre: nombreMascotaVisible })}
                    </span>
                    <span className="text-[10px] text-[#94A3B8]">{t('copilotoExt.orientacionInfo')}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={energia}
                      onChange={(e) => setEnergia(e.target.value)}
                      aria-label={t('copilotoExt.energiaAria')}
                      className="px-2.5 py-1.5 rounded-xl bg-[#111827] border border-white/10 text-[#E8EDF5]"
                    >
                      <option value="Activo">{t('copilotoExt.energiaActivo')}</option>
                      <option value="Cansado">{t('copilotoExt.energiaCansado')}</option>
                      <option value="Decaído">{t('copilotoExt.energiaDecaido')}</option>
                    </select>
                    <select
                      value={apetito}
                      onChange={(e) => setApetito(e.target.value)}
                      aria-label={t('copilotoExt.apetitoAria')}
                      className="px-2.5 py-1.5 rounded-xl bg-[#111827] border border-white/10 text-[#E8EDF5]"
                    >
                      <option value="Normal">{t('copilotoExt.apetitoNormal')}</option>
                      <option value="Poco apetito">{t('copilotoExt.apetitoPoco')}</option>
                      <option value="No quiere comer">{t('copilotoExt.apetitoNoCome')}</option>
                    </select>
                    <select
                      value={hidratacion}
                      onChange={(e) => setHidratacion(e.target.value)}
                      aria-label={t('copilotoExt.hidratacionAria')}
                      className="px-2.5 py-1.5 rounded-xl bg-[#111827] border border-white/10 text-[#E8EDF5]"
                    >
                      <option value="Hidratado">{t('copilotoExt.aguaHidratado')}</option>
                      <option value="Sediento">{t('copilotoExt.aguaSediento')}</option>
                      <option value="Toma poca agua">{t('copilotoExt.aguaPoca')}</option>
                    </select>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={enviarChequeoMascota}
                      className="px-3.5 py-1.5 rounded-xl bg-[#55152D] hover:bg-[#6E1E3A] text-white font-semibold border border-[#F27B91]/40"
                    >
                      {t('copilotoExt.consultarEstado')}
                    </button>
                  </div>
                </div>
              )}

              {/* Historial de Mensajes con Scroll Suave */}
              <div ref={contenedorChatRef} className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 gotox-scrollbar">
                {mensajes.map((msg) => {
                  const esBruno = msg.remitente === 'bruno';

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex gap-3 text-left ${esBruno ? 'justify-start' : 'justify-end'}`}
                    >
                      {esBruno && (
                        <div className="w-8 h-8 rounded-xl bg-[#55152D] text-[#F27B91] border border-[#F27B91]/30 flex items-center justify-center shrink-0 shadow-xs">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div className={`max-w-[85%] sm:max-w-[75%] space-y-2 ${esBruno ? '' : 'items-end'}`}>
                        <div
                          className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                            esBruno
                              ? 'bg-[#162032] border border-white/10 text-[#E8EDF5] rounded-tl-sm'
                              : 'bg-[#55152D] text-white rounded-tr-sm'
                          }`}
                        >
                          <p>{msg.texto}</p>

                          {/* Tarjetas de Recomendaciones Interactivas */}
                          {esBruno && msg.recomendaciones && msg.recomendaciones.length > 0 && (
                            <div className="pt-3 mt-3 border-t border-white/10 flex flex-wrap gap-2">
                              {msg.recomendaciones.map((rec, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleEnviarConsulta(t('copilotoExt.masInfoSobre', { tema: rec.texto }))}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111827] hover:bg-[#090D14] text-[11px] font-semibold text-[#F27B91] border border-white/10 hover:border-[#F27B91]/40 transition-colors"
                                >
                                  <Sparkles className="w-3 h-3 text-[#F27B91]" />
                                  <span>{rec.texto}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 px-1">
                          <span className="text-[10px] text-[#64748b]">
                            {msg.hora}
                          </span>
                          {esBruno && soportaVozSalida() && (
                            <button
                              type="button"
                              onClick={() =>
                                hablarComoBruno(msg.texto, {
                                  ttsLang,
                                  onStart: () => setHablando(true),
                                  onEnd: () => setHablando(false),
                                  onError: () => setHablando(false)
                                })
                              }
                              className="inline-flex items-center gap-1 text-[10px] text-[#F27B91] hover:underline"
                            >
                              <Volume2 className="w-3 h-3" />
                              <span>{t('copilotoExt.escuchar')}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {!esBruno && (
                        <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {/* Indicador de Escritura con Tres Puntos Animados */}
                {escribiendo && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#55152D] text-[#F27B91] flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-3 rounded-2xl bg-[#162032] border border-white/10 flex items-center gap-1.5">
                      <motion.span
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        className="w-1.5 h-1.5 rounded-full bg-[#F27B91]"
                      />
                      <motion.span
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        className="w-1.5 h-1.5 rounded-full bg-[#F27B91]"
                      />
                      <motion.span
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                        className="w-1.5 h-1.5 rounded-full bg-[#F27B91]"
                      />
                    </div>
                  </motion.div>
                )}

                <div ref={finHistorialRef} />
              </div>

              {/* Preguntas Sugeridas en Chips Rápidos */}
              <div className="px-4 py-2 border-t border-white/5 bg-[#162032]/40 flex items-center gap-2 overflow-x-auto gotox-scrollbar">
                <span className="text-[10px] uppercase font-bold text-[#64748b] shrink-0">
                  {t('copilotoExt.sugerenciasLabel')}
                </span>
                {preguntasSugeridas.map((pregunta, idx) => (
                  <motion.button
                    key={idx}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleEnviarConsulta(pregunta)}
                    className="px-2.5 py-1 rounded-xl bg-[#162032] hover:bg-[#1e293b] text-[11px] font-medium text-slate-300 hover:text-white border border-white/10 shrink-0 transition-colors text-left"
                  >
                    {pregunta}
                  </motion.button>
                ))}
              </div>

              {/* Campo de Entrada de Texto Destacado */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleEnviarConsulta();
                }}
                className="p-3 sm:p-4 border-t border-white/10 bg-[#162032] flex items-center gap-2 sm:gap-3"
              >
                <input
                  type="text"
                  value={consultaTexto}
                  onChange={(e) => setConsultaTexto(e.target.value)}
                  placeholder={
                    escuchando
                      ? t('copilotoExt.escuchandoVoz')
                      : t('copilotoExt.placeholderPage', { nombre: nombreMascotaVisible })
                  }
                  disabled={escribiendo}
                  className="flex-1 px-4 py-2.5 sm:py-3 rounded-2xl bg-[#111827] border border-white/10 text-xs sm:text-sm text-[#E8EDF5] placeholder-[#64748b] focus:outline-none focus:border-[#F27B91]/50 focus:ring-1 focus:ring-[#F27B91]/30 transition-all"
                />
                {soportaVozEntrada() && (
                  <button
                    type="button"
                    onClick={toggleMicrofono}
                    disabled={escribiendo}
                    title={escuchando ? t('copilotoExt.detenerMic') : t('copilotoExt.hablarConArgos')}
                    aria-label={escuchando ? t('copilotoExt.detenerMic') : t('copilotoExt.hablarConArgos')}
                    className={`shrink-0 px-3 py-2.5 sm:py-3 rounded-2xl border transition-colors ${
                      escuchando
                        ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                        : 'bg-[#111827] text-[#F27B91] border-white/10 hover:border-[#F27B91]/50'
                    }`}
                  >
                    {escuchando ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!consultaTexto.trim() || escribiendo}
                    icon={Send}
                    className="bg-[#55152D] hover:bg-[#6E1E3A] text-white px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-md"
                  >
                    <span className="hidden sm:inline">{t('copilotoExt.consultar')}</span>
                  </Button>
                </motion.div>
              </form>
            </motion.div>
          ) : (
            /* VISTA DEL CALCULADOR FISIOLÓGICO POR RAZA */
            <motion.div
              key="calculador"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={TRANSICION_SUAVE}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left"
            >
              {/* Lado Izquierdo: Controles del Calculador */}
              <div className="lg:col-span-7 rounded-3xl bg-[#111827] border border-white/10 p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#F27B91] block">
                    {t('copilotoExt.parametrosBio')}
                  </span>
                  <h3 className="font-serif text-2xl font-bold text-[#E8EDF5] tracking-tight">
                    {t('copilotoExt.configPaseo')}
                  </h3>
                  <p className="text-xs text-[#94A3B8]">
                    {t('copilotoExt.configPaseoSub')}
                  </p>
                </div>

                {/* Selector de Raza */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    {t('copilotoExt.paso1Raza')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {RAZAS.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRazaSeleccionada(r)}
                        className={`p-3 rounded-2xl border text-xs font-semibold text-left transition-all ${
                          razaSeleccionada.id === r.id
                            ? 'bg-[#55152D] border-[#F27B91]/50 text-white shadow-md'
                            : 'bg-[#162032] border-white/5 text-slate-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <span className="block truncate font-bold">{r.nombre}</span>
                        <span className="text-[10px] opacity-75 block truncate">{r.categoria}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selector de Duración con Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-bold text-slate-300">
                      {t('copilotoExt.paso2DuracionEst')}
                    </label>
                    <span className="font-bold text-[#F27B91] tabular-nums">
                      {t('copilotoExt.minutosLabel', { min: duracionMinutos })}
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label={t('copilotoExt.paso2DuracionEst')}
                    min="15"
                    max="90"
                    step="5"
                    value={duracionMinutos}
                    onChange={(e) => setDuracionMinutos(Number(e.target.value))}
                    className="w-full accent-[#F27B91] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#64748b]">
                    <span>{t('copilotoExt.rango15')}</span>
                    <span>{t('copilotoExt.rango45')}</span>
                    <span>{t('copilotoExt.rango90Av')}</span>
                  </div>
                </div>

                {/* Selector de Tipo de Terreno */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    {t('copilotoExt.paso3Calzada')}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTerreno('asfalto-mixto')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        terreno === 'asfalto-mixto'
                          ? 'bg-[#55152D] border-[#F27B91]/40 text-white'
                          : 'bg-[#162032] border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t('copilotoExt.asfaltoUrbano')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTerreno('parque-cesped')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        terreno === 'parque-cesped'
                          ? 'bg-[#55152D] border-[#F27B91]/40 text-white'
                          : 'bg-[#162032] border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t('copilotoExt.parqueCesped')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTerreno('sombra-completa')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        terreno === 'sombra-completa'
                          ? 'bg-[#55152D] border-[#F27B91]/40 text-white'
                          : 'bg-[#162032] border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t('copilotoExt.sombraContinua')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Lado Derecho: Veredicto en Vivo del Copiloto Argos */}
              <div className="lg:col-span-5 rounded-3xl bg-[#111827] border border-white/10 p-6 sm:p-8 space-y-6 shadow-xl flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <span className="text-xs font-bold text-[#E8EDF5]">{t('copilotoExt.veredictoCorto')}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badgeRiesgoClase}`}>
                      {estadoRiesgo}
                    </span>
                  </div>

                  {/* Tarjetas de Métricas Fisiológicas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[#162032] border border-white/5 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">{t('copilotoExt.aguaRec')}</span>
                      <p className="font-bold text-xl text-[#E8EDF5] tabular-nums">
                        {cuotaAguaMl} ml
                      </p>
                      <span className="text-[10px] text-blue-400 block font-medium">
                        {t('copilotoExt.repartirTomas')}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[#162032] border border-white/5 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">{t('copilotoExt.sensibilidadAsfalto')}</span>
                      <p className="font-bold text-base text-[#F27B91]">
                        {traducirSensibilidad(razaSeleccionada.sensibilidadAsfalto)}
                      </p>
                      <span className="text-[10px] text-[#94A3B8] block font-medium">
                        {t('copilotoExt.factorX', { f: razaSeleccionada.factorTermico })}
                      </span>
                    </div>
                  </div>

                  {/* Consejo Personalizado de Argos */}
                  <div className="p-4 rounded-2xl bg-[#162032] border border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#F27B91]">
                      <Bot className="w-4 h-4" />
                      <span>{t('copilotoExt.recVetGam')}</span>
                    </div>
                    <p className="text-xs text-[#E8EDF5] leading-relaxed">
                      {consejoBruno}
                    </p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={() => {
                    setModoVista('chat');
                    handleEnviarConsulta(t('copilotoExt.promptRuta', { raza: razaSeleccionada.nombre, min: duracionMinutos }));
                  }}
                  icon={ArrowRight}
                  className="w-full justify-center bg-[#55152D] hover:bg-[#6E1E3A] text-white py-3 rounded-2xl shadow-md"
                >
                  {t('copilotoExt.consultarRutaChat')}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </PageWrapper>
  );
}

export default CopilotoPage;
