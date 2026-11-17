import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'motion/react';
import { TERRAZAS } from '../data/terrazas';
import { PageWrapper } from '../components/PageWrapper';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { useTelemetria } from '../hooks/useTelemetria';
import { useTema } from '../context/TemaContext';
import {
  MapPin,
  Volume2,
  Thermometer,
  ShieldCheck,
  Search,
  Compass,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ArrowRight,
  Navigation,
  Coffee,
  Crosshair,
  Utensils,
  ExternalLink,
  Clock,
  Phone
} from 'lucide-react';
import { TRANSICION_SUAVE } from '../estilos/animaciones';

const CENTRO_GAM = { lat: 9.9352, lng: -84.0695 };

// Coordenadas GPS reales en San José, Costa Rica
const COORDENADAS_TERRAZAS = {
  'franco-cafe': { lat: 9.9355, lng: -84.0652, barrio: 'Barrio Escalante' },
  'arbol-de-seda': { lat: 9.9371, lng: -84.0631, barrio: 'Barrio Escalante' },
  'apotecario': { lat: 9.9324, lng: -84.0706, barrio: 'Barrio California' },
  'cafe-miel': { lat: 9.9383, lng: -84.0757, barrio: 'Barrio Amón / Otoya' }
};

// Corredores acústicamente seguros (parques reales de San José)
const CORREDORES_VERDES = [
  {
    id: 'corredor-espana',
    nombre: 'Arboleda Parque España',
    zona: 'Barrio Amón / Otoya',
    lat: 9.9360,
    lng: -84.0754,
    decibelios: 45,
    sombra: '90%',
    detalle: 'Sendero arbolado con fuentes de agua y baja circulación vehicular.'
  },
  {
    id: 'corredor-nacional',
    nombre: 'Circuito Parque Nacional',
    zona: 'Estación / California',
    lat: 9.9333,
    lng: -84.0701,
    decibelios: 48,
    sombra: '88%',
    detalle: 'Caminos amplios sombreados ideales para paseos matutinos.'
  },
  {
    id: 'corredor-francia',
    nombre: 'Paseo Parque Francia',
    zona: 'Barrio Escalante',
    lat: 9.9358,
    lng: -84.0660,
    decibelios: 42,
    sombra: '95%',
    detalle: 'Corredor peatonal tranquilo conectado con terrazas pet-friendly.'
  }
];

// Zonas con pavimento térmico crítico (> 28 °C en horas pico sin sombra)
const PUNTOS_CALIENTES = [
  {
    id: 'hot-avenida2',
    nombre: 'Cruce Av. 2 / Calle 23',
    zona: 'Asfalto Expuesto',
    lat: 9.9311,
    lng: -84.0714,
    temp: '32.4 °C',
    alerta: 'Evitar entre 11:30 y 14:00 por riesgo de quemadura podal.'
  },
  {
    id: 'hot-calle33',
    nombre: 'Rotonda Fuente de la Hispanidad',
    zona: 'San Pedro / Escalante',
    lat: 9.9325,
    lng: -84.0545,
    temp: '29.8 °C',
    alerta: 'Caminar por la acera este con cobertura de árboles.'
  }
];

function calcularDistanciaKm(lat1, lng1, lat2, lng2) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function crearPinTerrazaHtml(terraza, seleccionada, esClaro) {
  const bg = seleccionada ? '#55152D' : esClaro ? '#ffffff' : '#111827';
  const text = seleccionada ? '#ffffff' : esClaro ? '#0f172a' : '#E8EDF5';
  const border = seleccionada ? '#F27B91' : esClaro ? '#cbd5e1' : 'rgba(255,255,255,0.22)';
  const badgeBg = seleccionada
    ? 'rgba(52,211,153,0.25)'
    : esClaro
    ? '#ecfdf5'
    : 'rgba(16,185,129,0.2)';
  const badgeText = seleccionada ? '#a7f3d0' : esClaro ? '#047857' : '#6ee7b7';

  return `
    <div style="
      display:inline-flex;align-items:center;gap:6px;
      padding:5px 10px;border-radius:9999px;
      background:${bg};color:${text};
      border:1.5px solid ${border};
      box-shadow:0 8px 20px rgba(0,0,0,0.28);
      font-family:system-ui,-apple-system,sans-serif;
      white-space:nowrap;transform:translate(-50%,-50%);
      cursor:pointer;
    ">
      <span style="width:8px;height:8px;border-radius:9999px;background:#F27B91;flex-shrink:0;"></span>
      <span style="font-size:11px;font-weight:700;">${terraza.nombre}</span>
      <span style="font-size:10px;font-weight:700;font-family:monospace;padding:1px 5px;border-radius:6px;background:${badgeBg};color:${badgeText};">
        ${terraza.decibelios}dB
      </span>
    </div>
  `;
}

export function MapaPage() {
  const telemetria = useTelemetria();
  const { esClaro } = useTema();

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const userLayerRef = useRef(null);

  const [capaActiva, setCapaActiva] = useState('todas'); // 'todas' | 'restaurantes' | 'silencioso' | 'corredores' | 'asfalto'
  const [busqueda, setBusqueda] = useState('');
  const [terrazaSeleccionada, setTerrazaSeleccionada] = useState(null);
  const [restauranteSeleccionado, setRestauranteSeleccionado] = useState(null);
  const [elementoInfo, setElementoInfo] = useState(null);
  const [modalAuditoria, setModalAuditoria] = useState(null);

  const [restaurantesReales, setRestaurantesReales] = useState([]);
  const [cargandoRestaurantes, setCargandoRestaurantes] = useState(false);
  const requestIdRef = useRef(0);

  const [ubicacionUsuario, setUbicacionUsuario] = useState(null);
  const [estadoGps, setEstadoGps] = useState('idle'); // 'idle' | 'locating' | 'ready' | 'denied'
  const [zoomActual, setZoomActual] = useState(15);

  const cargarRestaurantesReales = useCallback(async (lat, lng) => {
    const reqId = ++requestIdRef.current;
    setCargandoRestaurantes(true);
    try {
      const resp = await fetch(`/api/places/nearby-real?lat=${lat}&lng=${lng}&radius=2200&limit=35`);
      if (!resp.ok) return;
      const json = await resp.json();
      const lista = json?.data?.restaurants;
      if (reqId === requestIdRef.current && Array.isArray(lista)) {
        setRestaurantesReales(lista);
      }
    } catch (err) {
      // Mantener lista previa si falla la red
    } finally {
      if (reqId === requestIdRef.current) {
        setCargandoRestaurantes(false);
      }
    }
  }, []);

  const restaurantesRealesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return restaurantesReales;
    const q = busqueda.toLowerCase();
    return restaurantesReales.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      (r.cuisine && r.cuisine.toLowerCase().includes(q)) ||
      (r.address && r.address.toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q))
    );
  }, [restaurantesReales, busqueda]);

  const terrazasVisibles = useMemo(() => {
    return TERRAZAS.filter((t) => {
      if (capaActiva === 'silencioso' && !t.nivelRuido.toLowerCase().includes('silencioso')) {
        return false;
      }
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        return (
          t.nombre.toLowerCase().includes(q) ||
          t.zona.toLowerCase().includes(q) ||
          t.categoria.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [capaActiva, busqueda]);

  const centrarEnUsuario = useCallback((silentIfDenied = false) => {
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
        cargarRestaurantesReales(coords.lat, coords.lng);
        if (mapRef.current) {
          mapRef.current.flyTo([coords.lat, coords.lng], 15, { duration: 1.1 });
        }
      },
      () => {
        setEstadoGps('denied');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [cargarRestaurantesReales]);

  // 1. Inicializar instancia real de Leaflet una sola vez
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [CENTRO_GAM.lat, CENTRO_GAM.lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: true
    });

    map.on('zoomend', () => {
      setZoomActual(map.getZoom());
    });

    markersLayerRef.current = L.layerGroup().addTo(map);
    userLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    cargarRestaurantesReales(CENTRO_GAM.lat, CENTRO_GAM.lng);
    // Intentar centrar automáticamente en la ubicación del usuario al abrir el mapa
    centrarEnUsuario(true);

    return () => {
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markersLayerRef.current = null;
      userLayerRef.current = null;
    };
  }, [centrarEnUsuario, cargarRestaurantesReales]);

  // 2. Actualizar capa de tiles según el tema (claro vs oscuro/morado)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const tilePane = map.getPane('tilePane');
    if (tilePane) {
      tilePane.style.filter = esClaro
        ? 'none'
        : 'invert(92%) hue-rotate(180deg) brightness(92%) contrast(92%)';
    }
  }, [esClaro]);

  // 3. Renderizar marcador real de ubicación del usuario
  useEffect(() => {
    const layer = userLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!ubicacionUsuario) return;

    L.circle([ubicacionUsuario.lat, ubicacionUsuario.lng], {
      radius: Math.min(ubicacionUsuario.accuracy || 50, 180),
      color: '#38bdf8',
      fillColor: '#38bdf8',
      fillOpacity: 0.14,
      weight: 1.5
    }).addTo(layer);

    const userIcon = L.divIcon({
      className: 'gotox-user-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      html: `
        <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
          <span style="position:absolute;inset:0;border-radius:9999px;background:rgba(56,189,248,0.35);"></span>
          <span style="position:relative;width:12px;height:12px;border-radius:9999px;background:#0ea5e9;border:2.5px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></span>
        </div>
      `
    });

    L.marker([ubicacionUsuario.lat, ubicacionUsuario.lng], { icon: userIcon })
      .bindTooltip('Tu ubicación actual', { direction: 'top', offset: [0, -10] })
      .addTo(layer);
  }, [ubicacionUsuario]);

  // 4. Renderizar marcadores de terrazas, corredores verdes y puntos calientes
  useEffect(() => {
    const layer = markersLayerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;

    layer.clearLayers();

    if (capaActiva === 'todas' || capaActiva === 'corredores') {
      CORREDORES_VERDES.forEach((corredor) => {
        L.circle([corredor.lat, corredor.lng], {
          radius: 90,
          color: '#10b981',
          fillColor: '#10b981',
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
              background:${esClaro ? '#ecfdf5' : 'rgba(6,78,59,0.92)'};
              color:${esClaro ? '#047857' : '#6ee7b7'};
              border:1px solid ${esClaro ? '#6ee7b7' : 'rgba(16,185,129,0.5)'};
              font-size:10px;font-weight:700;white-space:nowrap;
              box-shadow:0 4px 12px rgba(0,0,0,0.22);
              transform:translate(-50%,-50%);cursor:pointer;
            ">
              <span>🌿 ${corredor.nombre}</span>
            </div>
          `
        });

        const marker = L.marker([corredor.lat, corredor.lng], { icon }).addTo(layer);
        marker.on('click', () => {
          setTerrazaSeleccionada(null);
          setRestauranteSeleccionado(null);
          setElementoInfo({ tipo: 'corredor', data: corredor });
          map.panTo([corredor.lat, corredor.lng]);
        });
      });
    }

    if (capaActiva === 'todas' || capaActiva === 'asfalto') {
      PUNTOS_CALIENTES.forEach((hot) => {
        L.circle([hot.lat, hot.lng], {
          radius: 75,
          color: '#f59e0b',
          fillColor: '#f59e0b',
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
              background:${esClaro ? '#fffbeb' : 'rgba(120,53,15,0.92)'};
              color:${esClaro ? '#b45309' : '#fcd34d'};
              border:1px solid ${esClaro ? '#fcd34d' : 'rgba(245,158,11,0.55)'};
              font-size:10px;font-weight:700;white-space:nowrap;
              box-shadow:0 4px 12px rgba(0,0,0,0.22);
              transform:translate(-50%,-50%);cursor:pointer;
            ">
              <span>⚠ ${hot.temp} · ${hot.nombre}</span>
            </div>
          `
        });

        const marker = L.marker([hot.lat, hot.lng], { icon }).addTo(layer);
        marker.on('click', () => {
          setTerrazaSeleccionada(null);
          setRestauranteSeleccionado(null);
          setElementoInfo({ tipo: 'asfalto', data: hot });
          map.panTo([hot.lat, hot.lng]);
        });
      });
    }

    if (capaActiva === 'todas' || capaActiva === 'restaurantes') {
      restaurantesRealesFiltrados.forEach((rest) => {
        const seleccionado = restauranteSeleccionado?.id === rest.id;
        const icon = L.divIcon({
          className: 'gotox-osm-restaurant-marker',
          iconSize: [0, 0],
          html: `
            <div style="
              display:inline-flex;align-items:center;gap:5px;
              padding:4px 9px;border-radius:9999px;
              background:${seleccionado ? '#c2410c' : esClaro ? '#fff7ed' : 'rgba(124,45,18,0.92)'};
              color:${seleccionado ? '#ffffff' : esClaro ? '#9a3412' : '#fed7aa'};
              border:1.5px solid ${seleccionado ? '#fb923c' : esClaro ? '#fdba74' : 'rgba(251,146,60,0.55)'};
              font-size:10px;font-weight:700;white-space:nowrap;
              box-shadow:0 4px 12px rgba(0,0,0,0.24);
              transform:translate(-50%,-50%);cursor:pointer;
            ">
              <span style="width:7px;height:7px;border-radius:9999px;background:#fb923c;flex-shrink:0;"></span>
              <span>${rest.name}</span>
            </div>
          `
        });

        const marker = L.marker([rest.lat, rest.lng], {
          icon,
          zIndexOffset: seleccionado ? 900 : 250
        }).addTo(layer);

        marker.on('click', () => {
          setTerrazaSeleccionada(null);
          setElementoInfo(null);
          setRestauranteSeleccionado(rest);
          map.panTo([rest.lat, rest.lng]);
        });
      });
    }

    if (capaActiva === 'todas' || capaActiva === 'silencioso') {
      terrazasVisibles.forEach((terraza) => {
        const coord = COORDENADAS_TERRAZAS[terraza.id];
        if (!coord) return;
        const seleccionada = terrazaSeleccionada?.id === terraza.id;

        const icon = L.divIcon({
          className: 'gotox-terrace-marker',
          iconSize: [0, 0],
          html: crearPinTerrazaHtml(terraza, seleccionada, esClaro)
        });

        const marker = L.marker([coord.lat, coord.lng], {
          icon,
          zIndexOffset: seleccionada ? 1000 : 400
        }).addTo(layer);

        marker.on('click', () => {
          setElementoInfo(null);
          setRestauranteSeleccionado(null);
          setTerrazaSeleccionada(terraza);
          map.flyTo([coord.lat, coord.lng], Math.max(map.getZoom(), 15), { duration: 0.6 });
        });
      });
    }
  }, [capaActiva, terrazasVisibles, terrazaSeleccionada, restaurantesRealesFiltrados, restauranteSeleccionado, esClaro]);

  const resetearVista = () => {
    setTerrazaSeleccionada(null);
    setRestauranteSeleccionado(null);
    setElementoInfo(null);
    setBusqueda('');
    setCapaActiva('todas');
    if (mapRef.current) {
      mapRef.current.flyTo([CENTRO_GAM.lat, CENTRO_GAM.lng], 15, { duration: 0.8 });
    }
    cargarRestaurantesReales(CENTRO_GAM.lat, CENTRO_GAM.lng);
  };

  const buscarRestaurantesAqui = () => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    cargarRestaurantesReales(center.lat, center.lng);
  };

  const distanciaTerrazaKm = useMemo(() => {
    if (!ubicacionUsuario || !terrazaSeleccionada) return null;
    const coord = COORDENADAS_TERRAZAS[terrazaSeleccionada.id];
    if (!coord) return null;
    return calcularDistanciaKm(ubicacionUsuario.lat, ubicacionUsuario.lng, coord.lat, coord.lng);
  }, [ubicacionUsuario, terrazaSeleccionada]);

  const distanciaRestauranteKm = useMemo(() => {
    if (!ubicacionUsuario || !restauranteSeleccionado) return null;
    return calcularDistanciaKm(
      ubicacionUsuario.lat,
      ubicacionUsuario.lng,
      restauranteSeleccionado.lat,
      restauranteSeleccionado.lng
    );
  }, [ubicacionUsuario, restauranteSeleccionado]);

  return (
    <PageWrapper className="w-full space-y-6 pb-20">
      {/* ============================================================
          ENCABEZADO EDITORIAL DEL MAPA GAM
          ============================================================ */}
      <section className="gotox-hero-section relative overflow-hidden pt-8 pb-6 border-b border-white/5 bg-gradient-to-b from-[#111827] via-[#090D14] to-[#090D14]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-left">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#55152D]/35 text-[#F27B91] border border-[#F27B91]/30 text-xs font-semibold">
                <Compass className="w-3.5 h-3.5" />
                <span>Cartografía Interactiva en Vivo &bull; Costa Rica</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#E8EDF5] tracking-tight">
                Mapa Interactivo GAM
              </h1>
              <p className="text-xs sm:text-sm text-[#94A3B8]">
                Navega calles reales, centra el mapa en tu ubicación GPS y explora terrazas pet-friendly, corredores verdes y alertas de asfalto.
              </p>
            </div>

            {/* Telemetría Mini Flotante */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111827] border border-white/10 text-[#E8EDF5]">
                <Thermometer className="w-3.5 h-3.5 text-[#F27B91]" />
                <span>Asfalto: <strong className="text-white">{telemetria.temperaturaAsfalto} °C</strong></span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111827] border border-white/10 text-[#E8EDF5]">
                <Volume2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Ruido: <strong className="text-white">{telemetria.aforoAcusticoDb} dB</strong></span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111827] border border-white/10 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 gotox-radar-dot" />
                <span>{telemetria.ventanaSecaMinutos} min secos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          BARRA DE CONTROL Y CAPAS DEL MAPA
          ============================================================ */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#111827] border border-white/10 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          {/* Buscador Rápido en el Mapa */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar terraza o barrio en el mapa..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#162032] border border-white/10 text-xs text-[#E8EDF5] placeholder-[#64748b] focus:outline-none focus:border-[#F27B91]/50 focus:ring-1 focus:ring-[#F27B91]/30"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white"
              >
                &times;
              </button>
            )}
          </div>

          {/* Selector de Capas de Cartografía */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#162032] rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setCapaActiva('todas')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                capaActiva === 'todas'
                  ? 'bg-[#55152D] text-white shadow-xs'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Coffee className="w-3.5 h-3.5 text-[#F27B91]" />
              <span>Todo ({TERRAZAS.length + restaurantesRealesFiltrados.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setCapaActiva('restaurantes')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                capaActiva === 'restaurantes'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Utensils className="w-3.5 h-3.5 text-orange-300" />
              <span>Restaurantes ({restaurantesRealesFiltrados.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setCapaActiva('silencioso')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                capaActiva === 'silencioso'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
              <span>Silenciosas (&lt; 48 dB)</span>
            </button>

            <button
              type="button"
              onClick={() => setCapaActiva('corredores')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                capaActiva === 'corredores'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5 text-blue-300" />
              <span>Rutas Verdes</span>
            </button>

            <button
              type="button"
              onClick={() => setCapaActiva('asfalto')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                capaActiva === 'asfalto'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
              <span>Riesgo Podal</span>
            </button>
          </div>
        </div>
      </section>

      {/* ============================================================
          LIENZO DE CARTOGRAFÍA INTERACTIVA REAL (LEAFLET + GPS)
          ============================================================ */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6">
        <div className="relative w-full h-[540px] sm:h-[620px] lg:h-[680px] rounded-3xl bg-[#090D14] border border-white/10 overflow-hidden shadow-2xl">
          {/* Controles de Mapa (GPS + Zoom + Restablecer GAM) */}
          <div className="absolute top-4 right-4 z-[500] flex flex-col gap-1.5 bg-[#111827]/90 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-lg">
            <button
              type="button"
              onClick={() => centrarEnUsuario(false)}
              title="Centrar en mi ubicación actual"
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                estadoGps === 'ready'
                  ? 'text-sky-400 hover:bg-white/10'
                  : 'text-[#E8EDF5] hover:bg-white/10'
              }`}
            >
              <Crosshair className={`w-4 h-4 ${estadoGps === 'locating' ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              title="Acercar mapa"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[#E8EDF5] hover:bg-white/10 transition-colors"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono font-bold text-center text-[#94A3B8] tabular-nums">
              z{zoomActual}
            </span>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              title="Alejar mapa"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[#E8EDF5] hover:bg-white/10 transition-colors"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={resetearVista}
              title="Ver Terrazas GAM"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[#F27B91] hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Leyenda + Estado de Ubicación + Buscar en esta zona */}
          <div className="absolute top-4 left-4 z-[500] flex flex-wrap items-center gap-2 max-w-[calc(100%-5.5rem)]">
            <div className="bg-[#111827]/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/10 shadow-lg hidden md:flex items-center gap-4 text-[11px] text-[#94A3B8]">
              <span className="flex items-center gap-1.5 font-bold text-[#E8EDF5]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F27B91]" />
                Terrazas Auditadas
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-orange-200">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                Restaurantes Reales
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                Corredor Acústico
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                Pavimento Caliente
              </span>
            </div>

            <button
              type="button"
              onClick={() => centrarEnUsuario(false)}
              className="bg-[#111827]/90 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/10 shadow-lg text-[11px] font-semibold flex items-center gap-1.5 text-[#E8EDF5] hover:border-sky-400/50 transition-colors"
            >
              <span className={`w-2 h-2 rounded-full ${
                estadoGps === 'ready'
                  ? 'bg-sky-400'
                  : estadoGps === 'locating'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-400'
              }`} />
              <span>
                {estadoGps === 'ready'
                  ? 'Mi ubicación activa'
                  : estadoGps === 'locating'
                  ? 'Buscando GPS...'
                  : 'Ir a mi ubicación'}
              </span>
            </button>

            <button
              type="button"
              onClick={buscarRestaurantesAqui}
              disabled={cargandoRestaurantes}
              className="bg-[#55152D]/95 backdrop-blur-md px-3 py-2 rounded-2xl border border-[#F27B91]/40 shadow-lg text-[11px] font-semibold flex items-center gap-1.5 text-white hover:bg-[#6E1E3A] transition-colors disabled:opacity-60"
            >
              <Utensils className={`w-3.5 h-3.5 text-orange-300 ${cargandoRestaurantes ? 'animate-spin' : ''}`} />
              <span>{cargandoRestaurantes ? 'Buscando locales...' : 'Buscar restaurantes aquí'}</span>
            </button>
          </div>

          {/* Contenedor real del mapa Leaflet */}
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* TARJETA FLOTANTE DETALLE DE TERRAZA SELECCIONADA */}
          <AnimatePresence>
            {terrazaSeleccionada && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={TRANSICION_SUAVE}
                className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[500] bg-[#111827]/95 backdrop-blur-xl border border-white/15 rounded-3xl p-5 shadow-2xl text-left space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={terrazaSeleccionada.imagen}
                      alt={terrazaSeleccionada.nombre}
                      className="w-14 h-14 rounded-2xl object-cover border border-white/10 shrink-0"
                    />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#F27B91] block">
                        {terrazaSeleccionada.categoria}
                      </span>
                      <h3 className="font-serif font-bold text-lg text-[#E8EDF5] leading-tight">
                        {terrazaSeleccionada.nombre}
                      </h3>
                      <p className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-[#F27B91]" />
                        <span>
                          {terrazaSeleccionada.zona}
                          {distanciaTerrazaKm !== null ? ` · a ${distanciaTerrazaKm.toFixed(1)} km` : ''}
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setTerrazaSeleccionada(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    &times;
                  </button>
                </div>

                {/* Métricas Rápidas de la Terraza */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-[#162032] border border-white/5 space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-[#94A3B8] block">Acústica</span>
                    <p className="font-bold text-[#E8EDF5] tabular-nums">{terrazaSeleccionada.decibelios} dB</p>
                    <span className="text-[9px] text-emerald-400 block font-medium">{terrazaSeleccionada.nivelRuido}</span>
                  </div>

                  <div className="p-2 rounded-xl bg-[#162032] border border-white/5 space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-[#94A3B8] block">Piso</span>
                    <p className="font-bold text-[#E8EDF5] tabular-nums">{terrazaSeleccionada.temperaturaPiso}</p>
                    <span className="text-[9px] text-[#94A3B8] block font-medium">{terrazaSeleccionada.sombraPorcentaje}% sombra</span>
                  </div>

                  <div className="p-2 rounded-xl bg-[#162032] border border-white/5 space-y-0.5">
                    <span className="text-[9px] uppercase font-bold text-[#94A3B8] block">Cupos</span>
                    <p className="font-bold text-[#E8EDF5] tabular-nums">{terrazaSeleccionada.aforoCaninoActual}/{terrazaSeleccionada.aforoCaninoMax}</p>
                    <span className="text-[9px] text-emerald-400 block font-medium">Libres</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[#94A3B8] truncate">
                    ★ {terrazaSeleccionada.puntuacionPet} &bull; {terrazaSeleccionada.insignia}
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setModalAuditoria(terrazaSeleccionada)}
                    icon={ArrowRight}
                    className="bg-[#55152D] hover:bg-[#6E1E3A] text-white text-xs font-semibold px-3 py-1.5"
                  >
                    Ver Auditoría
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TARJETA FLOTANTE PARA RESTAURANTE REAL (OSM OVERPASS) */}
          <AnimatePresence>
            {restauranteSeleccionado && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={TRANSICION_SUAVE}
                className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[500] bg-[#111827]/95 backdrop-blur-xl border border-orange-400/30 rounded-3xl p-5 shadow-2xl text-left space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 block">
                      {restauranteSeleccionado.category === 'cafe'
                        ? 'Cafetería Real · OpenStreetMap'
                        : restauranteSeleccionado.category === 'bar'
                        ? 'Bar & Gastro · OpenStreetMap'
                        : 'Restaurante Real · OpenStreetMap'}
                    </span>
                    <h3 className="font-serif font-bold text-lg text-[#E8EDF5] leading-tight">
                      {restauranteSeleccionado.name}
                    </h3>
                    <p className="text-[11px] text-[#94A3B8] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
                      <span>
                        {restauranteSeleccionado.address}
                        {distanciaRestauranteKm !== null ? ` · a ${distanciaRestauranteKm.toFixed(1)} km` : ''}
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRestauranteSeleccionado(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    &times;
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {restauranteSeleccionado.cuisine && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30 font-semibold capitalize">
                      {restauranteSeleccionado.cuisine}
                    </span>
                  )}
                  {restauranteSeleccionado.outdoor_seating && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                      Terraza exterior
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-[#94A3B8] border border-white/10 font-semibold">
                    {restauranteSeleccionado.pet_friendly === 'si'
                      ? 'Mascotas: Sí'
                      : restauranteSeleccionado.pet_friendly === 'no'
                      ? 'Mascotas: No'
                      : 'Mascotas: Consultar'}
                  </span>
                </div>

                {(restauranteSeleccionado.opening_hours || restauranteSeleccionado.phone) && (
                  <div className="space-y-1 text-[11px] text-[#94A3B8] bg-[#162032] p-2.5 rounded-xl border border-white/5">
                    {restauranteSeleccionado.opening_hours && (
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-orange-300 shrink-0" />
                        <span className="truncate">{restauranteSeleccionado.opening_hours}</span>
                      </p>
                    )}
                    {restauranteSeleccionado.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-emerald-300 shrink-0" />
                        <span>{restauranteSeleccionado.phone}</span>
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-1 flex items-center justify-end gap-2">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${restauranteSeleccionado.lat},${restauranteSeleccionado.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold transition-colors"
                  >
                    <span>Cómo llegar</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* TARJETA FLOTANTE PARA CORREDOR VERDE O ALERTA DE ASFALTO */}
          <AnimatePresence>
            {elementoInfo && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95 }}
                transition={TRANSICION_SUAVE}
                className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-[500] bg-[#111827]/95 backdrop-blur-xl border border-white/15 rounded-3xl p-5 shadow-2xl text-left space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                      elementoInfo.tipo === 'corredor' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {elementoInfo.tipo === 'corredor' ? 'Corredor Acústico Seguro' : 'Alerta de Riesgo Podal'}
                    </span>
                    <h3 className="font-serif font-bold text-lg text-[#E8EDF5] leading-tight">
                      {elementoInfo.data.nombre}
                    </h3>
                    <p className="text-[11px] text-[#94A3B8] flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#F27B91]" />
                      <span>{elementoInfo.data.zona}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setElementoInfo(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                  >
                    &times;
                  </button>
                </div>

                {elementoInfo.tipo === 'corredor' ? (
                  <>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-[#162032] border border-white/5">
                        <span className="text-[9px] uppercase font-bold text-[#94A3B8] block">Ruido Promedio</span>
                        <p className="font-bold text-emerald-300 tabular-nums">{elementoInfo.data.decibelios} dB</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#162032] border border-white/5">
                        <span className="text-[9px] uppercase font-bold text-[#94A3B8] block">Cobertura Sombra</span>
                        <p className="font-bold text-[#E8EDF5] tabular-nums">{elementoInfo.data.sombra}</p>
                      </div>
                    </div>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">{elementoInfo.data.detalle}</p>
                  </>
                ) : (
                  <>
                    <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/30 flex items-center justify-between text-xs">
                      <span className="text-amber-200 font-semibold">Temperatura estimada de calzada</span>
                      <span className="font-mono font-bold text-amber-300">{elementoInfo.data.temp}</span>
                    </div>
                    <p className="text-xs text-amber-200/90 leading-relaxed">{elementoInfo.data.alerta}</p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ============================================================
          LISTADO DE RESTAURANTES Y CAFÉS REALES EN LA ZONA
          ============================================================ */}
      <section className="max-w-[1240px] mx-auto px-4 sm:px-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#E8EDF5] tracking-tight flex items-center gap-2">
              <Utensils className="w-5 h-5 text-orange-400" />
              <span>Restaurantes y Cafés Reales Cercanos ({restaurantesRealesFiltrados.length})</span>
            </h2>
            <p className="text-xs text-[#94A3B8]">
              Lugares reales obtenidos de OpenStreetMap según {ubicacionUsuario ? 'tu ubicación GPS actual' : 'el área visible en el mapa'}.
            </p>
          </div>
          <button
            type="button"
            onClick={buscarRestaurantesAqui}
            disabled={cargandoRestaurantes}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-[#162032] border border-white/10 text-xs font-semibold text-[#E8EDF5] hover:border-orange-400/50 transition-colors disabled:opacity-60"
          >
            {cargandoRestaurantes ? 'Actualizando...' : 'Actualizar zona del mapa'}
          </button>
        </div>

        {restaurantesRealesFiltrados.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#111827] border border-white/10 text-center text-xs text-[#94A3B8]">
            {cargandoRestaurantes
              ? 'Buscando restaurantes reales en OpenStreetMap...'
              : 'No se encontraron restaurantes para el filtro actual. Mueve el mapa o pulsa "Buscar restaurantes aquí".'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {restaurantesRealesFiltrados.slice(0, 12).map((rest) => {
              const distKm = ubicacionUsuario
                ? calcularDistanciaKm(ubicacionUsuario.lat, ubicacionUsuario.lng, rest.lat, rest.lng)
                : null;
              return (
                <div
                  key={rest.id}
                  className="p-4 rounded-2xl bg-[#111827] border border-white/10 hover:border-orange-400/40 transition-all flex flex-col justify-between gap-3 text-left"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                        {rest.category === 'cafe' ? 'Cafetería' : rest.category === 'bar' ? 'Bar & Gastro' : 'Restaurante'}
                      </span>
                      {distKm !== null && (
                        <span className="text-[10px] font-mono text-[#94A3B8]">
                          a {distKm.toFixed(1)} km
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif font-bold text-base text-[#E8EDF5] leading-snug">
                      {rest.name}
                    </h3>
                    <p className="text-[11px] text-[#94A3B8] flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{rest.address}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setTerrazaSeleccionada(null);
                        setElementoInfo(null);
                        setRestauranteSeleccionado(rest);
                        mapRef.current?.flyTo([rest.lat, rest.lng], 16, { duration: 0.7 });
                        mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#162032] hover:bg-[#1E293B] text-[#E8EDF5] font-semibold border border-white/10 transition-colors"
                    >
                      Ver en mapa
                    </button>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${rest.lat},${rest.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-600/90 hover:bg-orange-500 text-white font-semibold transition-colors"
                    >
                      <span>Cómo llegar</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ============================================================
          MODAL DE FICHA DE AUDITORÍA CON ANIMATE PRESENCE
          ============================================================ */}
      <AnimatePresence>
        {modalAuditoria && (
          <Modal
            isOpen={Boolean(modalAuditoria)}
            onClose={() => setModalAuditoria(null)}
            title={`Auditoría Urbana: ${modalAuditoria.nombre}`}
            size="lg"
          >
            <div className="space-y-5 text-[#E8EDF5] text-left">
              <div className="relative h-44 sm:h-52 rounded-2xl overflow-hidden border border-white/10">
                <img
                  src={modalAuditoria.imagen}
                  alt={modalAuditoria.nombre}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#F27B91]">
                    {modalAuditoria.categoria}
                  </span>
                  <p className="text-sm font-semibold text-white flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#F27B91]" />
                    {modalAuditoria.zona}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-[#162032] rounded-2xl border border-white/10 text-xs">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold text-[#E8EDF5]">{modalAuditoria.insignia}</p>
                    <p className="text-[10px] text-[#94A3B8]">{modalAuditoria.procedenciaVerificacion}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Verificado Vigente
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-[#162032] rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#94A3B8] block">Presión Acústica</span>
                  <p className="font-bold text-base text-[#E8EDF5]">{modalAuditoria.decibelios} dB ({modalAuditoria.nivelRuido})</p>
                </div>
                <div className="p-3 bg-[#162032] rounded-xl border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-[#94A3B8] block">Temperatura Calzada</span>
                  <p className="font-bold text-base text-[#E8EDF5]">{modalAuditoria.temperaturaPiso}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <h4 className="font-bold uppercase tracking-wider text-[#94A3B8]">Condiciones Pet-Friendly</h4>
                <p className="p-3 bg-[#162032] rounded-xl border border-white/5 text-slate-300 leading-relaxed">
                  {modalAuditoria.condicionesMascotas}
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setModalAuditoria(null)}
                  className="bg-[#55152D] hover:bg-[#6E1E3A] text-white"
                >
                  Entendido
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}

export default MapaPage;
