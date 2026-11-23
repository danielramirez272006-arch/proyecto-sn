import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LayoutPublico } from '../layouts/LayoutPublico';
import { RutaPrivada } from './RutaPrivada';
import { RutaAdmin } from './RutaAdmin';
import { Home } from '../pages/Home';
import { UsuarioPanel } from '../pages/UsuarioPanel';
import { MapaPage } from '../pages/MapaPage';
import { TerrazasPage } from '../pages/TerrazasPage';
import { CopilotoPage } from '../pages/CopilotoPage';
import { Nosotros } from '../pages/Nosotros';
import { TerminosCondiciones } from '../pages/TerminosCondiciones';
import { Acceso } from '../pages/Acceso';
import { Panel } from '../pages/Panel';

/**
 * Enrutador directo de respuesta instantánea sin bloqueo de salida ni fallos de carga diferida.
 */
export function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Routes location={location}>
      {/* Rutas Públicas de Synodos */}
      <Route element={<LayoutPublico />}>
        <Route path="/" element={<Home />} />
        <Route path="/mapa" element={<MapaPage />} />
        <Route path="/terrazas" element={<TerrazasPage />} />
        <Route path="/copiloto" element={<CopilotoPage />} />
        <Route path="/nosotros" element={<Nosotros />} />
        <Route path="/terminos" element={<TerminosCondiciones />} />
        <Route path="/acceso" element={<Acceso />} />

        {/* Atajos de rutas de usuario redirigen al Portal Exclusivo de Usuarios */}
        <Route
          path="/explorar"
          element={
            <RutaPrivada modulo="usuario.explorar">
              <Navigate to="/usuario?tab=explorar" replace />
            </RutaPrivada>
          }
        />
        <Route
          path="/mis-planes"
          element={
            <RutaPrivada modulo="usuario.planes">
              <Navigate to="/usuario?tab=planes" replace />
            </RutaPrivada>
          }
        />
        <Route
          path="/favoritos"
          element={
            <RutaPrivada modulo="usuario.favoritos">
              <Navigate to="/usuario?tab=favoritos" replace />
            </RutaPrivada>
          }
        />
        <Route
          path="/mi-mascota"
          element={
            <RutaPrivada modulo="usuario.mascota">
              <Navigate to="/usuario?tab=mascota" replace />
            </RutaPrivada>
          }
        />
        <Route
          path="/perfil"
          element={
            <RutaPrivada modulo="usuario.cuenta">
              <Navigate to="/usuario?tab=cuenta" replace />
            </RutaPrivada>
          }
        />

        {/* Compatibilidad con rutas anteriores */}
        <Route path="/servicios" element={<Navigate to="/explorar" replace />} />
        <Route path="/emergencias" element={<Navigate to="/mi-mascota" replace />} />
      </Route>

      {/* Página Exclusiva de Usuarios (Portal independiente, logo apunta a /) */}
      <Route
        path="/usuario"
        element={
          <RutaPrivada modulo="nav.miEspacioCorto">
            <UsuarioPanel />
          </RutaPrivada>
        }
      />

      {/* Página Exclusiva de Administración (solo cuentas role === 'admin', logo apunta a /) */}
      <Route
        path="/panel"
        element={
          <RutaAdmin>
            <Panel />
          </RutaAdmin>
        }
      />

      {/* Redirección por defecto */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AnimatedRoutes;
