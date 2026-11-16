import React from 'react';
import { HashRouter } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import './estilos/estilos.css';
import './estilos/tema.css';

import { AnimatedRoutes } from './components/AnimatedRoutes';

/**
 * GoToXApp - Sistema Operativo Urbano Inteligente para Mascotas (GAM, Costa Rica)
 * Configurado con MotionConfig para respetar accesibilidad (prefers-reduced-motion)
 * y transiciones suaves entre páginas independientes.
 */
export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="gotox-root">
        <HashRouter>
          <AnimatedRoutes />
        </HashRouter>
      </div>
    </MotionConfig>
  );
}

export { App as GoToXApp };
