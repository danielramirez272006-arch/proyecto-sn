import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * Revelado suave por sección al hacer scroll (inspirado en Linear.app y Magic UI BlurFade).
 * Se ejecuta una sola vez (`once: true`) para evitar parpadeos y mantener 60fps.
 */
export function ScrollReveal({
  children,
  delay = 0,
  yOffset = 14,
  blur = '0px',
  className = '',
  id
}) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div id={id} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      id={id}
      className={className}
      initial={{
        opacity: 0,
        y: yOffset
      }}
      whileInView={{
        opacity: 1,
        y: 0
      }}
      viewport={{ once: true, amount: 'some', margin: '0px' }}
      transition={{
        duration: 0.45,
        delay,
        ease: [0.22, 1, 0.36, 1]
      }}
    >
      {children}
    </motion.div>
  );
}

export default ScrollReveal;
