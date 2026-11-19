/**
 * Utilidades compartidas para Copiloto Bruno:
 * - Síntesis de voz (TTS) y reconocimiento de voz (STT) en español
 * - Respuestas heurísticas de respaldo sobre bienestar de mascota, clima y asfalto
 */

const ELEVENLABS_VOICE_ID = '3mmJ2Z5SLZ9OkeZZcv5p';
let activeAudio = null;
let activeAudioUrl = null;
let activeSpeechToken = 0;

export function soportaVozSalida() {
  return typeof window !== 'undefined' && (typeof Audio !== 'undefined' || 'speechSynthesis' in window);
}

export function soportaVozEntrada() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function detenerVozBruno() {
  activeSpeechToken += 1;
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {}
    activeAudio = null;
  }
  if (activeAudioUrl) {
    try {
      URL.revokeObjectURL(activeAudioUrl);
    } catch {}
    activeAudioUrl = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function limpiarTextoParaVoz(texto) {
  return String(texto || '')
    .replace(/[*_`#]/g, '')
    .replace(/°C/g, ' grados Celsius')
    .replace(/\bdB\b/g, ' decibeles')
    .replace(/\s+/g, ' ')
    .trim();
}

function hablarConNavegador(limpio, token, { onStart, onEnd, onError } = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.();
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(limpio);
    utterance.lang = 'es-CR';
    utterance.rate = 1.02;
    utterance.pitch = 0.96;

    const voces = window.speechSynthesis.getVoices() || [];
    const vozPreferida =
      voces.find((v) => v.lang?.toLowerCase() === 'es-cr') ||
      voces.find((v) => v.lang?.toLowerCase().startsWith('es-419')) ||
      voces.find((v) => v.lang?.toLowerCase().startsWith('es-mx')) ||
      voces.find((v) => v.lang?.toLowerCase().startsWith('es'));

    if (vozPreferida) {
      utterance.voice = vozPreferida;
    }

    utterance.onstart = () => {
      if (token === activeSpeechToken) onStart?.();
    };
    utterance.onend = () => {
      if (token === activeSpeechToken) onEnd?.();
    };
    utterance.onerror = () => {
      if (token === activeSpeechToken) onError?.();
    };

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    onError?.();
    return false;
  }
}

export async function hablarComoBruno(texto, { onStart, onEnd, onError } = {}) {
  if (!soportaVozSalida() || !texto) return false;

  detenerVozBruno();
  const token = activeSpeechToken;
  const limpio = limpiarTextoParaVoz(texto);
  if (!limpio) return false;

  try {
    const resp = await fetch('/api/concierge/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: limpio, voice_id: ELEVENLABS_VOICE_ID }),
    });

    if (token !== activeSpeechToken) return false;

    const contentType = resp.headers.get('content-type') || '';
    if (resp.ok && contentType.includes('audio')) {
      const blob = await resp.blob();
      if (token !== activeSpeechToken) return false;

      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      activeAudio = audio;
      activeAudioUrl = objectUrl;

      audio.onplay = () => {
        if (token === activeSpeechToken) onStart?.();
      };
      audio.onended = () => {
        if (token === activeSpeechToken) {
          detenerVozBruno();
          onEnd?.();
        }
      };
      audio.onerror = () => {
        if (token === activeSpeechToken) {
          detenerVozBruno();
          hablarConNavegador(limpio, token, { onStart, onEnd, onError });
        }
      };

      await audio.play();
      return true;
    }
  } catch {
    // Fallback automático a speechSynthesis del navegador
  }

  if (token !== activeSpeechToken) return false;
  return hablarConNavegador(limpio, token, { onStart, onEnd, onError });
}

export function iniciarEscuchaVoz({ onTranscript, onStart, onEnd, onError } = {}) {
  if (!soportaVozEntrada()) return null;
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRec();
  recognition.lang = 'es-CR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => onStart?.();
  recognition.onresult = (event) => {
    const transcript = event?.results?.[0]?.[0]?.transcript || '';
    if (transcript.trim()) onTranscript?.(transcript.trim());
  };
  recognition.onerror = (err) => onError?.(err);
  recognition.onend = () => onEnd?.();

  recognition.start();
  return recognition;
}

export function construirConsultaChequeo({ energia, apetito, hidratacion, nota = '' }, mascota = {}) {
  const nombre = mascota?.nombre || 'mi mascota';
  const partes = [
    `Quiero revisar cómo está ${nombre} hoy.`,
    `Nivel de energía: ${energia}.`,
    `Apetito: ${apetito}.`,
    `Hidratación: ${hidratacion}.`,
  ];
  if (nota.trim()) partes.push(`Observación adicional: ${nota.trim()}.`);
  partes.push('¿Qué cuidados me recomiendas ahora?');
  return partes.join(' ');
}

export function generarRespuestaFallbackBruno(texto, { telemetria = {}, mascota = {} } = {}) {
  const q = String(texto || '').toLowerCase();
  const nombre = mascota?.nombre || 'tu mascota';
  const peso = Number(mascota?.pesoKg) || 18;
  const asfalto = telemetria?.temperaturaAsfalto ?? 24.5;
  const ambiente = telemetria?.temperaturaAmbiente ?? 22;
  const ventanaSeca = telemetria?.ventanaSecaMinutos ?? 45;

  // 1. Señales de alarma médica / urgencia
  if (/(convulsion|sangre|veneno|chocolat|ahog|no respira|desmay|atropell|intoxic)/.test(q)) {
    return {
      respuestaTexto: `¡Atención! Lo que describes sobre ${nombre} puede ser una urgencia. No soy médico veterinario, así que por favor no esperes y acude de inmediato a un centro veterinario 24/7 (Hospital UNA: 2277-3600 o emergencias 9-1-1).`,
      recomendaciones: [
        { tipo: 'alerta', texto: 'Atención veterinaria inmediata' },
        { tipo: 'salud', texto: 'No automedicar en casa' }
      ]
    };
  }

  // 2. Estado general / chequeo / síntomas cotidianos de la mascota
  if (/(estado|como esta|cómo está|chequeo|decaid|decaíd|cansad|vomit|diarre|fiebre|apetito|no come|pata|estres|estrés|energia|energía|salud|triste)/.test(q)) {
    const hayAlertaLeve = /(decaid|decaíd|vomit|diarre|fiebre|no come|sedient)/.test(q);
    return {
      respuestaTexto: hayAlertaLeve
        ? `Veo que ${nombre} presenta señales de cansancio o malestar. Ofrécele agua fresca en lugar tranquilo, evita caminatas bajo el sol (asfalto a ${asfalto} °C) y observa su evolución en las próximas horas. Recuerda que no soy médico veterinario: si los síntomas persisten o empeoran, llévalo a valoración profesional.`
        : `${nombre} parece estar en condiciones estables para su rutina diaria. Con el asfalto a ${asfalto} °C y ${ventanaSeca} min de ventana seca, un paseo moderado con agua fresca (${Math.round(peso * 12)} ml aprox.) le vendrá muy bien. Recuerda que no soy veterinario y este seguimiento es preventivo.`,
      recomendaciones: [
        { tipo: 'salud', texto: `Seguimiento de ${nombre}` },
        { tipo: 'hidratacion', texto: `Meta hídrica: ~${Math.round(peso * 12)} ml / 30 min` }
      ]
    };
  }

  // 3. Asfalto / pavimento
  if (/(asfalto|pavimento|quemadur|suelo|calzada)/.test(q)) {
    return {
      respuestaTexto: `La temperatura actual del pavimento es de ${asfalto} °C (${telemetria?.nivelRiesgoAsfalto || 'Moderada'}). Las almohadillas de ${nombre} soportan hasta 26 °C sin riesgo; te recomiendo caminar por aceras con sombra o zonas verdes.`,
      recomendaciones: [
        { tipo: 'asfalto', texto: `Pavimento en ${asfalto} °C` },
        { tipo: 'ruta', texto: 'Corredor Parque Francia - Escalante' }
      ]
    };
  }

  // 4. Lluvia / clima
  if (/(lluvia|clima|seco|minuto|tiempo)/.test(q)) {
    return {
      respuestaTexto: `El radar estima una ventana seca de ${ventanaSeca} minutos con condición "${telemetria?.condicionClimatica || 'estable'}" y humedad del ${telemetria?.humedadRelativa ?? 72}%. Es buen momento para sacar a ${nombre} antes de que cambie el clima.`,
      recomendaciones: [
        { tipo: 'clima', texto: `Ventana seca: ${ventanaSeca} min` }
      ]
    };
  }

  // 5. Terrazas / ruido
  if (/(terraza|cafe|café|local|franco|arbol|árbol|ruido)/.test(q)) {
    return {
      respuestaTexto: `Para que ${nombre} esté tranquilo, te recomiendo "El Árbol de Seda" (42 dB, ultra silencioso) o "Franco Café" (46 dB, con bebederos frescos y sombra). Ambos cuentan con certificación pet-friendly en el GAM.`,
      recomendaciones: [
        { tipo: 'terraza', texto: 'Franco Café (46 dB)' },
        { tipo: 'terraza', texto: 'El Árbol de Seda (42 dB)' }
      ]
    };
  }

  // 6. Agua / hidratación
  if (/(agua|hidrat|cuanta|cuánta|beber|sed)/.test(q)) {
    const ml = Math.round(peso * 13 * (ambiente / 20));
    return {
      respuestaTexto: `Para ${nombre} (${peso} kg) con ambiente a ${ambiente} °C, lleva aproximadamente ${ml} ml de agua fresca por cada 30 minutos de paseo. Haz pausas cortas en sombra para hidratarlo.`,
      recomendaciones: [
        { tipo: 'hidratacion', texto: `Aprox. ${ml} ml / 30 min` }
      ]
    };
  }

  // 7. General
  return {
    respuestaTexto: `¡Pura vida! Analicé tu consulta para ${nombre} con la telemetría actual: asfalto a ${asfalto} °C, ${telemetria?.aforoAcusticoDb ?? 48} dB de ruido y ${ventanaSeca} min de ventana seca. Puedes preguntarme tanto por el clima como por el estado diario de ${nombre} (recuerda que no soy médico veterinario).`,
    recomendaciones: [
      { tipo: 'general', texto: `Perfil activo: ${nombre}` }
    ]
  };
}
