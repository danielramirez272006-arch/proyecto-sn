import React, { useState, useMemo } from 'react';
import { TelemetriaHero } from '../components/TelemetriaHero';
import { RadarTerrazas } from '../components/RadarTerrazas';
import { CopilotoBruno } from '../components/CopilotoBruno';
import { RuletaVideos } from '../components/RuletaVideos';
import { PageWrapper } from '../components/PageWrapper';
import { ModalDetalleLugar } from '../components/ModalDetalleLugar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { LUGARES_GOTOX, CATEGORIAS_DESCUBRIMIENTO, CONSULTAS_RAPIDAS_SUGERIDAS } from '../data/lugaresGoToX';
import { esFavorito, alternarFavorito } from '../servicios/almacenamientoCliente';
import { useTema } from '../context/TemaContext';
import { useSesion } from '../hooks/useSesion';
import {
  ShieldCheck,
  Navigation,
  Award,
  ArrowRight,
  Sparkles,
  Search,
  Mic,
  MicOff,
  MapPin,
  Clock,
  Compass,
  UtensilsCrossed,
  Coffee,
  Trees,
  Landmark,
  Dog,
  CloudRain,
  Heart,
  CalendarPlus,
  Volume2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function Home() {
  const navigate = useNavigate();
  const { esClaro, esMorado, esOscuro } = useTema();
  const { isLoggedIn } = useSesion();

  // Estados del Buscador Inteligente
  const [consulta, setConsulta] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [escuchandoVoz, setEscuchandoVoz] = useState(false);
  const [ubicacionUsuario, setUbicacionUsuario] = useState('San José Este (Escalante / San Pedro)');
  const [detectandoGps, setDetectandoGps] = useState(false);
  const [lugarSeleccionado, setLugarSeleccionado] = useState(null);
  const [favoritosVersion, setFavoritosVersion] = useState(0);

  // Reconocimiento de Voz nativo del navegador (Web Speech API)
  const alternarVoz = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Tu navegador no soporta entrada de voz por Speech API. Puedes escribir tu consulta en el buscador.');
      return;
    }

    if (escuchandoVoz) {
      setEscuchandoVoz(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognizer = new SpeechRecognition();
    recognizer.lang = 'es-CR';
    recognizer.continuous = false;
    recognizer.interimResults = false;

    recognizer.onstart = () => {
      setEscuchandoVoz(true);
    };

    recognizer.onresult = (event) => {
      const texto = event.results[0][0].transcript;
      setConsulta(texto);
      setEscuchandoVoz(false);
    };

    recognizer.onerror = () => {
      setEscuchandoVoz(false);
    };

    recognizer.onend = () => {
      setEscuchandoVoz(false);
    };

    recognizer.start();
  };

  // Geolocalización del navegador
  const detectarUbicacionReal = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no permite geolocalización.');
      return;
    }
    setDetectandoGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacionUsuario(`Ubicación GPS detectada (±${Math.round(pos.coords.accuracy)}m)`);
        setDetectandoGps(false);
      },
      () => {
        setUbicacionUsuario('San José Centro, Costa Rica');
        setDetectandoGps(false);
      },
      { timeout: 7000 }
    );
  };

  // Procesamiento de consultas naturales y filtrado reactivo
  const lugaresFiltrados = useMemo(() => {
    let res = [...LUGARES_GOTOX];
    const q = consulta.toLowerCase().trim();

    // Filtro por categoría seleccionada
    if (categoriaSeleccionada !== 'todas') {
      if (categoriaSeleccionada === 'pet-friendly') {
        res = res.filter(l => l.petFriendly === 'si');
      } else if (categoriaSeleccionada === 'bajo-techo') {
        res = res.filter(l => l.condicionClima === 'bajo-techo' || l.condicionClima === 'terraza-techada');
      } else {
        res = res.filter(l => l.tipoActividad === categoriaSeleccionada);
      }
    }

    // Filtro por consulta en lenguaje natural
    if (q) {
      if (q.includes('comer') || q.includes('almuerzo') || q.includes('cena')) {
        res = res.filter(l => l.tipoActividad === 'gastronomia' || l.categoria.toLowerCase().includes('comida'));
      } else if (q.includes('econ') || q.includes('barato')) {
        res = res.filter(l => l.precioNivel === '$');
      } else if (q.includes('perro') || q.includes('mascota')) {
        res = res.filter(l => l.petFriendly === 'si');
      } else if (q.includes('techo') || q.includes('lluvia') || q.includes('aguacero')) {
        res = res.filter(l => l.condicionClima === 'bajo-techo' || l.condicionClima === 'terraza-techada');
      } else if (q.includes('dos horas') || q.includes('2 horas') || q.includes('rapido') || q.includes('tiempo')) {
        res = res.filter(l => l.tiempoEstimado.includes('1') || l.tiempoEstimado.includes('Menos'));
      } else {
        res = res.filter(l =>
          l.nombre.toLowerCase().includes(q) ||
          l.zona.toLowerCase().includes(q) ||
          l.descripcion.toLowerCase().includes(q) ||
          l.categoria.toLowerCase().includes(q)
        );
      }
    }

    return res;
  }, [consulta, categoriaSeleccionada]);

  const mapIconoCategoria = (icono) => {
    switch (icono) {
      case 'UtensilsCrossed': return UtensilsCrossed;
      case 'Coffee': return Coffee;
      case 'Trees': return Trees;
      case 'Landmark': return Landmark;
      case 'Dog': return Dog;
      case 'CloudRain': return CloudRain;
      default: return Compass;
    }
  };

  return (
    <PageWrapper className="space-y-10">
      {/* ============================================================
          SECCIÓN 1. BUSCADOR INTELIGENTE: «¿Qué puedo hacer hoy cerca de mí?»
          ============================================================ */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-10 border border-current/10 bg-gradient-to-b from-[#55152D]/15 via-transparent to-transparent text-left space-y-6">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-[#501228] text-white border border-[#F27B91]/30 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#F27B91]" />
            <span>Descubrimiento Inteligente GAM &bull; Personas & Mascotas</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            ¿Qué puedo hacer hoy cerca de mí?
          </h1>

          <p className="text-sm sm:text-base opacity-75 font-sans leading-relaxed">
            Explora restaurantes, cafeterías de especialidad, actividades culturales bajo techo y espacios verdes en el GAM según tu presupuesto, tiempo disponible y compañía.
          </p>

          {/* Barra de Ubicación Activa con Geodetección */}
          <div className="flex items-center gap-2 text-xs pt-1">
            <button
              type="button"
              onClick={detectarUbicacionReal}
              disabled={detectandoGps}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-current/15 hover:border-[#F27B91] hover:bg-current/5 transition-all"
            >
              <MapPin className={`w-3.5 h-3.5 text-rose-500 ${detectandoGps ? 'animate-bounce' : ''}`} />
              <span>{detectandoGps ? 'Calculando GPS...' : ubicacionUsuario}</span>
            </button>
            <span className="text-[11px] opacity-50">&bull; Haz clic para actualizar</span>
          </div>
        </div>

        {/* Barra de Búsqueda Inteligente */}
        <div className="space-y-3">
          <div className={`flex items-center gap-2 p-2 rounded-2xl border shadow-lg transition-all ${
            esClaro
              ? 'bg-white border-slate-200 focus-within:ring-2 focus-within:ring-[#501228]/20'
              : esMorado
              ? 'bg-[#1F0C18] border-[#F27B91]/30 focus-within:ring-2 focus-within:ring-[#F27B91]/30'
              : 'bg-[#162032] border-white/10 focus-within:ring-2 focus-within:ring-white/20'
          }`}>
            <Search className="w-5 h-5 opacity-40 ml-2 shrink-0" />
            <input
              type="text"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder="Consulta natural (ej. Quiero salir con mi perro, algo económico, dos horas libres)..."
              className="w-full bg-transparent text-sm sm:text-base outline-none px-2 py-1 placeholder:opacity-40"
            />
            {consulta && (
              <button
                type="button"
                onClick={() => setConsulta('')}
                className="text-xs px-2 py-1 rounded-md opacity-60 hover:opacity-100"
              >
                Limpiar
              </button>
            )}
            <button
              type="button"
              onClick={alternarVoz}
              title={escuchandoVoz ? 'Detener voz' : 'Hablar por micrófono'}
              className={`p-2.5 rounded-xl transition-all shrink-0 ${
                escuchandoVoz
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-current/5 hover:bg-current/10 border border-current/10'
              }`}
            >
              {escuchandoVoz ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>

          {/* Chips de Consultas Naturales Sugeridas */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase font-bold opacity-60 mr-1">Prueba rápida:</span>
            {CONSULTAS_RAPIDAS_SUGERIDAS.map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setConsulta(sug.texto)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  consulta === sug.texto
                    ? 'bg-[#501228] text-white border-[#F27B91]/40 font-semibold'
                    : 'bg-current/5 border-current/10 hover:border-current/25 opacity-80 hover:opacity-100'
                }`}
              >
                {sug.texto}
              </button>
            ))}
          </div>
        </div>

        {/* Categorías de Descubrimiento */}
        <div className="pt-2">
          <div className="flex gap-2 overflow-x-auto pb-2 gotox-scrollbar">
            {CATEGORIAS_DESCUBRIMIENTO.map((cat) => {
              const Icono = mapIconoCategoria(cat.icon);
              const activa = categoriaSeleccionada === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoriaSeleccionada(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap border transition-all shrink-0 ${
                    activa
                      ? 'bg-[#501228] text-white border-[#F27B91]/40 shadow-sm'
                      : 'bg-current/5 border-current/10 opacity-70 hover:opacity-100 hover:bg-current/10'
                  }`}
                >
                  <Icono className="w-4 h-4" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resultados del Buscador Inteligente en Tiempo Real */}
        <div className="pt-4 border-t border-current/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-lg">
                Recomendaciones ({lugaresFiltrados.length})
              </span>
              <span className="text-xs opacity-60">filtradas por cercanía y preferencia</span>
            </div>
            <Link
              to={isLoggedIn ? "/explorar" : "/terrazas"}
              className="text-xs font-bold text-[#F27B91] hover:underline flex items-center gap-1"
            >
              <span>{isLoggedIn ? 'Ver catálogo completo con filtros' : 'Ver terrazas verificadas'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {lugaresFiltrados.slice(0, 6).map((lugar) => {
              const fav = esFavorito(lugar.id);
              return (
                <div
                  key={lugar.id}
                  className={`group rounded-3xl border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between ${
                    esClaro
                      ? 'bg-white border-slate-200'
                      : esMorado
                      ? 'bg-[#1F0C18] border-[#F27B91]/20 hover:border-[#F27B91]/40'
                      : 'bg-[#162032] border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Foto de Portada */}
                  <div
                    onClick={() => setLugarSeleccionado(lugar)}
                    className="relative h-44 w-full overflow-hidden cursor-pointer bg-slate-800"
                  >
                    <img
                      src={lugar.imagen}
                      alt={lugar.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/90 text-slate-900 backdrop-blur-sm">
                        {lugar.precioNivel} &bull; {lugar.zona}
                      </span>
                    </div>

                    {isLoggedIn && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          alternarFavorito(lugar.id);
                          setFavoritosVersion(v => v + 1);
                        }}
                        title={fav ? "Quitar de favoritos" : "Guardar en favoritos"}
                        className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-all active:scale-90"
                      >
                        <Heart className={`w-4 h-4 ${fav ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </button>
                    )}

                    <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-white text-xs">
                      <span className="text-[11px] opacity-90 truncate">{lugar.categoria}</span>
                      <span className="font-bold flex items-center gap-1 text-emerald-400">
                        {lugar.decibelios} dB
                      </span>
                    </div>
                  </div>

                  {/* Cuerpo de la tarjeta */}
                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h3
                        onClick={() => setLugarSeleccionado(lugar)}
                        className="font-serif font-bold text-base hover:text-[#F27B91] cursor-pointer transition-colors"
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
                        className="text-xs font-bold text-[#F27B91] hover:underline"
                      >
                        Ver detalles &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modal Interactivo de Ficha de Establecimiento */}
      {lugarSeleccionado && (
        <ModalDetalleLugar
          lugar={lugarSeleccionado}
          onClose={() => setLugarSeleccionado(null)}
          onFavoritoCambiado={() => setFavoritosVersion(v => v + 1)}
        />
      )}

      {/* ============================================================
          SECCIÓN 2. TELEMETRÍA URBANA EN VIVO & COPILOTO
          ============================================================ */}
      <TelemetriaHero />

      {/* ============================================================
          SECCIÓN 3. RECOMENDACIÓN DE VIDEOS EDUCATIVOS
          ============================================================ */}
      <RuletaVideos />

      {/* ============================================================
          SECCIÓN 4. TRES PILARES URBANOS DE GOTOX
          ============================================================ */}
      <section className="py-10 border-y border-current/10">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className={`flex items-start gap-4 p-5 rounded-3xl border transition-colors shadow-sm ${
              esClaro ? 'bg-white border-slate-200' : 'bg-[#162032] border-white/5'
            }`}>
              <div className="w-11 h-11 rounded-2xl bg-[#55152D] text-[#F27B91] border border-[#F27B91]/25 flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif font-bold text-lg">Protección Podal Canina</h3>
                <p className="text-xs opacity-75 leading-relaxed">
                  El asfalto oscuro en San José supera los 50 °C al mediodía. Alertamos cuando excede el umbral seguro de 26 °C.
                </p>
              </div>
            </div>

            <div className={`flex items-start gap-4 p-5 rounded-3xl border transition-colors shadow-sm ${
              esClaro ? 'bg-white border-slate-200' : 'bg-[#162032] border-white/5'
            }`}>
              <div className="w-11 h-11 rounded-2xl bg-[#55152D] text-[#F27B91] border border-[#F27B91]/25 flex items-center justify-center shrink-0 shadow-xs">
                <Navigation className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif font-bold text-lg">Rutas Acústicamente Limpias</h3>
                <p className="text-xs opacity-75 leading-relaxed">
                  Cartografía de decibelios para evitar escapes por pánico o estrés auditivo en zonas de alta congestión del GAM.
                </p>
              </div>
            </div>

            <div className={`flex items-start gap-4 p-5 rounded-3xl border transition-colors shadow-sm ${
              esClaro ? 'bg-white border-slate-200' : 'bg-[#162032] border-white/5'
            }`}>
              <div className="w-11 h-11 rounded-2xl bg-[#55152D] text-[#F27B91] border border-[#F27B91]/25 flex items-center justify-center shrink-0 shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif font-bold text-lg">Certificación en Terrazas</h3>
                <p className="text-xs opacity-75 leading-relaxed">
                  Cada local auditado garantiza bowls higienizados, agua fría de recambio continuo y anclajes seguros en mesa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECCIÓN 5. RADAR DE TERRAZAS Y COPILOTO BRUNO
          ============================================================ */}
      <RadarTerrazas />
      <CopilotoBruno />

      {/* ============================================================
          SECCIÓN 6. BANNER DE LLAMADO A LA ACCIÓN
          ============================================================ */}
      <section className="py-12 relative overflow-hidden">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
          <div className="relative rounded-3xl p-8 sm:p-12 overflow-hidden border border-[#F27B91]/25 bg-gradient-to-r from-[#55152D] via-[#3d0f20] to-[#111827] text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 text-left">
            <div className="max-w-xl space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-semibold tracking-wide uppercase text-[#F27B91] border border-white/15">
                <Sparkles className="w-3 h-3" />
                Experiencia Integral GoToX
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white">
                Descubre planes y organiza tus salidas en el GAM
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Tanto si sales en solitario, con amigos o con tu compañero de cuatro patas, GoToX sincroniza mapas, clima y recomendaciones en tiempo real.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              {isLoggedIn ? (
                <>
                  <Link to="/explorar" className="w-full sm:w-auto">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full sm:w-auto justify-center bg-white text-[#55152D] hover:bg-slate-100 border-transparent font-bold shadow-md"
                    >
                      Explorar Catálogo
                    </Button>
                  </Link>
                  <Link to="/mis-planes" className="w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto justify-center border-white/30 text-white hover:bg-white/10 font-semibold"
                    >
                      Crear Mi Primer Plan
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/mapa" className="w-full sm:w-auto">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="w-full sm:w-auto justify-center bg-white text-[#55152D] hover:bg-slate-100 border-transparent font-bold shadow-md"
                    >
                      Ver Mapa Interactivo
                    </Button>
                  </Link>
                  <Link to="/acceso" className="w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto justify-center border-white/30 text-white hover:bg-white/10 font-semibold"
                    >
                      Iniciar Sesión para Planes
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </PageWrapper>
  );
}
