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
import { Acceso } from '../pages/Acceso';
import { Panel } from '../pages/Panel';

/**
 * Enrutador directo de respuesta instantánea sin bloqueo de salida ni fallos de carga diferida.
 */
export function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Routes location={location}>
        {/* Rutas Públicas de GoToX */}
        <Route element={<LayoutPublico />}>
          <Route path="/" element={<Home />} />
          <Route path="/mapa" element={<MapaPage />} />
          <Route path="/terrazas" element={<TerrazasPage />} />
          <Route path="/copiloto" element={<CopilotoPage />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/acceso" element={<Acceso />} />

          {/* Atajos de rutas de usuario redirigen al Portal Exclusivo de Usuarios */}
          <Route
            path="/explorar"
            element={
              <RutaPrivada modulo="Explorar Catálogo">
                <Navigate to="/usuario?tab=explorar" replace />
              </RutaPrivada>
            }
          />
          <Route
            path="/mis-planes"
            element={
              <RutaPrivada modulo="Mis Planes">
                <Navigate to="/usuario?tab=planes" replace />
              </RutaPrivada>
            }
          />
          <Route
            path="/favoritos"
            element={
              <RutaPrivada modulo="Mis Favoritos">
                <Navigate to="/usuario?tab=favoritos" replace />
              </RutaPrivada>
            }
          />
          <Route
            path="/mi-mascota"
            element={
              <RutaPrivada modulo="Mi Mascota">
                <Navigate to="/usuario?tab=mascota" replace />
              </RutaPrivada>
            }
          />
          <Route
            path="/perfil"
            element={
              <RutaPrivada modulo="Mi Cuenta & Bóveda">
                <Navigate to="/usuario?tab=cuenta" replace />
              </RutaPrivada>
            }
          />
        </Route>

        {/* Página Exclusiva de Usuarios (Portal independiente, logo apunta a /) */}
        <Route
          path="/usuario"
          element={
            <RutaPrivada modulo="Mi Espacio de Usuario">
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
