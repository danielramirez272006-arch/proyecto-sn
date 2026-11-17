import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CarnetDigital } from '../components/CarnetDigital';
import { QrCollar } from '../components/QrCollar';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PageWrapper } from '../components/PageWrapper';
import { Tabla, Tr, Td } from '../components/ui/Tabla';
import { AnimacionCierreSesion } from '../components/AnimacionCierreSesion';
import { ModalConfirmarCierre } from '../components/ModalConfirmarCierre';
import { useSesion } from '../hooks/useSesion';
import {
  User,
  Dog,
  ShieldCheck,
  Heart,
  Calendar,
  FileText,
  MapPin,
  Volume2,
  Phone,
  Syringe,
  AlertCircle,
  ExternalLink,
  Plus,
  LogOut,
  UserCheck,
  Bell,
  Lock,
  Sparkles,
  Compass,
  Sliders,
  DollarSign,
  Coffee,
  CheckCircle2,
  Save
} from 'lucide-react';

export function Perfil() {
  const { mascota, usuario, isLoggedIn, cerrarSesion } = useSesion();
  const navigate = useNavigate();
  
  // Pestañas: 'cuenta' (Info personal & Ubicación) | 'preferencias' | 'mascota' (Opcional) | 'privacidad'
  const [tabPerfil, setTabPerfil] = useState('cuenta');
  const [tabMascota, setTabMascota] = useState('pasaporte'); // 'pasaporte' | 'vacunacion' | 'rutas' | 'collar'
  const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false);
  const [animandoSalida, setAnimandoSalida] = useState(false);
  const [guardadoExito, setGuardadoExito] = useState(false);

  // Estado del perfil del usuario (persistido en memoria / storage)
  const [perfilUsuario, setPerfilUsuario] = useState({
    nombre: usuario?.nombre || 'Mariana Rojas Morales',
    correo: usuario?.email || 'mariana.rojas@gotox.cr',
    telefono: '+506 8832-9011',
    ubicacionHabitual: 'Barrio Escalante, San José',
    tieneMascota: true,
    presupuestoHabitual: 'medio', // 'economico' | 'medio' | 'premium'
    intereses: ['Gastronomía de autor', 'Cafeterías de especialidad', 'Parques y senderos', 'Terrazas al aire libre'],
    notificacionesLluvia: true,
    notificacionesAcusticas: true,
    notificacionesEventos: false,
    compartirUbicacion: true,
    privacidadBiometrica: true
  });

  const handleSolicitarCierre = () => {
    setModalConfirmacionAbierto(true);
  };

  const handleConfirmarSalida = () => {
    setModalConfirmacionAbierto(false);
    setAnimandoSalida(true);
  };

  const handleCompletarSalida = () => {
    cerrarSesion();
    setAnimandoSalida(false);
    navigate('/acceso');
  };

  const handleGuardarCambios = (e) => {
    e.preventDefault();
    setGuardadoExito(true);
    setTimeout(() => setGuardadoExito(false), 3000);
  };

  const toggleInteres = (item) => {
    setPerfilUsuario((prev) => {
      const existe = prev.intereses.includes(item);
      return {
        ...prev,
        intereses: existe ? prev.intereses.filter((i) => i !== item) : [...prev.intereses, item]
      };
    });
  };

  return (
    <PageWrapper className="py-8 md:py-16">
      {/* Modal de confirmación y advertencia */}
      <ModalConfirmarCierre
        isOpen={modalConfirmacionAbierto}
        onClose={() => setModalConfirmacionAbierto(false)}
        onConfirmar={handleConfirmarSalida}
        nombreUsuario={perfilUsuario.nombre}
      />

      {/* Animación de cierre de sesión hacia /acceso */}
      <AnimacionCierreSesion
        visible={animandoSalida}
        nombreUsuario={perfilUsuario.nombre}
        onCompletado={handleCompletarSalida}
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-8">
        {/* Cabecera Principal del Perfil de Usuario */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200/80 dark:border-white/10 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#501228] to-[#F27B91] flex items-center justify-center text-white shadow-lg text-2xl font-serif font-bold">
              {perfilUsuario.nombre.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#111827] dark:text-white">
                  {perfilUsuario.nombre}
                </h1>
                <Badge variant="burdeos">Cuenta GoToX</Badge>
                {perfilUsuario.tieneMascota ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/70 dark:border-emerald-800/40">
                    <Dog className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>Tutor de {mascota.nombre}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full border border-blue-200/70 dark:border-blue-800/40">
                    <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span>Explorador Urbano</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <span>{perfilUsuario.correo}</span>
                <span>&bull;</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-[#F27B91]" /> {perfilUsuario.ubicacionHabitual}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isLoggedIn ? (
              <button
                type="button"
                onClick={handleSolicitarCierre}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 dark:border-rose-800/40 shadow-2xs transition-all active:scale-[0.98]"
                title="Cerrar sesión activa y volver al acceso"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Cerrar Sesión</span>
              </button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/acceso')}
              >
                Iniciar Sesión
              </Button>
            )}
          </div>
        </div>

        {/* Notificación de guardado */}
        {guardadoExito && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Tus preferencias y datos de perfil han sido actualizados con éxito.</span>
          </div>
        )}

        {/* Selector de Pestañas Superiores */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 overflow-x-auto gotox-scrollbar pb-1">
          <button
            type="button"
            onClick={() => setTabPerfil('cuenta')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              tabPerfil === 'cuenta'
                ? 'border-[#501228] dark:border-[#F27B91] text-[#501228] dark:text-[#F27B91]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            Información & Cuenta
          </button>
          <button
            type="button"
            onClick={() => setTabPerfil('preferencias')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              tabPerfil === 'preferencias'
                ? 'border-[#501228] dark:border-[#F27B91] text-[#501228] dark:text-[#F27B91]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Preferencias de Salida
          </button>
          <button
            type="button"
            onClick={() => setTabPerfil('mascota')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              tabPerfil === 'mascota'
                ? 'border-[#501228] dark:border-[#F27B91] text-[#501228] dark:text-[#F27B91]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Dog className="w-4 h-4" />
            Mi Mascota (Opcional)
          </button>
          <button
            type="button"
            onClick={() => setTabPerfil('privacidad')}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
              tabPerfil === 'privacidad'
                ? 'border-[#501228] dark:border-[#F27B91] text-[#501228] dark:text-[#F27B91]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" />
            Privacidad & Notificaciones
          </button>
        </div>

        {/* ============================================================
            PESTAÑA 1: INFORMACIÓN PERSONAL Y CUENTA
            ============================================================ */}
        {tabPerfil === 'cuenta' && (
          <form onSubmit={handleGuardarCambios} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-4">
                <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white pb-2 border-b border-slate-100 dark:border-white/10">
                  Datos de Identidad
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Nombre Completo</label>
                    <input
                      type="text"
                      value={perfilUsuario.nombre}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, nombre: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white text-xs focus:ring-1 focus:ring-[#501228]"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Correo Electrónico</label>
                    <input
                      type="email"
                      value={perfilUsuario.correo}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, correo: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white text-xs focus:ring-1 focus:ring-[#501228]"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Teléfono de Contacto</label>
                    <input
                      type="text"
                      value={perfilUsuario.telefono}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, telefono: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white text-xs focus:ring-1 focus:ring-[#501228]"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Ubicación Habitual (GAM)</label>
                    <input
                      type="text"
                      value={perfilUsuario.ubicacionHabitual}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, ubicacionHabitual: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white text-xs focus:ring-1 focus:ring-[#501228]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="primary" size="sm" className="gap-2">
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Información</span>
                  </Button>
                </div>
              </Card>

              {/* Estado de Integración de Mascota */}
              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
                  <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white">
                    Modalidad de Usuario
                  </h3>
                  <Badge variant={perfilUsuario.tieneMascota ? "burdeos" : "outline"}>
                    {perfilUsuario.tieneMascota ? "Con Mascota Vinculada" : "Sin Mascota"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  GoToX está diseñado tanto para personas con mascotas como para quienes desean descubrir restaurantes, cafeterías, actividades culturales y paseos urbanos por su cuenta.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setPerfilUsuario({ ...perfilUsuario, tieneMascota: true })}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      perfilUsuario.tieneMascota
                        ? 'bg-[#501228] text-white border-[#501228]'
                        : 'bg-white dark:bg-[#162032] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    🐾 Sí, tengo mascota
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerfilUsuario({ ...perfilUsuario, tieneMascota: false })}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      !perfilUsuario.tieneMascota
                        ? 'bg-[#501228] text-white border-[#501228]'
                        : 'bg-white dark:bg-[#162032] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    🚶 Solo para mí / Amigos
                  </button>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-4">
                <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white pb-2 border-b border-slate-100 dark:border-white/10">
                  Resumen de Actividad
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032]">
                    <span className="text-slate-500 dark:text-slate-400">Lugares en Favoritos</span>
                    <strong className="text-slate-800 dark:text-white">4 guardados</strong>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032]">
                    <span className="text-slate-500 dark:text-slate-400">Planes e Itinerarios</span>
                    <strong className="text-slate-800 dark:text-white">2 activos</strong>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032]">
                    <span className="text-slate-500 dark:text-slate-400">Zona Frecuente</span>
                    <strong className="text-slate-800 dark:text-white">Escalante / San Pedro</strong>
                  </div>
                </div>
              </Card>
            </div>
          </form>
        )}

        {/* ============================================================
            PESTAÑA 2: PREFERENCIAS DE SALIDA
            ============================================================ */}
        {tabPerfil === 'preferencias' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-5">
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white">
                    Nivel de Presupuesto Habitual
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    GoToX priorizará recomendaciones dentro de tu rango estimado de gasto por salida.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'economico', label: 'Económico', desc: 'Menos de ₡5,000 por persona' },
                    { id: 'medio', label: 'Moderado', desc: '₡5,000 a ₡12,000 por persona' },
                    { id: 'premium', label: 'Gourmet', desc: 'Más de ₡12,000 por persona' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPerfilUsuario({ ...perfilUsuario, presupuestoHabitual: p.id })}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        perfilUsuario.presupuestoHabitual === p.id
                          ? 'bg-[#501228]/10 dark:bg-[#55152D]/30 border-[#501228] dark:border-[#F27B91] ring-1 ring-[#501228]'
                          : 'bg-white dark:bg-[#162032] border-slate-200 dark:border-white/10'
                      }`}
                    >
                      <span className="text-sm font-bold block text-slate-800 dark:text-white">{p.label}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">{p.desc}</span>
                    </button>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-white/10">
                  <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white mb-2">
                    Intereses y Categorías Favoritas
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    Selecciona los tipos de experiencias que más te gusta descubrir en GoToX:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Gastronomía de autor',
                      'Cafeterías de especialidad',
                      'Parques y senderos',
                      'Terrazas al aire libre',
                      'Museos y cultura',
                      'Cervecerías artesanales',
                      'Heladerías artesanales',
                      'Espacios de coworking',
                      'Miradores del GAM'
                    ].map((interes) => {
                      const activo = perfilUsuario.intereses.includes(interes);
                      return (
                        <button
                          key={interes}
                          type="button"
                          onClick={() => toggleInteres(interes)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                            activo
                              ? 'bg-[#501228] text-white border-[#501228] shadow-xs'
                              : 'bg-white dark:bg-[#162032] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-slate-300'
                          }`}
                        >
                          {activo && '✓ '} {interes}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3">
                  <Button variant="primary" size="sm" onClick={handleGuardarCambios}>
                    Guardar Preferencias
                  </Button>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-[#501228] dark:text-[#F27B91]">
                  <Sparkles className="w-4 h-4" />
                  <h4 className="font-serif font-bold text-sm text-[#111827] dark:text-white">Recomendación IA</h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Con tus preferencias de presupuesto moderado y cafeterías de especialidad, te sugerimos explorar la zona de Barrio Escalante y Amón durante las mañanas con clima fresco.
                </p>
              </Card>
            </div>
          </div>
        )}

        {/* ============================================================
            PESTAÑA 3: BÓVEDA CANINA / MASCOTA (OPCIONAL)
            ============================================================ */}
        {tabPerfil === 'mascota' && (
          <div className="space-y-6">
            {/* Subpestañas de Mascota */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 overflow-x-auto gotox-scrollbar pb-1">
              <button
                type="button"
                onClick={() => setTabMascota('pasaporte')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  tabMascota === 'pasaporte'
                    ? 'bg-[#501228] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162032]'
                }`}
              >
                Pasaporte & Biometría
              </button>
              <button
                type="button"
                onClick={() => setTabMascota('vacunacion')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  tabMascota === 'vacunacion'
                    ? 'bg-[#501228] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162032]'
                }`}
              >
                Cartilla de Vacunación ({mascota.vacunacion.length})
              </button>
              <button
                type="button"
                onClick={() => setTabMascota('rutas')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  tabMascota === 'rutas'
                    ? 'bg-[#501228] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162032]'
                }`}
              >
                Rutas Seguras
              </button>
              <button
                type="button"
                onClick={() => setTabMascota('collar')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  tabMascota === 'collar'
                    ? 'bg-[#501228] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162032]'
                }`}
              >
                Collar Inteligente QR
              </button>
            </div>

            {/* Subcontenido 1: Pasaporte */}
            {tabMascota === 'pasaporte' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5 space-y-4">
                  <CarnetDigital mascota={mascota} interactivo={true} />
                  <p className="text-[11px] text-center text-slate-400">
                    Pasa el ratón por encima o haz click en la credencial para alternar vistas
                  </p>
                </div>

                <div className="lg:col-span-7 space-y-5">
                  <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/10">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#501228] dark:text-[#F27B91]" />
                        <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white">
                          {mascota.polizaMedica.aseguradora}
                        </h3>
                      </div>
                      <Badge variant="success">{mascota.polizaMedica.estado}</Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 bg-slate-50 dark:bg-[#162032] rounded-xl">
                        <span className="text-slate-400 block uppercase text-[10px]">Número de Póliza</span>
                        <strong className="text-slate-800 dark:text-white font-mono text-xs">{mascota.polizaMedica.numeroPoliza}</strong>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-[#162032] rounded-xl">
                        <span className="text-slate-400 block uppercase text-[10px]">Cobertura Anual</span>
                        <strong className="text-emerald-700 dark:text-emerald-400 text-xs">{mascota.polizaMedica.coberturaEmergencias}</strong>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-[#162032] rounded-xl">
                        <span className="text-slate-400 block uppercase text-[10px]">Copago Clínico</span>
                        <strong className="text-slate-800 dark:text-white text-xs">{mascota.polizaMedica.copago}</strong>
                      </div>
                    </div>

                    <div className="p-3 bg-[#FDF2F4] dark:bg-[#55152D]/25 rounded-xl border border-[#F9E2E8] dark:border-[#55152D]/40 flex items-center justify-between text-xs text-[#501228] dark:text-[#F27B91]">
                      <span>Asistencia de Urgencias 24h: <strong>{mascota.polizaMedica.asistencia24h}</strong></span>
                      <a href="tel:+5068007384357">
                        <Button size="sm" variant="primary">Llamar Triage</Button>
                      </a>
                    </div>
                  </Card>

                  <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-4">
                    <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white pb-2 border-b border-slate-100 dark:border-white/10">
                      Tutor Responsable y Contacto
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-slate-400 block uppercase text-[10px]">Tutor Legal</span>
                        <p className="font-semibold text-slate-800 dark:text-white">{mascota.tutor.nombre}</p>
                        <p className="text-slate-500 dark:text-slate-400">Cédula: {mascota.tutor.cedula}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 block uppercase text-[10px]">Teléfono de Urgencia</span>
                        <p className="font-semibold text-[#501228] dark:text-[#F27B91]">{mascota.tutor.telefono}</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}

            {/* Subcontenido 2: Vacunación */}
            {tabMascota === 'vacunacion' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-serif font-bold text-2xl text-[#111827] dark:text-white">
                      Registro Oficial de Inmunización
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Certificado por el Colegio de Médicos Veterinarios de Costa Rica.
                    </p>
                  </div>
                  <Badge variant="success">Todas al día</Badge>
                </div>

                <Tabla headers={['Vacuna o Tratamiento', 'Última Aplicación', 'Próxima Dosis Requerida', 'Estado']}>
                  {mascota.vacunacion.map((v, i) => (
                    <Tr key={i}>
                      <Td>
                        <div className="flex items-center gap-2">
                          <Syringe className="w-4 h-4 text-[#501228] dark:text-[#F27B91]" />
                          <span className="font-semibold text-slate-800 dark:text-white">{v.nombre}</span>
                        </div>
                      </Td>
                      <Td>
                        <span className="text-xs text-slate-600 dark:text-slate-300">{v.fecha}</span>
                      </Td>
                      <Td>
                        <span className="text-xs font-semibold text-slate-800 dark:text-white">{v.proxima}</span>
                      </Td>
                      <Td>
                        <Badge variant="success">{v.estado}</Badge>
                      </Td>
                    </Tr>
                  ))}
                </Tabla>
              </div>
            )}

            {/* Subcontenido 3: Rutas */}
            {tabMascota === 'rutas' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h2 className="font-serif font-bold text-2xl text-[#111827] dark:text-white">
                    Senderos y Rutas Urbanas Registradas
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Itinerarios validados con baja radiación en aceras y sombra continua.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {mascota.rutasFavoritas.map((ruta, i) => (
                    <Card key={i} className="p-5 border-slate-200/80 dark:border-white/10 space-y-3 bg-white dark:bg-[#162032] shadow-sm">
                      <div className="flex items-center gap-2 text-[#501228] dark:text-[#F27B91]">
                        <MapPin className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Circuito Seguro #{i + 1}</span>
                      </div>
                      <h3 className="font-serif font-bold text-base text-[#111827] dark:text-white">
                        {ruta.nombre}
                      </h3>
                      <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 dark:border-white/10 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Distancia</span>
                          <strong className="text-slate-800 dark:text-white">{ruta.longitudKm} km</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Ruido Medio</span>
                          <strong className="text-slate-800 dark:text-white">{ruta.decibeliosPromedio} dB</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Sombra</span>
                          <strong className="text-emerald-700 dark:text-emerald-400">{ruta.zonasSombra}</strong>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Subcontenido 4: Collar QR */}
            {tabMascota === 'collar' && (
              <div className="max-w-2xl mx-auto">
                <QrCollar mascota={mascota} />
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            PESTAÑA 4: PRIVACIDAD Y NOTIFICACIONES
            ============================================================ */}
        {tabPerfil === 'privacidad' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-4">
                <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white pb-2 border-b border-slate-100 dark:border-white/10">
                  Canales de Notificación
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032] cursor-pointer">
                    <div>
                      <span className="text-xs font-semibold block text-slate-800 dark:text-white">Alertas de Lluvia y Clima en Vivo</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Notificarme 30 minutos antes de lluvia en mi zona habitual</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={perfilUsuario.notificacionesLluvia}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, notificacionesLluvia: e.target.checked })}
                      className="w-4 h-4 rounded text-[#501228] focus:ring-[#501228]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032] cursor-pointer">
                    <div>
                      <span className="text-xs font-semibold block text-slate-800 dark:text-white">Alertas de Confort Acústico</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Avisos si hay detonaciones o ruidos &gt; 65 dB cerca</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={perfilUsuario.notificacionesAcusticas}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, notificacionesAcusticas: e.target.checked })}
                      className="w-4 h-4 rounded text-[#501228] focus:ring-[#501228]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032] cursor-pointer">
                    <div>
                      <span className="text-xs font-semibold block text-slate-800 dark:text-white">Nuevas Terrazas y Experiencias Auditadas</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Resumen semanal de nuevos locales verificados</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={perfilUsuario.notificacionesEventos}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, notificacionesEventos: e.target.checked })}
                      className="w-4 h-4 rounded text-[#501228] focus:ring-[#501228]"
                    />
                  </label>
                </div>
              </Card>

              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-4">
                <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white pb-2 border-b border-slate-100 dark:border-white/10">
                  Seguridad y Cifrado
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032] cursor-pointer">
                    <div>
                      <span className="text-xs font-semibold block text-slate-800 dark:text-white">Geolocalización en Tiempo Real</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Permitir a GoToX calcular distancias a pie exactas</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={perfilUsuario.compartirUbicacion}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, compartirUbicacion: e.target.checked })}
                      className="w-4 h-4 rounded text-[#501228] focus:ring-[#501228]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032] cursor-pointer">
                    <div>
                      <span className="text-xs font-semibold block text-slate-800 dark:text-white">Cifrado Biométrico en Dispositivo</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Firmar los datos de póliza y carnet con llave local</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={perfilUsuario.privacidadBiometrica}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, privacidadBiometrica: e.target.checked })}
                      className="w-4 h-4 rounded text-[#501228] focus:ring-[#501228]"
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <Button variant="primary" size="sm" onClick={handleGuardarCambios}>
                    Guardar Configuración
                  </Button>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-4">
              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                  <h4 className="font-serif font-bold text-sm text-[#111827] dark:text-white">Privacidad Garantizada</h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tus datos de ubicación nunca se comparten con terceros ni se venden a redes publicitarias. Solo se usan para calcular rutas seguras y tiempos de llegada.
                </p>
              </Card>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
