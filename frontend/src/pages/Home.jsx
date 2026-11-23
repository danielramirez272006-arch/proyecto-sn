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
import { useResolvedPlacePhotos } from '../shared/services/place-photos-service';
import { useLiveMultisourcePlaces } from '../shared/services/multisource-places-service';
import { LugarFoto } from '../components/LugarFoto';
import { esFavorito, alternarFavorito } from '../servicios/almacenamientoCliente';
import { useTema } from '../context/TemaContext';
import { useSesion } from '../hooks/useSesion';
import { useIdioma } from '../context/IdiomaContext';
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
  Volume2,
  RefreshCw
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { geolocalizacionPermitida } from '../shared/utils/cookie-consent';

export function Home() {
  const navigate = useNavigate();
  const { esClaro, esMorado, esOscuro } = useTema();
  const { isLoggedIn } = useSesion();
  const { idioma, idiomaActual, t } = useIdioma();

  // Estados del Buscador Inteligente
  const [consulta, setConsulta] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('todas');
  const [escuchandoVoz, setEscuchandoVoz] = useState(false);
  const [ubicacionUsuario, setUbicacionUsuario] = useState(null);
  const [detectandoGps, setDetectandoGps] = useState(false);
  const [lugarSeleccionado, setLugarSeleccionado] = useState(null);
  const [favoritosVersion, setFavoritosVersion] = useState(0);

  const textoUbicacionVisible = ubicacionUsuario
    ? ubicacionUsuario.tipo === 'detectada'
      ? t('homeExt.ubicacionDetectada', { metros: ubicacionUsuario.metros })
      : t('homeExt.ubicacionFallback')
    : t('homeExt.ubicacionDefault');

  // Reconocimiento de Voz nativo del navegador (Web Speech API)
  const alternarVoz = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert(t('homeExt.alertNoVoz'));
      return;
    }

    if (escuchandoVoz) {
      setEscuchandoVoz(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognizer = new SpeechRecognition();
    recognizer.lang = idiomaActual?.ttsLang || 'es-CR';
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
      alert(t('homeExt.alertNoGps'));
      return;
    }
    if (!geolocalizacionPermitida({ accionExplicita: true })) {
      alert(t('homeExt.alertGeoDesactivada'));
      return;
    }
    setDetectandoGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacionUsuario({ tipo: 'detectada', metros: Math.round(pos.coords.accuracy) });
        setDetectandoGps(false);
      },
      () => {
        setUbicacionUsuario({ tipo: 'fallback' });
        setDetectandoGps(false);
      },
      { timeout: 7000 }
    );
  };

  const { lugaresConFotos, cargandoFotos } = useResolvedPlacePhotos(LUGARES_GOTOX);
  const { lugaresReales, cargandoReales, refrescarReales } = useLiveMultisourcePlaces({
    lat: 9.9352,
    lng: -84.0695,
    radius: 2200,
    limit: 10
  });

  const lugaresCombinados = useMemo(() => {
    const nombresExistentes = new Set(lugaresConFotos.map((l) => l.nombre.trim().toLowerCase()));
    const nuevosReales = lugaresReales.filter(
      (r) => r?.nombre && !nombresExistentes.has(r.nombre.trim().toLowerCase())
    );
    return [...lugaresConFotos, ...nuevosReales];
  }, [lugaresConFotos, lugaresReales]);

  // Procesamiento de consultas naturales y filtrado reactivo
  const lugaresFiltrados = useMemo(() => {
    let res = [...lugaresCombinados];
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

    // Filtro por consulta en lenguaje natural (compatible con chips traducidos)
    if (q) {
      const chipsIdx = [1, 2, 3, 4, 5, 6].findIndex(
        (n) => t(`homeExt.chipExtra${n}`).toLowerCase().trim() === q
      );
      if (chipsIdx === 0 || q.includes('comer') || q.includes('almuerzo') || q.includes('cena') || q.includes('eat') || q.includes('food')) {
        res = res.filter(l => l.tipoActividad === 'gastronomia' || l.categoria.toLowerCase().includes('comida'));
      } else if (chipsIdx === 1 || q.includes('econ') || q.includes('barato') || q.includes('cheap') || q.includes('budget')) {
        res = res.filter(l => l.precioNivel === '$');
      } else if (chipsIdx === 2 || q.includes('perro') || q.includes('mascota') || q.includes('dog') || q.includes('pet')) {
        res = res.filter(l => l.petFriendly === 'si');
      } else if (chipsIdx === 3 || q.includes('techo') || q.includes('lluvia') || q.includes('aguacero') || q.includes('indoor') || q.includes('rain')) {
        res = res.filter(l => l.condicionClima === 'bajo-techo' || l.condicionClima === 'terraza-techada');
      } else if (chipsIdx === 4 || q.includes('dos horas') || q.includes('2 horas') || q.includes('rapido') || q.includes('tiempo') || q.includes('2 hours') || q.includes('two hours')) {
        res = res.filter(l => l.tiempoEstimado.includes('1') || l.tiempoEstimado.includes('Menos'));
      } else if (chipsIdx === 5 || q.includes('café') || q.includes('cafe') || q.includes('coffee') || q.includes('trabaj') || q.includes('work')) {
        res = res.filter(l => l.categoria.toLowerCase().includes('caf') || l.descripcion.toLowerCase().includes('trabaj'));
      } else {
        res = res.filter(l =>
          l.nombre.toLowerCase().includes(q) ||
          l.zona.toLowerCase().includes(q) ||
          l.descripcion.toLowerCase().includes(q) ||
          l.categoria.toLowerCase().includes(q)
        );
      }
    }

    return res.sort((a, b) => {
      const aFoto = a.imagen ? 1 : 0;
      const bFoto = b.imagen ? 1 : 0;
      if (bFoto !== aFoto) return bFoto - aFoto;
      return (b.puntuacion || 0) - (a.puntuacion || 0);
    });
  }, [lugaresCombinados, consulta, categoriaSeleccionada, t]);

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
            <Sparkles className="w-3.5 h-3.5 text-[#F27B91]" aria-hidden="true" />
            <span>{t('home.badge')}</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            {t('home.titulo')}
          </h1>

          <p className="text-sm sm:text-base opacity-75 font-sans leading-relaxed">
            {t('home.subtitulo')}
          </p>

          {/* Barra de Ubicación Activa con Geodetección */}
          <div className="flex items-center gap-2 text-xs pt-1">
            <button
              type="button"
              onClick={detectarUbicacionReal}
              disabled={detectandoGps}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-current/15 hover:border-[#F27B91] hover:bg-current/5 transition-all"
            >
              <MapPin className={`w-3.5 h-3.5 text-rose-500 ${detectandoGps ? 'animate-bounce' : ''}`} aria-hidden="true" />
              <span>{detectandoGps ? t('home.gpsCalculando') : textoUbicacionVisible}</span>
            </button>
            <span className="text-[11px] opacity-50">&bull; {t('home.gpsClic')}</span>
          </div>
        </div>

        {/* Barra de Búsqueda Inteligente */}
        <div className="space-y-3">
          <div className={`flex items-center gap-2 p-2 rounded-2xl border shadow-lg transition-all ${esClaro
            ? 'bg-white border-slate-200 focus-within:ring-2 focus-within:ring-[#501228]/20'
            : esMorado
              ? 'bg-[#1F0C18] border-[#F27B91]/30 focus-within:ring-2 focus-within:ring-[#F27B91]/30'
              : 'bg-[#162032] border-white/10 focus-within:ring-2 focus-within:ring-white/20'
            }`}>
            <Search className="w-5 h-5 opacity-40 ml-2 shrink-0" aria-hidden="true" />
            <input
              type="text"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              aria-label={t('home.buscadorPlaceholder')}
              placeholder={t('home.buscadorPlaceholder')}
              className="w-full bg-transparent text-sm sm:text-base outline-none px-2 py-1 placeholder:opacity-40"
            />
            {consulta && (
              <button
                type="button"
                onClick={() => setConsulta('')}
                className="text-xs px-2 py-1 rounded-md opacity-60 hover:opacity-100"
              >
                {t('home.limpiar')}
              </button>
            )}
            <button
              type="button"
              onClick={alternarVoz}
              aria-label={escuchandoVoz ? t('home.microfonoDetener') : t('home.microfonoHablar')}
              title={escuchandoVoz ? t('home.microfonoDetener') : t('home.microfonoHablar')}
              className={`p-2.5 rounded-xl transition-all shrink-0 ${escuchandoVoz
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-current/5 hover:bg-current/10 border border-current/10'
                }`}
            >
              {escuchandoVoz ? <MicOff className="w-4 h-4" aria-hidden="true" /> : <Mic className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>

          {/* Chips de Consultas Naturales Sugeridas */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase font-bold opacity-60 mr-1">{t('home.pruebaRapida')}</span>
            {CONSULTAS_RAPIDAS_SUGERIDAS.map((sug, i) => {
              const textoChip = t(`homeExt.chipExtra${i + 1}`, sug.texto);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setConsulta(textoChip)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    consulta === textoChip
                      ? 'bg-[#501228] text-white border-[#F27B91]/40 font-semibold'
                      : 'bg-current/5 border-current/10 hover:border-current/25 opacity-80 hover:opacity-100'
                  }`}
                >
                  {textoChip}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categorías de Descubrimiento */}
        <div className="pt-2">
          <div className="flex gap-2 overflow-x-auto pb-2 gotox-scrollbar">
            {CATEGORIAS_DESCUBRIMIENTO.map((cat) => {
              const Icono = mapIconoCategoria(cat.icon);
              const activa = categoriaSeleccionada === cat.id;
              const mapaCat = {
                todas: 'home.catTodas',
                gastronomia: 'home.catRestaurantes',
                cafe: 'home.catRestaurantes',
                'aire-libre': 'home.catParques',
                cultural: 'home.catCultura',
                'pet-friendly': 'home.catPetFriendly',
                'bajo-techo': 'home.catBajoTecho'
              };
              const etiquetaCat = idioma === 'es' ? cat.label : t(mapaCat[cat.id] || 'home.catTodas', cat.label);
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={activa}
                  onClick={() => setCategoriaSeleccionada(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold whitespace-nowrap border transition-all shrink-0 ${activa
                    ? 'bg-[#501228] text-white border-[#F27B91]/40 shadow-sm'
                    : 'bg-current/5 border-current/10 opacity-70 hover:opacity-100 hover:bg-current/10'
                    }`}
                >
                  <Icono className="w-4 h-4" aria-hidden="true" />
                  <span>{etiquetaCat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resultados del Buscador Inteligente en Tiempo Real */}
        <div className="pt-4 border-t border-current/10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-serif font-bold text-lg">
                {t('home.recomendaciones')} ({lugaresFiltrados.length})
              </span>
              <span className="text-xs opacity-60">{t('home.lugaresReales')}</span>
              <button
                type="button"
                onClick={refrescarReales}
                disabled={cargandoReales}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-current/15 text-[11px] font-semibold hover:bg-current/5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${cargandoReales ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
                <span>{cargandoReales ? t('home.actualizando') : t('home.actualizarVivo')}</span>
              </button>
            </div>
            <Link
              to={isLoggedIn ? "/explorar" : "/terrazas"}
              className="text-xs font-bold text-[#F27B91] hover:underline flex items-center gap-1"
            >
              <span>{isLoggedIn ? t('home.verCatalogo') : t('home.verTerrazas')}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {lugaresFiltrados.slice(0, 6).map((lugar) => {
              const fav = esFavorito(lugar.id);
              return (
                <div
                  key={lugar.id}
                  className={`group rounded-3xl border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between ${esClaro
                    ? 'bg-white border-slate-200'
                    : esMorado
                      ? 'bg-[#1F0C18] border-[#F27B91]/20 hover:border-[#F27B91]/40'
                      : 'bg-[#162032] border-white/10 hover:border-white/20'
                    }`}
                >
                  {/* Foto de Portada */}
                  <div
                    onClick={() => setLugarSeleccionado(lugar)}
                    className={`relative h-44 w-full overflow-hidden cursor-pointer ${esClaro ? 'bg-[#FAF5F8]' : esMorado ? 'bg-[#251420]' : 'bg-[#162032]'
                      }`}
                  >
                    <LugarFoto
                      src={lugar.imagen}
                      alt={lugar.nombre}
                      photoMeta={lugar.photoMeta}
                      cargando={cargandoFotos}
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
                        aria-label={fav ? t('homeExt.quitarFavoritos') : t('homeExt.guardarFavoritos')}
                        title={fav ? t('homeExt.quitarFavoritos') : t('homeExt.guardarFavoritos')}
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
                            <span>{t('homeExt.petFriendly')}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] opacity-60">{t('homeExt.soloHumanos')}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setLugarSeleccionado(lugar)}
                        className="text-xs font-bold text-[#F27B91] hover:underline"
                      >
                        {t('homeExt.verDetalles')}
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
            <div className={`flex items-start gap-4 p-5 rounded-3xl border transition-colors shadow-sm ${esClaro ? 'bg-white border-slate-200' : 'bg-[#162032] border-white/5'
              }`}>
              <div className="w-11 h-11 rounded-2xl bg-[#55152D] text-[#F27B91] border border-[#F27B91]/25 flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif font-bold text-lg">{t('homeExt.pilar1Titulo')}</h3>
                <p className="text-xs opacity-75 leading-relaxed">
                  {t('homeExt.pilar1Desc')}
                </p>
              </div>
            </div>

            <div className={`flex items-start gap-4 p-5 rounded-3xl border transition-colors shadow-sm ${esClaro ? 'bg-white border-slate-200' : 'bg-[#162032] border-white/5'
              }`}>
              <div className="w-11 h-11 rounded-2xl bg-[#55152D] text-[#F27B91] border border-[#F27B91]/25 flex items-center justify-center shrink-0 shadow-xs">
                <Navigation className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif font-bold text-lg">{t('homeExt.pilar2Titulo')}</h3>
                <p className="text-xs opacity-75 leading-relaxed">
                  {t('homeExt.pilar2Desc')}
                </p>
              </div>
            </div>

            <div className={`flex items-start gap-4 p-5 rounded-3xl border transition-colors shadow-sm ${esClaro ? 'bg-white border-slate-200' : 'bg-[#162032] border-white/5'
              }`}>
              <div className="w-11 h-11 rounded-2xl bg-[#55152D] text-[#F27B91] border border-[#F27B91]/25 flex items-center justify-center shrink-0 shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-serif font-bold text-lg">{t('homeExt.pilar3Titulo')}</h3>
                <p className="text-xs opacity-75 leading-relaxed">
                  {t('homeExt.pilar3Desc')}
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
                {t('homeExt.ctaBadge')}
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-white">
                {t('homeExt.ctaTitulo')}
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                {t('homeExt.ctaSubtitulo')}
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
                      {t('homeExt.ctaExplorar')}
                    </Button>
                  </Link>
                  <Link to="/mis-planes" className="w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto justify-center border-white/30 text-white hover:bg-white/10 font-semibold"
                    >
                      {t('homeExt.ctaCrearPlan')}
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
                      {t('homeExt.ctaVerMapa')}
                    </Button>
                  </Link>
                  <Link to="/acceso" className="w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full sm:w-auto justify-center border-white/30 text-white hover:bg-white/10 font-semibold"
                    >
                      {t('homeExt.ctaLoginPlanes')}
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
