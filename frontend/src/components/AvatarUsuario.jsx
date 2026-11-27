import React, { useRef, useState } from 'react';
import { Camera, Sparkles, RefreshCw, Upload, Check, Trash2 } from 'lucide-react';

export const CATALOGO_MASCOTAS_AVATAR = [
  { id: 'auto', label: 'Automático (Según Nombre)', emoji: '✨' },
  { id: 'perro', label: 'Perro Sabueso', emoji: '🐶' },
  { id: 'gato', label: 'Gato Urbano', emoji: '🐱' },
  { id: 'zorro', label: 'Zorro del Bosque', emoji: '🦊' },
  { id: 'conejo', label: 'Conejo Saltarín', emoji: '🐰' },
  { id: 'oso', label: 'Oso Tico', emoji: '🐻' },
  { id: 'buho', label: 'Búho Sabio', emoji: '🦉' },
  { id: 'mapache', label: 'Mapache Nocturno', emoji: '🦝' },
  { id: 'koala', label: 'Koala / Perezoso', emoji: '🐨' }
];

const ESPECIES_LISTA = ['perro', 'gato', 'zorro', 'conejo', 'oso', 'buho', 'mapache', 'koala'];

const PALETAS_FONDO = [
  { bg1: '#501228', bg2: '#2A0915', collar: '#10B981', placa: '#FBBF24' },
  { bg1: '#1F0E19', bg2: '#3D1328', collar: '#F27B91', placa: '#FAF9FE' },
  { bg1: '#162032', bg2: '#0F172A', collar: '#F27B91', placa: '#38BDF8' },
  { bg1: '#3B0D1E', bg2: '#55152D', collar: '#F59E0B', placa: '#FAF9FE' },
  { bg1: '#0F2922', bg2: '#091915', collar: '#F27B91', placa: '#34D399' },
  { bg1: '#28132B', bg2: '#140917', collar: '#38BDF8', placa: '#F27B91' }
];

const COLORES_PELAJE = {
  perro: [
    { base: '#E2A76F', secundario: '#FDE6C4', oreja: '#7C4722', mancha: '#9A5B2F' },
    { base: '#F4F1EA', secundario: '#FFFFFF', oreja: '#374151', mancha: '#4B5563' },
    { base: '#8D5524', secundario: '#E8C39E', oreja: '#4A2810', mancha: '#5C3317' },
    { base: '#475569', secundario: '#E2E8F0', oreja: '#1E293B', mancha: '#334155' }
  ],
  gato: [
    { base: '#F28C64', secundario: '#FFE8D6', oreja: '#F27B91', mancha: '#C85A32' },
    { base: '#64748B', secundario: '#F1F5F9', oreja: '#F27B91', mancha: '#334155' },
    { base: '#F5E6D3', secundario: '#FFFFFF', oreja: '#F27B91', mancha: '#8C6239' },
    { base: '#2D3748', secundario: '#E2E8F0', oreja: '#F27B91', mancha: '#1A202C' }
  ],
  zorro: [
    { base: '#EA580C', secundario: '#FFF7ED', oreja: '#1E293B', mancha: '#C2410C' },
    { base: '#E11D48', secundario: '#FFF1F2', oreja: '#31101E', mancha: '#9F1239' },
    { base: '#D97706', secundario: '#FEF3C7', oreja: '#292524', mancha: '#B45309' }
  ],
  conejo: [
    { base: '#FAF5F8', secundario: '#FFFFFF', oreja: '#F27B91', mancha: '#E9D3DD' },
    { base: '#E6CCB2', secundario: '#FFF8F0', oreja: '#F27B91', mancha: '#B08968' },
    { base: '#CBD5E1', secundario: '#F8FAFC', oreja: '#F472B6', mancha: '#94A3B8' }
  ],
  oso: [
    { base: '#8B5A2B', secundario: '#F5DEB3', oreja: '#5C3A1B', mancha: '#6B4226' },
    { base: '#A67B5B', secundario: '#FAEBD7', oreja: '#6F4E37', mancha: '#805A3B' },
    { base: '#D6C7B2', secundario: '#FFFDF9', oreja: '#78634E', mancha: '#A39078' }
  ],
  buho: [
    { base: '#7C4D79', secundario: '#FCE7F3', oreja: '#F27B91', mancha: '#501228' },
    { base: '#5B6E8C', secundario: '#E0F2FE', oreja: '#38BDF8', mancha: '#1E3A5F' },
    { base: '#925B3A', secundario: '#FEF3C7', oreja: '#F59E0B', mancha: '#5C341D' }
  ],
  mapache: [
    { base: '#94A3B8', secundario: '#F8FAFC', oreja: '#334155', mancha: '#1E293B' },
    { base: '#A8A29E', secundario: '#FAF9F6', oreja: '#44403C', mancha: '#292524' }
  ],
  koala: [
    { base: '#9CA3AF', secundario: '#F3F4F6', oreja: '#E5E7EB', mancha: '#4B5563' },
    { base: '#8FA3B0', secundario: '#F0F7FA', oreja: '#D9E6EC', mancha: '#4A606F' }
  ]
};

/**
 * Hash determinista de 32 bits a partir del nombre del usuario.
 */
function calcularHashNombre(texto = '') {
  const limpio = String(texto || 'Synodos').trim();
  let h = 2166136261;
  for (let i = 0; i < limpio.length; i++) {
    h ^= limpio.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

/**
 * Extrae todos los rasgos anatómicos y de color determinísticamente según el nombre y la configuración.
 */
export function resolverRasgosAvatar(nombre = 'Usuario Synodos', avatarConfig = null) {
  const tipo = avatarConfig?.tipo || 'auto';
  const semillaExtra = avatarConfig?.semilla || '';
  const hash = calcularHashNombre(`${nombre}::${semillaExtra}`);

  const especie =
    tipo && tipo !== 'auto' && ESPECIES_LISTA.includes(tipo)
      ? tipo
      : ESPECIES_LISTA[(hash >>> 0) % ESPECIES_LISTA.length] || 'perro';

  const paletaFondo =
    PALETAS_FONDO[(hash >>> 3) % PALETAS_FONDO.length] || PALETAS_FONDO[0];
  const listaPelajes = COLORES_PELAJE[especie] || COLORES_PELAJE.perro;
  const pelaje =
    listaPelajes[(hash >>> 5) % listaPelajes.length] || listaPelajes[0];

  const tipoOjos = (hash >>> 7) % 4; // 0: brillantes, 1: alegres ^ ^, 2: guiño, 3: mirada tierna
  const tipoBoca = (hash >>> 9) % 3; // 0: sonrisa feliz, 1: lengua afuera, 2: sonrisa w
  const tipoMancha = (hash >>> 11) % 3; // 0: parche ojo izq, 1: parche ojo der, 2: frente/rayas
  const inclinacionCabeza = (((hash >>> 0) % 7) - 3) * 1.8; // -5.4° a +5.4°

  return {
    especie,
    paletaFondo,
    pelaje,
    tipoOjos,
    tipoBoca,
    tipoMancha,
    inclinacionCabeza
  };
}

/**
 * Componente visual del Avatar del Usuario:
 * - Si el usuario subió o eligió una foto (`avatar?.tipo === 'foto'` o string URL/DataURL), muestra la imagen.
 * - Si usa el modo mascota determinista (`auto` o una de las 8 especies), renderiza el SVG vectorial único para su nombre.
 */
export function AvatarUsuario({
  nombre = 'Usuario Synodos',
  avatar = null,
  size = 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className = '',
  mostrarPuntoOnline = false
}) {
  const [imgError, setImgError] = useState(false);

  const fotoUrl =
    typeof avatar === 'string' && avatar.trim()
      ? avatar.trim()
      : avatar?.tipo === 'foto' && avatar?.url
      ? avatar.url
      : null;

  const sizeClasses = {
    xs: 'w-7 h-7 rounded-lg',
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-11 h-11 rounded-xl',
    lg: 'w-16 h-16 rounded-2xl',
    xl: 'w-20 h-20 rounded-3xl'
  };

  const rasgos = resolverRasgosAvatar(nombre, typeof avatar === 'object' ? avatar : null);
  const { especie, paletaFondo, pelaje, tipoOjos, tipoBoca, tipoMancha, inclinacionCabeza } = rasgos;
  const gradId = `syn-av-bg-${especie}-${Math.abs(calcularHashNombre(nombre) % 9999)}`;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 select-none ${sizeClasses[size] || sizeClasses.md} ${className}`}>
      {fotoUrl && !imgError ? (
        <img
          src={fotoUrl}
          alt={`Avatar de ${nombre}`}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover rounded-[inherit] border border-[#F27B91]/40 shadow-xs"
        />
      ) : (
        <svg
          viewBox="0 0 100 100"
          role="img"
          aria-label={`Avatar de ${nombre} (${especie})`}
          className="w-full h-full rounded-[inherit] border border-[#F27B91]/35 shadow-xs overflow-hidden"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={paletaFondo.bg1} />
              <stop offset="100%" stopColor={paletaFondo.bg2} />
            </linearGradient>
          </defs>

          {/* Fondo con gradiente Synodos */}
          <rect width="100" height="100" fill={`url(#${gradId})`} />
          <circle cx="82" cy="18" r="18" fill="#F27B91" opacity="0.12" />
          <circle cx="16" cy="84" r="22" fill="#FFFFFF" opacity="0.05" />

          {/* Cuerpo / Hombros y Collar */}
          <ellipse cx="50" cy="94" rx="28" ry="18" fill={pelaje.base} />
          <path
            d="M 28 84 Q 50 93 72 84"
            fill="none"
            stroke={paletaFondo.collar}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle cx="50" cy="89" r="4.2" fill={paletaFondo.placa} />

          {/* Grupo de Cabeza con inclinación determinista según el nombre */}
          <g transform={`rotate(${inclinacionCabeza} 50 52)`}>
            {/* 1. OREJAS SEGÚN ESPECIE */}
            {especie === 'conejo' && (
              <>
                <ellipse cx="36" cy="20" rx="7.5" ry="20" transform="rotate(-8 36 20)" fill={pelaje.base} />
                <ellipse cx="36" cy="21" rx="4" ry="14" transform="rotate(-8 36 21)" fill={pelaje.oreja} />
                <ellipse cx="64" cy="20" rx="7.5" ry="20" transform="rotate(10 64 20)" fill={pelaje.base} />
                <ellipse cx="64" cy="21" rx="4" ry="14" transform="rotate(10 64 21)" fill={pelaje.oreja} />
              </>
            )}

            {(especie === 'gato' || especie === 'zorro' || especie === 'mapache') && (
              <>
                <polygon points="22,46 25,17 45,34" fill={pelaje.base} stroke={pelaje.base} strokeWidth="3" strokeLinejoin="round" />
                <polygon points="26,41 28,23 41,34" fill={pelaje.oreja} />
                <polygon points="78,46 75,17 55,34" fill={pelaje.base} stroke={pelaje.base} strokeWidth="3" strokeLinejoin="round" />
                <polygon points="74,41 72,23 59,34" fill={pelaje.oreja} />
              </>
            )}

            {especie === 'perro' && (
              <>
                <ellipse cx="22" cy="48" rx="9" ry="18" transform="rotate(14 22 48)" fill={pelaje.oreja} />
                <ellipse cx="78" cy="48" rx="9" ry="18" transform="rotate(-14 78 48)" fill={pelaje.oreja} />
              </>
            )}

            {especie === 'oso' && (
              <>
                <circle cx="26" cy="28" r="11" fill={pelaje.base} />
                <circle cx="26" cy="28" r="6" fill={pelaje.oreja} />
                <circle cx="74" cy="28" r="11" fill={pelaje.base} />
                <circle cx="74" cy="28" r="6" fill={pelaje.oreja} />
              </>
            )}

            {especie === 'koala' && (
              <>
                <circle cx="20" cy="38" r="14" fill={pelaje.mancha} />
                <circle cx="20" cy="38" r="8.5" fill={pelaje.oreja} />
                <circle cx="80" cy="38" r="14" fill={pelaje.mancha} />
                <circle cx="80" cy="38" r="8.5" fill={pelaje.oreja} />
              </>
            )}

            {especie === 'buho' && (
              <>
                <polygon points="24,34 18,18 36,28" fill={pelaje.mancha} />
                <polygon points="76,34 82,18 64,28" fill={pelaje.mancha} />
              </>
            )}

            {/* 2. FORMA BASE DE LA CABEZA */}
            <ellipse
              cx="50"
              cy="53"
              rx={especie === 'zorro' ? '28' : '26'}
              ry={especie === 'buho' ? '26' : '24'}
              fill={pelaje.base}
            />

            {/* 3. MANCHAS / ANTIFAZ SEGÚN ESPECIE Y SEMILLA DEL NOMBRE */}
            {especie === 'mapache' && (
              <>
                <ellipse cx="36" cy="51" rx="11" ry="8" transform="rotate(-8 36 51)" fill={pelaje.mancha} />
                <ellipse cx="64" cy="51" rx="11" ry="8" transform="rotate(8 64 51)" fill={pelaje.mancha} />
              </>
            )}

            {especie === 'zorro' && (
              <>
                <path d="M 23 56 Q 38 48 50 68 Q 34 75 23 56 Z" fill={pelaje.secundario} />
                <path d="M 77 56 Q 62 48 50 68 Q 66 75 77 56 Z" fill={pelaje.secundario} />
              </>
            )}

            {especie === 'buho' && (
              <>
                <circle cx="38" cy="50" r="11" fill={pelaje.secundario} />
                <circle cx="62" cy="50" r="11" fill={pelaje.secundario} />
              </>
            )}

            {(especie === 'perro' || especie === 'gato') && tipoMancha === 0 && (
              <ellipse cx="37" cy="49" rx="9" ry="8" transform="rotate(-12 37 49)" fill={pelaje.mancha} opacity="0.85" />
            )}
            {(especie === 'perro' || especie === 'gato') && tipoMancha === 1 && (
              <ellipse cx="63" cy="49" rx="9" ry="8" transform="rotate(12 63 49)" fill={pelaje.mancha} opacity="0.85" />
            )}
            {(especie === 'perro' || especie === 'gato') && tipoMancha === 2 && (
              <>
                <path d="M 45 31 L 50 39 L 55 31" fill="none" stroke={pelaje.mancha} strokeWidth="2.8" strokeLinecap="round" />
                <path d="M 50 30 L 50 41" fill="none" stroke={pelaje.mancha} strokeWidth="2.8" strokeLinecap="round" />
              </>
            )}

            {/* 4. HOCICO / MEJILLAS */}
            {especie !== 'buho' && (
              <ellipse
                cx="50"
                cy="61"
                rx={especie === 'koala' ? '11' : '13'}
                ry={especie === 'koala' ? '10' : '9.5'}
                fill={pelaje.secundario}
              />
            )}

            {/* Mejillas sonrojadas */}
            <ellipse cx="29" cy="58" rx="4.2" ry="2.5" fill="#F27B91" opacity="0.55" />
            <ellipse cx="71" cy="58" rx="4.2" ry="2.5" fill="#F27B91" opacity="0.55" />

            {/* 5. OJOS SEGÚN EL HASH DEL NOMBRE */}
            {tipoOjos === 1 ? (
              /* Ojos alegres curvos ^ ^ */
              <>
                <path d="M 33 50 Q 38 44 43 50" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
                <path d="M 57 50 Q 62 44 67 50" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
              </>
            ) : tipoOjos === 2 ? (
              /* Guiño simpático */
              <>
                <circle cx="38" cy="49" r="4.3" fill="#111827" />
                <circle cx="36.6" cy="47.5" r="1.5" fill="#FFFFFF" />
                <path d="M 57 49 Q 62 44 67 49" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
              </>
            ) : (
              /* Ojos expresivos con brillo */
              <>
                <circle cx="38" cy="49" r={tipoOjos === 3 ? '4.8' : '4.2'} fill="#111827" />
                <circle cx="36.5" cy="47.4" r="1.6" fill="#FFFFFF" />
                <circle cx="62" cy="49" r={tipoOjos === 3 ? '4.8' : '4.2'} fill="#111827" />
                <circle cx="60.5" cy="47.4" r="1.6" fill="#FFFFFF" />
              </>
            )}

            {/* 6. NARIZ / PICO Y BOCA */}
            {especie === 'buho' ? (
              <polygon points="46,54 54,54 50,63" fill="#F59E0B" />
            ) : especie === 'koala' ? (
              <ellipse cx="50" cy="57" rx="5.5" ry="7.2" fill="#1F2937" />
            ) : (
              <>
                <ellipse
                  cx="50"
                  cy="57"
                  rx="4.2"
                  ry="3"
                  fill={especie === 'conejo' || especie === 'gato' ? '#F27B91' : '#1F2937'}
                />
                {tipoBoca === 1 && (
                  /* Lengüita rosada feliz */
                  <path d="M 47 64 Q 50 71 53 64 Z" fill="#F27B91" />
                )}
                <path
                  d="M 44 63 Q 47 66 50 62 Q 53 66 56 63"
                  fill="none"
                  stroke="#1F2937"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </>
            )}

            {/* Bigotes para Gato y Conejo */}
            {(especie === 'gato' || especie === 'conejo') && (
              <>
                <line x1="18" y1="56" x2="28" y2="58" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
                <line x1="18" y1="61" x2="28" y2="61" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
                <line x1="82" y1="56" x2="72" y2="58" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
                <line x1="82" y1="61" x2="72" y2="61" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
              </>
            )}
          </g>
        </svg>
      )}

      {mostrarPuntoOnline && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#111827]" />
      )}
    </div>
  );
}

/**
 * Redimensiona una imagen subida por el usuario a 256x256 JPEG para guardarla en la cuenta sin saturar almacenamiento.
 */
function comprimirImagenAvatar(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Panel selector para que el usuario elija entre:
 * - Avatar automático que cambia de mascota/facciones según su nombre
 * - Cualquiera de las 8 mascotas y animales (Perro, Gato, Zorro, Conejo, Oso, Búho, Mapache, Koala)
 * - Subir su propia foto de perfil desde su dispositivo
 */
export function SelectorAvatarUsuario({ nombre = 'Usuario Synodos', valor, onChange }) {
  const fileInputRef = useRef(null);
  const [errorFoto, setErrorFoto] = useState('');

  const configActual =
    typeof valor === 'string' && valor
      ? { tipo: 'foto', url: valor, semilla: '' }
      : valor && typeof valor === 'object'
      ? valor
      : { tipo: 'auto', url: null, semilla: '' };

  const rasgosActivos = resolverRasgosAvatar(nombre, configActual);

  const seleccionarMascota = (idMascota) => {
    setErrorFoto('');
    onChange({
      tipo: idMascota,
      url: null,
      semilla: configActual.semilla || ''
    });
  };

  const girarVarianteFacciones = () => {
    const nuevaSemilla = `v_${Math.floor(100 + Math.random() * 900)}`;
    onChange({
      tipo: configActual.tipo === 'foto' ? 'auto' : configActual.tipo || 'auto',
      url: null,
      semilla: nuevaSemilla
    });
  };

  const handleArchivoSubido = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorFoto('');
    if (!file.type.startsWith('image/')) {
      setErrorFoto('Selecciona un archivo de imagen válido (JPG, PNG o WebP).');
      return;
    }
    try {
      const dataUrl = await comprimirImagenAvatar(file);
      onChange({
        tipo: 'foto',
        url: dataUrl,
        semilla: configActual.semilla || ''
      });
    } catch {
      setErrorFoto('No se pudo procesar la fotografía seleccionada.');
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-[#162032]/60 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <AvatarUsuario nombre={nombre} avatar={configActual} size="lg" mostrarPuntoOnline={true} />
          <div className="space-y-0.5 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif font-bold text-sm text-[#111827] dark:text-white">
                Avatar & Foto de Perfil
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FDF2F4] dark:bg-[#55152D]/60 text-[#501228] dark:text-[#F27B91] border border-[#F27B91]/30">
                {configActual.tipo === 'foto'
                  ? 'Fotografía Personal'
                  : configActual.tipo === 'auto'
                  ? `Auto por nombre (${rasgosActivos.especie.toUpperCase()})`
                  : `Mascota: ${rasgosActivos.especie.toUpperCase()}`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Cambia automáticamente según tu nombre, elige entre 8 animales o sube tu propia foto.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleArchivoSubido}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#501228] hover:bg-[#6E1E3A] text-white border border-[#F27B91]/30 shadow-xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-[#F27B91]" />
            <span>Subir mi foto</span>
          </button>

          <button
            type="button"
            onClick={girarVarianteFacciones}
            title="Cambiar expresión, ojos y manchas manteniendo tu animal"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-[#111827] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/15 hover:border-[#F27B91] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#F27B91]" />
            <span>Variar gesto</span>
          </button>

          {configActual.tipo === 'foto' && (
            <button
              type="button"
              onClick={() => seleccionarMascota('auto')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Quitar foto</span>
            </button>
          )}
        </div>
      </div>

      {errorFoto && (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{errorFoto}</p>
      )}

      {/* Selector visual de las 8 mascotas + modo automático por nombre */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-left">
          Elige un animal o déjalo automático según las letras de tu nombre:
        </span>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          {CATALOGO_MASCOTAS_AVATAR.map((item) => {
            const seleccionado = configActual.tipo === item.id;
            const previewAvatar = {
              tipo: item.id,
              url: null,
              semilla: configActual.semilla || ''
            };
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => seleccionarMascota(item.id)}
                className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  seleccionado
                    ? 'bg-[#FDF2F4] dark:bg-[#55152D]/50 border-[#501228] dark:border-[#F27B91] ring-1 ring-[#F27B91]/50 shadow-sm'
                    : 'bg-white dark:bg-[#111827] border-slate-200/80 dark:border-white/10 hover:border-[#F27B91]/40'
                }`}
              >
                <div className="relative">
                  <AvatarUsuario nombre={nombre} avatar={previewAvatar} size="sm" />
                  {seleccionado && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#501228] text-white flex items-center justify-center border border-[#F27B91]">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold leading-tight text-center line-clamp-1 text-slate-700 dark:text-slate-200">
                  {item.id === 'auto' ? 'Auto' : item.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default AvatarUsuario;
