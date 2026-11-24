import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
  Sparkles,
  Send,
  Droplets,
  Thermometer,
  Clock,
  Navigation,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  MessageSquare,
  HelpCircle,
  RefreshCw,
  CornerDownLeft,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Heart
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

export function CopilotoBruno() {
  const telemetria = useTelemetria();
  const { mascota } = useSesion();
  const { idioma, idiomaActual, t } = useIdioma();
  const ttsLang = idiomaActual?.ttsLang || 'es-CR';
  const [vistaActiva, setVistaActiva] = useState('asistente'); // 'asistente' | 'calculador'
  const [consultaTexto, setConsultaTexto] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const [vozActiva, setVozActiva] = useState(true);
  const [hablando, setHablando] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [chequeoAbierto, setChequeoAbierto] = useState(false);
  const [energia, setEnergia] = useState('Activo');
  const [apetito, setApetito] = useState('Normal');
  const [hidratacion, setHidratacion] = useState('Hidratado');
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

  useEffect(() => {
    return () => {
      detenerVozBruno();
      recognitionRef.current?.stop?.();
    };
  }, []);

  // Historial de conversación inicial
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
        { tipo: 'clima', texto: t('copilotoExt.recVentana', { ventana: telemetria.ventanaSecaMinutos }) }
      ]
    }
  ]);

  // Mantener la tarjeta de bienvenida actualizada al cambiar de idioma
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
                { tipo: 'clima', texto: t('copilotoExt.recVentana', { ventana: telemetria.ventanaSecaMinutos }) }
              ]
            }
          : m
      )
    );
  }, [idioma, t, telemetria.temperaturaAsfalto, telemetria.ventanaSecaMinutos]);

  // Estado del Calculador Fisiológico
  const [razaSeleccionada, setRazaSeleccionada] = useState(RAZAS[0]);
  const [duracionMinutos, setDuracionMinutos] = useState(30);
  const [terreno, setTerreno] = useState('asfalto-mixto'); // 'asfalto-mixto' | 'parque-cesped' | 'sombra-completa'

  // Cálculos dinámicos del Copiloto Argos
  const factorTerreno = terreno === 'parque-cesped' ? 0.7 : terreno === 'sombra-completa' ? 0.8 : 1.2;
  const riesgoPuntuacion = Math.round(
    (telemetria.temperaturaAsfalto / 20) * razaSeleccionada.factorTermico * factorTerreno * (duracionMinutos / 25) * 10
  );

  let estadoRiesgo = t('copilotoExt.riesgoBajo');
  let badgeVariant = 'success';
  let consejoBruno = t('copilotoExt.consejoBajo');

  if (riesgoPuntuacion >= 22) {
    estadoRiesgo = t('copilotoExt.riesgoElevado');
    badgeVariant = 'danger';
    consejoBruno = t('copilotoExt.consejoElevado', { raza: razaSeleccionada.nombre });
  } else if (riesgoPuntuacion >= 14) {
    estadoRiesgo = t('copilotoExt.riesgoModerado');
    badgeVariant = 'warning';
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

  // Auto-scroll en el historial de mensajes (solo dentro del contenedor interno del chat, nunca en la ventana global)
  useEffect(() => {
    if (!haInteractuadoRef.current) {
      // En la carga inicial de la página no forzamos scroll para que el usuario empiece en el inicio (top: 0)
      return;
    }
    if (vistaActiva === 'asistente' && contenedorChatRef.current) {
      contenedorChatRef.current.scrollTo({
        top: contenedorChatRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [mensajes, escribiendo, vistaActiva]);

  // Manejador de envío de consulta al asistente Argos
  const handleEnviarConsulta = async (textoAEnviar) => {
    haInteractuadoRef.current = true;
    const texto = (textoAEnviar || consultaTexto).trim();
    if (!texto) return;

    const horaActual = new Date().toLocaleTimeString(ttsLang, { hour: '2-digit', minute: '2-digit' });

    // Agregar mensaje del usuario
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
    <section id="copiloto" className="py-16 md:py-24 relative overflow-hidden">
      {/* Fondo con resplandor suave */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full blur-[140px] pointer-events-none -z-10 opacity-20"
        style={{ background: 'radial-gradient(circle, #55152D 0%, rgba(242, 123, 145, 0.12) 60%, transparent 80%)' }}
      />

      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 space-y-10">
        {/* Cabecera del Módulo */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
          <div className="space-y-2 max-w-2xl text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111827] border border-white/10 text-xs font-semibold text-[#F27B91]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('copilotoExt.subBadge')}</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-[#E8EDF5] tracking-tight">
              {t('copilotoExt.titulo')}
            </h2>
            <p className="text-sm sm:text-base text-[#94A3B8] leading-relaxed">
              {t('copilotoExt.desc')}
            </p>
          </div>

          {/* Selector de Pestañas: Asistente vs Calculador */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#111827] border border-white/10 shadow-xs self-start md:self-auto">
            <button
              type="button"
              onClick={() => setVistaActiva('asistente')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                vistaActiva === 'asistente'
                  ? 'bg-[#55152D] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#E8EDF5]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t('copilotoExt.tabChat')}</span>
            </button>
            <button
              type="button"
              onClick={() => setVistaActiva('calculador')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                vistaActiva === 'calculador'
                  ? 'bg-[#55152D] text-white shadow-sm'
                  : 'text-[#94A3B8] hover:text-[#E8EDF5]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{t('copilotoExt.tabCalculador')}</span>
            </button>
          </div>
        </div>

        {/* ============================================================
            VISTA 1: ASISTENTE CONVERSACIONAL ARGOS
            ============================================================ */}
        {vistaActiva === 'asistente' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Tarjeta de Identidad de Argos y Sugerencias */}
            <div className="lg:col-span-4 space-y-5">
              <Card className="p-6 bg-[#111827] border-white/10 rounded-3xl space-y-5 text-left shadow-md">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src="/imagenes/copiloto-bruno.jpg"
                      alt={t('copilotoExt.avatarAlt')}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#F27B91]/30 shadow-md"
                    />
                    <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#111827]" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-xl text-[#E8EDF5]">Argos</h3>
                    <p className="text-xs text-[#F27B91] font-semibold">{t('copilotoExt.guardianSub')}</p>
                    <p className="text-[11px] text-[#94A3B8]">{t('copilotoExt.nodo')}</p>
                  </div>
                </div>

                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  {t('copilotoExt.cardDesc')}
                </p>

                {/* Preguntas sugeridas */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    {t('copilotoExt.preguntasSugeridas')}
                  </span>
                  <div className="space-y-1.5">
                    {preguntasSugeridas.map((pregunta, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleEnviarConsulta(pregunta)}
                        className="w-full text-left p-2.5 rounded-xl bg-[#162032] hover:bg-[#1e293b] text-xs text-[#E8EDF5] hover:text-[#F27B91] transition-colors border border-white/5 flex items-center justify-between group"
                      >
                        <span className="line-clamp-2">{pregunta}</span>
                        <CornerDownLeft className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#F27B91] shrink-0 ml-2 transition-opacity" />
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Ventana de Conversación Interactiva */}
            <div className="lg:col-span-8">
              <Card className="p-0 bg-[#111827] border-white/10 rounded-3xl overflow-hidden flex flex-col h-[580px] shadow-xl">
                {/* Cabecera del chat */}
                <div className="p-4 sm:p-5 border-b border-white/5 bg-[#162032]/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#55152D] flex items-center justify-center">
                      <img
                        src="/imagenes/copiloto-bruno.jpg"
                        alt={t('copilotoExt.avatarAlt')}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#E8EDF5] flex items-center gap-1.5">
                        {t('copilotoExt.canalTitulo')}
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </h4>
                      <p className="text-[11px] text-[#94A3B8]">
                        {t('copilotoExt.mascotaLine', { nombre: nombreMascotaVisible })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setChequeoAbierto((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors flex items-center gap-1 ${
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
                        title={hablando ? t('copilotoExt.detenerVozTitle') : vozActiva ? t('copilotoExt.silenciarVozTitle') : t('copilotoExt.activarVozTitle')}
                        className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border transition-colors flex items-center gap-1 ${
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
                            <span>{t('copilotoExt.detener')}</span>
                          </>
                        ) : vozActiva ? (
                          <>
                            <Volume2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('copilotoExt.vozActiva')}</span>
                          </>
                        ) : (
                          <>
                            <VolumeX className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{t('copilotoExt.sinVoz')}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Chequeo rápido de bienestar */}
                {chequeoAbierto && (
                  <div className="p-3.5 sm:px-5 border-b border-white/10 bg-[#162032]/90 space-y-2.5 text-xs">
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

                {/* Historial de Mensajes */}
                <div ref={contenedorChatRef} className="flex-1 p-4 sm:p-6 overflow-y-auto gotox-scrollbar space-y-4">
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

                        <div className="space-y-1.5 text-left">
                          <div
                            className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                              esBruno
                                ? 'bg-[#162032] text-[#E8EDF5] border border-white/5 rounded-tl-sm'
                                : 'bg-[#55152D] text-white rounded-tr-sm shadow-md'
                            }`}
                          >
                            <p>{msg.texto}</p>

                            {/* Recomendaciones visuales del asistente */}
                            {msg.recomendaciones && msg.recomendaciones.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                                {msg.recomendaciones.map((rec, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/10 text-[#F27B91] border border-white/10"
                                  >
                                    <Sparkles className="w-3 h-3 text-[#F27B91]" />
                                    {rec.texto}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 px-1">
                            <span className="text-[10px] text-[#94A3B8]">{msg.hora}</span>
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

                  {/* Estado de escritura */}
                  {escribiendo && (
                    <div className="flex items-center gap-3 mr-auto">
                      <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 ring-1 ring-[#F27B91]/30">
                        <img
                          src="/imagenes/copiloto-bruno.jpg"
                          alt={t('copilotoExt.avatarAlt')}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3 rounded-2xl bg-[#162032] border border-white/5 flex items-center gap-1.5 text-xs text-[#94A3B8]">
                        <span className="w-2 h-2 rounded-full bg-[#F27B91] animate-bounce" />
                        <span className="w-2 h-2 rounded-full bg-[#F27B91] animate-bounce [animation-delay:0.2s]" />
                        <span className="w-2 h-2 rounded-full bg-[#F27B91] animate-bounce [animation-delay:0.4s]" />
                        <span className="ml-1 text-[11px]">{t('copilotoExt.evaluando')}</span>
                      </div>
                    </div>
                  )}

                  <div ref={finHistorialRef} />
                </div>

                {/* Formulario de Entrada de Texto */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleEnviarConsulta();
                  }}
                  className="p-3 sm:p-4 border-t border-white/5 bg-[#162032]/40 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={consultaTexto}
                    onChange={(e) => setConsultaTexto(e.target.value)}
                    placeholder={
                      escuchando
                        ? t('copilotoExt.escuchandoVoz')
                        : t('copilotoExt.placeholderChat', { nombre: nombreMascotaVisible })
                    }
                    className="flex-1 bg-[#111827] text-xs sm:text-sm text-[#E8EDF5] placeholder-[#94A3B8]/60 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#F27B91] transition-colors"
                  />
                  {soportaVozEntrada() && (
                    <button
                      type="button"
                      onClick={toggleMicrofono}
                      disabled={escribiendo}
                      title={escuchando ? t('copilotoExt.detenerMic') : t('copilotoExt.hablarConArgos')}
                      aria-label={escuchando ? t('copilotoExt.detenerMic') : t('copilotoExt.hablarConArgos')}
                      className={`shrink-0 px-3 py-3 rounded-xl border transition-colors ${
                        escuchando
                          ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                          : 'bg-[#111827] text-[#F27B91] border-white/10 hover:border-[#F27B91]/50'
                      }`}
                    >
                      {escuchando ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={!consultaTexto.trim() || escribiendo}
                    icon={Send}
                    className="shrink-0 bg-[#55152D] hover:bg-[#6E1E3A] text-white px-4 py-3 rounded-xl"
                  >
                    <span className="hidden sm:inline">{t('copilotoExt.preguntar')}</span>
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        )}

        {/* ============================================================
            VISTA 2: CALCULADOR FISIOLÓGICO BIOCLIMÁTICO POR RAZA
            ============================================================ */}
        {vistaActiva === 'calculador' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Panel Izquierdo: Configuración de Parámetros */}
            <div className="lg:col-span-5 space-y-5">
              <Card className="p-6 bg-[#111827] border-white/10 rounded-3xl space-y-5 text-left shadow-md">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                    {t('copilotoExt.paso1Raza')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {RAZAS.map((r) => {
                      const activa = razaSeleccionada.id === r.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setRazaSeleccionada(r)}
                          className={`p-2.5 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                            activa
                              ? 'bg-[#55152D] text-white border-[#F27B91]/50 shadow-md font-semibold'
                              : 'bg-[#162032] text-[#E8EDF5] border-white/5 hover:border-white/20'
                          }`}
                        >
                          <span className="font-semibold">{r.nombre}</span>
                          <span className={`text-[10px] mt-1 ${activa ? 'text-pink-200' : 'text-[#94A3B8]'}`}>
                            {t('copilotoExt.pesoAprox', { peso: r.pesoPromedio })}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Duración */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wider text-[#94A3B8]">
                      {t('copilotoExt.paso2Duracion')}
                    </span>
                    <span className="font-bold text-[#F27B91] tabular-nums text-sm">
                      {t('copilotoExt.minutosLabel', { min: duracionMinutos })}
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label={t('copilotoExt.paso2Duracion')}
                    min="10"
                    max="90"
                    step="5"
                    value={duracionMinutos}
                    onChange={(e) => setDuracionMinutos(Number(e.target.value))}
                    className="w-full accent-[#55152D] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-[#94A3B8]">
                    <span>{t('copilotoExt.rango10')}</span>
                    <span>{t('copilotoExt.rango45')}</span>
                    <span>{t('copilotoExt.rango90')}</span>
                  </div>
                </div>

                {/* Tipo de Superficie */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                    {t('copilotoExt.paso3Terreno')}
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setTerreno('asfalto-mixto')}
                      className={`p-2 rounded-xl border text-center font-medium transition-colors ${
                        terreno === 'asfalto-mixto'
                          ? 'bg-[#55152D] text-white border-[#F27B91]/50'
                          : 'bg-[#162032] text-[#E8EDF5] border-white/5 hover:border-white/20'
                      }`}
                    >
                      {t('copilotoExt.acerasGam')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTerreno('parque-cesped')}
                      className={`p-2 rounded-xl border text-center font-medium transition-colors ${
                        terreno === 'parque-cesped'
                          ? 'bg-[#55152D] text-white border-[#F27B91]/50'
                          : 'bg-[#162032] text-[#E8EDF5] border-white/5 hover:border-white/20'
                      }`}
                    >
                      {t('copilotoExt.parqueCesped')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTerreno('sombra-completa')}
                      className={`p-2 rounded-xl border text-center font-medium transition-colors ${
                        terreno === 'sombra-completa'
                          ? 'bg-[#55152D] text-white border-[#F27B91]/50'
                          : 'bg-[#162032] text-[#E8EDF5] border-white/5 hover:border-white/20'
                      }`}
                    >
                      {t('copilotoExt.arboleda')}
                    </button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Panel Derecho: Veredicto del Copiloto */}
            <div className="lg:col-span-7 space-y-5">
              <Card className="p-6 bg-[#111827] border-white/10 rounded-3xl space-y-6 shadow-md text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/5 gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src="/imagenes/copiloto-bruno.jpg"
                        alt={t('copilotoExt.avatarAlt')}
                        className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl object-cover shadow-sm ring-2 ring-[#F27B91]/30"
                      />
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#111827]" />
                    </div>
                    <div>
                      <h3 className="font-serif text-xl font-bold text-[#E8EDF5]">
                        {t('copilotoExt.veredictoTitle', { raza: razaSeleccionada.nombre })}
                      </h3>
                      <p className="text-xs text-[#94A3B8]">
                        {t('copilotoExt.calculoAsfalto', { asfalto: telemetria.temperaturaAsfalto })}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Badge variant={badgeVariant} className="text-xs py-1 px-3">
                      {estadoRiesgo}
                    </Badge>
                  </div>
                </div>

                {/* Métricas Calculadas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-[#162032] rounded-xl border border-white/5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                      <Droplets className="w-4 h-4 text-blue-400" />
                      <span>{t('copilotoExt.hidratacionMin')}</span>
                    </div>
                    <div className="font-serif font-bold text-2xl text-[#E8EDF5] tabular-nums">
                      {cuotaAguaMl} ml
                    </div>
                    <span className="text-[10px] text-[#94A3B8] block">
                      {t('copilotoExt.llevarBotella')}
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#162032] rounded-xl border border-white/5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                      <Thermometer className="w-4 h-4 text-[#F27B91]" />
                      <span>{t('copilotoExt.cargaAlmohadillas')}</span>
                    </div>
                    <div className="font-serif font-bold text-2xl text-[#E8EDF5]">
                      {traducirSensibilidad(razaSeleccionada.sensibilidadAsfalto)}
                    </div>
                    <span className="text-[10px] text-[#94A3B8] block">
                      {t('copilotoExt.calzadaEn', { asfalto: telemetria.temperaturaAsfalto })}
                    </span>
                  </div>

                  <div className="p-3.5 bg-[#162032] rounded-xl border border-white/5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>{t('copilotoExt.limiteSeguro')}</span>
                    </div>
                    <div className="font-serif font-bold text-2xl text-[#E8EDF5] tabular-nums">
                      {duracionMinutos > 45 && razaSeleccionada.id === 'frenchie' ? '20 min max' : `${duracionMinutos} min`}
                    </div>
                    <span className="text-[10px] text-[#94A3B8] block">
                      {t('copilotoExt.ventanaSecaLabel', { min: telemetria.ventanaSecaMinutos })}
                    </span>
                  </div>
                </div>

                {/* Recomendación de Argos */}
                <div className="p-4 rounded-2xl bg-[#55152D]/25 border border-[#F27B91]/25 space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-[#F27B91]">
                    <Sparkles className="w-4 h-4" />
                    <span>{t('copilotoExt.recPersonalizada')}</span>
                  </div>
                  <p className="text-[#E8EDF5] leading-relaxed">
                    {consejoBruno}
                  </p>
                </div>

                {/* Ruta Recomendada por cercanía */}
                <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-[#94A3B8] gap-3">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-[#F27B91]" />
                    <span>
                      {t('copilotoExt.rutaOptimaLabel')}{' '}
                      <strong className="text-[#E8EDF5]">{t('copilotoExt.rutaOptimaNombre')}</strong>
                    </span>
                  </div>
                  <a href="#terrazas">
                    <Button size="sm" variant="secondary" className="bg-[#162032] text-[#E8EDF5] border-white/10 hover:border-[#F27B91]/30">
                      {t('copilotoExt.verTerrazasCircuito')}
                    </Button>
                  </a>
                </div>
              </Card>
            </div>
          </div>
        )}
        {/* Enlace a la Página Dedicada del Copiloto */}
        <div className="pt-4 flex justify-center">
          <Link to="/copiloto">
            <Button
              variant="secondary"
              size="lg"
              className="bg-[#111827] text-[#E8EDF5] hover:text-[#F27B91] border-white/10 hover:border-[#F27B91]/30 shadow-md font-semibold"
            >
              {t('copilotoExt.abrirPantallaCompleta')}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
