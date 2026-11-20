import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { CarnetDigital } from '../components/CarnetDigital';
import { QrCollar } from '../components/QrCollar';
import { SelectorFotoMascota } from '../components/SelectorFotoMascota';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { PageWrapper } from '../components/PageWrapper';
import { Tabla, Tr, Td } from '../components/ui/Tabla';
import { AnimacionCierreSesion } from '../components/AnimacionCierreSesion';
import { ModalConfirmarCierre } from '../components/ModalConfirmarCierre';
import { useSesion } from '../hooks/useSesion';
import { authService } from '../shared/services/auth-service';
import { abrirConfiguracionCookies } from '../shared/utils/cookie-consent';
import { obtenerFavoritosIds, obtenerPlanes } from '../servicios/almacenamientoCliente';
import {
  User,
  Dog,
  ShieldCheck,
  Heart,
  Calendar,
  MapPin,
  Syringe,
  LogOut,
  Lock,
  Sparkles,
  Sliders,
  CheckCircle2,
  Save,
  AlertTriangle,
  Compass,
  ArrowRight,
  Trash2,
  FileCheck2,
  Cookie
} from 'lucide-react';

export function Perfil({ embebido = false }) {
  const {
    mascota,
    usuario,
    boveda,
    isLoggedIn,
    esAdmin,
    cerrarSesion,
    cargarBovedaBackend,
    guardarBovedaBackend
  } = useSesion();
  const navigate = useNavigate();
  const location = useLocation();
  const accesoDenegadoAdmin = Boolean(location.state?.accesoDenegadoAdmin);

  const [tabPerfil, setTabPerfil] = useState('cuenta'); // 'cuenta' | 'preferencias' | 'mascota' | 'privacidad'
  const [tabMascota, setTabMascota] = useState('pasaporte'); // 'pasaporte' | 'vacunacion' | 'collar'
  const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false);
  const [animandoSalida, setAnimandoSalida] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardadoExito, setGuardadoExito] = useState('');
  const [errorGuardado, setErrorGuardado] = useState('');

  const [favoritosCount, setFavoritosCount] = useState(() => obtenerFavoritosIds().length);
  const [planesCount, setPlanesCount] = useState(() => obtenerPlanes().length);

  // Estado del usuario conectado
  const [perfilUsuario, setPerfilUsuario] = useState({
    nombre: usuario?.nombre || 'Usuario GoToX',
    correo: usuario?.correo || '',
    telefono: usuario?.telefono || '',
    ubicacionHabitual: usuario?.ubicacion || 'San José, Costa Rica',
    tieneMascota: Boolean(usuario?.tieneMascota),
    presupuestoHabitual: boveda?.budget_level || 'medio',
    intereses: boveda?.interests || ['Cafeterías de especialidad', 'Terrazas al aire libre'],
    notificacionesLluvia: boveda?.preferences?.notificacionesLluvia ?? true,
    notificacionesAcusticas: boveda?.preferences?.notificacionesAcusticas ?? true,
    notificacionesEventos: boveda?.preferences?.notificacionesEventos ?? false,
    compartirUbicacion: boveda?.preferences?.compartirUbicacion ?? true
  });

  // Estado editable de la mascota propia del usuario
  const [formMascota, setFormMascota] = useState({
    nombre: mascota?.nombre && mascota.nombre !== 'Sin mascota registrada' ? mascota.nombre : '',
    especie: mascota?.especie || 'Canino',
    raza: mascota?.raza && mascota.raza !== 'Sin especificar' ? mascota.raza : '',
    pesoKg: mascota?.pesoKg > 0 ? String(mascota.pesoKg) : '',
    edadAnos: mascota?.edadAnos > 0 ? String(mascota.edadAnos) : '',
    microchipId: mascota?.microchipId && mascota.microchipId !== 'En trámite' ? mascota.microchipId : '',
    colorManto: mascota?.colorManto || '',
    foto: mascota?.foto || mascota?.photoUrl || null,
    alergias: Array.isArray(mascota?.alergias) ? mascota.alergias.join(', ') : ''
  });

  // Cargar bóveda real desde el backend al montar
  useEffect(() => {
    cargarBovedaBackend().catch(() => {});
  }, [cargarBovedaBackend]);

  // Sincronizar contadores locales si cambian en otras vistas
  useEffect(() => {
    const syncLocal = () => {
      setFavoritosCount(obtenerFavoritosIds().length);
      setPlanesCount(obtenerPlanes().length);
    };
    window.addEventListener('gotox:favoritos', syncLocal);
    window.addEventListener('gotox:planes', syncLocal);
    return () => {
      window.removeEventListener('gotox:favoritos', syncLocal);
      window.removeEventListener('gotox:planes', syncLocal);
    };
  }, []);

  // Reflejar actualizaciones de Sesión / Backend en el formulario
  useEffect(() => {
    setPerfilUsuario((prev) => ({
      ...prev,
      nombre: usuario?.nombre || prev.nombre,
      correo: usuario?.correo || prev.correo,
      telefono: usuario?.telefono ?? prev.telefono,
      ubicacionHabitual: usuario?.ubicacion || prev.ubicacionHabitual,
      tieneMascota: usuario?.tieneMascota !== undefined ? Boolean(usuario.tieneMascota) : prev.tieneMascota,
      presupuestoHabitual: boveda?.budget_level || prev.presupuestoHabitual,
      intereses: Array.isArray(boveda?.interests) ? boveda.interests : prev.intereses,
      notificacionesLluvia: boveda?.preferences?.notificacionesLluvia ?? prev.notificacionesLluvia,
      notificacionesAcusticas: boveda?.preferences?.notificacionesAcusticas ?? prev.notificacionesAcusticas,
      notificacionesEventos: boveda?.preferences?.notificacionesEventos ?? prev.notificacionesEventos,
      compartirUbicacion: boveda?.preferences?.compartirUbicacion ?? prev.compartirUbicacion
    }));
  }, [usuario, boveda]);

  useEffect(() => {
    if (mascota) {
      setFormMascota({
        nombre: mascota.nombre && mascota.nombre !== 'Sin mascota registrada' ? mascota.nombre : '',
        especie: mascota.especie || 'Canino',
        raza: mascota.raza && mascota.raza !== 'Sin especificar' ? mascota.raza : '',
        pesoKg: mascota.pesoKg > 0 ? String(mascota.pesoKg) : '',
        edadAnos: mascota.edadAnos > 0 ? String(mascota.edadAnos) : '',
        microchipId: mascota.microchipId && mascota.microchipId !== 'En trámite' ? mascota.microchipId : '',
        colorManto: mascota.colorManto || '',
        foto: mascota.foto || mascota.photoUrl || null,
        alergias: Array.isArray(mascota.alergias) ? mascota.alergias.join(', ') : ''
      });
    }
  }, [mascota]);

  const handleSolicitarCierre = () => setModalConfirmacionAbierto(true);
  const handleConfirmarSalida = () => {
    setModalConfirmacionAbierto(false);
    setAnimandoSalida(true);
  };
  const handleCompletarSalida = () => {
    cerrarSesion();
    setAnimandoSalida(false);
    navigate('/acceso');
  };

  // Estados para Baja del Sistema y Eliminación de Datos Personales (Ley N.º 8968 CR)
  const [mostrarFormBaja, setMostrarFormBaja] = useState(false);
  const [passwordBaja, setPasswordBaja] = useState('');
  const [motivoBaja, setMotivoBaja] = useState('Ejercicio de derecho de supresión (Art. 7 Ley N.º 8968)');
  const [confirmaBajaIrreversible, setConfirmaBajaIrreversible] = useState(false);
  const [procesandoBaja, setProcesandoBaja] = useState(false);
  const [errorBaja, setErrorBaja] = useState('');
  const [comprobanteBaja, setComprobanteBaja] = useState(null);

  const handleSolicitarEliminacionCuenta = async (e) => {
    e.preventDefault();
    setErrorBaja('');

    if (!passwordBaja || passwordBaja.trim().length < 4) {
      setErrorBaja('Por seguridad, confirma tu identidad ingresando tu contraseña actual.');
      return;
    }
    if (!confirmaBajaIrreversible) {
      setErrorBaja('Debes marcar la casilla confirmando la solicitud de eliminación y anonimización.');
      return;
    }

    setProcesandoBaja(true);
    try {
      const res = await authService.deleteAccount({
        email: perfilUsuario.correo,
        password: passwordBaja,
        reason: motivoBaja
      });
      setComprobanteBaja(res);
      setTimeout(() => {
        cerrarSesion();
        navigate('/acceso', {
          replace: true,
          state: { cuentaEliminadaRecibo: res.receiptId }
        });
      }, 3200);
    } catch (err) {
      setErrorBaja(err?.message || 'No se pudo procesar la solicitud de baja.');
    } finally {
      setProcesandoBaja(false);
    }
  };

  const handleGuardarCambios = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setGuardando(true);
    setGuardadoExito('');
    setErrorGuardado('');

    try {
      const petPayload =
        perfilUsuario.tieneMascota && formMascota.nombre.trim()
          ? {
              nombre: formMascota.nombre.trim(),
              especie: formMascota.especie.trim() || 'Canino',
              raza: formMascota.raza.trim() || 'Mestizo',
              pesoKg: formMascota.pesoKg ? Number(formMascota.pesoKg) : 15,
              edadAnos: formMascota.edadAnos ? Number(formMascota.edadAnos) : 2,
              microchipId: formMascota.microchipId.trim(),
              colorManto: formMascota.colorManto.trim() || 'Variado',
              foto: formMascota.foto || null,
              alergias: formMascota.alergias
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            }
          : null;

      await guardarBovedaBackend({
        name: perfilUsuario.nombre.trim(),
        phone: perfilUsuario.telefono.trim(),
        zone: perfilUsuario.ubicacionHabitual.trim(),
        has_pet: perfilUsuario.tieneMascota,
        budget_level: perfilUsuario.presupuestoHabitual,
        interests: perfilUsuario.intereses,
        preferences: {
          notificacionesLluvia: perfilUsuario.notificacionesLluvia,
          notificacionesAcusticas: perfilUsuario.notificacionesAcusticas,
          notificacionesEventos: perfilUsuario.notificacionesEventos,
          compartirUbicacion: perfilUsuario.compartirUbicacion
        },
        pet: petPayload
      });

      setGuardadoExito('Tu información personal y preferencias se guardaron correctamente.');
      setTimeout(() => setGuardadoExito(''), 3500);
    } catch (err) {
      setErrorGuardado(err?.message || 'No se pudieron guardar los cambios en el servidor.');
    } finally {
      setGuardando(false);
    }
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

  const mascotaActualVista = {
    ...mascota,
    nombre: formMascota.nombre || mascota?.nombre || 'Mi Mascota',
    especie: formMascota.especie || 'Canino',
    raza: formMascota.raza || 'Mestizo',
    pesoKg: formMascota.pesoKg ? Number(formMascota.pesoKg) : 15,
    edadAnos: formMascota.edadAnos ? Number(formMascota.edadAnos) : 2,
    microchipId: formMascota.microchipId || 'En trámite',
    colorManto: formMascota.colorManto || 'Variado',
    foto: formMascota.foto || null,
    photoUrl: formMascota.foto || null,
    tutor: {
      ...mascota?.tutor,
      nombre: perfilUsuario.nombre,
      correo: perfilUsuario.correo,
      telefono: perfilUsuario.telefono || 'Sin registrar'
    }
  };

  return (
    <PageWrapper className={embebido ? 'py-2' : 'py-8 md:py-14'}>
      <ModalConfirmarCierre
        isOpen={modalConfirmacionAbierto}
        onClose={() => setModalConfirmacionAbierto(false)}
        onConfirmar={handleConfirmarSalida}
        nombreUsuario={perfilUsuario.nombre}
      />

      <AnimacionCierreSesion
        visible={animandoSalida}
        nombreUsuario={perfilUsuario.nombre}
        onCompletado={handleCompletarSalida}
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 space-y-8">
        {accesoDenegadoAdmin && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              El Panel de Administración es exclusivo para cuentas administradoras autorizadas. Aquí puedes gestionar todas tus funciones de usuario.
            </span>
          </div>
        )}

        {/* Cabecera Principal del Usuario */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200/80 dark:border-white/10 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#501228] to-[#F27B91] flex items-center justify-center text-white shadow-lg text-2xl font-serif font-bold">
              {(perfilUsuario.nombre || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#111827] dark:text-white">
                  {perfilUsuario.nombre}
                </h1>
                <Badge variant="burdeos">
                  {esAdmin ? 'Cuenta Administrativa' : 'Usuario GoToX'}
                </Badge>
                {perfilUsuario.tieneMascota ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/70 dark:border-emerald-800/40">
                    <Dog className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>{formMascota.nombre ? `Mascota: ${formMascota.nombre}` : 'Con mascota vinculada'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-200/70 dark:border-blue-800/40">
                    <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span>Explorador Urbano</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>{perfilUsuario.correo}</span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#F27B91]" />
                  {perfilUsuario.ubicacionHabitual}
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isLoggedIn && (
              <button
                type="button"
                onClick={handleSolicitarCierre}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 dark:border-rose-800/40 shadow-2xs transition-all active:scale-[0.98]"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Cerrar Sesión</span>
              </button>
            )}
          </div>
        </div>

        {guardadoExito && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{guardadoExito}</span>
          </div>
        )}

        {errorGuardado && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorGuardado}</span>
          </div>
        )}

        {/* Pestañas de la Página de Usuario */}
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
            Mi Cuenta
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
            Privacidad & Alertas
          </button>
        </div>

        {/* ============================================================
            1. MI CUENTA (INFORMACIÓN PERSONAL DEL USUARIO)
            ============================================================ */}
        {tabPerfil === 'cuenta' && (
          <form onSubmit={handleGuardarCambios} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-4">
                <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white pb-2 border-b border-slate-100 dark:border-white/10">
                  Información del Usuario
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Nombre Completo</label>
                    <input
                      type="text"
                      value={perfilUsuario.nombre}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, nombre: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Correo Electrónico</label>
                    <input
                      type="email"
                      value={perfilUsuario.correo}
                      readOnly
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#162032]/70 text-slate-500 dark:text-slate-400 text-xs cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Teléfono de Contacto</label>
                    <input
                      type="text"
                      value={perfilUsuario.telefono}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, telefono: e.target.value })}
                      placeholder="+506 8800-0000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Zona Habitual (GAM)</label>
                    <input
                      type="text"
                      value={perfilUsuario.ubicacionHabitual}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, ubicacionHabitual: e.target.value })}
                      placeholder="Barrio Escalante, San José"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="primary" size="sm" disabled={guardando} className="gap-2">
                    <Save className="w-3.5 h-3.5" />
                    <span>{guardando ? 'Guardando...' : 'Guardar Cambios'}</span>
                  </Button>
                </div>
              </Card>

              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
                  <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white">
                    Modalidad de Salida
                  </h3>
                  <Badge variant={perfilUsuario.tieneMascota ? 'burdeos' : 'outline'}>
                    {perfilUsuario.tieneMascota ? 'Con Mascota' : 'Sin Mascota'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Elige si deseas usar las herramientas para mascotas o explorar GoToX únicamente para tus salidas urbanas y gastronomía.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setPerfilUsuario({ ...perfilUsuario, tieneMascota: true })}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      perfilUsuario.tieneMascota
                        ? 'bg-[#501228] text-white border-[#501228]'
                        : 'bg-white dark:bg-[#162032] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                    }`}
                  >
                    Tengo mascota
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
                    Solo para mí / Amigos
                  </button>
                </div>
              </Card>
            </div>

            {/* Columna derecha: Accesos rápidos personales */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-4">
                <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white pb-2 border-b border-slate-100 dark:border-white/10">
                  Mi Actividad Personal
                </h3>
                <div className="space-y-3 text-xs">
                  <Link
                    to="/favoritos"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032] hover:border hover:border-[#F27B91]/40 transition-all"
                  >
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      Lugares en Favoritos
                    </span>
                    <strong className="text-slate-800 dark:text-white flex items-center gap-1">
                      {favoritosCount} guardados <ArrowRight className="w-3 h-3" />
                    </strong>
                  </Link>
                  <Link
                    to="/mis-planes"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032] hover:border hover:border-[#F27B91]/40 transition-all"
                  >
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#F27B91]" />
                      Mis Planes e Itinerarios
                    </span>
                    <strong className="text-slate-800 dark:text-white flex items-center gap-1">
                      {planesCount} activos <ArrowRight className="w-3 h-3" />
                    </strong>
                  </Link>
                  <Link
                    to="/explorar"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032] hover:border hover:border-[#F27B91]/40 transition-all"
                  >
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <Compass className="w-3.5 h-3.5 text-emerald-500" />
                      Explorar Catálogo GAM
                    </span>
                    <strong className="text-[#501228] dark:text-[#F27B91] flex items-center gap-1">
                      Abrir <ArrowRight className="w-3 h-3" />
                    </strong>
                  </Link>
                </div>
              </Card>
            </div>
          </form>
        )}

        {/* ============================================================
            2. PREFERENCIAS DE SALIDA
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
                    Priorizaremos recomendaciones dentro de tu rango estimado en colones.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    Intereses Favoritos
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Gastronomía de autor',
                      'Cafeterías de especialidad',
                      'Parques y senderos',
                      'Terrazas al aire libre',
                      'Museos y cultura',
                      'Cervecerías artesanales',
                      'Heladerías artesanales',
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
                  <Button variant="primary" size="sm" disabled={guardando} onClick={handleGuardarCambios}>
                    {guardando ? 'Guardando...' : 'Guardar Preferencias'}
                  </Button>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-[#501228] dark:text-[#F27B91]">
                  <Sparkles className="w-4 h-4" />
                  <h4 className="font-serif font-bold text-sm text-[#111827] dark:text-white">Sugerencia de Salida</h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  De acuerdo con tu presupuesto {perfilUsuario.presupuestoHabitual} y zona ({perfilUsuario.ubicacionHabitual}), puedes usar Explorar o Copiloto Bruno para planear tu salida de hoy.
                </p>
              </Card>
            </div>
          </div>
        )}

        {/* ============================================================
            3. MI MASCOTA (DATOS EDITABLES + CARNET DIGITAL + QR)
            ============================================================ */}
        {tabPerfil === 'mascota' && (
          <div className="space-y-6">
            {!perfilUsuario.tieneMascota ? (
              <Card className="p-8 text-center max-w-xl mx-auto space-y-4 border-slate-200/80 dark:border-white/10">
                <div className="w-12 h-12 rounded-2xl bg-[#55152D]/20 text-[#F27B91] flex items-center justify-center mx-auto">
                  <Dog className="w-6 h-6" />
                </div>
                <h3 className="font-serif font-bold text-xl text-[#111827] dark:text-white">
                  Aún no tienes una mascota vinculada
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Puedes seguir usando GoToX sin mascota, o agregar una ahora para activar su carnet digital, medalla QR y recomendaciones personalizadas.
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setPerfilUsuario({ ...perfilUsuario, tieneMascota: true })}
                  >
                    Agregar Información de Mi Mascota
                  </Button>
                </div>
              </Card>
            ) : (
              <>
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
                    Ficha & Carnet Digital
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
                  <button
                    type="button"
                    onClick={() => setTabMascota('vacunacion')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                      tabMascota === 'vacunacion'
                        ? 'bg-[#501228] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#162032]'
                    }`}
                  >
                    Cartilla de Referencia
                  </button>
                </div>

                {tabMascota === 'pasaporte' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-5 space-y-4">
                      <CarnetDigital mascota={mascotaActualVista} interactivo={true} />
                      <p className="text-[11px] text-center text-slate-400">
                        Vista interactiva del carnet con los datos de tu mascota
                      </p>
                    </div>

                    <div className="lg:col-span-7">
                      <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-4">
                        <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white pb-2 border-b border-slate-100 dark:border-white/10">
                          Editar Datos de Mi Mascota
                        </h3>
                        <form onSubmit={handleGuardarCambios} className="space-y-4 text-xs">
                          <SelectorFotoMascota
                            valor={formMascota.foto}
                            onChange={(foto) => setFormMascota((prev) => ({ ...prev, foto }))}
                            nombreMascota={formMascota.nombre || 'tu perro'}
                            razaActual={formMascota.raza}
                            onSeleccionarPerfilRaza={({ raza, pesoKg, colorManto, foto }) => {
                              setFormMascota((prev) => ({
                                ...prev,
                                raza: raza || prev.raza,
                                pesoKg: pesoKg ? String(pesoKg) : prev.pesoKg,
                                colorManto: colorManto || prev.colorManto,
                                foto: foto || prev.foto
                              }));
                            }}
                          />

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Nombre de la Mascota</label>
                              <input
                                type="text"
                                value={formMascota.nombre}
                                onChange={(e) => setFormMascota({ ...formMascota, nombre: e.target.value })}
                                placeholder="Ej. Max"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Raza / Especie</label>
                              <input
                                type="text"
                                value={formMascota.raza}
                                onChange={(e) => setFormMascota({ ...formMascota, raza: e.target.value })}
                                placeholder="Ej. Beagle"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Peso (kg)</label>
                              <input
                                type="number"
                                step="0.1"
                                value={formMascota.pesoKg}
                                onChange={(e) => setFormMascota({ ...formMascota, pesoKg: e.target.value })}
                                placeholder="15"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Edad (años)</label>
                              <input
                                type="number"
                                value={formMascota.edadAnos}
                                onChange={(e) => setFormMascota({ ...formMascota, edadAnos: e.target.value })}
                                placeholder="3"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">N° Microchip (Opcional)</label>
                              <input
                                type="text"
                                value={formMascota.microchipId}
                                onChange={(e) => setFormMascota({ ...formMascota, microchipId: e.target.value })}
                                placeholder="CRC-756-..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">Alergias o Cuidados</label>
                              <input
                                type="text"
                                value={formMascota.alergias}
                                onChange={(e) => setFormMascota({ ...formMascota, alergias: e.target.value })}
                                placeholder="Separadas por coma (Opcional)"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white"
                              />
                            </div>
                          </div>

                          <div className="pt-2">
                            <Button type="submit" variant="primary" size="sm" disabled={guardando} className="gap-2">
                              <Save className="w-3.5 h-3.5" />
                              <span>{guardando ? 'Guardando...' : 'Guardar Datos de Mascota'}</span>
                            </Button>
                          </div>
                        </form>
                      </Card>
                    </div>
                  </div>
                )}

                {tabMascota === 'collar' && (
                  <div className="max-w-2xl mx-auto">
                    <QrCollar mascota={mascotaActualVista} />
                  </div>
                )}

                {tabMascota === 'vacunacion' && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="font-serif font-bold text-2xl text-[#111827] dark:text-white">
                        Esquema de Vacunación de Referencia
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Calendario guía de cuidados preventivos; consulta siempre con tu médico veterinario.
                      </p>
                    </div>

                    <Tabla headers={['Vacuna o Tratamiento', 'Última Aplicación', 'Próxima Dosis', 'Estado']}>
                      {(mascota?.vacunacion || []).map((v, i) => (
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
              </>
            )}
          </div>
        )}

        {/* ============================================================
            4. PRIVACIDAD & NOTIFICACIONES PERSONALES
            ============================================================ */}
        {tabPerfil === 'privacidad' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-4">
                <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white pb-2 border-b border-slate-100 dark:border-white/10">
                  Alertas y Privacidad de Cuenta
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032] cursor-pointer">
                    <div>
                      <span className="text-xs font-semibold block text-slate-800 dark:text-white">Alertas de Lluvia y Clima en Vivo</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Avisarme antes de lluvias en mi zona habitual</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={perfilUsuario.notificacionesLluvia}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, notificacionesLluvia: e.target.checked })}
                      className="w-4 h-4 rounded accent-[#501228]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032] cursor-pointer">
                    <div>
                      <span className="text-xs font-semibold block text-slate-800 dark:text-white">Alertas de Confort Acústico</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Notificar si hay niveles de ruido superiores a 65 dB</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={perfilUsuario.notificacionesAcusticas}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, notificacionesAcusticas: e.target.checked })}
                      className="w-4 h-4 rounded accent-[#501228]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032] cursor-pointer">
                    <div>
                      <span className="text-xs font-semibold block text-slate-800 dark:text-white">Ubicación para Rutas y Recomendaciones</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Usar tu zona aproximada para sugerir lugares cercanos</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={perfilUsuario.compartirUbicacion}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, compartirUbicacion: e.target.checked })}
                      className="w-4 h-4 rounded accent-[#501228]"
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <Button variant="primary" size="sm" disabled={guardando} onClick={handleGuardarCambios}>
                    {guardando ? 'Guardando...' : 'Guardar Configuración'}
                  </Button>
                </div>
              </Card>

              {/* BAJA DEL SISTEMA Y ELIMINACIÓN DE DATOS PERSONALES (LEY N.º 8968 CR) */}
              <Card className="p-6 border-rose-300/80 dark:border-rose-800/50 bg-rose-50/30 dark:bg-rose-950/15 space-y-4">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-rose-200/70 dark:border-rose-800/40">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300/60 dark:border-rose-800/50 mb-1.5">
                      <Trash2 className="w-3 h-3" />
                      <span>Derecho de Supresión ARCO &bull; Ley N.º 8968 CR</span>
                    </span>
                    <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white">
                      Baja del Sistema y Eliminación de Datos Personales
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      Como titular de tus datos personales, puedes solicitar en cualquier momento la eliminación de tu cuenta y la supresión o anonimización de tu información en Synodos.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#162032] border border-slate-200/80 dark:border-white/10 space-y-1">
                    <span className="font-bold text-rose-700 dark:text-rose-300 block">
                      ¿Qué se elimina de inmediato?
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      Nombre completo, correo electrónico, teléfono, dirección/zona, perfil biométrico y fotografías de tu mascota, preferencias y tokens de sesión activos.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#162032] border border-slate-200/80 dark:border-white/10 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-white block">
                      ¿Qué se conserva anonimizado por ley?
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      Únicamente los registros de auditoría técnica e historial contable/operativo exigidos por obligación legal, totalmente anonimizados (sin datos personales identificables).
                    </p>
                  </div>
                </div>

                {comprobanteBaja ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>Solicitud Procesada &bull; Comprobante #{comprobanteBaja.receiptId}</span>
                    </div>
                    <p className="leading-relaxed">{comprobanteBaja.message}</p>
                    <p className="text-[11px] opacity-80">
                      Notificación emitida el {new Date(comprobanteBaja.processedAt).toLocaleString('es-CR')}. Cerrando sesión y limpiando bóveda local...
                    </p>
                  </div>
                ) : !mostrarFormBaja ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Se requerirá confirmar tu identidad antes de ejecutar la baja definitiva.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMostrarFormBaja(true);
                        setErrorBaja('');
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 transition-colors shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Solicitar Eliminación de Cuenta y Datos</span>
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSolicitarEliminacionCuenta}
                    className="p-4 rounded-2xl bg-white dark:bg-[#111827] border border-rose-300 dark:border-rose-800/60 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Confirmación de Identidad del Titular</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setMostrarFormBaja(false)}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                          Contraseña actual (para confirmar identidad)
                        </label>
                        <input
                          type="password"
                          value={passwordBaja}
                          onChange={(e) => setPasswordBaja(e.target.value)}
                          placeholder="Ingresa tu contraseña actual"
                          required
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#162032] text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                          Motivo de la solicitud
                        </label>
                        <select
                          value={motivoBaja}
                          onChange={(e) => setMotivoBaja(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#162032] text-slate-900 dark:text-white"
                        >
                          <option value="Ejercicio de derecho de supresión (Art. 7 Ley N.º 8968)">
                            Derecho de supresión ARCO (Ley N.º 8968)
                          </option>
                          <option value="Ya no utilizo la plataforma Synodos">
                            Ya no utilizo la plataforma Synodos
                          </option>
                          <option value="Deseo revocar mi consentimiento y anonimizar mi historial">
                            Revocar consentimiento y anonimizar historial
                          </option>
                        </select>
                      </div>
                    </div>

                    <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={confirmaBajaIrreversible}
                        onChange={(e) => setConfirmaBajaIrreversible(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded accent-rose-700 shrink-0"
                      />
                      <span className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        Confirmo mi identidad como titular de la cuenta <strong>{perfilUsuario.correo}</strong> y solicito la eliminación de mis datos personales y la anonimización de los registros legales conforme a la Ley N.º 8968.
                      </span>
                    </label>

                    {errorBaja && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{errorBaja}</span>
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setMostrarFormBaja(false)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15"
                      >
                        Conservar mi cuenta
                      </button>
                      <button
                        type="submit"
                        disabled={procesandoBaja}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>
                          {procesandoBaja ? 'Procesando baja y anonimización...' : 'Confirmar Eliminación Definitiva'}
                        </span>
                      </button>
                    </div>
                  </form>
                )}
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-4">
              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                  <h4 className="font-serif font-bold text-sm text-[#111827] dark:text-white">
                    Gobernanza Ley N.º 8968 CR
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tu cuenta personal cuenta con consentimiento informado activo (versión <strong>2026.11-CR-8968</strong>). Tus datos están protegidos mediante hash criptográfico, control de roles y bitácoras auditables.
                </p>
                <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-white/10 text-xs">
                  <Link
                    to="/terminos"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#162032] hover:bg-[#FDF2F4] dark:hover:bg-[#55152D]/30 font-semibold text-[#501228] dark:text-[#F27B91] transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4" />
                      <span>Ver Términos y Política de Privacidad</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={abrirConfiguracionCookies}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#162032] hover:bg-slate-100 dark:hover:bg-white/10 font-medium text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Cookie className="w-4 h-4 text-[#F27B91]" />
                      <span>Gestionar Consentimiento de Cookies</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
export default Perfil;
