import React, { useState, useEffect, useMemo } from 'react';
import { PageWrapper } from '../components/PageWrapper';
import { LUGARES_GOTOX } from '../data/lugaresGoToX';
import { obtenerFavoritosIds, alternarFavorito } from '../servicios/almacenamientoCliente';
import { ModalDetalleLugar } from '../components/ModalDetalleLugar';
import { useTema } from '../context/TemaContext';
import {
  Heart,
  Compass,
  MapPin,
  Volume2,
  Trash2,
  ArrowRight,
  Dog,
  Clock,
  Sparkles
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function FavoritosPage() {
  const { esClaro, esMorado, esOscuro } = useTema();
  const [favoritosIds, setFavoritosIds] = useState(obtenerFavoritosIds);
  const [lugarSeleccionado, setLugarSeleccionado] = useState(null);
  const [filtroCategoria, setFiltroCategoria] = useState('todas');

  useEffect(() => {
    const handleActualizacion = () => setFavoritosIds(obtenerFavoritosIds());
    window.addEventListener('gotox:favoritos', handleActualizacion);
    return () => window.removeEventListener('gotox:favoritos', handleActualizacion);
  }, []);

  const lugaresFavoritos = useMemo(() => {
    return LUGARES_GOTOX.filter(l => favoritosIds.includes(l.id));
  }, [favoritosIds]);

  const lugaresFiltrados = useMemo(() => {
    if (filtroCategoria === 'todas') return lugaresFavoritos;
    return lugaresFavoritos.filter(l => l.tipoActividad === filtroCategoria);
  }, [lugaresFavoritos, filtroCategoria]);

  const handleEliminar = (id, e) => {
    e.stopPropagation();
    alternarFavorito(id);
    setFavoritosIds(obtenerFavoritosIds());
  };

  return (
    <PageWrapper className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-current/10">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#501228] text-white border border-[#F27B91]/30 mb-2">
            <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
            <span>Colección Personal</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
            Mis Favoritos
          </h1>
          <p className="text-sm opacity-75 mt-1 font-sans">
            Tus establecimientos, terrazas y actividades guardadas para consultar en cualquier momento.
          </p>
        </div>

        <Link
          to="/explorar"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-current/20 hover:bg-current/5 transition-all self-start sm:self-auto"
        >
          <Compass className="w-4 h-4" />
          <span>Explorar Más Lugares</span>
        </Link>
      </div>

      {/* Filtros Rápidos */}
      {lugaresFavoritos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 gotox-scrollbar">
          <button
            type="button"
            onClick={() => setFiltroCategoria('todas')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filtroCategoria === 'todas'
                ? 'bg-[#501228] text-white border-[#F27B91]/40'
                : 'bg-current/5 border-current/10 opacity-70 hover:opacity-100'
            }`}
          >
            Todos ({lugaresFavoritos.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroCategoria('gastronomia')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filtroCategoria === 'gastronomia'
                ? 'bg-[#501228] text-white border-[#F27B91]/40'
                : 'bg-current/5 border-current/10 opacity-70 hover:opacity-100'
            }`}
          >
            Gastronomía
          </button>
          <button
            type="button"
            onClick={() => setFiltroCategoria('cafe')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filtroCategoria === 'cafe'
                ? 'bg-[#501228] text-white border-[#F27B91]/40'
                : 'bg-current/5 border-current/10 opacity-70 hover:opacity-100'
            }`}
          >
            Cafés
          </button>
          <button
            type="button"
            onClick={() => setFiltroCategoria('aire-libre')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filtroCategoria === 'aire-libre'
                ? 'bg-[#501228] text-white border-[#F27B91]/40'
                : 'bg-current/5 border-current/10 opacity-70 hover:opacity-100'
            }`}
          >
            Aire Libre
          </button>
          <button
            type="button"
            onClick={() => setFiltroCategoria('cultural')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filtroCategoria === 'cultural'
                ? 'bg-[#501228] text-white border-[#F27B91]/40'
                : 'bg-current/5 border-current/10 opacity-70 hover:opacity-100'
            }`}
          >
            Cultura
          </button>
        </div>
      )}

      {/* Grilla de Favoritos */}
      {lugaresFiltrados.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-current/10 space-y-4">
          <Heart className="w-12 h-12 opacity-30 mx-auto" />
          <h3 className="font-serif font-bold text-lg">No tienes lugares guardados en esta categoría</h3>
          <p className="text-xs opacity-60 max-w-sm mx-auto">
            Explora el catálogo urbano y haz clic en el icono de corazón para tenerlos a mano.
          </p>
          <Link
            to="/explorar"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#501228] text-white hover:bg-[#6E1E3A]"
          >
            <span>Ir al Catálogo de Lugares</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {lugaresFiltrados.map((lugar) => (
            <div
              key={lugar.id}
              className={`rounded-3xl border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between ${
                esClaro ? 'bg-white border-slate-200' : esMorado ? 'bg-[#180A14] border-[#F27B91]/20' : 'bg-[#111827] border-white/10'
              }`}
            >
              <div
                onClick={() => setLugarSeleccionado(lugar)}
                className="relative h-48 w-full overflow-hidden cursor-pointer bg-slate-900 group"
              >
                <img
                  src={lugar.imagen}
                  alt={lugar.nombre}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 text-slate-900 shadow-md">
                    {lugar.precioNivel} &bull; {lugar.zona}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(e) => handleEliminar(lugar.id, e)}
                  title="Quitar de favoritos"
                  className="absolute top-3 right-3 p-2.5 rounded-full bg-rose-600/80 hover:bg-rose-700 text-white backdrop-blur-md transition-all active:scale-90 z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs">
                  <span className="text-[11px] opacity-90 truncate">{lugar.categoria}</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{lugar.decibelios} dB</span>
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
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

                <div className="pt-2 border-t border-current/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {lugar.petFriendly === 'si' ? (
                      <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                        <Dog className="w-3.5 h-3.5" />
                        <span>Pet-friendly</span>
                      </span>
                    ) : (
                      <span className="text-[11px] opacity-60">Solo humanos</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setLugarSeleccionado(lugar)}
                    className="px-3 py-1.5 rounded-xl font-bold text-xs bg-[#501228] text-white hover:bg-[#6E1E3A] border border-[#F27B91]/30 transition-all shadow-xs"
                  >
                    Ver Ficha
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Detalle */}
      {lugarSeleccionado && (
        <ModalDetalleLugar
          lugar={lugarSeleccionado}
          onClose={() => setLugarSeleccionado(null)}
          onFavoritoCambiado={() => setFavoritosIds(obtenerFavoritosIds())}
        />
      )}
    </PageWrapper>
  );
}
export default FavoritosPage;
