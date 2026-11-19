import React, { useState, useMemo, useEffect } from 'react';
import { PageWrapper } from '../components/PageWrapper';
import { ModalDetalleLugar } from '../components/ModalDetalleLugar';
import { LUGARES_GOTOX } from '../data/lugaresGoToX';
import { useResolvedPlacePhotos } from '../shared/services/place-photos-service';
import { LugarFoto } from '../components/LugarFoto';
import { esFavorito, alternarFavorito } from '../servicios/almacenamientoCliente';
import { useTema } from '../context/TemaContext';
import {
  Search,
  Filter,
  MapPin,
  Clock,
  Volume2,
  ShieldCheck,
  Heart,
  Dog,
  Compass,
  Map as MapIcon,
  ListFilter,
  CheckCircle2,
  DollarSign,
  CloudRain,
  Sun,
  Accessibility,
  ArrowRight,
  Utensils,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function ExplorarPage() {
  const { esClaro, esMorado, esOscuro } = useTema();

  // Estados de filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroZona, setFiltroZona] = useState('todas');
  const [filtroPrecio, setFiltroPrecio] = useState('todos');
  const [filtroTiempo, setFiltroTiempo] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroClima, setFiltroClima] = useState('todos');
  const [filtroPet, setFiltroPet] = useState('todos');
  const [filtroAccesibilidad, setFiltroAccesibilidad] = useState({
    rampa: false,
    sillaRuedas: false,
    acusticaTranquila: false
  });

  const [mostrarMapaComplementario, setMostrarMapaComplementario] = useState(false);
  const [lugarSeleccionado, setLugarSeleccionado] = useState(null);
  const [favoritosTrigger, setFavoritosTrigger] = useState(0);
  const [restaurantesReales, setRestaurantesReales] = useState([]);
  const [cargandoReales, setCargandoReales] = useState(false);
  const { lugaresConFotos, cargandoFotos } = useResolvedPlacePhotos(LUGARES_GOTOX);

  useEffect(() => {
    let cancelado = false;
    const cargar = async (lat, lng) => {
      setCargandoReales(true);
      try {
        const res = await fetch(`/api/places/nearby-real?lat=${lat}&lng=${lng}&radius=2200&limit=12`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelado && Array.isArray(json?.data?.restaurants)) {
          setRestaurantesReales(json.data.restaurants);
        }
      } catch (err) {
        // Ignorar error de red
      } finally {
        if (!cancelado) setCargandoReales(false);
      }
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => cargar(pos.coords.latitude, pos.coords.longitude),
        () => cargar(9.9352, -84.0695),
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
      );
    } else {
      cargar(9.9352, -84.0695);
    }

    return () => {
      cancelado = true;
    };
  }, []);

  // Zonas únicas disponibles
  const zonasDisponibles = useMemo(() => {
    const setZonas = new Set(LUGARES_GOTOX.map(l => l.zona));
    return ['todas', ...Array.from(setZonas)];
  }, []);

  // Filtrado compuesto
  const lugaresFiltrados = useMemo(() => {
    return lugaresConFotos.filter(lugar => {
      // Búsqueda por texto
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const coincide =
          lugar.nombre.toLowerCase().includes(q) ||
          lugar.zona.toLowerCase().includes(q) ||
          lugar.descripcion.toLowerCase().includes(q) ||
          lugar.categoria.toLowerCase().includes(q);
        if (!coincide) return false;
      }

      // Filtro de Zona
      if (filtroZona !== 'todas' && lugar.zona !== filtroZona) return false;

      // Filtro de Presupuesto
      if (filtroPrecio !== 'todos' && lugar.precioNivel !== filtroPrecio) return false;

      // Filtro de Tiempo
      if (filtroTiempo !== 'todos') {
        if (filtroTiempo === 'corto' && !lugar.tiempoEstimado.includes('Menos')) return false;
        if (filtroTiempo === 'medio' && !lugar.tiempoEstimado.includes('1 - 2')) return false;
        if (filtroTiempo === 'largo' && !lugar.tiempoEstimado.includes('Tarde')) return false;
      }

      // Filtro de Tipo
      if (filtroTipo !== 'todos' && lugar.tipoActividad !== filtroTipo) return false;

      // Filtro de Clima
      if (filtroClima !== 'todos') {
        if (filtroClima === 'techo' && lugar.condicionClima !== 'bajo-techo' && lugar.condicionClima !== 'terraza-techada') return false;
        if (filtroClima === 'aire-libre' && lugar.condicionClima !== 'aire-libre') return false;
      }

      // Filtro Pet-Friendly
      if (filtroPet !== 'todos') {
        if (filtroPet === 'si' && lugar.petFriendly !== 'si') return false;
        if (filtroPet === 'solo-humanos' && lugar.petFriendly !== 'solo-humanos') return false;
      }

      // Filtro de Accesibilidad
      if (filtroAccesibilidad.rampa && !lugar.accesibilidad?.rampa) return false;
      if (filtroAccesibilidad.sillaRuedas && !lugar.accesibilidad?.sillaRuedas) return false;
      if (filtroAccesibilidad.acusticaTranquila && !lugar.accesibilidad?.acusticaTranquila) return false;

      return true;
    });
  }, [lugaresConFotos, busqueda, filtroZona, filtroPrecio, filtroTiempo, filtroTipo, filtroClima, filtroPet, filtroAccesibilidad]);

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroZona('todas');
    setFiltroPrecio('todos');
    setFiltroTiempo('todos');
    setFiltroTipo('todos');
    setFiltroClima('todos');
    setFiltroPet('todos');
    setFiltroAccesibilidad({ rampa: false, sillaRuedas: false, acusticaTranquila: false });
  };

  const hayFiltrosActivos =
    busqueda ||
    filtroZona !== 'todas' ||
    filtroPrecio !== 'todos' ||
    filtroTiempo !== 'todos' ||
    filtroTipo !== 'todos' ||
    filtroClima !== 'todos' ||
    filtroPet !== 'todos' ||
    filtroAccesibilidad.rampa ||
    filtroAccesibilidad.sillaRuedas ||
    filtroAccesibilidad.acusticaTranquila;

  return (
    <PageWrapper className="space-y-8">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-current/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#501228] text-white border border-[#F27B91]/30 mb-2">
            <Compass className="w-3.5 h-3.5 text-[#F27B91]" />
            <span>Catálogo Urbano GAM</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
            Explora Lugares & Experiencias
          </h1>
          <p className="text-sm opacity-75 mt-1 font-sans">
            Encuentra tu próximo plan gastronómico, cultural o al aire libre en el Gran Área Metropolitana.
          </p>
        </div>

        {/* Botón Toggle para Mapa Complementario */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMostrarMapaComplementario(!mostrarMapaComplementario)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
              mostrarMapaComplementario
                ? 'bg-[#501228] text-white border-[#F27B91]/40'
                : 'border-current/20 hover:bg-current/5'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>{mostrarMapaComplementario ? 'Ocultar Mapa' : 'Ver Mapa Complementario'}</span>
          </button>
        </div>
      </div>

      {/* MAPA COMPLEMENTARIO (OPCIONAL) */}
      {mostrarMapaComplementario && (
        <div className="rounded-3xl overflow-hidden border border-current/15 shadow-xl p-4 bg-current/5 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>Mapa complementario de ubicaciones en el GAM</span>
            </span>
            <Link to="/mapa" className="text-[#F27B91] hover:underline font-semibold">
              Abrir Radar 3D Interactivo &rarr;
            </Link>
          </div>
          <div className="h-64 sm:h-80 rounded-2xl overflow-hidden bg-slate-900 relative flex items-center justify-center text-center p-6 text-white">
            <div className="space-y-3 max-w-md">
              <Compass className="w-10 h-10 text-[#F27B91] mx-auto animate-spin" style={{ animationDuration: '20s' }} />
              <h3 className="font-serif font-bold text-lg">Visualización Cartográfica GAM</h3>
              <p className="text-xs text-slate-300">
                Mostrando {lugaresFiltrados.length} establecimientos sincronizados con telemetría de pavimento y niveles acústicos.
              </p>
              <Link
                to="/mapa"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#501228] text-white hover:bg-[#6E1E3A] border border-[#F27B91]/40"
              >
                <span>Explorar en Pantalla Completa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* PANEL DE FILTROS COMPLETOS */}
      <div className={`p-6 rounded-3xl border shadow-sm space-y-5 transition-colors ${
        esClaro ? 'bg-white border-slate-200' : esMorado ? 'bg-[#180A14] border-[#F27B91]/20' : 'bg-[#111827] border-white/10'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-current/10">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#F27B91]" />
            <span className="font-bold text-sm">Filtros de Búsqueda</span>
            <span className="text-xs opacity-60">({lugaresFiltrados.length} resultados)</span>
          </div>

          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors"
            >
              Limpiar todos los filtros &times;
            </button>
          )}
        </div>

        {/* Buscador de Texto */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, zona (Escalante, Amón...), cocina o especialidad..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-current/15 bg-transparent text-xs sm:text-sm outline-none focus:border-[#F27B91]"
          />
        </div>

        {/* Grilla de Controles de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Zona */}
          <div className="space-y-1">
            <label className="font-semibold opacity-70 block">Ubicación / Barrio</label>
            <select
              value={filtroZona}
              onChange={(e) => setFiltroZona(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-current/15 bg-transparent outline-none"
            >
              <option value="todas">Todas las Zonas</option>
              {zonasDisponibles.filter(z => z !== 'todas').map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          {/* Presupuesto */}
          <div className="space-y-1">
            <label className="font-semibold opacity-70 block">Presupuesto</label>
            <select
              value={filtroPrecio}
              onChange={(e) => setFiltroPrecio(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-current/15 bg-transparent outline-none"
            >
              <option value="todos">Cualquier Presupuesto</option>
              <option value="$">Económico ($)</option>
              <option value="$$">Moderado ($$)</option>
              <option value="$$$">Premium ($$$)</option>
            </select>
          </div>

          {/* Tipo de Actividad */}
          <div className="space-y-1">
            <label className="font-semibold opacity-70 block">Tipo de Actividad</label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-current/15 bg-transparent outline-none"
            >
              <option value="todos">Todas las Actividades</option>
              <option value="gastronomia">Gastronomía & Bistro</option>
              <option value="cafe">Café & Brunch</option>
              <option value="aire-libre">Parques & Aire Libre</option>
              <option value="cultural">Cultura & Museos</option>
            </select>
          </div>

          {/* Tiempo Disponible */}
          <div className="space-y-1">
            <label className="font-semibold opacity-70 block">Tiempo Disponible</label>
            <select
              value={filtroTiempo}
              onChange={(e) => setFiltroTiempo(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-current/15 bg-transparent outline-none"
            >
              <option value="todos">Cualquier Duración</option>
              <option value="corto">Menos de 1 hora</option>
              <option value="medio">1 - 2 horas</option>
              <option value="largo">Tarde completa (3h+)</option>
            </select>
          </div>

          {/* Clima */}
          <div className="space-y-1">
            <label className="font-semibold opacity-70 block">Condición Climática</label>
            <select
              value={filtroClima}
              onChange={(e) => setFiltroClima(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-current/15 bg-transparent outline-none"
            >
              <option value="todos">Cualquier Clima</option>
              <option value="techo">Bajo Techo (Protección de Lluvia)</option>
              <option value="aire-libre">Al Aire Libre (Soleado)</option>
            </select>
          </div>

          {/* Compañía / Pet-Friendly */}
          <div className="space-y-1">
            <label className="font-semibold opacity-70 block">Compañía / Mascotas</label>
            <select
              value={filtroPet}
              onChange={(e) => setFiltroPet(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-current/15 bg-transparent outline-none"
            >
              <option value="todos">Todos (Con y sin mascota)</option>
              <option value="si">Solo Lugares Pet-Friendly</option>
              <option value="solo-humanos">Solo para Humanos (Sin mascotas)</option>
            </select>
          </div>

          {/* Accesibilidad Confirmada Checkboxes */}
          <div className="sm:col-span-2 space-y-1">
            <label className="font-semibold opacity-70 block">Accesibilidad Confirmada</label>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filtroAccesibilidad.rampa}
                  onChange={(e) => setFiltroAccesibilidad({ ...filtroAccesibilidad, rampa: e.target.checked })}
                  className="rounded accent-[#501228]"
                />
                <span>Rampa</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filtroAccesibilidad.sillaRuedas}
                  onChange={(e) => setFiltroAccesibilidad({ ...filtroAccesibilidad, sillaRuedas: e.target.checked })}
                  className="rounded accent-[#501228]"
                />
                <span>Silla de Ruedas</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filtroAccesibilidad.acusticaTranquila}
                  onChange={(e) => setFiltroAccesibilidad({ ...filtroAccesibilidad, acusticaTranquila: e.target.checked })}
                  className="rounded accent-[#501228]"
                />
                <span>Ambiente Tranquilo (&le;50 dB)</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* CATÁLOGO DE RESULTADOS (LISTA INDEPENDIENTE SIN MAPA) */}
      <div className="space-y-4">
        {lugaresFiltrados.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-current/10 space-y-3">
            <Compass className="w-12 h-12 opacity-30 mx-auto" />
            <h3 className="font-serif font-bold text-lg">No encontramos lugares con esos filtros</h3>
            <p className="text-xs opacity-60">Intenta reiniciar los filtros para ver todo el catálogo disponible.</p>
            <button
              type="button"
              onClick={limpiarFiltros}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#501228] text-white"
            >
              Ver todos los lugares
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lugaresFiltrados.map((lugar) => {
              const fav = esFavorito(lugar.id);
              return (
                <div
                  key={lugar.id}
                  className={`rounded-3xl border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between ${
                    esClaro ? 'bg-white border-slate-200' : esMorado ? 'bg-[#180A14] border-[#F27B91]/20' : 'bg-[#111827] border-white/10'
                  }`}
                >
                  {/* Foto de Portada con Badge */}
                  <div
                    onClick={() => setLugarSeleccionado(lugar)}
                    className="relative h-48 w-full overflow-hidden cursor-pointer bg-slate-900 group"
                  >
                    <LugarFoto
                      src={lugar.imagen}
                      alt={lugar.nombre}
                      photoMeta={lugar.photoMeta}
                      cargando={cargandoFotos}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 text-slate-900 shadow-md">
                        {lugar.precioNivel} &bull; {lugar.zona}
                      </span>
                      {lugar.verificado && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-md flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verificado</span>
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        alternarFavorito(lugar.id);
                        setFavoritosTrigger(v => v + 1);
                      }}
                      title={fav ? "Quitar de favoritos" : "Guardar en favoritos"}
                      className="absolute top-3 right-3 p-2.5 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-all active:scale-90 z-10"
                    >
                      <Heart className={`w-4 h-4 ${fav ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>

                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs">
                      <span className="text-[11px] opacity-90 truncate">{lugar.categoria}</span>
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{lugar.decibelios} dB</span>
                      </span>
                    </div>
                  </div>

                  {/* Detalle del Card */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h3
                        onClick={() => setLugarSeleccionado(lugar)}
                        className="font-serif font-bold text-lg hover:text-[#F27B91] cursor-pointer transition-colors"
                      >
                        {lugar.nombre}
                      </h3>
                      <p className="text-xs opacity-75 line-clamp-2 leading-relaxed">
                        {lugar.descripcion}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-current/10 text-xs">
                      <div className="flex items-center justify-between opacity-80 text-[11px]">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{lugar.horario}</span>
                        </span>
                        <span>{lugar.tiempoEstimado}</span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div>
                          {lugar.petFriendly === 'si' ? (
                            <span className="text-[11px] text-emerald-500 font-bold flex items-center gap-1">
                              <Dog className="w-3.5 h-3.5" />
                              <span>Pet-friendly</span>
                            </span>
                          ) : (
                            <span className="text-[11px] opacity-60">Solo para humanos</span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setLugarSeleccionado(lugar)}
                          className="px-3 py-1.5 rounded-xl font-bold text-xs bg-[#501228] text-white hover:bg-[#6E1E3A] border border-[#F27B91]/30 transition-all shadow-xs"
                        >
                          Ver Ficha Completa
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Restaurantes y Cafés Reales cercanos (OpenStreetMap) */}
      <div className="space-y-4 pt-4 border-t border-current/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-2xl font-bold tracking-tight flex items-center gap-2">
              <Utensils className="w-5 h-5 text-orange-400" />
              <span>Restaurantes Reales cerca de ti ({restaurantesReales.length})</span>
            </h2>
            <p className="text-xs opacity-70">
              Lugares reales consultados en OpenStreetMap según tu ubicación actual.
            </p>
          </div>
          <Link
            to="/mapa"
            className="text-xs font-bold text-[#F27B91] hover:underline flex items-center gap-1"
          >
            <span>Ver todos en el Mapa Interactivo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {cargandoReales && restaurantesReales.length === 0 ? (
          <div className="p-6 rounded-2xl border border-current/10 text-center text-xs opacity-70">
            Cargando restaurantes reales cercanos...
          </div>
        ) : restaurantesReales.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {restaurantesReales.slice(0, 9).map((rest) => (
              <div
                key={rest.id}
                className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between gap-3 ${
                  esClaro
                    ? 'bg-white border-slate-200'
                    : esMorado
                    ? 'bg-[#180A14] border-[#F27B91]/20'
                    : 'bg-[#111827] border-white/10'
                }`}
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 block">
                    {rest.category === 'cafe' ? 'Cafetería Real' : 'Restaurante Real'}
                  </span>
                  <h3 className="font-serif font-bold text-base leading-snug">{rest.name}</h3>
                  <p className="text-[11px] opacity-75 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{rest.address}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-current/10 text-xs">
                  <span className="text-[10px] opacity-70">
                    {rest.pet_friendly === 'si' ? 'Mascotas: Sí' : 'Mascotas: Consultar'}
                  </span>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${rest.lat},${rest.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-colors"
                  >
                    <span>Cómo llegar</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Modal Interactivo de Ficha de Establecimiento */}
      {lugarSeleccionado && (
        <ModalDetalleLugar
          lugar={lugarSeleccionado}
          onClose={() => setLugarSeleccionado(null)}
          onFavoritoCambiado={() => setFavoritosTrigger(v => v + 1)}
        />
      )}
    </PageWrapper>
  );
}
export default ExplorarPage;
