import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { pageVariants } from '../estilos/animaciones';

/**
 * Envoltorio animado para transiciones suaves de página (fade + slide-up sutil).
 * Garantiza scroll al inicio al cambiar de ruta.
 */
export function PageWrapper({ children, className = '' }) {
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch (_) {
      window.scrollTo(0, 0);
    }
  }, []);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`w-full ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default PageWrapper;
