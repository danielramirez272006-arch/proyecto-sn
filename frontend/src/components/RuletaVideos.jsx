import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { VIDEOS_RULETA } from '../data/videosRuleta';
import { api } from '../shared/services/api-client';
import '../estilos/ruleta-videos.css';

/**
 * Ruleta infinita de videos.
 *
 * - Las tarjetas se colocan sobre un arco de círculo (seno/coseno) y se mueven
 *   con un solo bucle requestAnimationFrame + interpolación exponencial.
 * - El bucle escribe `transform` y `opacity` directamente en el DOM (refs):
 *   React solo re-renderiza cuando cambia el índice activo, la vista o un fallo.
 * - Únicamente la tarjeta central monta el <iframe> de YouTube.
 */

/* Aquí se ajusta la VELOCIDAD y el tacto del arrastre. */
const CONFIG = {
  autoplayMs: 6000, // cada cuánto avanza solo
  resumeMs: 3000, // cuánto tarda en retomar tras una interacción
  stiffness: 6.2, // suavidad del lerp (más alto = más seco)
  dragStiffness: 15, // lerp mientras se arrastra
  dragPxPerStep: 150, // px de arrastre por tarjeta
  settleEps: 0.02 // "centrada" = a menos de 2% de paso
};

const pad = (n) => String(n).padStart(2, '0');
const mod = (n, m) => ((n % m) + m) % m;

/* Diferencia circular más corta: valor en (-n/2, n/2] */
function shortest(v, n) {
  if (!n || n <= 1) return 0;
  let d = mod(v, n);
  if (d > n / 2) d -= n;
  return d;
}

const miniatura = (id) => `https://img.youtube.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;

const urlEmbed = (id) =>
  'https://www.youtube-nocookie.com/embed/' +
  encodeURIComponent(id) +
  '?autoplay=1&mute=1&controls=0&rel=0&playsinline=1' +
  '&loop=1&playlist=' +
  encodeURIComponent(id) +
  '&modestbranding=1&iv_load_policy=3';

/* Los radios deben coincidir con los media queries del CSS.
   Aquí se ajusta el RADIO del arco. */
function elegirConfig() {
  const w = typeof window === 'undefined' ? 1440 : window.innerWidth;
  if (w < 640) return { radius: 190, stepDeg: 28, fadeStart: 1.0, maxDelta: 1.7 };
  if (w < 1100) return { radius: 260, stepDeg: 22, fadeStart: 1.05, maxDelta: 2.3 };
  if (w >= 1400) return { radius: 360, stepDeg: 20, fadeStart: 1.15, maxDelta: 2.6 };
  return { radius: 280, stepDeg: 18, fadeStart: 1.1, maxDelta: 2.5 };
}

/* Limpia títulos de YouTube eliminando hashtags (#perros), emojis excesivos y sufijos innecesarios */
function limpiarTituloVideo(titulo = '') {
  const limpio = String(titulo || '')
    .replace(/#[\p{L}\p{N}_-]+/gu, '') // Quita cualquier hashtag (#perros, #shorts, etc.)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '') // Quita emojis que ensucian o alargan el título
    .replace(/\s*\|\s*.*$/, '') // Quita sufijos tipo "| Canal"
    .replace(/\s+/g, ' ')
    .trim();
  return limpio || String(titulo || '').trim();
}

function PanelInfo({ video }) {
  if (!video) return null;
  const tituloLimpio = limpiarTituloVideo(video.titulo);
  return (
    <div className="gxw-info__content">
      <h2 className="gxw-info__title">{tituloLimpio}</h2>
    </div>
  );
}

/* ---------------- PetSearch: búsqueda sobre catálogo aprobado ---------------- */
const STOPWORDS_ES = new Set([
  'para', 'como', 'cómo', 'con', 'los', 'las', 'una', 'uno', 'unos', 'unas',
  'del', 'sobre', 'que', 'qué', 'cual', 'cuál', 'donde', 'dónde', 'tiene', 'tener',
  'hacer', 'hago', 'puedo', 'debo', 'esta', 'este', 'esto', 'pero', 'mas', 'más',
  'por', 'casa', 'perro', 'perros', 'gato', 'gatos', 'mascota', 'mascotas'
]);

const TEMAS_CATALOGO = [
  'Baño e higiene de perros',
  'Cepillado dental canino',
  'Primeros auxilios en gatos',
  'Intoxicación y emergencias en perros',
  'Atragantamiento y maniobra de Heimlich'
];

const normalizarTexto = (txt = '') =>
  String(txt || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ');

const esRefinamientoCorto = (q = '') =>
  /\b(m[aá]s\s+corto|menos\s+largo|menor\s+duraci[oó]n|algo\s+corto|m[aá]s\s+r[aá]pido|cortito)\b/i.test(q);

function buscarEnCatalogo(consulta, catalogo) {
  const normQuery = normalizarTexto(consulta);
  const todasPalabras = normQuery.split(/\s+/).filter((t) => t.length > 2);
  const palabrasTema = todasPalabras.filter((t) => !STOPWORDS_ES.has(t));
  const tokens = palabrasTema.length > 0 ? palabrasTema : todasPalabras;
  if (tokens.length === 0) return [];

  const resultados = [];
  for (const video of catalogo) {
    const titulo = normalizarTexto(video.titulo);
    const categoria = normalizarTexto(video.categoria);
    const tema = normalizarTexto(video.tema);
    const resumen = normalizarTexto(video.resumen);
    const especie = normalizarTexto(video.especie);

    let score = 0;
    let topicHit = false;

    for (const tk of tokens) {
      if (titulo.includes(tk)) { score += 5; topicHit = true; }
      if (tema.includes(tk) || categoria.includes(tk)) { score += 4; topicHit = true; }
      if (resumen.includes(tk)) { score += 3; topicHit = true; }
    }

    // Bono por coincidencia de especie si ya hubo coincidencia de tema
    if (topicHit) {
      if (normQuery.includes('perro') && especie.includes('perro')) score += 3;
      if (normQuery.includes('gato') && especie.includes('gato')) score += 3;
    }

    let mejorFrag = null;
    let mejorFragScore = 0;
    for (const f of video.fragmentos || []) {
      const fq = normalizarTexto(f.pregunta);
      const fa = normalizarTexto(f.respuesta);
      let fScore = 0;
      for (const tk of tokens) {
        if (fq.includes(tk)) { fScore += 8; topicHit = true; }
        if (fa.includes(tk)) { fScore += 4; topicHit = true; }
      }
      if (fScore > mejorFragScore) {
        mejorFragScore = fScore;
        mejorFrag = f;
      }
    }

    score += mejorFragScore;
    if (topicHit && score > 0) {
      resultados.push({
        video,
        score,
        fragmento: mejorFrag || (video.fragmentos && video.fragmentos[0]) || null
      });
    }
  }

  return resultados.sort((a, b) => b.score - a.score);
}

/* ---------------- Reproductor: utilidades ---------------- */
const EASE_PLAYER = 'cubic-bezier(.22,.68,.24,1)';
const DURACION_PLAYER = 300;

const prefiereMenosMovimiento = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Rect del elemento solo si está completamente dentro de la ventana. */
function rectVisible(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  if (r.top < 0 || r.left < 0 || r.bottom > window.innerHeight || r.right > window.innerWidth) return null;
  return r;
}

const transformEntre = (desde, hacia) =>
  `translate(${desde.left - hacia.left}px, ${desde.top - hacia.top}px) ` +
  `scale(${desde.width / hacia.width}, ${desde.height / hacia.height})`;

const urlReproductor = (id, inicio) =>
  'https://www.youtube-nocookie.com/embed/' +
  encodeURIComponent(id) +
  '?autoplay=1&rel=0&playsinline=1&modestbranding=1' +
  (inicio > 0 ? '&start=' + inicio : '');

const urlYouTube = (id, inicio) =>
  'https://www.youtube.com/watch?v=' + encodeURIComponent(id) + (inicio > 0 ? '&t=' + inicio + 's' : '');

const formatoTiempo = (s) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;

export function RuletaVideos() {
  const [vista, setVista] = useState('wheel');
  const [info, setInfo] = useState({ cur: 0, prev: null, front: 0 });
  const [fallidos, setFallidos] = useState({});
  const [videoCaido, setVideoCaido] = useState({});
  const [videoActivo, setVideoActivo] = useState(null);
  const [frameListo, setFrameListo] = useState(null);

  // Catálogo aprobado (carga inicial + resultados de búsqueda compartidos entre carrusel y Lista)
  const [catalogoBase, setCatalogoBase] = useState(VIDEOS_RULETA);
  const [videosLista, setVideosLista] = useState(VIDEOS_RULETA);
  const totalVideos = videosLista.length;
  const [actualizandoVideos, setActualizandoVideos] = useState(false);
  const actualizandoRef = useRef(false);
  const pasoActualizacionRef = useRef(Math.floor(Date.now() / (10 * 60 * 1000)));
  const ultimaRotacionRef = useRef(Date.now());
  const videosListaRef = useRef(VIDEOS_RULETA);

  // Estado del chat de búsqueda (PetSearch)
  const [consultaGemini, setConsultaGemini] = useState('');
  const [buscandoGemini, setBuscandoGemini] = useState(false);
  const [modoDemo, setModoDemo] = useState(true);
  const [mensajesChat, setMensajesChat] = useState([]);
  const [ultimoTema, setUltimoTema] = useState(null);
  const [busquedaActiva, setBusquedaActiva] = useState(false);
  const busquedaActivaRef = useRef(false);

  useEffect(() => {
    videosListaRef.current = videosLista;
  }, [videosLista]);

  useEffect(() => {
    busquedaActivaRef.current = busquedaActiva;
  }, [busquedaActiva]);

  /* Reproductor único (carrusel, Lista y chat comparten este estado).
     fase: 'abriendo' → 'abierto' → 'cerrando' → null */
  const [reproductor, setReproductorEstado] = useState(null);
  const [frameEstado, setFrameEstado] = useState('cargando');
  const reproductorRef = useRef(null);
  const shellRef = useRef(null);
  const haloRef = useRef(null);
  const cerrarBtnRef = useRef(null);
  const openerRef = useRef(null);
  const animRef = useRef(null);
  const listThumbsRef = useRef([]);
  const tokenRef = useRef(0);

  const setReproductor = useCallback((upd) => {
    setReproductorEstado((prev) => {
      const next = typeof upd === 'function' ? upd(prev) : upd;
      reproductorRef.current = next;
      return next;
    });
  }, []);

  const mapearVideosBackend = useCallback((videos, baseAnterior = VIDEOS_RULETA) => {
    const mapa = new Map(baseAnterior.map((v) => [v.id, v]));
    const nuevos = [];
    for (const v of videos) {
      if (!v.youtube_id) continue;
      const existente = mapa.get(v.youtube_id) || {};
      const item = {
        ...existente,
        id: v.youtube_id,
        dbId: v.id || existente.dbId,
        titulo: limpiarTituloVideo(v.title || existente.titulo),
        categoria: v.category || existente.categoria || `${v.species || 'general'} • ${v.topic || 'cuidado'}`,
        anio: v.year || existente.anio || (v.approved_at ? new Date(v.approved_at).getFullYear() : 2026),
        especie: v.species || existente.especie,
        tema: v.topic || existente.tema,
        duracion: Number(v.duration_seconds) || existente.duracion || 240,
        resumen: v.summary || existente.resumen,
        poster: v.thumbnail_url || existente.poster,
        fragmentos: existente.fragmentos || []
      };
      mapa.set(v.youtube_id, item);
      nuevos.push(item);
    }
    return { mapa, nuevos };
  }, []);

  // Sincroniza el catálogo aprobado y recomendaciones en vivo desde YouTube al iniciar
  useEffect(() => {
    let activo = true;
    Promise.allSettled([
      api.get('/pet-videos?limit=20'),
      api.get('/pet-videos/live?limit=6')
    ]).then(([aprobadosRes, liveRes]) => {
      if (!activo) return;
      const aprobados = aprobadosRes.status === 'fulfilled' && Array.isArray(aprobadosRes.value)
        ? aprobadosRes.value
        : [];
      const livePayload = liveRes.status === 'fulfilled' ? liveRes.value : null;
      if (Number.isInteger(livePayload?.step)) {
        pasoActualizacionRef.current = livePayload.step;
      }
      ultimaRotacionRef.current = Date.now();
      const liveData = Array.isArray(livePayload?.videos) && livePayload.videos.length > 0
        ? livePayload.videos
        : [];

      const entrantes = [...liveData, ...aprobados];
      if (entrantes.length === 0) return;

      setCatalogoBase((prev) => {
        const { mapa, nuevos } = mapearVideosBackend(entrantes, prev);
        const combinado = liveData.length > 0
          ? [...nuevos, ...Array.from(mapa.values()).filter((v) => !nuevos.some((n) => n.id === v.id))]
          : Array.from(mapa.values());
        setVideosLista((curr) => (curr === prev ? combinado : curr));
        return combinado;
      });
    });

    return () => {
      activo = false;
    };
  }, [mapearVideosBackend]);

  const actualizarVideosEnVivo = useCallback(async (opts = {}) => {
    const automatico = Boolean(opts && opts.automatico === true);
    if (actualizandoRef.current) return;
    actualizandoRef.current = true;
    setActualizandoVideos(true);
    pasoActualizacionRef.current += 1;
    try {
      const idsActuales = (videosListaRef.current || [])
        .slice(0, 6)
        .map((v) => v.id)
        .filter(Boolean)
        .join(',');
      const resp = await api.get(
        `/pet-videos/live?limit=6&refresh=1&step=${pasoActualizacionRef.current}&exclude=${encodeURIComponent(idsActuales)}`
      );
      const listaLive = Array.isArray(resp?.videos) ? resp.videos : [];
      if (listaLive.length > 0) {
        ultimaRotacionRef.current = Date.now();
        setCatalogoBase((prev) => {
          const { nuevos } = mapearVideosBackend(listaLive, prev);
          const mapa = new Map(prev.map((v) => [v.id, v]));
          for (const n of nuevos) mapa.set(n.id, n);

          // En actualización automática cada 10 min, no interrumpir si hay video abierto o búsqueda activa
          if (!automatico || (!reproductorRef.current && !busquedaActivaRef.current)) {
            posRef.current = 0;
            targetRef.current = 0;
            activoRef.current = null;
            setVideoActivo(null);
            setFrameListo(null);
            setFallidos({});
            setVideoCaido({});
            setInfo({ cur: 0, prev: null, front: 0 });
            if (!automatico) {
              setBusquedaActiva(false);
              setUltimoTema(null);
            }
            setVideosLista(nuevos);
          }

          return Array.from(mapa.values());
        });
      }
    } catch {
      // Mantiene la selección actual si falla la red
    } finally {
      actualizandoRef.current = false;
      setActualizandoVideos(false);
    }
  }, [mapearVideosBackend]);

  // Actualización automática del carrusel cada 10 minutos (resistente a pestañas en segundo plano)
  useEffect(() => {
    const INTERVALO_ROTACION_MS = 10 * 60 * 1000;
    const verificarYRotar = () => {
      if (Date.now() - ultimaRotacionRef.current >= INTERVALO_ROTACION_MS) {
        actualizarVideosEnVivo({ automatico: true });
      }
    };

    const timer = setInterval(verificarYRotar, 15000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        verificarYRotar();
      }
    };
    window.addEventListener('focus', verificarYRotar);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', verificarYRotar);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [actualizarVideosEnVivo]);

  const aplicarResultadosAlCarrusel = (nuevaLista) => {
    posRef.current = 0;
    targetRef.current = 0;
    activoRef.current = null;
    setVideoActivo(null);
    setFrameListo(null);
    setInfo({ cur: 0, prev: null, front: 0 });
    setVideosLista(nuevaLista);
    setBusquedaActiva(true);
  };

  const restablecerCatalogo = () => {
    posRef.current = 0;
    targetRef.current = 0;
    activoRef.current = null;
    setVideoActivo(null);
    setFrameListo(null);
    setInfo({ cur: 0, prev: null, front: 0 });
    setVideosLista(catalogoBase);
    setBusquedaActiva(false);
    setUltimoTema(null);
  };

  const buscarVideoConGemini = async (textoManual) => {
    const q = (textoManual ?? consultaGemini).trim();
    if (!q || buscandoGemini) return;
    setConsultaGemini('');
    setBuscandoGemini(true);

    const msgUsuario = { id: `u_${Date.now()}`, rol: 'usuario', texto: q };
    setMensajesChat((prev) => [...prev, msgUsuario]);

    try {
      // 1. Caso de refinamiento: «uno más corto»
      if (esRefinamientoCorto(q)) {
        if (!ultimoTema || !ultimoTema.videos || ultimoTema.videos.length === 0) {
          setMensajesChat((prev) => [
            ...prev,
            {
              id: `a_${Date.now()}`,
              rol: 'asistente',
              texto: 'Dime primero qué tema buscas (por ejemplo, baño de perros o primeros auxilios) y luego puedo buscar una versión más corta.',
              sinCoincidencias: true,
              temasSugeridos: TEMAS_CATALOGO.slice(0, 4)
            }
          ]);
          return;
        }

        const videoActual = videosLista[0];
        const duracionActual = Number(videoActual?.duracion) || 9999;
        const candidatos = [...ultimoTema.videos].sort((a, b) => (a.video.duracion || 9999) - (b.video.duracion || 9999));
        const masCorto = candidatos.find((c) => (c.video.duracion || 9999) < duracionActual && c.video.id !== videoActual?.id)
          || candidatos.find((c) => c.video.id !== videoActual?.id && (c.video.duracion || 9999) <= duracionActual);

        if (masCorto) {
          const ordenados = [masCorto.video, ...candidatos.filter((c) => c.video.id !== masCorto.video.id).map((c) => c.video)].slice(0, 3);
          aplicarResultadosAlCarrusel(ordenados);
          const frag = masCorto.fragmento;
          setMensajesChat((prev) => [
            ...prev,
            {
              id: `a_${Date.now()}`,
              rol: 'asistente',
              texto: `Aquí tienes una opción más corta sobre «${ultimoTema.query}»: «${masCorto.video.titulo}» (${formatoTiempo(masCorto.video.duracion || 0)}). ${frag ? frag.respuesta : masCorto.video.resumen || ''}`,
              videoPrincipal: masCorto.video,
              fragmento: frag
            }
          ]);
        } else {
          setMensajesChat((prev) => [
            ...prev,
            {
              id: `a_${Date.now()}`,
              rol: 'asistente',
              texto: `«${videoActual?.titulo || 'Este video'}» (${formatoTiempo(duracionActual)}) ya es el video más corto que tenemos en el catálogo aprobado sobre «${ultimoTema.query}».`,
              videoPrincipal: videoActual,
              fragmento: ultimoTema.videos[0]?.fragmento || null
            }
          ]);
        }
        return;
      }

      // 2. Consulta al flujo de búsqueda existente (/api/pet-videos/smart-search sin inventar externos)
      let respBackend = null;
      try {
        respBackend = await api.post('/pet-videos/smart-search', { text: q, allow_youtube: false });
      } catch {
        respBackend = null;
      }

      const usaGeminiReal = Boolean(respBackend && respBackend.search_mode === 'gemini_ai');
      setModoDemo(!usaGeminiReal);

      // Cruzar coincidencias verificadas del catálogo aprobado
      const coincidencias = buscarEnCatalogo(q, catalogoBase);

      if (coincidencias.length > 0) {
        const top3 = coincidencias.slice(0, 3).map((c) => c.video);
        const principal = coincidencias[0];
        const frag = principal.fragmento;

        // Si el backend dio una respuesta directa de Gemini y corresponde al mismo video, enriquecer el texto
        let textoRespuesta = frag ? frag.respuesta : (principal.video.resumen || `Encontré ${top3.length} video(s) del catálogo aprobado sobre tu consulta.`);
        if (usaGeminiReal && respBackend?.best_match?.youtube_id === principal.video.id && respBackend.best_match.direct_answer) {
          textoRespuesta = respBackend.best_match.direct_answer;
        }

        aplicarResultadosAlCarrusel(top3);
        setUltimoTema({ query: q, videos: coincidencias });

        setMensajesChat((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            rol: 'asistente',
            texto: textoRespuesta,
            videoPrincipal: principal.video,
            fragmento: frag,
            esEmergencia: Boolean(respBackend?.is_medical_emergency)
          }
        ]);
      } else {
        // Sin coincidencias: informarlo con honestidad y sugerir temas que sí están en el catálogo
        setMensajesChat((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            rol: 'asistente',
            texto: `Todavía no tenemos un video aprobado sobre «${q}» en el catálogo. Puedes probar con alguno de los temas disponibles:`,
            sinCoincidencias: true,
            temasSugeridos: TEMAS_CATALOGO
          }
        ]);
      }
    } finally {
      setBuscandoGemini(false);
    }
  };

  const seccionRef = useRef(null);
  const wheelRef = useRef(null);
  const cardsRef = useRef([]);
  const posRef = useRef(0); // posición real (float, sin límite → loop infinito)
  const targetRef = useRef(0); // objetivo (entero o fracción al arrastrar)
  const activoRef = useRef(null);
  const caidosRef = useRef({});
  const frameListoRef = useRef(false);
  const pendienteRef = useRef(null); // índice pedido desde la vista Lista

  const marcarActivo = useCallback((i) => {
    if (activoRef.current === i) return;
    activoRef.current = i;
    setVideoActivo(i);
  }, []);

  const marcarFallido = useCallback((i) => {
    setFallidos((prev) => (prev[i] ? prev : { ...prev, [i]: true }));
  }, []);

  const marcarVideoCaido = useCallback(
    (i) => {
      caidosRef.current = { ...caidosRef.current, [i]: true };
      setVideoCaido(caidosRef.current);
      setFrameListo(null);
      if (activoRef.current === i) {
        activoRef.current = null;
        setVideoActivo(null);
      }
    },
    []
  );

  /* Si el embed no carga en 12 s se cae al fondo oscuro con el título.
     El reset va en layout effect para que un `is-ready` viejo nunca
     se reutilice al remontar el mismo video. */
  useLayoutEffect(() => {
    frameListoRef.current = false;
    setFrameListo(null);

    if (videoActivo === null) return undefined;

    const i = videoActivo;
    const t = setTimeout(() => {
      if (!frameListoRef.current) marcarVideoCaido(i);
    }, 12000);
    return () => clearTimeout(t);
  }, [videoActivo, marcarVideoCaido]);

  /* ------------------------------------------------------------------
     MOTOR: se rearma al cambiar de vista (Wheel / List).
     ------------------------------------------------------------------ */
  useEffect(() => {
    if (vista === 'list') {
      marcarActivo(null);
      return undefined;
    }

    const wheel = wheelRef.current;
    const seccion = seccionRef.current;
    if (!wheel) return undefined;

    let cfg = elegirConfig();
    let lastTime = 0;
    let nextAdvanceAt = performance.now() + CONFIG.autoplayMs;
    let pausedUntil = 0;
    let dragging = false;
    let dragState = null;
    let lastWheelAt = 0;
    let hovered = false;
    let shownIdx = -1;
    let pendingIdx = 0;
    let pendingSince = 0;
    let raf = 0;
    const readyAt = performance.now() + 900;

    /* Solicitud de la vista Lista: centrar la tarjeta elegida por el camino corto */
    if (pendienteRef.current !== null) {
      const pedido = pendienteRef.current;
      pendienteRef.current = null;
      const base = Math.round(posRef.current);
      targetRef.current = base + shortest(pedido - base, totalVideos);
    }

    const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = mqReduced.matches;
    const onReduced = (e) => {
      reduced = e.matches;
    };

    const pauseAuto = () => {
      pausedUntil = performance.now() + CONFIG.resumeMs;
    };

    /* ---------------- Render del arco ---------------- */
    const render = () => {
      const stepRad = (cfg.stepDeg * Math.PI) / 180;

      for (let i = 0; i < totalVideos; i++) {
        const card = cardsRef.current[i];
        if (!card) continue;

        const d = shortest(i - posRef.current, totalVideos); // distancia circular al centro
        const ad = Math.abs(d);

        // opacidad: 1 en el centro, se desvanece hacia los extremos
        const op = Math.max(
          0,
          Math.min(1, 1 - (ad - cfg.fadeStart) / (cfg.maxDelta - cfg.fadeStart))
        );
        const oculta = ad > cfg.maxDelta || op <= 0.002;

        if (oculta) {
          if (card.style.visibility !== 'hidden') {
            card.style.visibility = 'hidden';
            card.style.opacity = '0';
          }
          continue;
        }
        if (card.style.visibility !== 'visible') card.style.visibility = 'visible';

        const a = d * stepRad;
        const x = cfg.radius * Math.sin(a);
        const y = -cfg.radius * (1 - Math.cos(a));
        const rot = d * cfg.stepDeg;
        const scale = 1 - Math.min(ad * 0.055, 0.22);

        card.style.transform =
          'translate3d(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px,0)' +
          ' rotate(' + rot.toFixed(2) + 'deg)' +
          ' scale(' + scale.toFixed(4) + ')';
        card.style.opacity = op.toFixed(3);
        card.style.zIndex = String(200 - Math.round(ad * 20));
      }
    };

    /* ---------------- Panel de texto ---------------- */
    const applyInfo = (idx) => {
      shownIdx = idx;
      setInfo((prev) =>
        prev.cur === idx ? prev : { cur: idx, prev: prev.cur, front: 1 - prev.front }
      );
    };

    /* ---------------- Iframe: solo la central ---------------- */
    const sincronizarVideo = (now, centrado, near) => {
      // Con el reproductor abierto no se monta la vista previa: un solo iframe.
      if (reproductorRef.current) {
        if (activoRef.current !== null) marcarActivo(null);
        return;
      }
      const actual = activoRef.current;
      if (actual !== null) {
        const off = Math.abs(shortest(actual - posRef.current, totalVideos));
        if (!centrado || off > 0.001 || near !== actual) marcarActivo(null);
      }
      if (
        centrado &&
        activoRef.current === null &&
        now > readyAt &&
        !caidosRef.current[near]
      ) {
        marcarActivo(near);
      }
    };

    /* ---------------- Bucle único ---------------- */
    const tick = (now) => {
      const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
      lastTime = now;

      if (reproductorRef.current || totalVideos <= 1) {
        // Selección congelada mientras se reproduce; al cerrar espera un ciclo completo.
        nextAdvanceAt = now + CONFIG.autoplayMs;
      } else if (!reduced && now > pausedUntil && now > nextAdvanceAt) {
        targetRef.current = Math.round(targetRef.current) + 1;
        nextAdvanceAt = now + CONFIG.autoplayMs;
      }

      const dist = targetRef.current - posRef.current;
      if (Math.abs(dist) < 0.0008) {
        posRef.current = targetRef.current;
        // normaliza los contadores para que no crezcan sin fin
        if (Math.abs(posRef.current) > totalVideos * 50) {
          const k = Math.floor(posRef.current / totalVideos);
          posRef.current -= k * totalVideos;
          targetRef.current -= k * totalVideos;
        }
      } else {
        const stiff = reduced ? 30 : dragging ? CONFIG.dragStiffness : CONFIG.stiffness;
        posRef.current += dist * (1 - Math.exp(-stiff * dt));
      }

      render();

      const base = Math.round(posRef.current);
      const centrado = Math.abs(posRef.current - base) < CONFIG.settleEps;
      const near = mod(base, totalVideos);

      if (near !== pendingIdx) {
        pendingIdx = near;
        pendingSince = now;
      }
      if (pendingIdx !== shownIdx && (centrado || now - pendingSince > 120)) {
        applyInfo(pendingIdx);
      }

      sincronizarVideo(now, centrado, near);
      raf = requestAnimationFrame(tick);
    };

    /* ---------------- Acciones ---------------- */
    const irA = (i) => {
      if (!Number.isInteger(i) || i < 0 || i >= totalVideos) return;
      const base = Math.round(posRef.current);
      targetRef.current = base + shortest(i - base, totalVideos);
      pauseAuto();
    };

    const paso = (dir) => {
      targetRef.current = Math.round(targetRef.current) + dir;
      pauseAuto();
    };

    /* ---------------- Entradas ---------------- */
    const onPointerEnter = () => {
      hovered = true;
      pauseAuto();
    };
    const onPointerLeave = () => {
      hovered = false;
    };
    const onPointerHover = () => {
      if (!dragging) pauseAuto();
    };

    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // El botón «Reproducir» recibe su clic normal (sin arrastre ni pointer capture)
      if (e.target.closest && e.target.closest('[data-gxw-play]')) return;
      dragState = {
        id: e.pointerId,
        x: e.clientX,
        t: targetRef.current,
        moved: 0,
        // Con pointer capture el `click` se redirige al contenedor:
        // el tap en una tarjeta lateral se resuelve en pointerup.
        card: e.target.closest ? e.target.closest('.gxw-card') : null
      };
      dragging = true;
      wheel.classList.add('is-dragging');
      pauseAuto();
      try {
        wheel.setPointerCapture(e.pointerId);
      } catch (_) {
        /* el navegador puede rechazarlo; no es crítico */
      }
      wheel.focus({ preventScroll: true });
    };

    const onPointerMoveWin = (e) => {
      if (!dragState || e.pointerId !== dragState.id) return;
      const dx = e.clientX - dragState.x;
      dragState.moved = Math.max(dragState.moved, Math.abs(dx));
      targetRef.current = dragState.t - dx / CONFIG.dragPxPerStep; // izquierda = avanzar
      pauseAuto();
    };

    const onPointerUp = (e) => {
      if (!dragState || e.pointerId !== dragState.id) return;
      const { moved, card } = dragState;
      dragState = null;
      dragging = false;
      wheel.classList.remove('is-dragging');
      targetRef.current = Math.round(targetRef.current); // imanta a la más cercana
      pauseAuto();

      if (moved <= 6 && card) {
        const i = Number(card.dataset.index);
        if (i !== mod(Math.round(posRef.current), totalVideos)) irA(i);
      }
    };

    const onWheel = (e) => {
      e.preventDefault();
      pauseAuto();
      const now = performance.now();
      if (now - lastWheelAt < 180) return; // evita 5 saltos por un solo gesto
      lastWheelAt = now;
      targetRef.current = Math.round(targetRef.current) + (e.deltaY > 0 ? 1 : -1);
    };

    const onKeyDown = (e) => {
      if (reproductorRef.current) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) {
        return;
      }
      // Solo cuando la ruleta tiene el foco o el puntero encima:
      // así no secuestra las flechas del resto de la página.
      if (document.activeElement !== wheel && !hovered) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        paso(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        paso(-1);
      }
    };

    // Respaldo por si el navegador no aplica pointer capture
    const onClick = (e) => {
      if (e.target === wheel) return;
      if (e.target.closest && e.target.closest('[data-gxw-play]')) return;
      const card = e.target.closest ? e.target.closest('.gxw-card') : null;
      if (!card) return;
      const i = Number(card.dataset.index);
      if (i === mod(Math.round(posRef.current), totalVideos)) return;
      irA(i);
    };

    const onResize = () => {
      cfg = elegirConfig();
      render();
    };

    /* ---------------- Visibilidad: no animar fuera de pantalla ---------------- */
    let io = null;
    if (typeof IntersectionObserver !== 'undefined' && seccion) {
      io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !raf) {
            // Al volver a pantalla, el autoplay arranca de nuevo con su espera completa
            lastTime = 0;
            pausedUntil = 0;
            nextAdvanceAt = performance.now() + CONFIG.autoplayMs;
            raf = requestAnimationFrame(tick);
          } else if (!entry.isIntersecting && raf) {
            cancelAnimationFrame(raf);
            raf = 0;
          }
        },
        { threshold: 0.05 }
      );
      io.observe(seccion);
    }

    wheel.addEventListener('pointerenter', onPointerEnter);
    wheel.addEventListener('pointerleave', onPointerLeave);
    wheel.addEventListener('pointermove', onPointerHover, { passive: true });
    wheel.addEventListener('pointerdown', onPointerDown);
    wheel.addEventListener('wheel', onWheel, { passive: false });
    wheel.addEventListener('click', onClick);
    window.addEventListener('pointermove', onPointerMoveWin, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize, { passive: true });
    if (mqReduced.addEventListener) mqReduced.addEventListener('change', onReduced);

    render();
    if (!io) raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (io) io.disconnect();
      wheel.classList.remove('is-dragging');
      wheel.removeEventListener('pointerenter', onPointerEnter);
      wheel.removeEventListener('pointerleave', onPointerLeave);
      wheel.removeEventListener('pointermove', onPointerHover);
      wheel.removeEventListener('pointerdown', onPointerDown);
      wheel.removeEventListener('wheel', onWheel);
      wheel.removeEventListener('click', onClick);
      window.removeEventListener('pointermove', onPointerMoveWin);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      if (mqReduced.removeEventListener) mqReduced.removeEventListener('change', onReduced);
      marcarActivo(null);
    };
  }, [vista, marcarActivo, totalVideos]);

  /* ==================================================================
     REPRODUCTOR: apertura y cierre
     ================================================================== */
  const indiceCentral = () => mod(Math.round(posRef.current), totalVideos);
  const mediaDeTarjeta = (i) => {
    const card = cardsRef.current[i];
    if (!card || card.style.visibility !== 'visible') return null;
    return card.querySelector('.gxw-card__media');
  };

  const abrirReproductor = useCallback(
    ({ video, indice = null, inicio = 0, origen, opener = null, origenEl = null }) => {
      const actual = reproductorRef.current;
      if (actual && actual.fase === 'cerrando') return;
      const seg = Math.max(0, Math.floor(Number(inicio) || 0));
      openerRef.current = opener;

      // Ya hay uno abierto: se reutiliza el mismo reproductor (un solo iframe)
      if (actual) {
        setReproductor((prev) =>
          prev && { ...prev, video, indice, inicio: seg, origen, frameN: prev.frameN + 1, haloNeutro: false }
        );
        return;
      }

      const volverALista = origen === 'lista' || vista === 'list';
      if (origen === 'lista' && indice !== null) {
        // La Lista fija la selección del carrusel en el video elegido (comportamiento previo)
        const base = Math.round(posRef.current);
        const t = base + shortest(indice - base, totalVideos);
        posRef.current = t;
        targetRef.current = t;
        setInfo((prev) => (prev.cur === indice ? prev : { cur: indice, prev: prev.cur, front: 1 - prev.front }));
      }
      if (vista === 'list') setVista('wheel');

      tokenRef.current += 1;
      const nuevo = {
        video,
        indice,
        inicio: seg,
        origen,
        volverALista,
        fase: 'abriendo',
        desde: prefiereMenosMovimiento() ? null : rectVisible(origenEl),
        fijo: null,
        token: tokenRef.current,
        frameN: 0,
        haloNeutro: indice !== null && Boolean(fallidos[indice])
      };
      reproductorRef.current = nuevo; // el motor se congela en el mismo frame
      setReproductor(nuevo);
    },
    [vista, fallidos, setReproductor]
  );

  const cerrarReproductor = useCallback(() => {
    const actual = reproductorRef.current;
    if (!actual || actual.fase === 'cerrando') return;
    // Rect visual actual (incluye una apertura a medias) antes de cancelarla
    const fijo = shellRef.current ? shellRef.current.getBoundingClientRect() : null;
    if (animRef.current) {
      animRef.current.cancel();
      animRef.current = null;
    }
    if (actual.volverALista) setVista('list');
    setReproductor((prev) => prev && { ...prev, fase: 'cerrando', fijo });
  }, [setReproductor]);

  const cerrarInmediato = useCallback(() => {
    if (animRef.current) {
      animRef.current.cancel();
      animRef.current = null;
    }
    openerRef.current = null;
    reproductorRef.current = null;
    setReproductor(null);
  }, [setReproductor]);

  const faseReproductor = reproductor ? reproductor.fase : null;
  const claveFase = reproductor ? `${reproductor.token}:${reproductor.fase}` : '';

  useLayoutEffect(() => {
    const r = reproductorRef.current;
    const shell = shellRef.current;
    if (!r || !shell) return undefined;
    const halo = haloRef.current;
    const reducido = prefiereMenosMovimiento();
    let anim = null;

    if (r.fase === 'abriendo') {
      const fin = shell.getBoundingClientRect();
      if (r.desde && !reducido && fin.width) {
        anim = shell.animate(
          [{ transform: transformEntre(r.desde, fin) }, { transform: 'none' }],
          { duration: DURACION_PLAYER, easing: EASE_PLAYER }
        );
        if (halo) {
          halo.animate(
            [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'scale(1)' }],
            { duration: DURACION_PLAYER, easing: EASE_PLAYER }
          );
        }
      } else {
        // Miniatura no visible o movimiento reducido: fundido breve
        if (r.origen === 'chat' && !rectVisible(shell)) {
          shell.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
        anim = shell.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
      }
      anim.onfinish = () => {
        animRef.current = null;
        setReproductor((prev) =>
          prev && prev.token === r.token && prev.fase === 'abriendo' ? { ...prev, fase: 'abierto' } : prev
        );
      };
    } else if (r.fase === 'cerrando') {
      let destino = null;
      if (!reducido && r.indice !== null) {
        if (r.origen === 'lista') {
          destino = rectVisible(listThumbsRef.current[r.indice]);
        } else if (r.indice === indiceCentral()) {
          destino = rectVisible(mediaDeTarjeta(r.indice));
        }
      }
      const desde = r.fijo;
      if (destino && desde && desde.width) {
        anim = shell.animate(
          [{ transform: 'none' }, { transform: transformEntre(destino, desde) }],
          { duration: DURACION_PLAYER, easing: EASE_PLAYER, fill: 'forwards' }
        );
        if (halo) {
          halo.animate(
            [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.7)' }],
            { duration: DURACION_PLAYER, easing: EASE_PLAYER, fill: 'forwards' }
          );
        }
      } else {
        anim = shell.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
      }
      anim.onfinish = () => {
        animRef.current = null;
        reproductorRef.current = null;
        setReproductor(null);
        const opener = openerRef.current;
        openerRef.current = null;
        requestAnimationFrame(() => {
          if (opener && opener.isConnected) opener.focus();
        });
      };
    }

    animRef.current = anim;
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claveFase, setReproductor]);

  /* Escape cierra; el foco pasa a «Cerrar video» al terminar de abrir */
  useEffect(() => {
    if (!faseReproductor || faseReproductor === 'cerrando') return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cerrarReproductor();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [faseReproductor, cerrarReproductor]);

  useEffect(() => {
    if (faseReproductor === 'abierto' && cerrarBtnRef.current) {
      cerrarBtnRef.current.focus({ preventScroll: true });
    }
  }, [faseReproductor]);

  /* Si el embed no carga en 12 s se ofrece el enlace a YouTube */
  const claveFrame = reproductor && reproductor.fase === 'abierto' ? `${reproductor.token}:${reproductor.frameN}` : '';
  useEffect(() => {
    if (!claveFrame) return undefined;
    setFrameEstado('cargando');
    const t = setTimeout(() => setFrameEstado((s) => (s === 'listo' ? s : 'error')), 12000);
    return () => clearTimeout(t);
  }, [claveFrame]);

  const abrirDesdeCarrusel = (i, opener) => {
    const vid = videosLista[i];
    if (!vid) return;
    abrirReproductor({
      video: vid,
      indice: i,
      origen: 'carrusel',
      opener,
      origenEl: i === indiceCentral() ? mediaDeTarjeta(i) : null
    });
  };

  const abrirDesdeLista = (i, opener) => {
    const vid = videosLista[i];
    if (!vid) return;
    abrirReproductor({
      video: vid,
      indice: i,
      origen: 'lista',
      opener,
      origenEl: listThumbsRef.current[i]
    });
  };

  const abrirDesdeChat = (videoObj, inicioSeg = 0, opener = null) => {
    if (!videoObj || !videoObj.id) return;
    const i = videosLista.findIndex((v) => v.id === videoObj.id);
    const indice = i >= 0 ? i : null;
    const visible = indice !== null && vista === 'wheel' && indice === indiceCentral();
    abrirReproductor({
      video: indice !== null ? videosLista[indice] : videoObj,
      indice,
      inicio: inicioSeg || 0,
      origen: 'chat',
      opener,
      origenEl: visible ? mediaDeTarjeta(indice) : null
    });
  };

  /* ---------------- Derivados para el render ---------------- */
  const indiceSeg = Math.min(info.cur, Math.max(0, totalVideos - 1));
  const vActual = videosLista[indiceSeg];
  const vAnterior = info.prev === null || info.prev >= totalVideos ? null : videosLista[info.prev];
  const capa0 = info.front === 0 ? vActual : vAnterior;
  const capa1 = info.front === 1 ? vActual : vAnterior;
  const idx0 = info.front === 0 ? indiceSeg : info.prev;
  const idx1 = info.front === 1 ? indiceSeg : info.prev;
  const ghostPrev = totalVideos > 1 ? videosLista[mod(indiceSeg - 1, totalVideos)].titulo : '';
  const ghostNext = totalVideos > 1 ? videosLista[mod(indiceSeg + 1, totalVideos)].titulo : '';

  const hayReproductor = Boolean(reproductor);
  const posterReproductor = reproductor
    ? reproductor.video.poster || miniatura(reproductor.video.id)
    : null;

  const poster0 = capa0 ? capa0.poster || miniatura(capa0.id) : null;
  const poster1 = capa1 ? capa1.poster || miniatura(capa1.id) : null;
  const neutro0 = idx0 !== null && idx0 !== undefined && Boolean(fallidos[idx0]);
  const neutro1 = idx1 !== null && idx1 !== undefined && Boolean(fallidos[idx1]);
  const ambientReproductorActivo = hayReproductor && reproductor.fase !== 'cerrando';

  const claseStage = [
    'gxw__stage',
    vista === 'list' && !hayReproductor ? 'is-hidden' : '',
    hayReproductor ? 'has-player' : '',
    hayReproductor && reproductor.fase !== 'cerrando' ? 'is-playing' : '',
    reproductor && reproductor.fase === 'cerrando' && reproductor.volverALista ? 'is-retorno-lista' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const cambiarVista = (v) => {
    if (reproductorRef.current) cerrarInmediato();
    setVista(v);
  };

  return (
    <section className={`gxw ${hayReproductor ? 'has-player' : ''}`} ref={seccionRef} aria-labelledby="gxw-titulo">
      {/* ---------------- Fondo ambiental dinámico (cambia junto al video) ---------------- */}
      <div className="gxw__ambient" aria-hidden="true">
        {poster0 && !neutro0 && (
          <div
            className={`gxw__ambient-layer ${info.front === 0 && !ambientReproductorActivo ? 'is-on' : ''}`}
            style={{ backgroundImage: `url("${poster0}")` }}
          />
        )}
        {poster1 && !neutro1 && (
          <div
            className={`gxw__ambient-layer ${info.front === 1 && !ambientReproductorActivo ? 'is-on' : ''}`}
            style={{ backgroundImage: `url("${poster1}")` }}
          />
        )}
        {posterReproductor && !reproductor.haloNeutro && (
          <div
            className={`gxw__ambient-layer gxw__ambient-layer--player ${ambientReproductorActivo ? 'is-on' : ''}`}
            style={{ backgroundImage: `url("${posterReproductor}")` }}
          />
        )}
        <div className="gxw__ambient-scrim" />
      </div>

      {/* ---------------- HUD superior ---------------- */}
      <header className="gxw__hud gxw__hud--top">
        <div className="gxw__hud-group">
          <div className="gxw__switch" role="group" aria-label="Cambiar vista">
            <button
              type="button"
              className={`gxw__switch-btn ${vista === 'wheel' ? 'is-active' : ''}`}
              aria-pressed={vista === 'wheel'}
              onClick={() => cambiarVista('wheel')}
            >
              Wheel
            </button>
            <span className="gxw__switch-slash" aria-hidden="true">
              /
            </span>
            <button
              type="button"
              className={`gxw__switch-btn ${vista === 'list' ? 'is-active' : ''}`}
              aria-pressed={vista === 'list'}
              onClick={() => cambiarVista('list')}
            >
              List
            </button>
          </div>
          <button
            type="button"
            className="gxw__refresh"
            onClick={() => actualizarVideosEnVivo({ automatico: false })}
            disabled={actualizandoVideos}
            aria-label="Actualizar videos desde YouTube"
          >
            {actualizandoVideos ? 'Actualizando…' : '↻ Actualizar videos'}
          </button>
        </div>
        <h2 className="gxw__mark" id="gxw-titulo">
          Recomendación
          <br />
          de videos
        </h2>
      </header>

      {/* ---------------- Chat de búsqueda arriba del carrusel (PetSearch) ---------------- */}
      <div className="gxw-chat-wrap">
        <div className="gxw-chat" role="search" aria-label="Buscar videos sobre tu mascota">
          <div className="gxw-chat__head">
            <h3 className="gxw-chat__title">¿Qué quieres aprender sobre tu mascota?</h3>
            <div className="gxw-chat__badges">
              {busquedaActiva && (
                <button type="button" className="gxw-chat__reset" onClick={restablecerCatalogo}>
                  Ver selección inicial ({catalogoBase.length})
                </button>
              )}
              <span className="gxw-chat__badge">
                {modoDemo ? 'Demostración' : 'Gemini IA'}
              </span>
            </div>
          </div>

          <form
            className="gxw-chat__form"
            onSubmit={(e) => {
              e.preventDefault();
              buscarVideoConGemini();
            }}
          >
            <input
              type="text"
              className="gxw-chat__input"
              value={consultaGemini}
              onChange={(e) => setConsultaGemini(e.target.value)}
              placeholder="Escribe tu pregunta…"
              aria-label="Escribe tu pregunta sobre tu mascota"
            />
            <button type="submit" className="gxw-chat__btn" disabled={buscandoGemini}>
              {buscandoGemini ? 'Buscando…' : 'Buscar'}
            </button>
          </form>

          <div className="gxw-chat__sugerencias" aria-label="Sugerencias para empezar">
            <span className="gxw-chat__sug-label">Sugerencias:</span>
            <button
              type="button"
              className="gxw-chat__chip"
              onClick={() => buscarVideoConGemini('Juegos para mi perro en casa')}
            >
              Juegos para mi perro en casa
            </button>
            <button
              type="button"
              className="gxw-chat__chip"
              onClick={() => buscarVideoConGemini('Cómo acostumbrar a mi gato a la transportadora')}
            >
              Cómo acostumbrar a mi gato a la transportadora
            </button>
          </div>

          {mensajesChat.length > 0 && (
            <div className="gxw-chat__log" aria-live="polite">
              {mensajesChat.map((m) => (
                <div
                  key={m.id}
                  className={`gxw-chat__msg ${m.rol === 'usuario' ? 'is-user' : 'is-bot'}`}
                >
                  <p className="gxw-chat__text">{m.texto}</p>

                  {m.esEmergencia && (
                    <p className="gxw-chat__alerta">
                      Atención veterinaria recomendada: 9-1-1 &bull; Hospital UNA: 2277-3600
                    </p>
                  )}

                  {m.videoPrincipal && (
                    <div className="gxw-chat__actions">
                      <button
                        type="button"
                        className="gxw-chat__ver"
                        onClick={(e) =>
                          abrirDesdeChat(
                            m.videoPrincipal,
                            m.fragmento ? m.fragmento.inicio : 0,
                            e.currentTarget
                          )
                        }
                      >
                        <span aria-hidden="true">▶</span>{' '}
                        {m.fragmento && m.fragmento.inicio > 0
                          ? `Ver desde ${formatoTiempo(m.fragmento.inicio)}`
                          : 'Ver video'}
                      </button>
                      <span className="gxw-chat__vidname">{m.videoPrincipal.titulo}</span>
                    </div>
                  )}

                  {m.sinCoincidencias && m.temasSugeridos && (
                    <div className="gxw-chat__temas">
                      {m.temasSugeridos.map((tema) => (
                        <button
                          key={tema}
                          type="button"
                          className="gxw-chat__chip"
                          onClick={() => buscarVideoConGemini(tema)}
                        >
                          {tema}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---------------- Escenario ---------------- */}
      <div className={claseStage} aria-hidden={vista === 'list' && !hayReproductor}>
        <div className="gxw__wheelwrap">
          <div
            className="gxw__wheel"
            ref={wheelRef}
            tabIndex={hayReproductor ? -1 : 0}
            role="group"
            aria-hidden={hayReproductor}
            aria-label="Ruleta infinita de videos. Arrastra, usa la rueda del ratón o las flechas del teclado."
          >
            {videosLista.map((video, i) => {
              const caido = Boolean(fallidos[i] || videoCaido[i]);
              const vivo = videoActivo === i && frameListo === i;
              const central = i === indiceSeg;

              return (
                <article
                  key={video.id}
                  ref={(el) => {
                    cardsRef.current[i] = el;
                  }}
                  className={`gxw-card ${caido ? 'is-failed' : ''} ${vivo ? 'is-live' : ''} ${central ? 'is-center' : ''}`}
                  data-index={i}
                  aria-label={`${video.titulo}, ${video.anio}`}
                >
                  <div className="gxw-card__media">
                    <img
                      className="gxw-card__thumb"
                      src={miniatura(video.id)}
                      alt=""
                      decoding="async"
                      loading="lazy"
                      draggable={false}
                      onError={() => marcarFallido(i)}
                    />
                    <div className="gxw-card__fallback">
                      <strong>{video.titulo}</strong>
                      <em>Video no disponible</em>
                    </div>
                    <div className="gxw-card__shade" aria-hidden="true" />
                    {videoActivo === i && !videoCaido[i] && (
                      <iframe
                        key={video.id}
                        className={`gxw-card__frame ${frameListo === i ? 'is-ready' : ''}`}
                        src={urlEmbed(video.id)}
                        title={video.titulo}
                        tabIndex={-1}
                        referrerPolicy="strict-origin-when-cross-origin"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        onLoad={() => {
                          frameListoRef.current = true;
                          setFrameListo(i);
                        }}
                        onError={() => marcarVideoCaido(i)}
                      />
                    )}
                    <button
                      type="button"
                      data-gxw-play
                      className="gxw-card__play"
                      tabIndex={central && !hayReproductor ? 0 : -1}
                      aria-hidden={!central}
                      aria-label={`Reproducir ${video.titulo}`}
                      onClick={(e) => abrirDesdeCarrusel(i, e.currentTarget)}
                    >
                      <span aria-hidden="true">▶</span> Reproducir
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* ---------------- Reproductor único ---------------- */}
          {reproductor && (
            <>
              <div
                ref={shellRef}
                className={`gxw-player ${reproductor.fase === 'cerrando' ? 'is-fijo' : ''}`}
                style={
                  reproductor.fase === 'cerrando' && reproductor.fijo
                    ? {
                        left: reproductor.fijo.left,
                        top: reproductor.fijo.top,
                        width: reproductor.fijo.width,
                        height: reproductor.fijo.height
                      }
                    : undefined
                }
                role="region"
                aria-label={`Reproductor: ${reproductor.video.titulo}`}
              >
                <div
                  ref={haloRef}
                  className={`gxw-player__halo ${reproductor.haloNeutro ? 'is-neutro' : ''}`}
                  style={reproductor.haloNeutro ? undefined : { backgroundImage: `url("${posterReproductor}")` }}
                  aria-hidden="true"
                />
                <div className="gxw-player__media">
                  <img
                    className="gxw-player__poster"
                    src={posterReproductor}
                    alt=""
                    draggable={false}
                    onError={() => setReproductor((p) => p && { ...p, haloNeutro: true })}
                  />
                  {reproductor.fase === 'abierto' && (
                    <iframe
                      key={`${reproductor.video.id}:${reproductor.inicio}:${reproductor.frameN}`}
                      className={`gxw-player__frame ${frameEstado === 'listo' ? 'is-ready' : ''}`}
                      src={urlReproductor(reproductor.video.id, reproductor.inicio)}
                      title={reproductor.video.titulo}
                      referrerPolicy="strict-origin-when-cross-origin"
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                      onLoad={() => setFrameEstado('listo')}
                      onError={() => setFrameEstado('error')}
                    />
                  )}
                  {reproductor.fase === 'abierto' && frameEstado === 'error' && (
                    <div className="gxw-player__error" role="alert">
                      <p>No se pudo reproducir el video aquí.</p>
                      <a
                        href={urlYouTube(reproductor.video.id, reproductor.inicio)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver en YouTube ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
              {reproductor.fase !== 'cerrando' && (
                <div className={`gxw-player__bar ${reproductor.fase === 'abierto' ? 'is-on' : ''}`}>
                  <a
                    className="gxw-player__yt"
                    href={urlYouTube(reproductor.video.id, reproductor.inicio)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir en YouTube ↗
                  </a>
                  <button
                    ref={cerrarBtnRef}
                    type="button"
                    className="gxw-player__close"
                    onClick={cerrarReproductor}
                  >
                    <span aria-hidden="true">✕</span> Cerrar video
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ---------------- Panel de texto (limpio, sin superposición) ---------------- */}
        <aside className={`gxw-info ${hayReproductor ? 'is-playing' : ''}`}>
          <p className="gxw-info__label">
            <span className="gxw-info__dot" aria-hidden="true" /> Video Seleccionado
          </p>
          <div className="gxw-info__swap">
            <div className="gxw-info__layer is-on">
              <PanelInfo
                video={reproductor ? reproductor.video : vActual}
                indice={reproductor ? reproductor.indice : indiceSeg}
                total={totalVideos}
              />
            </div>
          </div>
          {!reproductor && (
            <button
              type="button"
              className="gxw-info__ver"
              onClick={(e) => abrirDesdeCarrusel(indiceSeg, e.currentTarget)}
            >
              <span aria-hidden="true">▶</span> Ver video
            </button>
          )}
        </aside>
      </div>

      {/* ---------------- HUD inferior ---------------- */}
      <footer className={`gxw__hud gxw__hud--bottom`} aria-hidden={vista === 'list'}>
        <div className="gxw__counter" aria-hidden="true">
          <span className="gxw__counter-cur">{pad(indiceSeg + 1)}</span>
          <span className="gxw__counter-slash">/</span>
          <span className="gxw__counter-total">{pad(totalVideos)}</span>
        </div>
        <div className="gxw__scrollhint" aria-hidden="true">
          <span className="gxw__scrollhint-line" />
          <span>Scroll</span>
        </div>
      </footer>

      {/* ---------------- Vista lista ---------------- */}
      <section className={`gxw__list ${vista === 'list' ? 'is-open' : ''}`} aria-hidden={vista !== 'list'}>
        <div className="gxw__list-grid">
          {videosLista.map((video, i) => (
            <button
              key={video.id}
              type="button"
              className={`gxw-list__item ${fallidos[i] ? 'is-failed' : ''}`}
              aria-label={`Ver video: ${video.titulo}`}
              tabIndex={vista === 'list' ? 0 : -1}
              onClick={(e) => abrirDesdeLista(i, e.currentTarget)}
            >
              <div
                className="gxw-list__thumb"
                ref={(el) => {
                  listThumbsRef.current[i] = el;
                }}
              >
                <img
                  src={miniatura(video.id)}
                  alt=""
                  decoding="async"
                  loading="lazy"
                  onError={() => marcarFallido(i)}
                />
                <div className="gxw-list__fallback">{video.titulo}</div>
                <span className="gxw-list__ver" aria-hidden="true">▶ Ver video</span>
              </div>
              <div className="gxw-list__meta">
                <span className="gxw-list__name">{limpiarTituloVideo(video.titulo)}</span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
