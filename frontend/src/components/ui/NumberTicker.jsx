import React, { useEffect, useRef, useState } from 'react';

/**
 * Contador numérico animado con curva desacelerada tipo spring (inspirado en Magic UI NumberTicker).
 * Mantiene `tabular-nums` para evitar saltos horizontales de layout durante el conteo.
 */
export function NumberTicker({
  value,
  decimals = undefined,
  duration = 900,
  className = ''
}) {
  const numericTarget = Number(value);
  const isValidNumber = Number.isFinite(numericTarget);

  // Detectar decimales automáticamente si no se especifican (ej. 23.1 -> 1 decimal, 43 -> 0)
  const resolvedDecimals =
    decimals !== undefined
      ? decimals
      : isValidNumber && !Number.isInteger(numericTarget)
      ? 1
      : 0;

  const [displayValue, setDisplayValue] = useState(() =>
    isValidNumber ? numericTarget : 0
  );
  const prevValueRef = useRef(isValidNumber ? 0 : 0);

  useEffect(() => {
    if (!isValidNumber) return;

    const startValue = prevValueRef.current;
    const endValue = numericTarget;
    const startTime = performance.now();
    let rafId;

    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const current = startValue + (endValue - startValue) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevValueRef.current = endValue;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      prevValueRef.current = endValue;
    };
  }, [numericTarget, isValidNumber, duration]);

  if (!isValidNumber) {
    return <span className={`tabular-nums ${className}`}>{value}</span>;
  }

  return (
    <span className={`tabular-nums tracking-tight ${className}`}>
      {displayValue.toFixed(resolvedDecimals)}
    </span>
  );
}

export default NumberTicker;
