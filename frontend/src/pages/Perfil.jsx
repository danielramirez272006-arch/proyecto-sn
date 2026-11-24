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
import { api } from '../shared/services/api-client';
import { useIdioma } from '../context/IdiomaContext';
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
  const { t, idiomaActual } = useIdioma();
  const accesoDenegadoAdmin = Boolean(location.state?.accesoDenegadoAdmin);

  const [tabPerfil, setTabPerfil] = useState('cuenta'); // 'cuenta' | 'preferencias' | 'mascota' | 'privacidad'
  const [tabMascota, setTabMascota] = useState('pasaporte'); // 'pasaporte' | 'vacunacion' | 'collar'
  const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false);
  const [animandoSalida, setAnimandoSalida] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardadoExito, setGuardadoExito] = useState('');
  const [errorGuardado, setErrorGuardado] = useState('');
  const [claveBaja, setClaveBaja] = useState('');
  const [eliminandoCuenta, setEliminandoCuenta] = useState(false);
  const [mensajeBaja, setMensajeBaja] = useState('');

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
      setErrorBaja(t('perfil.errPassReq'));
      return;
    }
    if (!confirmaBajaIrreversible) {
      setErrorBaja(t('perfil.errChkReq'));
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
      setErrorBaja(err?.message || t('perfil.errBajaGen'));
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
              raza: formMascota.raza.trim() || t('carnet.mestizo'),
              pesoKg: formMascota.pesoKg ? Number(formMascota.pesoKg) : 15,
              edadAnos: formMascota.edadAnos ? Number(formMascota.edadAnos) : 2,
              microchipId: formMascota.microchipId.trim(),
              colorManto: formMascota.colorManto.trim() || t('carnet.variado'),
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

      setGuardadoExito(t('perfil.msgGuardadoOk'));
      setTimeout(() => setGuardadoExito(''), 3500);
    } catch (err) {
      setErrorGuardado(err?.message || t('perfil.msgGuardadoErr'));
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
    nombre: formMascota.nombre || mascota?.nombre || t('comun.miMascotaDefault'),
    especie: formMascota.especie || 'Canino',
    raza: formMascota.raza || t('carnet.mestizo'),
    pesoKg: formMascota.pesoKg ? Number(formMascota.pesoKg) : 15,
    edadAnos: formMascota.edadAnos ? Number(formMascota.edadAnos) : 2,
    microchipId: formMascota.microchipId || t('comun.enTramite'),
    colorManto: formMascota.colorManto || t('carnet.variado'),
    foto: formMascota.foto || null,
    photoUrl: formMascota.foto || null,
    tutor: {
      ...mascota?.tutor,
      nombre: perfilUsuario.nombre,
      correo: perfilUsuario.correo,
      telefono: perfilUsuario.telefono || t('comun.sinRegistrar')
    }
  };

  const interesesTraducidos = t('perfil.interesesOpc');
  const interesesCanonicos = [
    'Gastronomía de autor',
    'Cafeterías de especialidad',
    'Parques y senderos',
    'Terrazas al aire libre',
    'Museos y cultura',
    'Cervecerías artesanales',
    'Heladerías artesanales',
    'Miradores del GAM'
  ];
  const presupuestoLabel =
    perfilUsuario.presupuestoHabitual === 'economico'
      ? t('perfil.tierEconLabel')
      : perfilUsuario.presupuestoHabitual === 'premium'
      ? t('perfil.tierPremLabel')
      : t('perfil.tierModLabel');

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
              <strong>{t('perfil.adminAvisoTitulo')}:</strong> {t('perfil.adminAvisoDesc')}
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
                  {esAdmin ? t('perfil.rolAdmin') : t('perfil.rolUsuario')}
                </Badge>
                {perfilUsuario.tieneMascota ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200/70 dark:border-emerald-800/40">
                    <Dog className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    <span>{formMascota.nombre ? t('perfil.badgeMascota', { nombre: formMascota.nombre }) : t('perfil.badgeConMascota')}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-200/70 dark:border-blue-800/40">
                    <User className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                    <span>{t('perfil.badgeExplorador')}</span>
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
                <span>{t('nav.cerrarSesion')}</span>
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
            {t('perfil.tabCuenta')}
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
            {t('perfil.tabPreferencias')}
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
            {t('perfil.tabMascota')}
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
            {t('perfil.tabPrivacidad')}
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
                  {t('perfil.infoUsuarioTitulo')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">{t('perfil.lblNombre')}</label>
                    <input
                      type="text"
                      value={perfilUsuario.nombre}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, nombre: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">{t('perfil.lblCorreo')}</label>
                    <input
                      type="email"
                      value={perfilUsuario.correo}
                      readOnly
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#162032]/70 text-slate-500 dark:text-slate-400 text-xs cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">{t('perfil.lblTelefono')}</label>
                    <input
                      type="text"
                      value={perfilUsuario.telefono}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, telefono: e.target.value })}
                      placeholder={t('accesoExt.telefonoPlaceholder')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">{t('perfil.lblZona')}</label>
                    <input
                      type="text"
                      value={perfilUsuario.ubicacionHabitual}
                      onChange={(e) => setPerfilUsuario({ ...perfilUsuario, ubicacionHabitual: e.target.value })}
                      placeholder={t('accesoExt.zonaPlaceholder')}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="primary" size="sm" disabled={guardando} className="gap-2">
                    <Save className="w-3.5 h-3.5" />
                    <span>{guardando ? t('comun.guardando') : t('perfil.guardarCambiosBtn')}</span>
                  </Button>
                </div>
              </Card>

              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/10">
                  <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white">
                    {t('perfil.modalidadTitulo')}
                  </h3>
                  <Badge variant={perfilUsuario.tieneMascota ? 'burdeos' : 'outline'}>
                    {perfilUsuario.tieneMascota ? t('perfil.conMascotaEstado') : t('perfil.sinMascotaEstado')}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {t('perfil.modalidadDesc')}
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
                    {t('perfil.btnTengoMascota')}
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
                    {t('perfil.btnSoloAmigos')}
                  </button>
                </div>
              </Card>
            </div>

            {/* Columna derecha: Accesos rápidos personales */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-4">
                <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white pb-2 border-b border-slate-100 dark:border-white/10">
                  {t('perfil.actividadTitulo')}
                </h3>
                <div className="space-y-3 text-xs">
                  <Link
                    to="/favoritos"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032] hover:border hover:border-[#F27B91]/40 transition-all"
                  >
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      {t('perfil.lugaresFavoritos')}
                    </span>
                    <strong className="text-slate-800 dark:text-white flex items-center gap-1">
                      {t('perfil.guardadosCount', { n: favoritosCount })} <ArrowRight className="w-3 h-3" />
                    </strong>
                  </Link>
                  <Link
                    to="/mis-planes"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032] hover:border hover:border-[#F27B91]/40 transition-all"
                  >
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-[#F27B91]" />
                      {t('perfil.misPlanesItin')}
                    </span>
                    <strong className="text-slate-800 dark:text-white flex items-center gap-1">
                      {t('perfil.activosCount', { n: planesCount })} <ArrowRight className="w-3 h-3" />
                    </strong>
                  </Link>
                  <Link
                    to="/explorar"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032] hover:border hover:border-[#F27B91]/40 transition-all"
                  >
                    <span className="text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <Compass className="w-3.5 h-3.5 text-emerald-500" />
                      {t('perfil.explorarCatalogo')}
                    </span>
                    <strong className="text-[#501228] dark:text-[#F27B91] flex items-center gap-1">
                      {t('perfil.abrirBtn')} <ArrowRight className="w-3 h-3" />
                    </strong>
                  </Link>
                </div>
              </Card>

              <Card className="p-6 border-rose-500/25 bg-rose-500/5 space-y-3 text-left">
                <h3 className="font-serif font-bold text-sm text-rose-500 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar Cuenta y Datos (Ley N.º 8968)</span>
                </h3>
                <p className="text-[11px] opacity-80 leading-relaxed">
                  Ejerce tu derecho de supresión: elimina tus mascotas, bóveda y sesiones de forma irreversible.
                </p>
                {mensajeBaja && (
                  <p className="text-[11px] text-rose-400 font-semibold">{mensajeBaja}</p>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    value={claveBaja}
                    onChange={(e) => setClaveBaja(e.target.value)}
                    placeholder="Confirma tu contraseña"
                    aria-label="Confirma tu contraseña para eliminar cuenta"
                    className="flex-1 px-3 py-2 rounded-xl border border-rose-500/30 bg-transparent text-xs outline-none"
                  />
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    disabled={eliminandoCuenta || !claveBaja}
                    onClick={async () => {
                      setMensajeBaja('');
                      setEliminandoCuenta(true);
                      try {
                        await api.post('/auth/delete-account', { password: claveBaja });
                        cerrarSesion();
                        navigate('/', { replace: true });
                      } catch (err) {
                        setMensajeBaja(err?.message || 'Contraseña incorrecta o sesión no válida.');
                      } finally {
                        setEliminandoCuenta(false);
                      }
                    }}
                  >
                    {eliminandoCuenta ? 'Procesando...' : 'Dar de baja'}
                  </Button>
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
                    {t('perfil.presupuestoTitulo')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('perfil.presupuestoDesc')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'economico', label: t('perfil.tierEconLabel'), desc: t('perfil.tierEconDesc') },
                    { id: 'medio', label: t('perfil.tierModLabel'), desc: t('perfil.tierModDesc') },
                    { id: 'premium', label: t('perfil.tierPremLabel'), desc: t('perfil.tierPremDesc') }
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
                    {t('perfil.interesesTitulo')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {interesesCanonicos.map((interes, idx) => {
                      const activo = perfilUsuario.intereses.includes(interes);
                      const etiqueta = (Array.isArray(interesesTraducidos) && interesesTraducidos[idx]) || interes;
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
                          {activo && '✓ '} {etiqueta}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3">
                  <Button variant="primary" size="sm" disabled={guardando} onClick={handleGuardarCambios}>
                    {guardando ? t('comun.guardando') : t('perfil.guardarPrefsBtn')}
                  </Button>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-[#501228] dark:text-[#F27B91]">
                  <Sparkles className="w-4 h-4" />
                  <h4 className="font-serif font-bold text-sm text-[#111827] dark:text-white">{t('perfil.sugerenciaTitulo')}</h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t('perfil.sugerenciaCuerpo', { presupuesto: presupuestoLabel, zona: perfilUsuario.ubicacionHabitual })}
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
                  {t('perfil.sinMascotaPerfilTitulo')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('perfil.sinMascotaPerfilDesc')}
                </p>
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setPerfilUsuario({ ...perfilUsuario, tieneMascota: true })}
                  >
                    {t('perfil.sinMascotaPerfilBtn')}
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
                    {t('perfil.subtabCarnet')}
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
                    {t('perfil.subtabQr')}
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
                    {t('perfil.subtabCartilla')}
                  </button>
                </div>

                {tabMascota === 'pasaporte' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-5 space-y-4">
                      <CarnetDigital mascota={mascotaActualVista} interactivo={true} />
                      <p className="text-[11px] text-center text-slate-400">
                        {t('perfil.vistaCarnetHint')}
                      </p>
                    </div>

                    <div className="lg:col-span-7">
                      <Card className="p-6 border-slate-200/80 dark:border-white/10 space-y-4">
                        <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white pb-2 border-b border-slate-100 dark:border-white/10">
                          {t('perfil.editarMascotaTitulo')}
                        </h3>
                        <form onSubmit={handleGuardarCambios} className="space-y-4 text-xs">
                          <SelectorFotoMascota
                            valor={formMascota.foto}
                            onChange={(foto) => setFormMascota((prev) => ({ ...prev, foto }))}
                            nombreMascota={formMascota.nombre || t('accesoExt.tuPerroDefault')}
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
                              <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">{t('perfil.lblNombreMascota')}</label>
                              <input
                                type="text"
                                value={formMascota.nombre}
                                onChange={(e) => setFormMascota({ ...formMascota, nombre: e.target.value })}
                                placeholder={t('mascotaPage.phNombre')}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">{t('perfil.lblRazaMascota')}</label>
                              <input
                                type="text"
                                value={formMascota.raza}
                                onChange={(e) => setFormMascota({ ...formMascota, raza: e.target.value })}
                                placeholder={t('mascotaPage.phRaza')}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">{t('perfil.lblPesoMascota')}</label>
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
                              <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">{t('perfil.lblEdadMascota')}</label>
                              <input
                                type="number"
                                value={formMascota.edadAnos}
                                onChange={(e) => setFormMascota({ ...formMascota, edadAnos: e.target.value })}
                                placeholder="3"
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">{t('accesoExt.microchipOpc')}</label>
                              <input
                                type="text"
                                value={formMascota.microchipId}
                                onChange={(e) => setFormMascota({ ...formMascota, microchipId: e.target.value })}
                                placeholder="CRC-756-..."
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="text-slate-500 dark:text-slate-400 block mb-1 font-medium">{t('perfil.lblAlergiasMascota')}</label>
                              <input
                                type="text"
                                value={formMascota.alergias}
                                onChange={(e) => setFormMascota({ ...formMascota, alergias: e.target.value })}
                                placeholder={t('mascotaPage.phAlergias')}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#162032] text-slate-800 dark:text-white"
                              />
                            </div>
                          </div>

                          <div className="pt-2">
                            <Button type="submit" variant="primary" size="sm" disabled={guardando} className="gap-2">
                              <Save className="w-3.5 h-3.5" />
                              <span>{guardando ? t('comun.guardando') : t('perfil.guardarMascotaBtn')}</span>
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
                        {t('perfil.esquemaTitulo')}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('perfil.esquemaSub')}
                      </p>
                    </div>

                    <Tabla headers={[t('perfil.thVacuna'), t('perfil.thUltima'), t('perfil.thProxima'), t('perfil.thEstado')]}>
                      {(mascota?.vacunacion || []).map((v, i) => {
                        const vacunaNombre =
                          i === 0
                            ? t('perfil.vacuna1Nombre')
                            : i === 1
                            ? t('perfil.vacuna2Nombre')
                            : i === 2
                            ? t('perfil.vacuna3Nombre')
                            : i === 3
                            ? t('perfil.vacuna4Nombre')
                            : v.nombre;
                        const estadoVac =
                          v.estado && v.estado.toLowerCase().includes('al d')
                            ? t('perfil.vacunaAlDia')
                            : t('perfil.vacunaProxima');
                        return (
                          <Tr key={i}>
                            <Td>
                              <div className="flex items-center gap-2">
                                <Syringe className="w-4 h-4 text-[#501228] dark:text-[#F27B91]" />
                                <span className="font-semibold text-slate-800 dark:text-white">{vacunaNombre}</span>
                              </div>
                            </Td>
                            <Td>
                              <span className="text-xs text-slate-600 dark:text-slate-300">{v.fecha}</span>
                            </Td>
                            <Td>
                              <span className="text-xs font-semibold text-slate-800 dark:text-white">{v.proxima}</span>
                            </Td>
                            <Td>
                              <Badge variant="success">{estadoVac}</Badge>
                            </Td>
                          </Tr>
                        );
                      })}
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
                  {t('perfil.privacidadTitulo')}
                </h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#162032] cursor-pointer">
                    <div>
                      <span className="text-xs font-semibold block text-slate-800 dark:text-white">{t('perfil.priv1Titulo')}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{t('perfil.priv1Desc')}</span>
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
                      <span className="text-xs font-semibold block text-slate-800 dark:text-white">{t('perfil.priv2Titulo')}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{t('perfil.priv2Desc')}</span>
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
                      <span className="text-xs font-semibold block text-slate-800 dark:text-white">{t('perfil.priv3Titulo')}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{t('perfil.priv3Desc')}</span>
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
                    {guardando ? t('comun.guardando') : t('perfil.guardarConfigBtn')}
                  </Button>
                </div>
              </Card>

              {/* BAJA DEL SISTEMA Y ELIMINACIÓN DE DATOS PERSONALES (LEY N.º 8968 CR) */}
              <Card className="p-6 border-rose-300/80 dark:border-rose-800/50 bg-rose-50/30 dark:bg-rose-950/15 space-y-4">
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-rose-200/70 dark:border-rose-800/40">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300/60 dark:border-rose-800/50 mb-1.5">
                      <Trash2 className="w-3 h-3" />
                      <span>{t('perfil.arcoTag')}</span>
                    </span>
                    <h3 className="font-serif font-bold text-lg text-[#111827] dark:text-white">
                      {t('perfil.arcoTitulo')}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      {t('perfil.arcoDesc')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#162032] border border-slate-200/80 dark:border-white/10 space-y-1">
                    <span className="font-bold text-rose-700 dark:text-rose-300 block">
                      {t('perfil.arcoQueEliminaTitulo')}
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {t('perfil.arcoQueEliminaDesc')}
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#162032] border border-slate-200/80 dark:border-white/10 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-white block">
                      {t('perfil.arcoQueConservaTitulo')}
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      {t('perfil.arcoQueConservaDesc')}
                    </p>
                  </div>
                </div>

                {comprobanteBaja ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 space-y-2 text-xs">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>{t('perfil.arcoProcesadaBadge', { id: comprobanteBaja.receiptId })}</span>
                    </div>
                    <p className="leading-relaxed">{comprobanteBaja.message}</p>
                    <p className="text-[11px] opacity-80">
                      {t('perfil.arcoProcesadaDesc', {
                        email: `${perfilUsuario.correo} (${new Date(comprobanteBaja.processedAt).toLocaleString(idiomaActual.ttsLang)})`
                      })}
                    </p>
                  </div>
                ) : !mostrarFormBaja ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('perfil.arcoRequeriraId')}
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
                      <span>{t('perfil.arcoSolicitarBtn')}</span>
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
                        <span>{t('perfil.arcoConfirmTitulo')}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setMostrarFormBaja(false)}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
                      >
                        {t('comun.cancelar')}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                          {t('perfil.lblPassBaja')}
                        </label>
                        <input
                          type="password"
                          value={passwordBaja}
                          onChange={(e) => setPasswordBaja(e.target.value)}
                          placeholder={t('perfil.phPassBaja')}
                          required
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#162032] text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                          {t('perfil.lblMotivoBaja')}
                        </label>
                        <select
                          value={motivoBaja}
                          onChange={(e) => setMotivoBaja(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#162032] text-slate-900 dark:text-white"
                        >
                          <option value="Ejercicio de derecho de supresión (Art. 7 Ley N.º 8968)">
                            {t('perfil.motivoOpt1')}
                          </option>
                          <option value="Ya no utilizo la plataforma Synodos">
                            {t('perfil.motivoOpt2')}
                          </option>
                          <option value="Deseo revocar mi consentimiento y anonimizar mi historial">
                            {t('perfil.motivoOpt3')}
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
                        {t('perfil.chkConfirmBaja')} ({perfilUsuario.correo})
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
                        {t('perfil.btnConservar')}
                      </button>
                      <button
                        type="submit"
                        disabled={procesandoBaja}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 disabled:opacity-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>
                          {procesandoBaja ? t('perfil.btnProcesando') : t('perfil.btnConfirmarBaja')}
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
                    {t('perfil.govTitulo')}
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t('perfil.govDesc')} (2026.11-CR-8968)
                </p>
                <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-white/10 text-xs">
                  <Link
                    to="/terminos"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#162032] hover:bg-[#FDF2F4] dark:hover:bg-[#55152D]/30 font-semibold text-[#501228] dark:text-[#F27B91] transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4" />
                      <span>{t('perfil.verTerminosBtn')}</span>
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
                      <span>{t('perfil.gestionarCookiesBtn')}</span>
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
