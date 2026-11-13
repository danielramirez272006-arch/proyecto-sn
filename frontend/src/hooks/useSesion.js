import { useState } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { MASCOTA_ACTIVA_DEFECTO } from '../data/mascota';
import { authService } from '../shared/services/auth-service';

const SESION_DEFECTO = {
  isLoggedIn: true,
  usuario: {
    nombre: "Mariana Rojas",
    correo: "mariana.rojas@gotox.cr",
    rol: "Tutor Certificado Pet-OS",
    ciudad: "San José, Costa Rica",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
  },
  mascota: MASCOTA_ACTIVA_DEFECTO,
  ajustes: {
    alertasAsfaltoCaliente: true,
    umbralTemperaturaAsfalto: 28,
    notificarAforoTerrazas: true,
    modoAhorroBateriaCollar: false,
    alertaDecibeliosMax: 65
  }
};

export function useSesion() {
  const [sesion, setSesion] = useLocalStorage('gotox_sesion_activa', SESION_DEFECTO);
  const [cargandoAuth, setCargandoAuth] = useState(false);
  const [errorAuth, setErrorAuth] = useState(null);

  const aplicarUsuarioBackend = (user) => {
    if (!user) return;
    setSesion(prev => ({
      ...prev,
      isLoggedIn: true,
      usuario: {
        ...prev.usuario,
        id: user.id,
        nombre: user.name || prev.usuario.nombre,
        correo: user.email || prev.usuario.correo,
        rol: user.role || prev.usuario.rol
      }
    }));
  };

  /**
   * Login real contra POST /api/auth/login (listo para conectar en Acceso.jsx).
   */
  const loginConBackend = async ({ email, password }) => {
    setCargandoAuth(true);
    setErrorAuth(null);
    try {
      const data = await authService.login({ email, password });
      aplicarUsuarioBackend(data?.user);
      return data;
    } catch (err) {
      setErrorAuth(err.message || 'No se pudo iniciar sesión');
      throw err;
    } finally {
      setCargandoAuth(false);
    }
  };

  /**
   * Registro real contra POST /api/auth/register (listo para conectar en Acceso.jsx).
   */
  const registrarConBackend = async ({ name, email, password }) => {
    setCargandoAuth(true);
    setErrorAuth(null);
    try {
      const data = await authService.register({ name, email, password });
      aplicarUsuarioBackend(data?.user);
      return data;
    } catch (err) {
      setErrorAuth(err.message || 'No se pudo completar el registro');
      throw err;
    } finally {
      setCargandoAuth(false);
    }
  };

  /**
   * Sincroniza la sesión activa con GET /api/auth/me.
   */
  const sincronizarPerfilBackend = async () => {
    try {
      const me = await authService.getMe();
      if (me?.authenticated && me?.user) {
        aplicarUsuarioBackend(me.user);
      }
      return me;
    } catch {
      return null;
    }
  };

  const iniciarSesion = (correo, nombre = "Usuario GoToX") => {
    setSesion(prev => ({
      ...prev,
      isLoggedIn: true,
      usuario: {
        ...prev.usuario,
        correo: correo || prev.usuario.correo,
        nombre: nombre || prev.usuario.nombre
      }
    }));

    // Sincronización no bloqueante con el backend (/api/auth/guest-session)
    authService.createGuestSession(nombre || correo).catch(() => {
      // Modo local sin backend activo
    });
  };

  const cerrarSesion = () => {
    setSesion(prev => ({
      ...prev,
      isLoggedIn: false
    }));
    authService.logout().catch(() => {});
  };

  const actualizarMascota = (datosActualizados) => {
    setSesion(prev => ({
      ...prev,
      mascota: {
        ...prev.mascota,
        ...datosActualizados
      }
    }));
  };

  const actualizarAjustes = (nuevosAjustes) => {
    setSesion(prev => ({
      ...prev,
      ajustes: {
        ...prev.ajustes,
        ...nuevosAjustes
      }
    }));
  };

  return {
    isLoggedIn: sesion.isLoggedIn,
    autenticadoBackend: Boolean(sesion.usuario?.id),
    cargandoAuth,
    errorAuth,
    usuario: sesion.usuario,
    mascota: sesion.mascota || MASCOTA_ACTIVA_DEFECTO,
    ajustes: sesion.ajustes,
    iniciarSesion,
    loginConBackend,
    registrarConBackend,
    sincronizarPerfilBackend,
    cerrarSesion,
    actualizarMascota,
    actualizarAjustes
  };
}

