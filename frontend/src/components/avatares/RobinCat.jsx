import React from 'react';

export function RobinCat({ className = 'w-24 h-24', size = 96 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Avatar felino estilo Robin Cat"
      role="img"
    >
      <defs>
        <radialGradient id="robinGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="robinMask" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>
        <linearGradient id="robinCape" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="robinFur" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>

      {/* Aura circular de fondo */}
      <circle cx="60" cy="60" r="54" fill="url(#robinGlow)" />
      <circle cx="60" cy="60" r="50" fill="#FEF3C7" stroke="#FDE68A" strokeWidth="2" />

      {/* Capa de héroe posterior */}
      <path d="M30 85 C30 110, 90 110, 90 85 L84 75 L36 75 Z" fill="url(#robinCape)" />

      {/* Orejas de gato */}
      <polygon points="36,44 26,18 52,32" fill="url(#robinFur)" stroke="#B45309" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="38,40 31,23 49,32" fill="#F472B6" />
      
      <polygon points="84,44 94,18 68,32" fill="url(#robinFur)" stroke="#B45309" strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points="82,40 89,23 71,32" fill="#F472B6" />

      {/* Cabeza del gato */}
      <circle cx="60" cy="56" r="32" fill="url(#robinFur)" stroke="#B45309" strokeWidth="1.5" />
      
      {/* Mechones en mejillas */}
      <path d="M26 60 Q22 64 27 68 Q23 70 30 73" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M94 60 Q98 64 93 68 Q97 70 90 73" stroke="#B45309" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Máscara de antifaz estilo Robin */}
      <path
        d="M32 50 C38 42, 54 44, 60 52 C66 44, 82 42, 88 50 C90 58, 80 66, 68 62 C63 60, 57 60, 52 62 C40 66, 30 58, 32 50 Z"
        fill="url(#robinMask)"
        stroke="#064E3B"
        strokeWidth="1.5"
      />

      {/* Ojos brillantes a través del antifaz */}
      <ellipse cx="46" cy="52" rx="5" ry="6" fill="#FFFFFF" />
      <circle cx="47" cy="52" r="3" fill="#111827" />
      <circle cx="48" cy="50" r="1.2" fill="#FFFFFF" />

      <ellipse cx="74" cy="52" rx="5" ry="6" fill="#FFFFFF" />
      <circle cx="73" cy="52" r="3" fill="#111827" />
      <circle cx="72" cy="50" r="1.2" fill="#FFFFFF" />

      {/* Nariz rosa y boca */}
      <polygon points="58,64 62,64 60,67" fill="#F43F5E" />
      <path d="M60 67 Q55 72 52 70 M60 67 Q65 72 68 70" stroke="#78350F" strokeWidth="1.5" strokeLinecap="round" fill="none" />

      {/* Bigotes */}
      <line x1="32" y1="64" x2="16" y2="61" stroke="#92400E" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="32" y1="68" x2="14" y2="70" stroke="#92400E" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="88" y1="64" x2="104" y2="61" stroke="#92400E" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="88" y1="68" x2="106" y2="70" stroke="#92400E" strokeWidth="1.2" strokeLinecap="round" />

      {/* Emblema 'R' en el cuello */}
      <circle cx="60" cy="88" r="9" fill="#047857" stroke="#FDE68A" strokeWidth="1.5" />
      <text x="60" y="92" fontSize="9" fontWeight="bold" fill="#FDE68A" textAnchor="middle" fontFamily="sans-serif">R</text>
    </svg>
  );
}

