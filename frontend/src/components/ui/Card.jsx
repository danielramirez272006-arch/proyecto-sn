import React from 'react';

/**
 * Helper que actualiza las variables CSS (--mouse-x, --mouse-y, --rotate-x, --rotate-y)
 * para los efectos Spotlight (Magic UI) y 3D Tilt sutil (Aceternity UI) sin cambiar el layout.
 */
export function handleSynodosCardMouseMove(e) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2 || 1;
  const centerY = rect.height / 2 || 1;

  // Inclinación máxima de ±2.4 grados para mantener legibilidad editorial
  const rotateX = (((y - centerY) / centerY) * -2.4).toFixed(2);
  const rotateY = (((x - centerX) / centerX) * 2.4).toFixed(2);

  el.style.setProperty('--mouse-x', `${x}px`);
  el.style.setProperty('--mouse-y', `${y}px`);
  el.style.setProperty('--rotate-x', `${rotateX}deg`);
  el.style.setProperty('--rotate-y', `${rotateY}deg`);
}

export function handleSynodosCardMouseLeave(e) {
  const el = e.currentTarget;
  el.style.setProperty('--rotate-x', '0deg');
  el.style.setProperty('--rotate-y', '0deg');
}

export function Card({
  children,
  className = '',
  hover = true,
  beam = false,
  onMouseMove,
  onMouseEnter,
  onMouseLeave,
  ...props
}) {
  const handleMove = (e) => {
    if (hover) handleSynodosCardMouseMove(e);
    if (onMouseMove) onMouseMove(e);
  };

  const handleEnter = (e) => {
    if (hover) handleSynodosCardMouseMove(e);
    if (onMouseEnter) onMouseEnter(e);
  };

  const handleLeave = (e) => {
    if (hover) handleSynodosCardMouseLeave(e);
    if (onMouseLeave) onMouseLeave(e);
  };

  return (
    <div
      onMouseMove={handleMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`group bg-white rounded-2xl border border-slate-200/70 p-6 ${
        hover
          ? 'gotox-card-hover synodos-spotlight-card synodos-tilt-card'
          : 'shadow-sm relative'
      } ${className}`}
      {...props}
    >
      {hover && (
        <div
          aria-hidden="true"
          className={`synodos-border-beam transition-opacity duration-500 ${
            beam ? 'opacity-75 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        />
      )}
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={`mb-4 flex flex-col space-y-1 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', ...props }) {
  return (
    <h3 className={`text-lg font-semibold text-[#111827] font-serif tracking-tight ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '', ...props }) {
  return (
    <p className={`text-sm text-[#6B7280] leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '', ...props }) {
  return (
    <div className={`space-y-3 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={`mt-5 pt-4 border-t border-slate-100 flex items-center justify-between ${className}`} {...props}>
      {children}
    </div>
  );
}
