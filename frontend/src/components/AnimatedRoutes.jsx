import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { LayoutPublico } from '../layouts/LayoutPublico';
import { RutaPrivada } from './RutaPrivada';
import { RutaAdmin } from './RutaAdmin';
import { Home } from '../pages/Home';
import { ExplorarPage } from '../pages/ExplorarPage';
import { MisPlanesPage } from '../pages/MisPlanesPage';
import { FavoritosPage } from '../pages/FavoritosPage';
import { MiMascotaPage } from '../pages/MiMascotaPage';
import { MapaPage } from '../pages/MapaPage';
import { TerrazasPage } from '../pages/TerrazasPage';
import { CopilotoPage } from '../pages/CopilotoPage';
import { Nosotros } from '../pages/Nosotros';
import { Acceso } from '../pages/Acceso';
import { Perfil } from '../pages/Perfil';
import { Panel } from '../pages/Panel';

/**
 * Enrutador con transiciones fluidas de página mediante AnimatePresence.
 * Cada ruta tiene su propio ciclo de entrada y salida sin parpadeos.
 */
export function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Rutas de GoToX */}
        <Route element={<LayoutPublico />}>
          {/* Públicas: visibles con o sin sesión */}
          <Route path="/" element={<Home />} />
          <Route path="/mapa" element={<MapaPage />} />
          <Route path="/terrazas" element={<TerrazasPage />} />
          <Route path="/copiloto" element={<CopilotoPage />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/acceso" element={<Acceso />} />

          {/* Exclusivas para usuarios con sesión iniciada */}
          <Route
            path="/explorar"
            element={
              <RutaPrivada modulo="Explorar Catálogo">
                <ExplorarPage />
              </RutaPrivada>
            }
          />
          <Route
            path="/mis-planes"
            element={
              <RutaPrivada modulo="Mis Planes">
                <MisPlanesPage />
              </RutaPrivada>
            }
          />
          <Route
            path="/favoritos"
            element={
              <RutaPrivada modulo="Mis Favoritos">
                <FavoritosPage />
              </RutaPrivada>
            }
          />
          <Route
            path="/mi-mascota"
            element={
              <RutaPrivada modulo="Mi Mascota">
                <MiMascotaPage />
              </RutaPrivada>
            }
          />
          <Route
            path="/perfil"
            element={
              <RutaPrivada modulo="Bóveda Pet">
                <Perfil />
              </RutaPrivada>
            }
          />
        </Route>

        {/* Centro de Mando IA (exclusivo para administradores autorizados) */}
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
    </AnimatePresence>
  );
}

export default AnimatedRoutes;
