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

function limpiarTextoParaVoz(texto, ttsLang = 'es-CR') {
  const esIngles = String(ttsLang || '').toLowerCase().startsWith('en');
  const esEspanol = String(ttsLang || '').toLowerCase().startsWith('es');
  return String(texto || '')
    .replace(/[*_`#]/g, '')
    .replace(/°C/g, esEspanol ? ' grados Celsius' : esIngles ? ' degrees Celsius' : ' °C')
    .replace(/\bdB\b/g, esEspanol ? ' decibeles' : esIngles ? ' decibels' : ' dB')
    .replace(/\s+/g, ' ')
    .trim();
}

function hablarConNavegador(limpio, token, { ttsLang = 'es-CR', onStart, onEnd, onError } = {}) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onError?.();
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(limpio);
    const targetLang = ttsLang || 'es-CR';
    const langPrefix = targetLang.split('-')[0].toLowerCase();
    utterance.lang = targetLang;
    utterance.rate = 1.02;
    utterance.pitch = 0.96;

    const voces = window.speechSynthesis.getVoices() || [];
    const vozPreferida =
      voces.find((v) => v.lang?.toLowerCase() === targetLang.toLowerCase()) ||
      (langPrefix === 'es' && (voces.find((v) => v.lang?.toLowerCase().startsWith('es-419')) || voces.find((v) => v.lang?.toLowerCase().startsWith('es-mx')))) ||
      voces.find((v) => v.lang?.toLowerCase().startsWith(langPrefix));

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

export async function hablarComoBruno(texto, { ttsLang = 'es-CR', onStart, onEnd, onError } = {}) {
  if (!soportaVozSalida() || !texto) return false;

  detenerVozBruno();
  const token = activeSpeechToken;
  const limpio = limpiarTextoParaVoz(texto, ttsLang);
  if (!limpio) return false;

  // Para idiomas distintos del español, usar directamente speechSynthesis nativo en el idioma del usuario
  const esEspanol = String(ttsLang || 'es-CR').toLowerCase().startsWith('es');
  if (esEspanol) {
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
            hablarConNavegador(limpio, token, { ttsLang, onStart, onEnd, onError });
          }
        };

        await audio.play();
        return true;
      }
    } catch {
      // Fallback automático a speechSynthesis del navegador
    }
  }

  if (token !== activeSpeechToken) return false;
  return hablarConNavegador(limpio, token, { ttsLang, onStart, onEnd, onError });
}

export function iniciarEscuchaVoz({ ttsLang = 'es-CR', onTranscript, onStart, onEnd, onError } = {}) {
  if (!soportaVozEntrada()) return null;
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRec();
  recognition.lang = ttsLang || 'es-CR';
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

const CHEQUEO_I18N = {
  es: (n, e, a, h, nota) => `Quiero revisar cómo está ${n} hoy. Nivel de energía: ${e}. Apetito: ${a}. Hidratación: ${h}.${nota ? ` Observación adicional: ${nota}.` : ''} ¿Qué cuidados me recomiendas ahora?`,
  en: (n, e, a, h, nota) => `I want to check how ${n} is doing today. Energy: ${e}. Appetite: ${a}. Hydration: ${h}.${nota ? ` Extra note: ${nota}.` : ''} What care do you recommend now?`,
  fr: (n, e, a, h, nota) => `Je souhaite vérifier l'état de ${n} aujourd'hui. Énergie : ${e}. Appétit : ${a}. Hydratation : ${h}.${nota ? ` Remarque : ${nota}.` : ''} Quels soins recommandes-tu ?`,
  de: (n, e, a, h, nota) => `Ich möchte prüfen, wie es ${n} heute geht. Energie: ${e}. Appetit: ${a}. Hydration: ${h}.${nota ? ` Hinweis: ${nota}.` : ''} Welche Pflege empfiehlst du?`,
  pt: (n, e, a, h, nota) => `Quero verificar como está ${n} hoje. Energia: ${e}. Apetite: ${a}. Hidratação: ${h}.${nota ? ` Observação: ${nota}.` : ''} Que cuidados recomendas agora?`,
  it: (n, e, a, h, nota) => `Voglio controllare come sta ${n} oggi. Energia: ${e}. Appetito: ${a}. Idratazione: ${h}.${nota ? ` Nota: ${nota}.` : ''} Quali cure consigli adesso?`,
  zh: (n, e, a, h, nota) => `我想检查一下 ${n} 今天的状况。精力：${e}。食欲：${a}。饮水：${h}。${nota ? `补充：${nota}。` : ''}请问现在有什么护理建议？`,
  ja: (n, e, a, h, nota) => `${n} の今日の体調を確認したいです。元気度：${e}。食欲：${a}。水分：${h}。${nota ? `補足：${nota}。` : ''}おすすめのケアを教えてください。`,
  ko: (n, e, a, h, nota) => `오늘 ${n}의 상태를 확인하고 싶습니다. 에너지: ${e}. 식욕: ${a}. 수분 섭취: ${h}.${nota ? ` 참고: ${nota}.` : ''} 지금 어떤 케어를 권장하나요?`,
  ru: (n, e, a, h, nota) => `Я хочу проверить самочувствие ${n} сегодня. Энергия: ${e}. Аппетит: ${a}. Вода: ${h}.${nota ? ` Примечание: ${nota}.` : ''} Какие меры ухода вы порекомендуете?`
};

const MASCOTA_DEFAULT_I18N = {
  es: 'tu mascota',
  en: 'your pet',
  fr: 'ton animal',
  de: 'dein Haustier',
  pt: 'seu pet',
  it: 'il tuo animale',
  zh: '你的宠物',
  ja: '愛犬',
  ko: '반려동물',
  ru: 'ваш питомец'
};

export function construirConsultaChequeo({ energia, apetito, hidratacion, nota = '', idioma = 'es' }, mascota = {}) {
  const nombre = mascota?.nombre || MASCOTA_DEFAULT_I18N[idioma] || MASCOTA_DEFAULT_I18N.es;
  const fn = CHEQUEO_I18N[idioma] || CHEQUEO_I18N.es;
  return fn(nombre, energia, apetito, hidratacion, nota.trim());
}

const FALLBACK_PLANTILLAS = {
  es: {
    urgencia: (n) => `¡Atención! Lo que describes sobre ${n} puede ser una urgencia. No soy médico veterinario, así que por favor no esperes y acude de inmediato a un centro veterinario 24/7 (Hospital UNA: 2277-3600 o emergencias 9-1-1).`,
    urgRec1: 'Atención veterinaria inmediata',
    urgRec2: 'No automedicar en casa',
    alertaLeve: (n, a) => `Veo que ${n} presenta señales de cansancio o malestar. Ofrécele agua fresca en lugar tranquilo, evita caminatas bajo el sol (asfalto a ${a} °C) y observa su evolución. Recuerda que no soy médico veterinario: si persiste o empeora, consulta a un profesional.`,
    estadoOk: (n, a, v, ml) => `${n} parece estar en condiciones estables para su rutina diaria. Con el asfalto a ${a} °C y ${v} min de ventana seca, un paseo moderado con agua fresca (${ml} ml aprox.) le vendrá muy bien. Recuerda que no soy veterinario y este seguimiento es preventivo.`,
    segRec: (n) => `Seguimiento de ${n}`,
    hidraRec: (ml) => `Meta hídrica: ~${ml} ml / 30 min`,
    asfalto: (n, a, r) => `La temperatura actual del pavimento es de ${a} °C (${r}). Las almohadillas de ${n} soportan hasta 26 °C sin riesgo; camina por aceras con sombra o zonas verdes.`,
    asfRec1: (a) => `Pavimento en ${a} °C`,
    asfRec2: 'Corredor Parque Francia - Escalante',
    lluvia: (n, v, c, h) => `El radar estima una ventana seca de ${v} minutos con condición "${c}" y humedad del ${h}%. Es buen momento para sacar a ${n} antes de que cambie el clima.`,
    lluvRec: (v) => `Ventana seca: ${v} min`,
    terraza: (n) => `Para que ${n} esté tranquilo, te recomiendo "El Árbol de Seda" (42 dB, ultra silencioso) o "Franco Café" (46 dB, con bebederos frescos y sombra). Ambos cuentan con certificación pet-friendly en el GAM.`,
    agua: (n, p, amb, ml) => `Para ${n} (${p} kg) con ambiente a ${amb} °C, lleva aproximadamente ${ml} ml de agua fresca por cada 30 minutos de paseo. Haz pausas cortas en sombra.`,
    aguaRec: (ml) => `Aprox. ${ml} ml / 30 min`,
    general: (n, a, db, v) => `¡Pura vida! Analicé tu consulta para ${n} con la telemetría actual: asfalto a ${a} °C, ${db} dB de ruido y ${v} min de ventana seca. Puedes preguntarme tanto por el clima como por el estado diario de ${n} (recuerda que no soy veterinario).`,
    genRec: (n) => `Perfil activo: ${n}`
  },
  en: {
    urgencia: (n) => `Warning! What you describe for ${n} could be an emergency. I am not a veterinarian, so please do not wait—go immediately to a 24/7 vet hospital (UNA Vet Hospital: 2277-3600 or call 9-1-1).`,
    urgRec1: 'Immediate veterinary care',
    urgRec2: 'Do not self-medicate at home',
    alertaLeve: (n, a) => `It sounds like ${n} shows signs of fatigue or discomfort. Offer fresh water in a quiet spot, avoid walks under direct sun (asphalt at ${a} °C), and monitor closely. I am not a veterinarian: if symptoms persist or worsen, see a vet.`,
    estadoOk: (n, a, v, ml) => `${n} appears stable for daily routine. With asphalt at ${a} °C and a ${v}-min dry window, a moderate walk with fresh water (~${ml} ml) works great. Note that I am not a vet and this guidance is preventive.`,
    segRec: (n) => `${n}'s check-in`,
    hidraRec: (ml) => `Hydration target: ~${ml} ml / 30 min`,
    asfalto: (n, a, r) => `Current pavement temperature is ${a} °C (${r}). ${n}'s paw pads safely tolerate up to 26 °C; stick to shaded sidewalks or green corridors.`,
    asfRec1: (a) => `Pavement at ${a} °C`,
    asfRec2: 'Parque Francia - Escalante Corridor',
    lluvia: (n, v, c, h) => `Radar estimates a ${v}-minute dry window (${c}, ${h}% humidity). Now is a good window to walk ${n} before weather shifts.`,
    lluvRec: (v) => `Dry window: ${v} min`,
    terraza: (n) => `For a calm stay with ${n}, I recommend "El Árbol de Seda" (42 dB, ultra-quiet) or "Franco Café" (46 dB, shaded water stations). Both are verified pet-friendly in the GAM.`,
    agua: (n, p, amb, ml) => `For ${n} (${p} kg) at ${amb} °C ambient temperature, bring roughly ${ml} ml of fresh water per 30 minutes of walking with shaded rest stops.`,
    aguaRec: (ml) => `Approx. ${ml} ml / 30 min`,
    general: (n, a, db, v) => `Pura vida! I checked live GAM telemetry for ${n}: asphalt at ${a} °C, ${db} dB noise, and a ${v}-min dry window. Ask about weather, safe patios, or ${n}'s daily well-being (remember I am not a vet).`,
    genRec: (n) => `Active profile: ${n}`
  },
  fr: {
    urgencia: (n) => `Attention ! Ce que vous décrivez pour ${n} peut être une urgence. Je ne suis pas vétérinaire : rendez-vous sans attendre dans une clinique 24/7 (Hôpital UNA : 2277-3600 ou 9-1-1).`,
    urgRec1: 'Soins vétérinaires immédiats',
    urgRec2: 'Ne pas automédiquer',
    alertaLeve: (n, a) => `${n} semble fatigué ou mal à l'aise. Offrez de l'eau fraîche au calme, évitez le soleil (asphalte à ${a} °C) et consultez un vétérinaire si les symptômes persistent.`,
    estadoOk: (n, a, v, ml) => `${n} semble en forme pour sa sortie. Avec l'asphalte à ${a} °C et ${v} min sans pluie, une promenade modérée avec ~${ml} ml d'eau est idéale.`,
    segRec: (n) => `Suivi de ${n}`,
    hidraRec: (ml) => `Hydratation : ~${ml} ml / 30 min`,
    asfalto: (n, a, r) => `L'asphalte est à ${a} °C (${r}). Les coussinets de ${n} tolèrent jusqu'à 26 °C sans risque ; privilégiez l'ombre.`,
    asfRec1: (a) => `Asphalte à ${a} °C`,
    asfRec2: 'Corridor Parque Francia - Escalante',
    lluvia: (n, v, c, h) => `Le radar prévoit ${v} min sans pluie (${c}, ${h}% d'humidité). Bon créneau pour sortir ${n}.`,
    lluvRec: (v) => `Créneau sec : ${v} min`,
    terraza: (n) => `Pour un moment serein avec ${n} : "El Árbol de Seda" (42 dB) ou "Franco Café" (46 dB, eau fraîche et ombre).`,
    agua: (n, p, amb, ml) => `Pour ${n} (${p} kg) par ${amb} °C, emportez environ ${ml} ml d'eau fraîche par tranche de 30 min.`,
    aguaRec: (ml) => `Env. ${ml} ml / 30 min`,
    general: (n, a, db, v) => `Analyse prête pour ${n} : asphalte ${a} °C, ${db} dB, fenêtre sèche ${v} min. (Rappel : avis informatif, non vétérinaire).`,
    genRec: (n) => `Profil : ${n}`
  },
  de: {
    urgencia: (n) => `Achtung! Was Sie für ${n} beschreiben, könnte ein Notfall sein. Ich bin kein Tierarzt — bitte sofort eine 24/7-Tierklinik aufsuchen (UNA: 2277-3600 oder 9-1-1).`,
    urgRec1: 'Sofortige tierärztliche Hilfe',
    urgRec2: 'Keine Selbstmedikation',
    alertaLeve: (n, a) => `${n} wirkt müde oder unwohl. Geben Sie frisches Wasser im Schatten, meiden Sie die Sonne (Asphalt ${a} °C) und konsultieren Sie bei Anhalten einen Tierarzt.`,
    estadoOk: (n, a, v, ml) => `${n} wirkt stabil. Bei ${a} °C Asphalt und ${v} Min. Trockenzeit empfiehlt sich ein ruhiger Spaziergang mit ca. ${ml} ml frischem Wasser.`,
    segRec: (n) => `Check für ${n}`,
    hidraRec: (ml) => `Wasserziel: ~${ml} ml / 30 Min`,
    asfalto: (n, a, r) => `Der Asphalt misst ${a} °C (${r}). ${n}s Pfoten vertragen sicher bis 26 °C; wählen Sie schattige Wege.`,
    asfRec1: (a) => `Asphalt ${a} °C`,
    asfRec2: 'Korridor Parque Francia - Escalante',
    lluvia: (n, v, c, h) => `Radar schätzt ${v} Minuten ohne Regen (${c}, ${h}% Luftfeuchte). Guter Zeitpunkt für ${n}.`,
    lluvRec: (v) => `Trockenfenster: ${v} Min`,
    terraza: (n) => `Für ${n} ruhig geeignet: "El Árbol de Seda" (42 dB) oder "Franco Café" (46 dB, Wasserstation & Schatten).`,
    agua: (n, p, amb, ml) => `Für ${n} (${p} kg) bei ${amb} °C bitte ca. ${ml} ml frisches Wasser pro 30 Minuten mitnehmen.`,
    aguaRec: (ml) => `Ca. ${ml} ml / 30 Min`,
    general: (n, a, db, v) => `Live-Telemetrie für ${n}: Asphalt ${a} °C, ${db} dB Lärm, ${v} Min. trocken. (Hinweis: kein Tierarzt-Ersatz).`,
    genRec: (n) => `Profil: ${n}`
  },
  pt: {
    urgencia: (n) => `Atenção! O quadro descrito para ${n} pode ser emergência. Não sou veterinário: procure imediatamente um hospital veterinário 24h (UNA: 2277-3600 ou 9-1-1).`,
    urgRec1: 'Atendimento veterinário imediato',
    urgRec2: 'Não automedicar em casa',
    alertaLeve: (n, a) => `${n} apresenta sinais de cansaço ou mal-estar. Ofereça água fresca à sombra, evite caminhadas ao sol (asfalto a ${a} °C) e procure um veterinário se persistir.`,
    estadoOk: (n, a, v, ml) => `${n} está estável. Com asfalto a ${a} °C e ${v} min sem chuva, um passeio moderado com ~${ml} ml de água fresca é ótimo.`,
    segRec: (n) => `Acompanhamento: ${n}`,
    hidraRec: (ml) => `Meta hídrica: ~${ml} ml / 30 min`,
    asfalto: (n, a, r) => `Temperatura do piso: ${a} °C (${r}). As patas de ${n} suportam até 26 °C; prefira calçadas sombreadas.`,
    asfRec1: (a) => `Piso em ${a} °C`,
    asfRec2: 'Corredor Parque Francia - Escalante',
    lluvia: (n, v, c, h) => `Radar prevê janela seca de ${v} min (${c}, ${h}% umidade). Bom momento para passear com ${n}.`,
    lluvRec: (v) => `Janela seca: ${v} min`,
    terraza: (n) => `Para tranquilidade de ${n}: "El Árbol de Seda" (42 dB) ou "Franco Café" (46 dB, sombra e água fresca).`,
    agua: (n, p, amb, ml) => `Para ${n} (${p} kg) a ${amb} °C, leve cerca de ${ml} ml de água fresca a cada 30 minutos de passeio.`,
    aguaRec: (ml) => `Aprox. ${ml} ml / 30 min`,
    general: (n, a, db, v) => `Pura vida! Telemetria atual para ${n}: asfalto ${a} °C, ${db} dB, ${v} min secos. (Aviso: não substitui um veterinário).`,
    genRec: (n) => `Perfil ativo: ${n}`
  },
  it: {
    urgencia: (n) => `Attenzione! Quello che descrivi per ${n} può essere un'urgenza. Non sono veterinario: recati subito in una clinica 24/7 (UNA: 2277-3600 o 9-1-1).`,
    urgRec1: 'Assistenza veterinaria immediata',
    urgRec2: 'Non automedicare',
    alertaLeve: (n, a) => `${n} mostra segni di stanchezza. Offri acqua fresca all'ombra, evita passeggiate al sole (asfalto a ${a} °C) e contatta un veterinario se i sintomi continuano.`,
    estadoOk: (n, a, v, ml) => `${n} sembra in buona forma. Con asfalto a ${a} °C e ${v} min asciutti, una passeggiata con ~${ml} ml d'acqua è ideale.`,
    segRec: (n) => `Controllo di ${n}`,
    hidraRec: (ml) => `Idratazione: ~${ml} ml / 30 min`,
    asfalto: (n, a, r) => `Asfalto a ${a} °C (${r}). I polpastrelli di ${n} reggono fino a 26 °C in sicurezza; scegli zone ombreggiate.`,
    asfRec1: (a) => `Asfalto ${a} °C`,
    asfRec2: 'Corridoio Parque Francia - Escalante',
    lluvia: (n, v, c, h) => `Il radar stima ${v} min senza pioggia (${c}, umidità ${h}%). Ottimo momento per uscire con ${n}.`,
    lluvRec: (v) => `Finestra asciutta: ${v} min`,
    terraza: (n) => `Per far rilassare ${n}: "El Árbol de Seda" (42 dB) o "Franco Café" (46 dB, ciotole fresche e ombra).`,
    agua: (n, p, amb, ml) => `Per ${n} (${p} kg) a ${amb} °C porta circa ${ml} ml di acqua fresca ogni 30 minuti.`,
    aguaRec: (ml) => `Circa ${ml} ml / 30 min`,
    general: (n, a, db, v) => `Analisi live per ${n}: asfalto ${a} °C, ${db} dB, ${v} min asciutti. (Solo orientamento, non veterinario).`,
    genRec: (n) => `Profilo: ${n}`
  },
  zh: {
    urgencia: (n) => `注意！${n} 的症状可能属于紧急情况。我不是执业兽医，请立即前往24小时宠物医院（UNA兽医医院：2277-3600 或拨打 9-1-1）。`,
    urgRec1: '立即就医',
    urgRec2: '切勿自行用药',
    alertaLeve: (n, a) => `${n} 似乎有些疲倦或不适。请在安静处提供清水，避免烈日下行走（路面 ${a} °C），若症状持续请尽快看兽医。`,
    estadoOk: (n, a, v, ml) => `${n} 状态看起来较稳定。当前路面 ${a} °C、无雨窗口 ${v} 分钟，适合携带约 ${ml} ml 清水适度散步。（仅供参考，不替代兽医）`,
    segRec: (n) => `${n} 的状态追踪`,
    hidraRec: (ml) => `建议饮水：约 ${ml} ml / 30 分钟`,
    asfalto: (n, a, r) => `当前路面温度 ${a} °C（${r}）。${n} 的脚垫安全耐受上限为 26 °C，请尽量走树荫路段。`,
    asfRec1: (a) => `路面 ${a} °C`,
    asfRec2: 'Parque Francia - Escalante 绿道',
    lluvia: (n, v, c, h) => `雷达预测无雨窗口约 ${v} 分钟（${c}，湿度 ${h}%），现在适合带 ${n} 外出。`,
    lluvRec: (v) => `无雨窗口：${v} 分钟`,
    terraza: (n) => `推荐带 ${n} 前往安静露台："El Árbol de Seda"（42 dB）或 "Franco Café"（46 dB，备有清水与遮阴）。`,
    agua: (n, p, amb, ml) => `按 ${n}（${p} kg）及气温 ${amb} °C 计算，每散步 30 分钟建议携带约 ${ml} ml 清水并定时在阴凉处补水。`,
    aguaRec: (ml) => `约 ${ml} ml / 30 分钟`,
    general: (n, a, db, v) => `已结合实时遥测为 ${n} 分析：路面 ${a} °C、噪音 ${db} dB、无雨窗口 ${v} 分钟。（非兽医诊疗建议）`,
    genRec: (n) => `当前档案：${n}`
  },
  ja: {
    urgencia: (n) => `注意！${n} の症状は緊急の可能性があります。私は獣医師ではないため、すぐ24時間対応の動物病院へ（UNA動物病院: 2277-3600 / 9-1-1）。`,
    urgRec1: '直ちに獣医師の診察を',
    urgRec2: '自己判断で投薬しない',
    alertaLeve: (n, a) => `${n} に疲れや不調のサインが見られます。涼しい場所で新鮮な水を与え、直射日光（路面 ${a} °C）を避けて経過を見てください。続く場合は受診を。`,
    estadoOk: (n, a, v, ml) => `${n} は安定した状態です。路面 ${a} °C・晴れ間 ${v} 分のため、約 ${ml} ml の水を持参して穏やかな散歩が最適です。`,
    segRec: (n) => `${n} のチェック`,
    hidraRec: (ml) => `水分目安：約 ${ml} ml / 30分`,
    asfalto: (n, a, r) => `現在の路面温度は ${a} °C（${r}）です。${n} の肉球の安全目安は 26 °C までですので日陰をお選びください。`,
    asfRec1: (a) => `路面温度 ${a} °C`,
    asfRec2: 'Parque Francia - Escalante ルート',
    lluvia: (n, v, c, h) => `雨雲レーダー予測：あと ${v} 分は乾燥状態（${c}・湿度 ${h}%）です。今が散歩の好機です。`,
    lluvRec: (v) => `乾燥予測：${v} 分`,
    terraza: (n) => `${n} と落ち着けるテラス：El Árbol de Seda（42 dB）または Franco Café（46 dB、給水・日陰完備）。`,
    agua: (n, p, amb, ml) => `${n}（${p} kg）・気温 ${amb} °C では30分あたり約 ${ml} ml の水を持参し、日陰で休憩してください。`,
    aguaRec: (ml) => `約 ${ml} ml / 30分`,
    general: (n, a, db, v) => `${n} の最新計測：路面 ${a} °C、騒音 ${db} dB、乾燥 ${v} 分。天候や体調についてお気軽にご相談ください（獣医療ではありません）。`,
    genRec: (n) => `対象：${n}`
  },
  ko: {
    urgencia: (n) => `주의! ${n}에게 나타난 증상은 응급 상황일 수 있습니다. 수의사가 아니므로 지체 없이 24시간 동물병원(UNA 병원 2277-3600 / 9-1-1)을 방문하세요.`,
    urgRec1: '즉시 수의사 진료 필요',
    urgRec2: '임의 투약 금지',
    alertaLeve: (n, a) => `${n}에게 피로나 컨디션 저하가 보입니다. 조용한 곳에서 신선한 물을 주고 직사광선 산책(노면 ${a} °C)은 피해 주세요. 지속되면 내원하세요.`,
    estadoOk: (n, a, v, ml) => `${n}의 상태가 안정적입니다. 노면 ${a} °C, 비 안 오는 시간 ${v}분이므로 물 약 ${ml} ml를 챙겨 가볍게 산책하기 좋습니다.`,
    segRec: (n) => `${n} 상태 추적`,
    hidraRec: (ml) => `수분 목표: 약 ${ml} ml / 30분`,
    asfalto: (n, a, r) => `현재 노면 온도는 ${a} °C(${r})입니다. ${n}의 발바닥 안전 한도는 26 °C이므로 그늘진 인도를 이용하세요.`,
    asfRec1: (a) => `노면 온도 ${a} °C`,
    asfRec2: 'Parque Francia - Escalante 코스',
    lluvia: (n, v, c, h) => `레이더 기준 ${v}분 동안 건조 구간이 예상됩니다(${c}, 습도 ${h}%). ${n} 산책하기 좋은 타이밍입니다.`,
    lluvRec: (v) => `건조 구간: ${v}분`,
    terraza: (n) => `${n}와 조용히 머물기 좋은 테라스: El Árbol de Seda(42 dB) 또는 Franco Café(46 dB, 급수·그늘 완비).`,
    agua: (n, p, amb, ml) => `${n}(${p} kg), 기온 ${amb} °C 기준 30분 산책당 약 ${ml} ml의 신선한 물을 준비해 그늘에서 자주 급수해 주세요.`,
    aguaRec: (ml) => `약 ${ml} ml / 30분`,
    general: (n, a, db, v) => `${n} 실시간 데이터 분석: 노면 ${a} °C, 소음 ${db} dB, 건조 구간 ${v}분. (수의학적 진단을 대체하지 않습니다).`,
    genRec: (n) => `활성 프로필: ${n}`
  },
  ru: {
    urgencia: (n) => `Внимание! Описанные симптомы у ${n} могут быть экстренными. Я не ветеринар — немедленно обратитесь в круглосуточную ветклинику (UNA: 2277-3600 или 9-1-1).`,
    urgRec1: 'Срочная ветеринарная помощь',
    urgRec2: 'Не заниматься самолечением',
    alertaLeve: (n, a) => `Похоже, у ${n} усталость или недомогание. Дайте свежей воды в спокойном месте, избегайте жары (асфальт ${a} °C) и обратитесь к врачу, если симптомы сохранятся.`,
    estadoOk: (n, a, v, ml) => `Состояние ${n} стабильное. При асфальте ${a} °C и ${v} мин без дождя подойдёт спокойная прогулка с ~${ml} мл свежей воды.`,
    segRec: (n) => `Контроль: ${n}`,
    hidraRec: (ml) => `Норма воды: ~${ml} мл / 30 мин`,
    asfalto: (n, a, r) => `Температура покрытия сейчас ${a} °C (${r}). Подушечки лап ${n} безопасно выдерживают до 26 °C; выбирайте тенистые аллеи.`,
    asfRec1: (a) => `Асфальт ${a} °C`,
    asfRec2: 'Коридор Parque Francia - Escalante',
    lluvia: (n, v, c, h) => `Радар прогнозирует ${v} мин без дождя (${c}, влажность ${h}%). Хорошее окно для прогулки с ${n}.`,
    lluvRec: (v) => `Сухое окно: ${v} мин`,
    terraza: (n) => `Спокойные террасы для ${n}: "El Árbol de Seda" (42 dB) или "Franco Café" (46 dB, миски с водой и тень).`,
    agua: (n, p, amb, ml) => `Для ${n} (${p} кг) при ${amb} °C возьмите около ${ml} мл воды на каждые 30 минут прогулки.`,
    aguaRec: (ml) => `Около ${ml} мл / 30 мин`,
    general: (n, a, db, v) => `Телеметрия для ${n}: асфальт ${a} °C, шум ${db} dB, сухое окно ${v} мин. (Справка не заменяет ветеринара).`,
    genRec: (n) => `Профиль: ${n}`
  }
};

export function generarRespuestaFallbackBruno(texto, { telemetria = {}, mascota = {}, idioma = 'es' } = {}) {
  const q = String(texto || '').toLowerCase();
  const tpl = FALLBACK_PLANTILLAS[idioma] || FALLBACK_PLANTILLAS.es;
  const nombre = mascota?.nombre || MASCOTA_DEFAULT_I18N[idioma] || MASCOTA_DEFAULT_I18N.es;
  const peso = Number(mascota?.pesoKg) || 18;
  const asfalto = telemetria?.temperaturaAsfalto ?? 24.5;
  const ambiente = telemetria?.temperaturaAmbiente ?? 22;
  const ventanaSeca = telemetria?.ventanaSecaMinutos ?? 45;

  // 1. Señales de alarma médica / urgencia
  if (/(convulsion|sangre|veneno|chocolat|ahog|no respira|desmay|atropell|intoxic|seizure|bleed|blood|poison|chok|not breath|faint|toxic|convuls|étouff|krampf|blut|envenen|avvelen|中毒|けいれん|発作|발작|출혈|судорог|яд|кров)/.test(q)) {
    return {
      respuestaTexto: tpl.urgencia(nombre),
      recomendaciones: [
        { tipo: 'alerta', texto: tpl.urgRec1 },
        { tipo: 'salud', texto: tpl.urgRec2 }
      ]
    };
  }

  // 2. Estado general / chequeo / síntomas cotidianos de la mascota
  if (/(estado|como esta|cómo está|chequeo|decaid|decaíd|cansad|vomit|diarre|fiebre|apetito|no come|pata|estres|estrés|energia|energía|salud|triste|how is|check|sluggish|tired|letharg|vomit|diarrh|fever|appetite|not eating|stress|energy|health|comment va|fatigué|abattu|wie geht|müde|erschöpft|come sta|stanco|depresso|精神|状态|食欲|怎么|様子|ぐったり|元気|기력|식욕|처져|состояни|устал|аппетит|грустн)/.test(q)) {
    const hayAlertaLeve = /(decaid|decaíd|vomit|diarre|fiebre|no come|sedient|sluggish|tired|letharg|not eating|thirsty|abattu|müde|sem apetite|stanco|scarso|ぐったり|少ない|식욕|적음|мало|не ест|жажд)/.test(q);
    const ml = Math.round(peso * 12);
    return {
      respuestaTexto: hayAlertaLeve
        ? tpl.alertaLeve(nombre, asfalto)
        : tpl.estadoOk(nombre, asfalto, ventanaSeca, ml),
      recomendaciones: [
        { tipo: 'salud', texto: tpl.segRec(nombre) },
        { tipo: 'hidratacion', texto: tpl.hidraRec(ml) }
      ]
    };
  }

  // 3. Asfalto / pavimento
  if (/(asfalto|pavimento|quemadur|suelo|calzada|asphalt|pavement|sidewalk|ground|burn|asphalte|trottoir|brûl|pflaster|boden|verbrenn|calçada|marciapiede|路面|アスファルト|아스팔트|지열|асфальт|тротуар)/.test(q)) {
    return {
      respuestaTexto: tpl.asfalto(nombre, asfalto, telemetria?.nivelRiesgoAsfalto || 'OK'),
      recomendaciones: [
        { tipo: 'asfalto', texto: tpl.asfRec1(asfalto) },
        { tipo: 'ruta', texto: tpl.asfRec2 }
      ]
    };
  }

  // 4. Lluvia / clima
  if (/(lluvia|clima|seco|minuto|tiempo|rain|weather|dry|forecast|pluie|météo|regen|wetter|chuva|tempo|pioggia|meteo|雨|天气|天気|날씨|비|дождь|погод)/.test(q)) {
    return {
      respuestaTexto: tpl.lluvia(nombre, ventanaSeca, telemetria?.condicionClimatica || 'OK', telemetria?.humedadRelativa ?? 72),
      recomendaciones: [
        { tipo: 'clima', texto: tpl.lluvRec(ventanaSeca) }
      ]
    };
  }

  // 5. Terrazas / ruido
  if (/(terraza|cafe|café|local|franco|arbol|árbol|ruido|terrace|patio|place|venue|noise|quiet|terrasse|bruit|lärm|terraço|barulho|terrazza|rumore|露台|安静|テラス|静か|테라스|소음|террас|кафе|шум)/.test(q)) {
    return {
      respuestaTexto: tpl.terraza(nombre),
      recomendaciones: [
        { tipo: 'terraza', texto: 'Franco Café (46 dB)' },
        { tipo: 'terraza', texto: 'El Árbol de Seda (42 dB)' }
      ]
    };
  }

  // 6. Agua / hidratación
  if (/(agua|hidrat|cuanta|cuánta|beber|sed|water|hydrat|drink|thirst|eau|boire|soif|wasser|trinken|durst|água|sede|acqua|bere|sete|水|喝水|水分|물|수분|вода|пить)/.test(q)) {
    const ml = Math.round(peso * 13 * (ambiente / 20));
    return {
      respuestaTexto: tpl.agua(nombre, peso, ambiente, ml),
      recomendaciones: [
        { tipo: 'hidratacion', texto: tpl.aguaRec(ml) }
      ]
    };
  }

  // 7. General
  return {
    respuestaTexto: tpl.general(nombre, asfalto, telemetria?.aforoAcusticoDb ?? 48, ventanaSeca),
    recomendaciones: [
      { tipo: 'general', texto: tpl.genRec(nombre) }
    ]
  };
}
