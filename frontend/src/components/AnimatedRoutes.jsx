import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { LayoutPublico } from '../layouts/LayoutPublico';
import { Home } from '../pages/Home';
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
        {/* Rutas Públicas de GoToX */}
        <Route element={<LayoutPublico />}>
          <Route path="/" element={<Home />} />
          <Route path="/mapa" element={<MapaPage />} />
          <Route path="/terrazas" element={<TerrazasPage />} />
          <Route path="/copiloto" element={<CopilotoPage />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/acceso" element={<Acceso />} />
          <Route path="/perfil" element={<Perfil />} />
        </Route>

        {/* Centro de Mando IA */}
        <Route path="/panel" element={<Panel />} />

        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default AnimatedRoutes;
