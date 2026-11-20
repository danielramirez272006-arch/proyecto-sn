import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PageWrapper } from '../components/PageWrapper';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useTema } from '../context/TemaContext';
import { ModalConfirmacion } from '../components/ModalConfirmacion';
import {
  obtenerConsentimientoCookies,
  abrirConfiguracionCookies,
  borrarDatosLocales,
  CLAVES_ALMACENAMIENTO,
} from '../shared/utils/cookie-consent';
import {
  ShieldCheck,
  Scale,
  FileText,
  Lock,
  Stethoscope,
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Cookie,
  UserCheck,
  Network,
  RefreshCw,
  Trash2,
  ListChecks
} from 'lucide-react';

const VERSION_DOCUMENTO = 'Noviembre 2026 (v2)';
// Canal oficial de contacto para ejercer derechos. Debe definirlo el equipo antes de publicar.
const CONTACTO_PRIVACIDAD = null;

const SECCIONES_TERMINOS = [
  {
    id: 'alcance',
    numero: '01',
    categoria: 'uso',
    icono: MapPin,
    titulo: 'Naturaleza del servicio y procedencia de los datos',
    resumen: 'Qué es verificado, qué es una señal externa y qué es demostración.',
    puntos: [
      'GoToX Pet OS combina datos propios con fuentes abiertas y de terceros (OpenStreetMap / Overpass, Geoapify, Foursquare y Wikimedia Commons) para mostrar lugares y condiciones de ingreso con mascotas.',
      'Un establecimiento solo se muestra como «Confirmado» cuando existe evidencia activa registrada por el comercio (business_confirmation) o por revisión administrativa (admin_review) y su vigencia no ha vencido (180 días).',
      'Una señal externa sin confirmar se muestra como tal. No garantiza el ingreso: consulta siempre con el local antes de ir, porque las políticas pueden cambiar.',
      'Los elementos marcados como «Demo» o «Referencia editorial» son ilustrativos y no son mediciones oficiales en tiempo real.'
    ]
  },
  {
    id: 'cuenta',
    numero: '02',
    categoria: 'uso',
    icono: UserCheck,
    titulo: 'Cuenta, sesión y uso aceptable',
    resumen: 'Responsabilidades de quien usa la plataforma.',
    puntos: [
      'Eres responsable de la veracidad de los datos que registras (tuyos y de tu mascota) y de custodiar tus credenciales. Avísanos si sospechas un uso no autorizado de tu cuenta.',
      'Algunas pantallas ofrecen un «Modo Demostración» o accesos rápidos de prueba: usan datos ficticios y no deben interpretarse como una cuenta real.',
      'No está permitido: intentar acceder a áreas administrativas sin autorización, automatizar consultas de forma abusiva, subir contenido que no tengas derecho a publicar, ni usar la plataforma para suplantar a comercios o a otras personas.',
      'Podemos limitar o suspender el acceso ante abuso, riesgo de seguridad o incumplimiento de estos términos.'
    ]
  },
  {
    id: 'veterinaria',
    numero: '03',
    categoria: 'salud',
    icono: Stethoscope,
    titulo: 'Descargo veterinario e inteligencia artificial',
    resumen: 'La información y el asistente no sustituyen a un médico veterinario.',
    puntos: [
      'El Copiloto Bruno (apoyado en modelos de IA como Google Gemini), la sección de videos y las alertas de temperatura o ruido tienen carácter informativo y preventivo.',
      'Las respuestas de IA pueden ser incompletas o equivocadas. Nada de lo mostrado reemplaza el diagnóstico, el tratamiento ni el criterio de un profesional veterinario colegiado en Costa Rica.',
      'Los videos son de terceros (YouTube); su contenido es responsabilidad de sus autores y puede cambiar o dejar de estar disponible.',
      'Ante síntomas agudos (asfixia, intoxicación, golpe de calor, convulsiones o sangrado) acude de inmediato a un hospital veterinario 24/7 o llama al 9-1-1. Contacto del Hospital Veterinario UNA: 2277-3600.'
    ]
  },
  {
    id: 'datos',
    numero: '04',
    categoria: 'privacidad',
    icono: Lock,
    titulo: 'Datos personales y tus derechos (Ley N° 8968)',
    resumen: 'Qué datos tratamos, para qué y cómo ejercer tus derechos.',
    puntos: [
      'Datos que podemos tratar: nombre, correo y contraseña de tu cuenta; datos de tu mascota (nombre, raza, peso, microchip) si los registras; favoritos y planes que guardas; y tu ubicación aproximada solo si activas la geolocalización.',
      'Finalidades: iniciar sesión, mostrar tu perfil y carnet digital, buscar lugares compatibles cerca de ti, y mejorar la seguridad del servicio. No vendemos tus datos ni los usamos para publicidad.',
      'Tu contraseña se almacena con derivación criptográfica PBKDF2 y sal aleatoria; nunca en texto plano.',
      'Si activas la geolocalización, las coordenadas se envían a nuestro servidor y se usan para consultar a los proveedores de lugares (ver cláusula 05). Si no la activas, usamos el centro del Gran Área Metropolitana.',
      'Derechos: según la Ley N° 8968 puedes solicitar acceso, rectificación y supresión de tus datos y revocar tu consentimiento en cualquier momento. Para los datos guardados solo en tu navegador puedes ejercer la supresión tú mismo con el botón «Borrar mis datos locales».',
      'Las fotografías subidas pasan por un filtro que elimina los metadatos EXIF (incluida la ubicación GPS de la cámara) antes de guardarse.'
    ]
  },
  {
    id: 'terceros',
    numero: '05',
    categoria: 'privacidad',
    icono: Network,
    titulo: 'Terceros que intervienen en el servicio',
    resumen: 'Proveedores externos que pueden recibir datos técnicos al usar ciertas funciones.',
    puntos: [
      'Base de datos y almacenamiento de fotografías: Supabase.',
      'Lugares y mapas: OpenStreetMap / Overpass, Geoapify, Foursquare y Google Places reciben las coordenadas y el radio de búsqueda para devolver establecimientos cercanos. Wikimedia Commons se consulta para fotografías de licencia abierta.',
      'Inteligencia artificial: Google Gemini procesa el texto de las preguntas que envías al asistente. No incluyas datos sensibles en tus preguntas.',
      'Videos: YouTube sirve los videos incrustados y puede aplicar sus propias políticas de privacidad al reproducirlos.',
      'Clima y voz: según la función que uses y la configuración activa, se consultan servicios de clima (Open-Meteo) y de síntesis de voz (ElevenLabs).',
      'No todos los proveedores están activos en todo momento. Cada uno trata los datos según sus propios términos; GoToX no controla esas políticas.'
    ]
  },
  {
    id: 'convivencia',
    numero: '06',
    categoria: 'uso',
    icono: ShieldCheck,
    titulo: 'Convivencia responsable y bienestar animal (Ley N° 7451)',
    resumen: 'Deberes del tutor en locales, parques y rutas urbanas.',
    puntos: [
      'El ingreso con mascotas depende de las condiciones de cada local (correa o arnés, cupo por mesa, áreas habilitadas, restricciones de tamaño o peso). Respétalas.',
      'Conforme a la Ley de Bienestar de los Animales N° 7451, el tutor es responsable del bienestar, la hidratación, la recolección de desechos y el comportamiento de su mascota.',
      'Los comercios pueden ejercer su derecho de admisión ante conductas agresivas o incumplimiento de las normas sanitarias.'
    ]
  },
  {
    id: 'fotografias',
    numero: '07',
    categoria: 'propiedad',
    icono: Camera,
    titulo: 'Derechos de autor, licencias y moderación de fotografías',
    resumen: 'Atribución obligatoria y revisión humana antes de publicar.',
    puntos: [
      'No se publican fotografías genéricas ni sin autor y licencia verificables, y ninguna imagen se asigna a una sucursal por una coincidencia aproximada de nombre.',
      'Toda fotografía ingresa primero a un almacenamiento privado en estado «pendiente de revisión» y solo se hace pública tras verificar autoría y licencia (CC BY, CC BY-SA, CC0 o autorización escrita del comercio).',
      'Si eres titular de derechos y quieres retirar una imagen, solicítalo por el canal de contacto de la cláusula 04: un administrador puede retirarla del almacenamiento público.'
    ]
  },
  {
    id: 'finanzas',
    numero: '08',
    categoria: 'uso',
    icono: Scale,
    titulo: 'Herramientas financieras y ley aplicable',
    resumen: 'Alcance de las calculadoras y jurisdicción.',
    puntos: [
      'Las utilidades de división de cuenta (IVA 13 % y servicio 10 %), tipo de cambio referencial y enlaces para SINPE Móvil son ayudas de cálculo. GoToX no procesa ni retiene dinero.',
      'Estos términos se rigen por las leyes de la República de Costa Rica. Cualquier controversia se someterá a los tribunales competentes de San José.'
    ]
  },
  {
    id: 'cookies',
    numero: '09',
    categoria: 'privacidad',
    icono: Cookie,
    titulo: 'Política de cookies y almacenamiento local',
    resumen: 'Qué guardamos en tu navegador, por qué y cómo borrarlo.',
    puntos: [
      'GoToX usa principalmente el almacenamiento local del navegador (localStorage) y una única cookie propia (gotox_cookie_consent) que recuerda tu elección durante 180 días con SameSite=Lax.',
      'No usamos cookies de publicidad ni de analítica de terceros.',
      'Solo la geolocalización es opcional: si la desactivas, la aplicación no solicita la ubicación de tu dispositivo. Las demás categorías son necesarias para el servicio o las genera tu propia actividad (favoritos, planes, preferencias).',
      'Puedes cambiar tu elección en cualquier momento desde «Preferencias de Cookies» (pie de página) y borrar todo lo guardado con «Borrar mis datos locales».'
    ],
    tabla: [
      {
        categoria: 'Necesarias',
        claves: CLAVES_ALMACENAMIENTO.necessary,
        finalidad: 'Mantener la sesión (tokens de acceso y renovación, sesión de invitado) y los datos de sesión del perfil.',
        duracion: 'Hasta cerrar sesión o borrar los datos'
      },
      {
        categoria: 'Funcionales',
        claves: CLAVES_ALMACENAMIENTO.functional,
        finalidad: 'Tema visual, idioma, menú contraído, favoritos y planes que tú guardas.',
        duracion: 'Hasta que los borres'
      },
      {
        categoria: 'Consentimiento',
        claves: ['gotox_cookie_consent (cookie)', 'gotox_cookie_consent_v1', 'gotox_terminos_aceptados_v1'],
        finalidad: 'Recordar tu elección de privacidad y la constancia de lectura de estos términos.',
        duracion: '180 días (cookie) / hasta que los borres'
      },
      {
        categoria: 'Opcional: geolocalización',
        claves: ['Sin clave propia: se aplica según tu elección'],
        finalidad: 'Permite solicitar la ubicación del dispositivo para centrar el mapa y buscar lugares cercanos.',
        duracion: 'Mientras la mantengas activada'
      }
    ]
  },
  {
    id: 'cambios',
    numero: '10',
    categoria: 'uso',
    icono: RefreshCw,
    titulo: 'Cambios a estos términos',
    resumen: 'Cómo se comunican las actualizaciones.',
    puntos: [
      `Esta es la versión ${VERSION_DOCUMENTO}. Si cambia de forma relevante, actualizaremos la versión y la fecha en esta página y te pediremos de nuevo la constancia de lectura.`,
      'Este documento es informativo del proyecto y debe ser revisado por asesoría legal antes de su publicación comercial.'
    ]
  }
];

const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'uso', label: 'Uso del servicio' },
  { id: 'salud', label: 'Salud e IA' },
  { id: 'privacidad', label: 'Privacidad y cookies' },
  { id: 'propiedad', label: 'Fotografías' }
];

export function TerminosCondiciones() {
  const { esClaro, esMorado } = useTema();
  const { hash } = useLocation();
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [consentimiento, setConsentimiento] = useState(() => obtenerConsentimientoCookies());
  const [aceptadoLocal, setAceptadoLocal] = useState(() => {
    try {
      return localStorage.getItem('gotox_terminos_aceptados_v1') === VERSION_DOCUMENTO;
    } catch {
      return false;
    }
  });

  // Mantener el estado del consentimiento sincronizado con el banner
  useEffect(() => {
    const onUpdate = () => setConsentimiento(obtenerConsentimientoCookies());
    window.addEventListener('gotox:cookie-consent-updated', onUpdate);
    return () => window.removeEventListener('gotox:cookie-consent-updated', onUpdate);
  }, []);

  // Soporte de enlaces con ancla (p. ej. /terminos#cookies)
  useEffect(() => {
    if (!hash) return;
    setFiltroCategoria('todas');
    const id = hash.replace('#', '');
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => clearTimeout(t);
  }, [hash]);

  const seccionesFiltradas = SECCIONES_TERMINOS.filter(
    (s) => filtroCategoria === 'todas' || s.categoria === filtroCategoria
  );

  const handleConfirmarLectura = () => {
    const nuevoEstado = !aceptadoLocal;
    setAceptadoLocal(nuevoEstado);
    try {
      if (nuevoEstado) localStorage.setItem('gotox_terminos_aceptados_v1', VERSION_DOCUMENTO);
      else localStorage.removeItem('gotox_terminos_aceptados_v1');
    } catch {
      // Ignorar si localStorage no está disponible
    }
  };

  const handleBorrar = () => setConfirmarBorrado(true);

  const estadoGeo = !consentimiento
    ? 'sin decidir'
    : consentimiento.geolocation
    ? 'activada'
    : 'desactivada';

  return (
    <PageWrapper className="py-10 md:py-16">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 space-y-8 text-left">
        {/* Encabezado */}
        <div className="space-y-4 border-b border-current/10 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#501228] text-white border border-[#F27B91]/30 text-xs font-semibold">
              <Scale className="w-3.5 h-3.5 text-[#F27B91]" />
              <span>Marco legal y privacidad &bull; Costa Rica</span>
            </div>
            <Badge variant="success">Versión {VERSION_DOCUMENTO}</Badge>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Términos, condiciones, privacidad y cookies
          </h1>

          <p className="text-sm sm:text-base opacity-80 leading-relaxed max-w-3xl font-sans">
            Reglas de uso de <strong>GoToX Pet OS</strong>: cómo tratamos tus datos y los de tu mascota, qué guardamos en tu navegador,
            qué terceros intervienen y cuáles son tus derechos.
          </p>
        </div>

        {/* Resumen rápido */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-[#F27B91]" />
            <h2 className="font-serif font-bold text-base">Lo esencial en 30 segundos</h2>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs sm:text-sm">
            {[
              'No vendemos tus datos ni usamos cookies de publicidad.',
              'Tu ubicación solo se usa si tú la activas.',
              'Un lugar es «Confirmado» solo con evidencia vigente; si no, lo indicamos.',
              'El asistente y los videos no sustituyen a un veterinario.',
              'Puedes borrar tus datos locales cuando quieras.',
              'Las fotografías pasan por revisión humana antes de publicarse.'
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#F27B91] shrink-0 mt-0.5" />
                <span className="opacity-90">{t}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Índice + filtros */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {FILTROS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFiltroCategoria(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  filtroCategoria === tab.id
                    ? 'bg-[#501228] text-white border-[#F27B91]/40 shadow-xs'
                    : 'border-current/15 opacity-75 hover:opacity-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <nav aria-label="Índice de cláusulas" className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {SECCIONES_TERMINOS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setFiltroCategoria('todas');
                  setTimeout(() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                }}
                className="underline-offset-2 hover:underline opacity-80 hover:opacity-100"
              >
                {s.numero}. {s.titulo.split(' (')[0]}
              </a>
            ))}
          </nav>
        </div>

        {/* Aviso de transparencia */}
        <Card
          className={`p-5 border flex items-start gap-3 ${
            esClaro
              ? 'bg-[#FDF2F4] border-[#F9E2E8] text-[#501228]'
              : esMorado
              ? 'bg-[#24101C] border-[#F27B91]/30 text-[#FDF2F6]'
              : 'bg-[#162032] border-white/10 text-[#E8EDF5]'
          }`}
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-[#F27B91]" />
          <div className="space-y-1 text-xs">
            <p className="font-bold text-sm">Compromiso de transparencia</p>
            <p className="opacity-85 leading-relaxed">
              No marcamos un lugar como confirmado sin evidencia vigente ni publicamos fotografías sin autor y licencia registrados.
              Las señales externas y los datos de demostración se etiquetan siempre de forma visible.
            </p>
          </div>
        </Card>

        {/* Cláusulas */}
        <div className="grid grid-cols-1 gap-6">
          {seccionesFiltradas.map((sec) => {
            const Icono = sec.icono;
            return (
              <Card key={sec.id} id={sec.id} className="p-6 space-y-4 scroll-mt-24">
                <div className="flex items-start justify-between gap-4 border-b border-current/10 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#501228] text-white flex items-center justify-center shrink-0 font-bold text-xs">
                      {sec.numero}
                    </div>
                    <div>
                      <h2 className="font-serif font-bold text-lg sm:text-xl">{sec.titulo}</h2>
                      <p className="text-xs opacity-70 mt-0.5">{sec.resumen}</p>
                    </div>
                  </div>
                  <Icono className="w-5 h-5 text-[#F27B91] shrink-0 hidden sm:block" />
                </div>

                <ul className="space-y-2.5 text-xs sm:text-sm leading-relaxed">
                  {sec.puntos.map((punto, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#F27B91] shrink-0 mt-1" />
                      <span className="opacity-90">{punto}</span>
                    </li>
                  ))}
                </ul>

                {sec.tabla && (
                  <div className="overflow-x-auto rounded-xl border border-current/15">
                    <table className="w-full text-left text-[11px] sm:text-xs">
                      <thead className="bg-current/5">
                        <tr>
                          <th className="p-2.5 font-bold">Categoría</th>
                          <th className="p-2.5 font-bold">Claves guardadas</th>
                          <th className="p-2.5 font-bold">Finalidad</th>
                          <th className="p-2.5 font-bold">Duración</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sec.tabla.map((fila) => (
                          <tr key={fila.categoria} className="border-t border-current/10 align-top">
                            <td className="p-2.5 font-semibold whitespace-nowrap">{fila.categoria}</td>
                            <td className="p-2.5 font-mono opacity-80 break-all">{fila.claves.join(', ')}</td>
                            <td className="p-2.5 opacity-90">{fila.finalidad}</td>
                            <td className="p-2.5 opacity-90">{fila.duracion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {sec.id === 'datos' && (
                  <div className="p-3.5 rounded-xl border border-current/15 bg-current/5 text-xs space-y-1">
                    <p className="font-bold">Contacto para ejercer tus derechos</p>
                    <p className="opacity-85">
                      {CONTACTO_PRIVACIDAD
                        ? CONTACTO_PRIVACIDAD
                        : 'Canal de contacto pendiente de definir por el equipo de GoToX antes de la publicación.'}
                    </p>
                  </div>
                )}

                {sec.id === 'cookies' && (
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <Button variant="secondary" size="sm" icon={Cookie} onClick={abrirConfiguracionCookies}>
                      Preferencias de cookies (geolocalización: {estadoGeo})
                    </Button>
                    <Button variant="secondary" size="sm" icon={Trash2} onClick={handleBorrar}>
                      Borrar mis datos locales
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Constancia de lectura */}
        <Card className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-current/15">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#F27B91]" />
              <span className="font-serif font-bold text-base">Constancia de lectura en este dispositivo</span>
            </div>
            <p className="text-xs opacity-75">
              {aceptadoLocal
                ? `Registraste la lectura de la versión ${VERSION_DOCUMENTO} en este navegador.`
                : 'Puedes dejar constancia local de que leíste la versión vigente.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link to="/acceso">
              <Button variant="secondary" size="sm" icon={ArrowLeft}>
                Ir a Acceso
              </Button>
            </Link>
            <Button
              variant={aceptadoLocal ? 'secondary' : 'primary'}
              size="sm"
              icon={CheckCircle2}
              onClick={handleConfirmarLectura}
            >
              {aceptadoLocal ? 'Lectura registrada ✓' : 'Registrar lectura'}
            </Button>
          </div>
        </Card>
      </div>

      <ModalConfirmacion
        abierto={confirmarBorrado}
        peligroso
        titulo="¿Borrar tus datos locales?"
        mensaje="Vamos a eliminar lo que GoToX guardó en este navegador. No afecta a tu cuenta en el servidor."
        detalles={[
          'Se cerrará tu sesión',
          'Se eliminarán tus favoritos y planes guardados',
          'Se restablecerán tema, idioma y menú lateral',
          'Se borrará tu elección de cookies'
        ]}
        textoConfirmar="Sí, borrar mis datos"
        textoCancelar="Cancelar"
        onCancelar={() => setConfirmarBorrado(false)}
        onConfirmar={() => {
          setConfirmarBorrado(false);
          borrarDatosLocales();
        }}
      />
    </PageWrapper>
  );
}

export default TerminosCondiciones;
