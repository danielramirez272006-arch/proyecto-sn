import React from 'react';

export function ChatGptCat({ className = 'w-24 h-24', size = 96 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Avatar felino de Inteligencia Artificial ChatGPT"
      role="img"
    >
      <defs>
        <radialGradient id="aiGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#A7F3D0" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="aiBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id="aiTeal" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* Halo de red neuronal */}
      <circle cx="60" cy="60" r="54" fill="url(#aiGlow)" />
      <circle cx="60" cy="60" r="50" fill="#ECFDF5" stroke="#A7F3D0" strokeWidth="1.5" strokeDasharray="3 3" />

      {/* Orejas geométricas */}
      <polygon points="34,42 26,16 50,30" fill="url(#aiBody)" stroke="#94A3B8" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="36,38 30,22 47,30" fill="url(#aiTeal)" />

      <polygon points="86,42 94,16 70,30" fill="url(#aiBody)" stroke="#94A3B8" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="84,38 90,22 73,30" fill="url(#aiTeal)" />

      {/* Cabeza metálica aperlada */}
      <circle cx="60" cy="56" r="32" fill="url(#aiBody)" stroke="#94A3B8" strokeWidth="1.5" />

      {/* Símbolo de nodo neural en la frente */}
      <circle cx="60" cy="38" r="4" fill="url(#aiTeal)" />
      <circle cx="60" cy="38" r="7" stroke="#10B981" strokeWidth="1" strokeDasharray="2 2" />

      {/* Ojos sintéticos luminosos (Teal AI) */}
      <rect x="40" y="49" width="12" height="7" rx="3.5" fill="#10B981" />
      <rect x="42" y="51" width="4" height="3" rx="1.5" fill="#ECFDF5" />

      <rect x="68" y="49" width="12" height="7" rx="3.5" fill="#10B981" />
      <rect x="70" y="51" width="4" height="3" rx="1.5" fill="#ECFDF5" />

      {/* Nariz y boca digital */}
      <circle cx="60" cy="65" r="2" fill="#047857" />
      <path d="M57 69 Q60 72 63 69" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Bigotes en forma de trazas de circuito con nodos */}
      <line x1="34" y1="63" x2="18" y2="61" stroke="#10B981" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="17" cy="61" r="1.5" fill="#10B981" />
      <line x1="33" y1="67" x2="16" y2="69" stroke="#10B981" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="15" cy="69" r="1.5" fill="#10B981" />

      <line x1="86" y1="63" x2="102" y2="61" stroke="#10B981" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="103" cy="61" r="1.5" fill="#10B981" />
      <line x1="87" y1="67" x2="104" y2="69" stroke="#10B981" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="105" cy="69" r="1.5" fill="#10B981" />

      {/* Collar con procesador cuántico */}
      <path d="M42 85 C42 98, 78 98, 78 85 Z" fill="#0F172A" />
      <rect x="54" y="86" width="12" height="10" rx="2" fill="#10B981" />
      <path d="M57 91 L63 91" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M60 88 L60 94" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

