/**
 * GoToX Pet OS — Variantes Centrales de Animación con Motion
 * Curvas suaves, aceleración física controlada y respeto por prefers-reduced-motion.
 */

export const TRANSICION_SUAVE = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1.0]
};

export const TRANSICION_RAPIDA = {
  duration: 0.12,
  ease: [0.22, 1, 0.36, 1.0]
};

export const SPRING_SUTIL = {
  type: "spring",
  stiffness: 380,
  damping: 30
};

// 1. Fade In Sencillo
export const fadeIn = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: TRANSICION_SUAVE
  },
  exit: {
    opacity: 0,
    transition: TRANSICION_RAPIDA
  }
};

// 2. Slide Up Sutil (16px)
export const slideUp = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: TRANSICION_SUAVE
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: TRANSICION_RAPIDA
  }
};

// 3. Scale In Elegante (de 0.96 a 1.0)
export const scaleIn = {
  initial: { opacity: 0, scale: 0.96 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: TRANSICION_SUAVE
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: TRANSICION_RAPIDA
  }
};

// 4. Contenedor Escalonado (Stagger Container)
export const containerStagger = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
};

// 5. Elemento Individual para Stagger
export const itemStagger = {
  initial: { opacity: 0, y: 18 },
  animate: {
    opacity: 1,
    y: 0,
    transition: TRANSICION_SUAVE
  }
};

// 6. Transición de Página Completa (PageWrapper) — Instantánea y fluida sin lag
export const pageVariants = {
  initial: {
    opacity: 0,
    y: 6
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.15,
      ease: [0.22, 1, 0.36, 1.0]
    }
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.08,
      ease: "easeOut"
    }
  }
};

// 7. Microinteracciones para Tarjetas y Botones
export const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: {
    y: -4,
    scale: 1.01,
    transition: { duration: 0.25, ease: "easeOut" }
  }
};

export const buttonTap = {
  tap: { scale: 0.97 },
  hover: { y: -1 }
};
