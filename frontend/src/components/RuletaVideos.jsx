import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { VIDEOS_RULETA } from '../data/videosRuleta';
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

const N = VIDEOS_RULETA.length;

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

/* Diferencia circular más corta: valor en (-N/2, N/2] */
function shortest(v) {
  let d = mod(v, N);
  if (d > N / 2) d -= N;
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

function PanelInfo({ video, indice }) {
  if (!video) return null;
  return (
    <>
      <h2 className="gxw-info__title">{video.titulo}</h2>
      <div className="gxw-info__year">{video.anio}</div>
      <p className="gxw-info__cat">
        {video.categoria} — {pad(indice + 1)}/{pad(N)}
      </p>
    </>
  );
}

export function RuletaVideos() {
  const [vista, setVista] = useState('wheel');
  const [info, setInfo] = useState({ cur: 0, prev: null, front: 0 });
  const [fallidos, setFallidos] = useState({});
  const [videoCaido, setVideoCaido] = useState({});
  const [videoActivo, setVideoActivo] = useState(null);
  const [frameListo, setFrameListo] = useState(null);

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
      targetRef.current = base + shortest(pedido - base);
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

      for (let i = 0; i < N; i++) {
        const card = cardsRef.current[i];
        if (!card) continue;

        const d = shortest(i - posRef.current); // distancia circular al centro
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
      const actual = activoRef.current;
      if (actual !== null) {
        const off = Math.abs(shortest(actual - posRef.current));
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

      if (!reduced && now > pausedUntil && now > nextAdvanceAt) {
        targetRef.current = Math.round(targetRef.current) + 1;
        nextAdvanceAt = now + CONFIG.autoplayMs;
      }

      const dist = targetRef.current - posRef.current;
      if (Math.abs(dist) < 0.0008) {
        posRef.current = targetRef.current;
        // normaliza los contadores para que no crezcan sin fin
        if (Math.abs(posRef.current) > N * 50) {
          const k = Math.floor(posRef.current / N);
          posRef.current -= k * N;
          targetRef.current -= k * N;
        }
      } else {
        const stiff = reduced ? 30 : dragging ? CONFIG.dragStiffness : CONFIG.stiffness;
        posRef.current += dist * (1 - Math.exp(-stiff * dt));
      }

      render();

      const base = Math.round(posRef.current);
      const centrado = Math.abs(posRef.current - base) < CONFIG.settleEps;
      const near = mod(base, N);

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
      if (!Number.isInteger(i) || i < 0 || i >= N) return;
      const base = Math.round(posRef.current);
      targetRef.current = base + shortest(i - base);
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
        if (i !== mod(Math.round(posRef.current), N)) irA(i);
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
      const card = e.target.closest ? e.target.closest('.gxw-card') : null;
      if (!card) return;
      const i = Number(card.dataset.index);
      if (i === mod(Math.round(posRef.current), N)) return;
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
  }, [vista, marcarActivo]);

  /* ---------------- Derivados para el render ---------------- */
  const vActual = VIDEOS_RULETA[info.cur];
  const vAnterior = info.prev === null ? null : VIDEOS_RULETA[info.prev];
  const capa0 = info.front === 0 ? vActual : vAnterior;
  const capa1 = info.front === 1 ? vActual : vAnterior;
  const idx0 = info.front === 0 ? info.cur : info.prev;
  const idx1 = info.front === 1 ? info.cur : info.prev;
  const ghostPrev = VIDEOS_RULETA[mod(info.cur - 1, N)].titulo;
  const ghostNext = VIDEOS_RULETA[mod(info.cur + 1, N)].titulo;

  return (
    <section className="gxw" ref={seccionRef} aria-labelledby="gxw-titulo">
      {/* ---------------- HUD superior ---------------- */}
      <header className="gxw__hud gxw__hud--top">
        <div className="gxw__hud-group">
          <div className="gxw__switch" role="group" aria-label="Cambiar vista">
            <button
              type="button"
              className={`gxw__switch-btn ${vista === 'wheel' ? 'is-active' : ''}`}
              aria-pressed={vista === 'wheel'}
              onClick={() => setVista('wheel')}
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
              onClick={() => setVista('list')}
            >
              List
            </button>
          </div>
        </div>
        <h2 className="gxw__mark" id="gxw-titulo">
          Recomendación
          <br />
          de videos
        </h2>
      </header>

      {/* ---------------- Escenario ---------------- */}
      <div className={`gxw__stage ${vista === 'list' ? 'is-hidden' : ''}`} aria-hidden={vista === 'list'}>
        <div className="gxw__wheelwrap">
          <div
            className="gxw__wheel"
            ref={wheelRef}
            tabIndex={0}
            role="group"
            aria-label="Ruleta infinita de videos. Arrastra, usa la rueda del ratón o las flechas del teclado."
          >
            {VIDEOS_RULETA.map((video, i) => {
              const caido = Boolean(fallidos[i] || videoCaido[i]);
              const vivo = videoActivo === i && frameListo === i;

              return (
                <article
                  key={video.id}
                  ref={(el) => {
                    cardsRef.current[i] = el;
                  }}
                  className={`gxw-card ${caido ? 'is-failed' : ''} ${vivo ? 'is-live' : ''}`}
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
                    <div className="gxw-card__tag" aria-hidden="true">
                      <b>{video.categoria}</b>
                      <span>{video.anio}</span>
                    </div>
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
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* ---------------- Panel de texto ---------------- */}
        <aside className="gxw-info">
          <p className="gxw-info__label">
            <span className="gxw-info__dot" aria-hidden="true" /> Now showing
          </p>
          <p className="gxw-info__ghost">{ghostPrev}</p>
          <div className="gxw-info__swap">
            <div className={`gxw-info__layer ${info.front === 0 ? 'is-on' : ''}`} aria-hidden={info.front !== 0}>
              <PanelInfo video={capa0} indice={idx0} />
            </div>
            <div className={`gxw-info__layer ${info.front === 1 ? 'is-on' : ''}`} aria-hidden={info.front !== 1}>
              <PanelInfo video={capa1} indice={idx1} />
            </div>
          </div>
          <p className="gxw-info__ghost">{ghostNext}</p>
        </aside>
      </div>

      {/* ---------------- HUD inferior ---------------- */}
      <footer className={`gxw__hud gxw__hud--bottom`} aria-hidden={vista === 'list'}>
        <div className="gxw__counter" aria-hidden="true">
          <span className="gxw__counter-cur">{pad(info.cur + 1)}</span>
          <span className="gxw__counter-slash">/</span>
          <span className="gxw__counter-total">{pad(N)}</span>
        </div>
        <div className="gxw__scrollhint" aria-hidden="true">
          <span className="gxw__scrollhint-line" />
          <span>Scroll</span>
        </div>
      </footer>

      {/* ---------------- Vista lista ---------------- */}
      <section className={`gxw__list ${vista === 'list' ? 'is-open' : ''}`} aria-hidden={vista !== 'list'}>
        <div className="gxw__list-grid">
          {VIDEOS_RULETA.map((video, i) => (
            <button
              key={video.id}
              type="button"
              className={`gxw-list__item ${fallidos[i] ? 'is-failed' : ''}`}
              onClick={() => {
                pendienteRef.current = i;
                setVista('wheel');
              }}
            >
              <div className="gxw-list__thumb">
                <img
                  src={miniatura(video.id)}
                  alt=""
                  decoding="async"
                  loading="lazy"
                  onError={() => marcarFallido(i)}
                />
                <div className="gxw-list__fallback">{video.titulo}</div>
              </div>
              <div className="gxw-list__meta">
                <span className="gxw-list__name">{video.titulo}</span>
                <span className="gxw-list__year">{video.anio}</span>
              </div>
              <div className="gxw-list__cat">{video.categoria}</div>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
