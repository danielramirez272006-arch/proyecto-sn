import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

/**
 * Revelado suave por sección al hacer scroll (inspirado en Linear.app y Magic UI BlurFade).
 * Se ejecuta una sola vez (`once: true`) para evitar parpadeos y mantener 60fps.
 */
export function ScrollReveal({
  children,
  delay = 0,
  yOffset = 22,
  blur = '5px',
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
        y: yOffset,
        filter: `blur(${blur})`
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        filter: 'blur(0px)'
      }}
      viewport={{ once: true, amount: 0.1, margin: '0px 0px -50px 0px' }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.22, 1, 0.36, 1]
      }}
    >
      {children}
    </motion.div>
  );
}

export default ScrollReveal;
