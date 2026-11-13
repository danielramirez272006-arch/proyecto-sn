import { useLocalStorage } from './useLocalStorage';
import { MASCOTA_ACTIVA_DEFECTO } from '../data/mascota';

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
  };

  const cerrarSesion = () => {
    setSesion(prev => ({
      ...prev,
      isLoggedIn: false
    }));
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
    usuario: sesion.usuario,
    mascota: sesion.mascota || MASCOTA_ACTIVA_DEFECTO,
    ajustes: sesion.ajustes,
    iniciarSesion,
    cerrarSesion,
    actualizarMascota,
    actualizarAjustes
  };
}

