import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { MASCOTA_ACTIVA_DEFECTO } from '../data/mascota';
import { authService } from '../shared/services/auth-service';

const CLAVE_STORAGE = 'gotox_sesion_activa';

const SESION_DEFECTO = {
  isLoggedIn: false,
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

function leerSesionInicial() {
  if (typeof window === 'undefined') return SESION_DEFECTO;
  try {
    const raw = window.localStorage.getItem(CLAVE_STORAGE);
    if (raw) {
      const parseado = JSON.parse(raw);
      return {
        ...SESION_DEFECTO,
        ...parseado,
        // Garantizar que estructuras anidadas no sean undefined
        usuario: { ...SESION_DEFECTO.usuario, ...(parseado.usuario || {}) },
        mascota: { ...SESION_DEFECTO.mascota, ...(parseado.mascota || {}) },
        ajustes: { ...SESION_DEFECTO.ajustes, ...(parseado.ajustes || {}) }
      };
    }
  } catch (err) {
    console.warn('[SesionContext] Error leyendo sesión guardada:', err);
  }
  return SESION_DEFECTO;
}

const SesionContext = createContext(null);

export function SesionProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesionInicial);
  const [cargandoAuth, setCargandoAuth] = useState(false);
  const [errorAuth, setErrorAuth] = useState(null);

  // Sincronizar automáticamente en localStorage al cambiar el estado
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(CLAVE_STORAGE, JSON.stringify(sesion));
      }
    } catch (err) {
      console.warn('[SesionContext] Error persistiendo sesión:', err);
    }
  }, [sesion]);

  const aplicarUsuarioBackend = useCallback((user) => {
    if (!user) return;
    setSesion(prev => ({
      ...prev,
      isLoggedIn: true,
      usuario: {
        ...prev.usuario,
        id: user.id,
        nombre: user.name || prev.usuario?.nombre || 'Tutor GoToX',
        correo: user.email || prev.usuario?.correo,
        rol: user.role || prev.usuario?.rol || 'Tutor Certificado Pet-OS'
      }
    }));
  }, []);

  const iniciarSesion = useCallback((correo, nombre = "Usuario GoToX") => {
    setSesion(prev => ({
      ...prev,
      isLoggedIn: true,
      usuario: {
        ...prev.usuario,
        correo: correo || prev.usuario?.correo || 'mariana.rojas@gotox.cr',
        nombre: nombre || prev.usuario?.nombre || 'Mariana Rojas'
      }
    }));

    authService.createGuestSession(nombre || correo).catch(() => {});
  }, []);

  const cerrarSesion = useCallback(() => {
    // 1. Limpiar estado de React de manera unificada
    setSesion(prev => ({
      ...prev,
      isLoggedIn: false,
      usuario: {
        ...SESION_DEFECTO.usuario,
        id: null
      }
    }));

    // 2. Limpiar tokens y storage inmediatamente
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('token');
        window.localStorage.removeItem('auth_user');
        window.localStorage.setItem(
          CLAVE_STORAGE,
          JSON.stringify({ ...SESION_DEFECTO, isLoggedIn: false })
        );
      }
    } catch (err) {
      console.warn('[SesionContext] Error limpiando credenciales:', err);
    }

    // 3. Notificar al backend de forma no bloqueante
    authService.logout().catch(() => {});
  }, []);

  const loginConBackend = useCallback(async ({ email, password }) => {
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
  }, [aplicarUsuarioBackend]);

  const registrarConBackend = useCallback(async ({ name, email, password }) => {
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
  }, [aplicarUsuarioBackend]);

  const sincronizarPerfilBackend = useCallback(async () => {
    try {
      const me = await authService.getMe();
      if (me?.authenticated && me?.user) {
        aplicarUsuarioBackend(me.user);
      }
      return me;
    } catch {
      return null;
    }
  }, [aplicarUsuarioBackend]);

  const actualizarMascota = useCallback((datosActualizados) => {
    setSesion(prev => ({
      ...prev,
      mascota: {
        ...prev.mascota,
        ...datosActualizados
      }
    }));
  }, []);

  const actualizarAjustes = useCallback((nuevosAjustes) => {
    setSesion(prev => ({
      ...prev,
      ajustes: {
        ...prev.ajustes,
        ...nuevosAjustes
      }
    }));
  }, []);

  const valor = useMemo(() => ({
    isLoggedIn: Boolean(sesion.isLoggedIn),
    usuario: sesion.usuario,
    mascota: sesion.mascota,
    ajustes: sesion.ajustes,
    cargandoAuth,
    errorAuth,
    iniciarSesion,
    cerrarSesion,
    loginConBackend,
    registrarConBackend,
    sincronizarPerfilBackend,
    actualizarMascota,
    actualizarAjustes
  }), [
    sesion,
    cargandoAuth,
    errorAuth,
    iniciarSesion,
    cerrarSesion,
    loginConBackend,
    registrarConBackend,
    sincronizarPerfilBackend,
    actualizarMascota,
    actualizarAjustes
  ]);

  return (
    <SesionContext.Provider value={valor}>
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) {
    throw new Error('useSesion debe usarse dentro de un <SesionProvider>');
  }
  return contexto;
}
