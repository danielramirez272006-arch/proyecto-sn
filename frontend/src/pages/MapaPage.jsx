import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useReducedMotion } from 'motion/react';
import { TERRAZAS } from '../data/terrazas';
import { PageWrapper } from '../components/PageWrapper';
import { useTelemetria } from '../hooks/useTelemetria';
import { useTema } from '../context/TemaContext';
import { useIdioma } from '../context/IdiomaContext';
import {
  MapPin,
  Volume2,
  Thermometer,
  Compass,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
  Search,
  Layers,
  Navigation,
  AlertTriangle,
  X
} from 'lucide-react';
import { obtenerTokensMapa } from '../features/mapa/temaMapa';
import {
  adaptarTerrazaDemo,
  adaptarLugarExterno,
  filtrarLugares,
  ordenarLugares
} from '../features/mapa/adaptadorLugares';
import { ListaLugaresMapa } from '../features/mapa/ListaLugaresMapa';
import { PanelDetalleLugar } from '../features/mapa/PanelDetalleLugar';
import { PanelInferiorMovil } from '../features/mapa/PanelInferiorMovil';
import { geolocalizacionPermitida } from '../shared/utils/cookie-consent';

const CENTRO_GAM = { lat: 9.9352, lng: -84.0695 };

const COORDENADAS_TERRAZAS = {
  'franco-cafe': { lat: 9.9355, lng: -84.0652, barrio: 'Barrio Escalante' },
  'arbol-de-seda': { lat: 9.9371, lng: -84.0631, barrio: 'Barrio Escalante' },
  apotecario: { lat: 9.9324, lng: -84.0706, barrio: 'Barrio California' },
  'cafe-miel': { lat: 9.9383, lng: -84.0757, barrio: 'Barrio Amón / Otoya' }
};

const CORREDORES_VERDES = [
  {
    id: 'corredor-espana',
    nombre: 'Arboleda Parque España',
    zona: 'Barrio Amón / Otoya (Demo)',
    lat: 9.936,
    lng: -84.0754,
    decibelios: 45,
    sombra: '90%',
    detalle: 'Sendero arbolado de referencia en el prototipo.'
  },
  {
    id: 'corredor-nacional',
    nombre: 'Circuito Parque Nacional',
    zona: 'Estación / California (Demo)',
    lat: 9.9333,
    lng: -84.0701,
    decibelios: 48,
    sombra: '88%',
    detalle: 'Caminos amplios sombreados de referencia en el prototipo.'
  },
  {
    id: 'corredor-francia',
    nombre: 'Paseo Parque Francia',
    zona: 'Barrio Escalante (Demo)',
    lat: 9.9358,
    lng: -84.066,
    decibelios: 42,
    sombra: '95%',
    detalle: 'Corredor peatonal tranquilo de referencia en el prototipo.'
  }
];

const PUNTOS_CALIENTES = [
  {
    id: 'hot-avenida2',
    nombre: 'Cruce Av. 2 / Calle 23',
    zona: 'Asfalto Expuesto (Demo)',
    lat: 9.9311,
    lng: -84.0714,
    temp: '32.4 °C',
    alerta: 'Referencia demo: evitar horas pico sin sombra por calor en acera.'
  },
  {
    id: 'hot-calle33',
    nombre: 'Rotonda Fuente de la Hispanidad',
    zona: 'San Pedro / Escalante (Demo)',
    lat: 9.9325,
    lng: -84.0545,
    temp: '29.8 °C',
    alerta: 'Referencia demo: preferir acera con cobertura de árboles.'
  }
];

const FILTROS_INICIALES = {
  soloPermitidos: false,
  conTerraza: false,
  soloTranquilos: false,
  incluirDesconocidos: true
};

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function crearPinLugarHtml(lugar, seleccionado, esClaro, reducedMotion) {
  const bg = seleccionado ? '#501228' : esClaro ? '#FFFFFF' : '#111827';
  const text = seleccionado ? '#FFFFFF' : esClaro ? '#0F172A' : '#F8FAFC';
  const border = seleccionado ? '#F9A8B8' : esClaro ? '#64748B' : '#94A3B8';
  const dot =
    lugar.petStatus === 'permitido'
      ? '#10B981'
      : lugar.petStatus === 'no_permitido'
      ? '#F43F5E'
      : '#F59E0B';
  const halo = seleccionado
    ? '0 0 0 4px rgba(242,123,145,0.35), 0 8px 18px rgba(0,0,0,0.3)'
    : '0 4px 12px rgba(0,0,0,0.22)';
  const scale = seleccionado && !reducedMotion ? 'scale(1.07)' : 'scale(1)';

  return `
    <div style="
      display:inline-flex;align-items:center;gap:6px;
      padding:5px 10px;border-radius:9999px;
      background:${bg};color:${text};
      border:1.5px solid ${border};
      box-shadow:${halo};
      font-family:system-ui,-apple-system,sans-serif;
      white-space:nowrap;transform:translate(-50%,-50%) ${scale};
      transition:${reducedMotion ? 'none' : 'transform 160ms ease, box-shadow 160ms ease'};
      cursor:pointer;
    ">
      <span style="width:8px;height:8px;border-radius:9999px;background:${dot};flex-shrink:0;"></span>
      <span style="font-size:11px;font-weight:700;">${escapeHtml(lugar.nombre)}</span>
    </div>
  `;
}

export function MapaPage() {
  const telemetria = useTelemetria();
  const { tema } = useTema();
  const { t } = useIdioma();
  const tokens = useMemo(() => obtenerTokensMapa(tema), [tema]);
  const prefersReducedMotion = useReducedMotion();

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userLayerRef = useRef(null);
  const triggerDetalleRef = useRef(null);
  const programmaticMoveRef = useRef(false);
  const userInteractingRef = useRef(false);
  const abortControllerRef = useRef(null);

  const [esEscritorio, setEsEscritorio] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [busquedaInput, setBusquedaInput] = useState('');
  const [busquedaDebounced, setBusquedaDebounced] = useState('');
  const [cargandoBusqueda, setCargandoBusqueda] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_INICIALES);
  const [orden, setOrden] = useState('relevancia');

  // Capas independientes del mapa (separadas de filtros de restaurantes)
  const [mostrarRutasVerdes, setMostrarRutasVerdes] = useState(true);
  const [mostrarRiesgoPodal, setMostrarRiesgoPodal] = useState(true);

  const [lugarSeleccionado, setLugarSeleccionado] = useState(null);
  const [elementoInfo, setElementoInfo] = useState(null);
  const [panelMovilExpandido, setPanelMovilExpandido] = useState(false);
  const [leyendaMovilAbierta, setLeyendaMovilAbierta] = useState(false);

  const [lugaresExternosRaw, setLugaresExternosRaw] = useState([]);
  const [zonaModificadaPorUsuario, setZonaModificadaPorUsuario] = useState(false);
  const [mensajeZonaKey, setMensajeZonaKey] = useState('');

  const [ubicacionUsuario, setUbicacionUsuario] = useState(null);
  const [estadoGps, setEstadoGps] = useState('idle');
  const [zoomActual, setZoomActual] = useState(15);

  // Debounce en la búsqueda para no procesar ni consultar por cada tecla
  useEffect(() => {
    if (busquedaInput === busquedaDebounced) {
      setCargandoBusqueda(false);
      return undefined;
    }
    setCargandoBusqueda(true);
    const timer = window.setTimeout(() => {
      setBusquedaDebounced(busquedaInput);
      setCargandoBusqueda(false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [busquedaInput, busquedaDebounced]);

  useEffect(() => {
    const onResize = () => {
      setEsEscritorio(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const moverMapa = useCallback(
    (lat, lng, zoom = 15) => {
      const map = mapRef.current;
      if (!map) return;
      programmaticMoveRef.current = true;
      if (prefersReducedMotion) {
        map.setView([lat, lng], zoom, { animate: false });
      } else {
        map.flyTo([lat, lng], zoom, { duration: 0.55 });
      }
      window.setTimeout(() => {
        programmaticMoveRef.current = false;
      }, 650);
    },
    [prefersReducedMotion]
  );

  // Cargar lugares de demostración y señales externas ya existentes (si las hay)
  const lugaresAdaptados = useMemo(() => {
    const demos = TERRAZAS.map((t) =>
      adaptarTerrazaDemo(t, COORDENADAS_TERRAZAS[t.id], ubicacionUsuario)
    ).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));

    const externos = lugaresExternosRaw
      .map((item) => adaptarLugarExterno(item, ubicacionUsuario))
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));

    return [...demos, ...externos];
  }, [lugaresExternosRaw, ubicacionUsuario]);

  const lugaresVisibles = useMemo(() => {
    const filtrados = filtrarLugares(lugaresAdaptados, {
      busqueda: busquedaDebounced,
      soloPermitidos: filtros.soloPermitidos,
      conTerraza: filtros.conTerraza,
      soloTranquilos: filtros.soloTranquilos,
      incluirDesconocidos: filtros.incluirDesconocidos
    });
    return ordenarLugares(filtrados, orden);
  }, [lugaresAdaptados, busquedaDebounced, filtros, orden]);

  const centrarEnUsuario = useCallback(
    (silentIfDenied = false) => {
      if (!geolocalizacionPermitida({ accionExplicita: !silentIfDenied })) {
        if (!silentIfDenied) setEstadoGps('denied');
        return;
      }
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        if (!silentIfDenied) setEstadoGps('denied');
        return;
      }

      setEstadoGps('locating');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 40)
          };
          setUbicacionUsuario(coords);
          setEstadoGps('ready');
          moverMapa(coords.lat, coords.lng, 15);
        },
        () => {
          setEstadoGps('denied');
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
      );
    },
    [moverMapa]
  );

  // Inicializar Leaflet una sola vez (no se reinicia al contraer la sidebar)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [CENTRO_GAM.lat, CENTRO_GAM.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: true
    });

    tileLayerRef.current = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);

    const markUserInteraction = () => {
      if (!programmaticMoveRef.current) {
        userInteractingRef.current = true;
      }
    };

    map.on('dragstart', markUserInteraction);
    map.on('zoomstart', markUserInteraction);

    map.on('zoomend', () => {
      setZoomActual(map.getZoom());
    });

    map.on('moveend', () => {
      if (userInteractingRef.current && !programmaticMoveRef.current) {
        setZonaModificadaPorUsuario(true);
        setMensajeZonaKey('');
      }
      userInteractingRef.current = false;
    });

    mapRef.current = map;

    return () => {
      abortControllerRef.current?.abort();
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
      userLayerRef.current = null;
    };
  }, []);

  // Recalcular tamaño del mapa tras cambios de distribución (incluyendo sidebar contraíble)
  useEffect(() => {
    const map = mapRef.current;
    const container = mapContainerRef.current;
    if (!map || !container) return undefined;

    const recalcular = () => {
      programmaticMoveRef.current = true;
      map.invalidateSize({ animate: false });
      window.setTimeout(() => {
        programmaticMoveRef.current = false;
      }, 120);
    };

    const timer = window.setTimeout(recalcular, 270);

    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        recalcular();
      });
      observer.observe(container);
    }

    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [esEscritorio, panelMovilExpandido, lugarSeleccionado]);

  // Mantener teselas OSM sin oscurecimiento por filtros CSS
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const tilePane = map.getPane('tilePane');
    if (tilePane) {
      tilePane.style.filter = 'none';
    }
  }, [tema]);

  // Marcador de usuario
  useEffect(() => {
    const layer = userLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!ubicacionUsuario) return;

    L.circle([ubicacionUsuario.lat, ubicacionUsuario.lng], {
      radius: Math.min(ubicacionUsuario.accuracy || 50, 180),
      color: '#0284C7',
      fillColor: '#38BDF8',
      fillOpacity: 0.16,
      weight: 1.5
    }).addTo(layer);

    const userIcon = L.divIcon({
      className: 'gotox-user-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      html: `<div style="width:14px;height:14px;border-radius:9999px;background:#0284C7;border:2.5px solid #FFFFFF;box-shadow:0 2px 8px rgba(0,0,0,0.45);"></div>`
    });

    L.marker([ubicacionUsuario.lat, ubicacionUsuario.lng], { icon: userIcon })
      .bindTooltip(t('mapaExt.tuUbicacion'), { direction: 'top', offset: [0, -10] })
      .addTo(layer);
  }, [ubicacionUsuario, t]);

  // Marcadores de lugares + capas independientes
  useEffect(() => {
    const layer = markersLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;

    layer.clearLayers();

    if (mostrarRutasVerdes) {
      CORREDORES_VERDES.forEach((corredor) => {
        L.circle([corredor.lat, corredor.lng], {
          radius: 90,
          color: '#10B981',
          fillColor: '#10B981',
          fillOpacity: 0.14,
          weight: 1.5,
          dashArray: '4 4'
        }).addTo(layer);

        const icon = L.divIcon({
          className: 'gotox-corridor-marker',
          iconSize: [0, 0],
          html: `
            <div style="
              display:inline-flex;align-items:center;gap:5px;
              padding:4px 9px;border-radius:9999px;
              background:${tokens.esClaro ? '#ECFDF5' : '#064E3B'};
              color:${tokens.esClaro ? '#065F46' : '#ECFDF5'};
              border:1.5px solid #10B981;
              font-size:10px;font-weight:700;white-space:nowrap;
              box-shadow:0 4px 12px rgba(0,0,0,0.22);
              transform:translate(-50%,-50%);cursor:pointer;
            ">
              <span>${escapeHtml(corredor.nombre)}</span>
            </div>
          `
        });

        const marker = L.marker([corredor.lat, corredor.lng], { icon }).addTo(layer);
        marker.on('click', () => {
          setLugarSeleccionado(null);
          setElementoInfo({ tipo: 'corredor', data: corredor });
          moverMapa(corredor.lat, corredor.lng, map.getZoom());
        });
      });
    }

    if (mostrarRiesgoPodal) {
      PUNTOS_CALIENTES.forEach((hot) => {
        L.circle([hot.lat, hot.lng], {
          radius: 75,
          color: '#D97706',
          fillColor: '#F59E0B',
          fillOpacity: 0.16,
          weight: 1.5
        }).addTo(layer);

        const icon = L.divIcon({
          className: 'gotox-hot-marker',
          iconSize: [0, 0],
          html: `
            <div style="
              display:inline-flex;align-items:center;gap:5px;
              padding:4px 9px;border-radius:9999px;
              background:${tokens.esClaro ? '#FFFBEB' : '#78350F'};
              color:${tokens.esClaro ? '#92400E' : '#FEF3C7'};
              border:1.5px solid #F59E0B;
              font-size:10px;font-weight:700;white-space:nowrap;
              box-shadow:0 4px 12px rgba(0,0,0,0.22);
              transform:translate(-50%,-50%);cursor:pointer;
            ">
              <span>${escapeHtml(hot.temp)} · ${escapeHtml(hot.nombre)}</span>
            </div>
          `
        });

        const marker = L.marker([hot.lat, hot.lng], { icon }).addTo(layer);
        marker.on('click', () => {
          setLugarSeleccionado(null);
          setElementoInfo({ tipo: 'asfalto', data: hot });
          moverMapa(hot.lat, hot.lng, map.getZoom());
        });
      });
    }

    lugaresVisibles.forEach((lugar) => {
      const seleccionado = lugarSeleccionado?.id === lugar.id;
      const icon = L.divIcon({
        className: 'gotox-place-marker',
        iconSize: [0, 0],
        html: crearPinLugarHtml(lugar, seleccionado, tokens.esClaro, prefersReducedMotion)
      });

      const marker = L.marker([lugar.lat, lugar.lng], {
        icon,
        zIndexOffset: seleccionado ? 1000 : 400
      }).addTo(layer);

      marker.on('click', () => {
        setElementoInfo(null);
        setLugarSeleccionado(lugar);
        moverMapa(lugar.lat, lugar.lng, Math.max(map.getZoom(), 15));
      });
    });
  }, [
    mostrarRutasVerdes,
    mostrarRiesgoPodal,
    lugaresVisibles,
    lugarSeleccionado,
    tokens.esClaro,
    prefersReducedMotion,
    moverMapa
  ]);

  const handleSeleccionarLugar = useCallback(
    (lugar, triggerEl = null) => {
      if (triggerEl) {
        triggerDetalleRef.current = triggerEl;
      }
      setElementoInfo(null);
      setLugarSeleccionado(lugar);
      moverMapa(lugar.lat, lugar.lng, Math.max(mapRef.current?.getZoom() || 15, 15));
    },
    [moverMapa]
  );

  // Cargar automáticamente nuestros restaurantes reales desde Supabase DB (con fotos propias)
  useEffect(() => {
    let activo = true;
    fetch('/api/places?limit=800', { headers: { Accept: 'application/json' } })
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((json) => {
        const items = Array.isArray(json?.data) ? json.data : [];
        if (activo && items.length > 0) {
          setLugaresExternosRaw(items);
        }
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  // Buscar en esta zona con cancelación de solicitudes obsoletas (solo base de datos propia)
  const handleBuscarEnEstaZona = useCallback(async () => {
    if (!mapRef.current) return;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const center = mapRef.current.getCenter();
    setCargandoBusqueda(true);
    setZonaModificadaPorUsuario(false);

    try {
      const resp = await fetch(
        `/api/places/multisource/search?lat=${center.lat}&lng=${center.lng}&radius=5000&limit=50&source=db`,
        { signal: controller.signal }
      );
      if (resp.ok) {
        const json = await resp.json();
        const items = json?.data?.places || json?.data?.restaurants;
        if (Array.isArray(items)) {
          setLugaresExternosRaw(items);
        }
      }
      setMensajeZonaKey('mapaExt.areaActualizada');
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setMensajeZonaKey('mapaExt.mostrandoPrototipo');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setCargandoBusqueda(false);
      }
    }
  }, []);

  const handleLimpiarFiltros = useCallback(() => {
    setBusquedaInput('');
    setBusquedaDebounced('');
    setFiltros(FILTROS_INICIALES);
    setOrden('relevancia');
  }, []);

  const resetearVista = useCallback(() => {
    abortControllerRef.current?.abort();
    setLugarSeleccionado(null);
    setElementoInfo(null);
    handleLimpiarFiltros();
    setMostrarRutasVerdes(true);
    setMostrarRiesgoPodal(true);
    setZonaModificadaPorUsuario(false);
    setMensajeZonaKey('');
    setLugaresExternosRaw([]);
    moverMapa(CENTRO_GAM.lat, CENTRO_GAM.lng, 15);
  }, [handleLimpiarFiltros, moverMapa]);

  return (
    <PageWrapper className="w-full space-y-3 pb-10 overflow-x-hidden">
      {/* Encabezado editorial compacto */}
      <section className={`gotox-hero-section relative pt-4 pb-3.5 border-b ${tokens.bordeSuave}`}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-left">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 min-w-0">
              <div className="flex items-center gap-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${tokens.badgeDemo}`}
                >
                  <Compass className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t('mapa.badge')}</span>
                </span>
                <h1 className={`font-serif text-xl sm:text-2xl font-bold tracking-tight ${tokens.textoTitulo}`}>
                  {t('mapa.titulo')}
                </h1>
              </div>
              <p className={`text-xs ${tokens.textoMuted}`}>
                {t('mapa.subtitulo')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${tokens.superficiePrincipal}`}>
                <Thermometer className="w-3.5 h-3.5 text-[#F27B91]" aria-hidden="true" />
                <span className={tokens.textoCuerpo}>
                  {t('mapa.asfalto')} <strong className={tokens.textoTitulo}>{telemetria.temperaturaAsfalto} °C</strong>
                </span>
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${tokens.superficiePrincipal}`}>
                <Volume2 className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
                <span className={tokens.textoCuerpo}>
                  {t('mapa.ruido')} <strong className={tokens.textoTitulo}>{telemetria.aforoAcusticoDb} dB</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Composición Principal: aprovecha el ancho liberado por la sidebar */}
      <section className="max-w-[1440px] mx-auto px-3 sm:px-6">
        <div
          className={
            esEscritorio
              ? 'grid grid-cols-[370px_1fr] xl:grid-cols-[400px_1fr] gap-4 items-stretch h-[calc(100dvh-10.5rem)] min-h-[540px] max-h-[740px]'
              : 'flex flex-col rounded-3xl border overflow-hidden h-[calc(100dvh-9.5rem)] min-h-[520px] max-h-[760px]'
          }
        >
          {/* Columna Lateral Escritorio (>= 1024px) */}
          {esEscritorio && (
            <aside
              aria-label={t('mapaExt.asideAria')}
              className={`h-full min-h-0 rounded-3xl border p-4 flex flex-col overflow-hidden ${tokens.superficiePrincipal}`}
            >
              {lugarSeleccionado ? (
                <PanelDetalleLugar
                  lugar={lugarSeleccionado}
                  tokens={tokens}
                  modo="columna"
                  onCerrar={() => setLugarSeleccionado(null)}
                  onCentrarEnMapa={(l) => moverMapa(l.lat, l.lng, 16)}
                  triggerRef={triggerDetalleRef}
                />
              ) : (
                <ListaLugaresMapa
                  tokens={tokens}
                  lugares={lugaresVisibles}
                  busqueda={busquedaInput}
                  onBusquedaChange={setBusquedaInput}
                  cargandoBusqueda={cargandoBusqueda}
                  filtros={filtros}
                  onFiltrosChange={setFiltros}
                  orden={orden}
                  onOrdenChange={setOrden}
                  onLimpiarFiltros={handleLimpiarFiltros}
                  lugarSeleccionado={lugarSeleccionado}
                  onSeleccionarLugar={handleSeleccionarLugar}
                />
              )}
            </aside>
          )}

          {/* Lienzo Protagonista del Mapa Leaflet */}
          <div
            className={`relative flex-1 min-h-[300px] ${
              esEscritorio ? 'h-full rounded-3xl border overflow-hidden shadow-xl' : 'w-full overflow-hidden'
            } ${tokens.superficieMapa}`}
          >
            {/* Controles Superiores Izquierda: Navegación GPS + Buscar en esta zona + Capas independientes */}
            <div className="absolute top-3 left-3 z-[500] flex flex-col items-start gap-2 max-w-[calc(100%-4.5rem)]">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => centrarEnUsuario(false)}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-transform active:scale-[0.98] ${tokens.superficieFlotante} ${tokens.focusRing}`}
                >
                  <Crosshair className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>
                    {estadoGps === 'ready'
                      ? t('mapaExt.ubicacionActiva')
                      : estadoGps === 'locating'
                      ? t('mapaExt.ubicando')
                      : t('mapaExt.miUbicacion')}
                  </span>
                </button>

                {zonaModificadaPorUsuario && (
                  <button
                    type="button"
                    onClick={handleBuscarEnEstaZona}
                    className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-transform active:scale-[0.98] ${tokens.botonPrimario} ${tokens.focusRing}`}
                  >
                    <Search className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{t('mapaExt.buscarZona')}</span>
                  </button>
                )}
              </div>

              {/* Control independiente de capas cartográficas (Rutas verdes y Riesgo podal) */}
              <div
                className={`flex flex-wrap items-center gap-1.5 p-1 rounded-xl border ${tokens.superficieFlotante}`}
                role="group"
                aria-label={t('mapaExt.capasAria')}
              >
                <button
                  type="button"
                  aria-pressed={mostrarRutasVerdes}
                  onClick={() => setMostrarRutasVerdes((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${tokens.focusRing} ${
                    mostrarRutasVerdes ? tokens.corredorVerde : tokens.chipInactivo
                  }`}
                >
                  <Navigation className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>{t('mapaExt.rutasVerdes')}</span>
                </button>
                <button
                  type="button"
                  aria-pressed={mostrarRiesgoPodal}
                  onClick={() => setMostrarRiesgoPodal((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${tokens.focusRing} ${
                    mostrarRiesgoPodal ? tokens.alertaAsfalto : tokens.chipInactivo
                  }`}
                >
                  <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                  <span>{t('mapaExt.riesgoPodal')}</span>
                </button>
              </div>

              {mensajeZonaKey && (
                <div
                  role="status"
                  className={`px-3 py-1 rounded-xl border text-[11px] font-medium ${tokens.superficieFlotante}`}
                >
                  {t(mensajeZonaKey)}
                </div>
              )}
            </div>

            {/* Controles Superiores Derecha: Zoom y Restablecer */}
            <div
              className={`absolute top-3 right-3 z-[500] flex flex-col gap-1 p-1.5 rounded-2xl border ${tokens.superficieFlotante}`}
              role="group"
              aria-label={t('mapaExt.zoomAria')}
            >
              <button
                type="button"
                onClick={() => mapRef.current?.zoomIn()}
                aria-label={t('mapaExt.acercar')}
                title={t('mapaExt.acercar')}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors active:scale-95 ${tokens.botonControlMapa}`}
              >
                <ZoomIn className="w-4 h-4" aria-hidden="true" />
              </button>
              <span
                aria-label={t('mapaExt.nivelZoom', { zoom: zoomActual })}
                className={`text-[11px] font-mono font-bold text-center tabular-nums ${tokens.textoCuerpo}`}
              >
                z{zoomActual}
              </span>
              <button
                type="button"
                onClick={() => mapRef.current?.zoomOut()}
                aria-label={t('mapaExt.alejar')}
                title={t('mapaExt.alejar')}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors active:scale-95 ${tokens.botonControlMapa}`}
              >
                <ZoomOut className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={resetearVista}
                aria-label={t('mapaExt.restablecerVista')}
                title={t('mapaExt.restablecerTitle')}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors active:scale-95 ${tokens.botonControlMapa}`}
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            {/* Leyenda inferior izquierda sin colisión con atribuciones OSM */}
            <div className="absolute bottom-7 sm:bottom-3 left-3 z-[500] max-w-[calc(100%-1.5rem)]">
              {!esEscritorio && !leyendaMovilAbierta ? (
                <button
                  type="button"
                  aria-expanded="false"
                  onClick={() => setLeyendaMovilAbierta(true)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 ${tokens.superficieFlotante} ${tokens.focusRing}`}
                >
                  <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t('mapaExt.leyenda')}</span>
                </button>
              ) : (
                <div
                  className={`px-3 py-2 rounded-2xl border text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1.5 ${tokens.superficieFlotante}`}
                >
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white/60" />
                    {t('mapaExt.permitidoDemo')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white/60" />
                    {t('mapaExt.desconocidoAlerta')}
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white/60" />
                    {t('mapaExt.noPermitido')}
                  </span>
                  {!esEscritorio && (
                    <button
                      type="button"
                      aria-label={t('mapaExt.ocultarLeyenda')}
                      onClick={() => setLeyendaMovilAbierta(false)}
                      className={`ml-1 p-1 rounded-lg ${tokens.botonControlMapa}`}
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Lienzo real de Leaflet */}
            <div ref={mapContainerRef} className="w-full h-full z-10" />

            {/* Tarjeta flotante para Corredor Verde o Alerta de Asfalto */}
            {elementoInfo && (
              <div
                role="region"
                aria-label={elementoInfo.data.nombre}
                className={`absolute bottom-14 sm:bottom-12 right-3 left-3 sm:left-auto sm:w-80 z-[510] rounded-2xl border p-4 space-y-2 text-left ${tokens.superficieFlotante}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide mb-1 ${
                        elementoInfo.tipo === 'corredor' ? tokens.corredorVerde : tokens.alertaAsfalto
                      }`}
                    >
                      {elementoInfo.tipo === 'corredor' ? t('mapaExt.corredorDemo') : t('mapaExt.alertaPodalDemo')}
                    </span>
                    <h3 className={`font-serif font-bold text-sm ${tokens.textoTitulo}`}>
                      {elementoInfo.data.nombre}
                    </h3>
                    <p className={`text-[11px] flex items-center gap-1 ${tokens.textoMuted}`}>
                      <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span>{elementoInfo.data.zona}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={t('mapaExt.cerrarAviso')}
                    onClick={() => setElementoInfo(null)}
                    className={`p-1.5 rounded-lg border text-xs ${tokens.botonSecundario} ${tokens.focusRing}`}
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
                <p className={`text-xs leading-relaxed ${tokens.textoCuerpo}`}>
                  {elementoInfo.tipo === 'corredor'
                    ? `${elementoInfo.data.decibelios} dB · ${t('mapaExt.sombraDetalle')} ${elementoInfo.data.sombra}. ${elementoInfo.data.detalle}`
                    : `${elementoInfo.data.temp} · ${elementoInfo.data.alerta}`}
                </p>
              </div>
            )}
          </div>

          {/* Panel Inferior en Móvil y Tablet (< 1024px) */}
          {!esEscritorio && (
            <PanelInferiorMovil
              tokens={tokens}
              expandido={panelMovilExpandido}
              onToggleExpandido={setPanelMovilExpandido}
              totalResultados={lugaresVisibles.length}
            >
              <ListaLugaresMapa
                tokens={tokens}
                lugares={lugaresVisibles}
                busqueda={busquedaInput}
                onBusquedaChange={setBusquedaInput}
                cargandoBusqueda={cargandoBusqueda}
                filtros={filtros}
                onFiltrosChange={setFiltros}
                orden={orden}
                onOrdenChange={setOrden}
                onLimpiarFiltros={handleLimpiarFiltros}
                lugarSeleccionado={lugarSeleccionado}
                onSeleccionarLugar={handleSeleccionarLugar}
                compacto
              />
            </PanelInferiorMovil>
          )}
        </div>
      </section>

      {/* Modal de detalle en móvil/tablet (< 1024px) con bloqueo de scroll y Escape */}
      {!esEscritorio && lugarSeleccionado && (
        <PanelDetalleLugar
          lugar={lugarSeleccionado}
          tokens={tokens}
          modo="modal"
          onCerrar={() => setLugarSeleccionado(null)}
          onCentrarEnMapa={(l) => {
            setLugarSeleccionado(null);
            moverMapa(l.lat, l.lng, 16);
          }}
          triggerRef={triggerDetalleRef}
        />
      )}
    </PageWrapper>
  );
}

export default MapaPage;
