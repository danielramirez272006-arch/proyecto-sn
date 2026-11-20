import React, { useState } from 'react';
import {
  X,
  MapPin,
  Clock,
  DollarSign,
  Volume2,
  ShieldCheck,
  Heart,
  CalendarPlus,
  Compass,
  Dog,
  ExternalLink,
  Phone,
  CheckCircle2,
  Users,
  LogIn
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTema } from '../context/TemaContext';
import { useSesion } from '../hooks/useSesion';
import { esFavorito, alternarFavorito, obtenerPlanes, agregarParadaAPlan } from '../servicios/almacenamientoCliente';
import { LugarFoto } from './LugarFoto';

export function ModalDetalleLugar({ lugar, onClose, onFavoritoCambiado }) {
  const { esClaro, esMorado, esOscuro } = useTema();
  const { isLoggedIn } = useSesion();
  const [favorito, setFavorito] = useState(() => (lugar ? esFavorito(lugar.id) : false));
  const [fotoActiva, setFotoActiva] = useState(0);
  const [modalPlanAbierto, setModalPlanAbierto] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');

  if (!lugar) return null;

  const galeria = Array.isArray(lugar.galeria) && lugar.galeria.length > 0
    ? lugar.galeria.filter(Boolean)
    : lugar.imagen
    ? [lugar.imagen]
    : [];

  const handleToggleFavorito = () => {
    const nuevos = alternarFavorito(lugar.id);
    setFavorito(nuevos.includes(lugar.id));
    if (onFavoritoCambiado) onFavoritoCambiado(lugar.id);
  };

  const handleAgregarAPlan = (planId) => {
    agregarParadaAPlan(planId, {
      lugarId: lugar.id,
      horaEstimada: "Por definir",
      duracionMinutos: 60,
      nota: `Parada en ${lugar.nombre}`
    });
    setModalPlanAbierto(false);
    setMensajeExito('¡Añadido a tu itinerario con éxito!');
    setTimeout(() => setMensajeExito(''), 3000);
  };

  const abrirEnGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lugar.lat},${lugar.lng}`;
    window.open(url, '_blank');
  };

  const planes = obtenerPlanes();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-3xl max-h-[92vh] overflow-y-auto gotox-scrollbar rounded-3xl border shadow-2xl transition-colors ${
          esClaro
            ? 'bg-white border-slate-200 text-slate-800'
            : esMorado
            ? 'bg-[#180A14] border-[#F27B91]/25 text-[#FDF2F6]'
            : 'bg-[#111827] border-white/10 text-[#E8EDF5]'
        }`}
      >
        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal"
          className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/50 hover:bg-black/80 text-white backdrop-blur-md transition-all active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Galería Superior */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-slate-900 rounded-t-3xl">
          <LugarFoto
            src={galeria[fotoActiva] || null}
            alt={lugar.nombre}
            photoMeta={lugar.photoMeta}
            className="w-full h-full object-cover transition-all duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

          {/* Badges Flotantes */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
            {lugar.verificado && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-md">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{lugar.insignia || 'Verificado GoToX'}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-slate-900 backdrop-blur-sm">
              <Compass className="w-3.5 h-3.5 text-[#501228]" />
              <span>{lugar.zona}</span>
            </span>
          </div>

          {/* Selector de Fotos si hay más de una */}
          {galeria.length > 1 && (
            <div className="absolute bottom-4 left-4 flex gap-2 z-10">
              {galeria.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFotoActiva(i)}
                  className={`w-12 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                    fotoActiva === i ? 'border-[#F27B91] scale-105' : 'border-white/50 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="Miniatura" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Botón Favorito Flotante (solo con sesión activa) */}
          {isLoggedIn && (
            <button
              type="button"
              onClick={handleToggleFavorito}
              title={favorito ? "Quitar de favoritos" : "Guardar en favoritos"}
              className="absolute bottom-4 right-4 z-10 p-3 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-md shadow-lg transition-transform active:scale-90"
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  favorito ? 'fill-rose-500 text-rose-500' : 'text-slate-600 dark:text-slate-200'
                }`}
              />
            </button>
          )}
        </div>

        {/* Contenido Editorial */}
        <div className="p-6 sm:p-8 space-y-6">
          {mensajeExito && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>{mensajeExito}</span>
            </div>
          )}

          {/* Encabezado Principal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-current/10">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-[#501228] dark:text-[#F27B91]">
                {lugar.categoria}
              </span>
              <h2 className="font-serif font-black text-2xl sm:text-3xl mt-0.5 tracking-tight">
                {lugar.nombre}
              </h2>
              <p className="text-xs opacity-75 flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>{lugar.direccion}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-3 py-1.5 rounded-xl font-bold text-sm bg-current/5 border border-current/10">
                {lugar.rangoPrecio || lugar.precioNivel}
              </span>
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider opacity-60">Sobre el Lugar</h3>
            <p className="text-sm leading-relaxed opacity-90 font-sans">
              {lugar.descripcion}
            </p>
          </div>

          {/* Métricas y Confort */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-current/5 border border-current/10 space-y-1">
              <div className="flex items-center gap-1 text-[11px] opacity-60">
                <Clock className="w-3.5 h-3.5" />
                <span>Horario</span>
              </div>
              <p className="text-xs font-bold truncate">{lugar.horario}</p>
            </div>

            <div className="p-3 rounded-2xl bg-current/5 border border-current/10 space-y-1">
              <div className="flex items-center gap-1 text-[11px] opacity-60">
                <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Acústica</span>
              </div>
              <p className="text-xs font-bold">{lugar.decibelios} dB ({lugar.nivelRuido})</p>
            </div>

            <div className="p-3 rounded-2xl bg-current/5 border border-current/10 space-y-1">
              <div className="flex items-center gap-1 text-[11px] opacity-60">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Aforo Canino</span>
              </div>
              <p className="text-xs font-bold">{lugar.aforoActual} / {lugar.aforoMax} plazas</p>
            </div>

            <div className="p-3 rounded-2xl bg-current/5 border border-current/10 space-y-1">
              <div className="flex items-center gap-1 text-[11px] opacity-60">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tiempo Sugerido</span>
              </div>
              <p className="text-xs font-bold">{lugar.tiempoEstimado}</p>
            </div>
          </div>

          {/* Políticas Pet-Friendly vs Solo Humanos */}
          <div className={`p-4 rounded-2xl border space-y-2 ${
            lugar.petFriendly === 'solo-humanos'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          }`}>
            <div className="flex items-center gap-2">
              <Dog className="w-4 h-4" />
              <span className="font-bold text-xs">
                {lugar.petFriendly === 'solo-humanos' ? 'Espacio Exclusivo para Humanos' : 'Política Pet-Friendly Verificada'}
              </span>
            </div>
            <p className="text-xs leading-relaxed opacity-90">
              {lugar.politicaPet}
            </p>
          </div>

          {/* Accesibilidad Confirmada */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider opacity-60">Accesibilidad Confirmada</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {lugar.accesibilidad?.rampa && (
                <span className="px-3 py-1 rounded-full bg-current/5 border border-current/10 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Rampa de acceso</span>
                </span>
              )}
              {lugar.accesibilidad?.sillaRuedas && (
                <span className="px-3 py-1 rounded-full bg-current/5 border border-current/10 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Apto para silla de ruedas</span>
                </span>
              )}
              {lugar.accesibilidad?.acusticaTranquila && (
                <span className="px-3 py-1 rounded-full bg-current/5 border border-current/10 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Ambiente acústicamente calmo</span>
                </span>
              )}
              {lugar.accesibilidad?.estacionamientoPreferencial && (
                <span className="px-3 py-1 rounded-full bg-current/5 border border-current/10 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Estacionamiento accesible</span>
                </span>
              )}
            </div>
          </div>

          {/* Servicios Destacados */}
          {lugar.servicios && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-60">Comodidades y Servicios</h3>
              <div className="flex flex-wrap gap-2">
                {lugar.servicios.map((s, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-current/5 border border-current/10">
                    &bull; {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Acciones de Pie */}
          <div className="pt-4 border-t border-current/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={abrirEnGoogleMaps}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-current/20 hover:bg-current/10 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Cómo Llegar (Maps)</span>
              </button>

              {lugar.telefono && (
                <a
                  href={`tel:${lugar.telefono}`}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-current/20 hover:bg-current/10 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Llamar</span>
                </a>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => setModalPlanAbierto(!modalPlanAbierto)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#501228] text-white hover:bg-[#6E1E3A] border border-[#F27B91]/30 transition-all shadow-md active:scale-95"
                >
                  <CalendarPlus className="w-4 h-4 text-[#F27B91]" />
                  <span>Añadir a Mis Planes</span>
                </button>
              ) : (
                <Link
                  to="/acceso"
                  onClick={onClose}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#501228] text-white hover:bg-[#6E1E3A] border border-[#F27B91]/30 transition-all shadow-md active:scale-95"
                >
                  <LogIn className="w-4 h-4 text-[#F27B91]" />
                  <span>Inicia sesión para guardar en Favoritos y Planes</span>
                </Link>
              )}
            </div>
          </div>

          {/* Selector de Plan si se activa */}
          {isLoggedIn && modalPlanAbierto && (
            <div className="p-4 rounded-2xl bg-current/5 border border-current/15 space-y-3 animate-in fade-in">
              <span className="text-xs font-bold block">Selecciona el plan donde deseas agregar este lugar:</span>
              <div className="space-y-2">
                {planes.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleAgregarAPlan(p.id)}
                    className="w-full text-left p-3 rounded-xl border border-current/10 hover:border-[#F27B91] hover:bg-current/5 flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <p className="font-bold">{p.titulo}</p>
                      <span className="opacity-60 text-[11px]">{p.paradas?.length || 0} paradas programadas</span>
                    </div>
                    <span className="text-xs font-bold text-[#F27B91]">+ Añadir</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
