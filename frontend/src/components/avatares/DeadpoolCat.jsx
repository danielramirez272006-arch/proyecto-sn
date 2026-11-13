import React from 'react';

export function DeadpoolCat({ className = 'w-24 h-24', size = 96 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Avatar felino estilo Deadpool Cat"
      role="img"
    >
      <defs>
        <radialGradient id="dpGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FECDD3" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#E11D48" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dpRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
        <linearGradient id="dpBlack" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#27272A" />
          <stop offset="100%" stopColor="#09090B" />
        </linearGradient>
      </defs>

      {/* Aura circular de fondo */}
      <circle cx="60" cy="60" r="54" fill="url(#dpGlow)" />
      <circle cx="60" cy="60" r="50" fill="#FFE4E6" stroke="#FECDD3" strokeWidth="2" />

      {/* Empuñaduras de katanas cruzadas detrás */}
      <line x1="20" y1="15" x2="45" y2="40" stroke="#71717A" strokeWidth="4" strokeLinecap="round" />
      <line x1="16" y1="18" x2="24" y2="10" stroke="#E11D48" strokeWidth="3" strokeLinecap="round" />
      <line x1="100" y1="15" x2="75" y2="40" stroke="#71717A" strokeWidth="4" strokeLinecap="round" />
      <line x1="104" y1="18" x2="96" y2="10" stroke="#E11D48" strokeWidth="3" strokeLinecap="round" />

      {/* Orejas de gato */}
      <polygon points="34,40 24,14 50,28" fill="url(#dpRed)" stroke="#7F1D1D" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="36,36 29,20 47,28" fill="#18181B" />

      <polygon points="86,40 96,14 70,28" fill="url(#dpRed)" stroke="#7F1D1D" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="84,36 91,20 73,28" fill="#18181B" />

      {/* Cabeza completa cubierta por la máscara roja */}
      <circle cx="60" cy="56" r="32" fill="url(#dpRed)" stroke="#7F1D1D" strokeWidth="1.5" />

      {/* Parches negros distintivos en los ojos */}
      <ellipse cx="44" cy="54" rx="12" ry="16" fill="url(#dpBlack)" transform="rotate(-6 44 54)" />
      <ellipse cx="76" cy="54" rx="12" ry="16" fill="url(#dpBlack)" transform="rotate(6 76 54)" />

      {/* Ojos blancos de expresión felina pícara */}
      <path d="M38 52 Q44 48 50 54 Q44 57 38 52 Z" fill="#FFFFFF" />
      <path d="M82 52 Q76 48 70 54 Q76 57 82 52 Z" fill="#FFFFFF" />

      {/* Nariz felina y suturas */}
      <polygon points="58,66 62,66 60,69" fill="#18181B" />
      <path d="M60 69 Q56 74 53 72 M60 69 Q64 74 67 72" stroke="#18181B" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Bigotes tácticos negros */}
      <line x1="32" y1="67" x2="16" y2="65" stroke="#18181B" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="32" y1="71" x2="18" y2="73" stroke="#18181B" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="88" y1="67" x2="104" y2="65" stroke="#18181B" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="88" y1="71" x2="102" y2="73" stroke="#18181B" strokeWidth="1.2" strokeLinecap="round" />

      {/* Arnés táctico en el pecho con hebilla circular */}
      <path d="M36 84 C36 100, 84 100, 84 84 Z" fill="#18181B" />
      <circle cx="60" cy="90" r="7" fill="#DC2626" stroke="#FAFAFA" strokeWidth="1.5" />
      <line x1="60" y1="84" x2="60" y2="96" stroke="#FAFAFA" strokeWidth="1" />
      <line x1="54" y1="90" x2="66" y2="90" stroke="#FAFAFA" strokeWidth="1" />
    </svg>
  );
}

