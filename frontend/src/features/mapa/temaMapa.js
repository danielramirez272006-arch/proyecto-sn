/**
 * Tokens de contraste WCAG AA (>= 4.5:1 texto normal, >= 3:1 componentes)
 * para los 3 temas de GoToX Pet OS: Claro, Oscuro y Vino (morado).
 */

export function obtenerTokensMapa(tema) {
  if (tema === 'claro') {
    return {
      esClaro: true,
      nombre: 'claro',
      superficiePrincipal: 'bg-white border-slate-300 text-slate-900',
      superficieSecundaria: 'bg-slate-50 border-slate-300 text-slate-900',
      superficieMapa: 'bg-slate-100 border-slate-300',
      superficieFlotante: 'bg-white/95 border-slate-300 text-slate-900 shadow-lg',
      textoTitulo: 'text-slate-900',
      textoCuerpo: 'text-slate-700',
      textoMuted: 'text-slate-600',
      bordeSuave: 'border-slate-300',
      inputClase:
        'bg-white border-slate-400 text-slate-900 placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#501228] focus-visible:border-[#501228]',
      chipInactivo:
        'bg-white text-slate-800 border-slate-400 hover:bg-slate-100 hover:border-slate-600',
      chipActivo:
        'bg-[#501228] text-white border-[#501228] font-bold shadow-sm',
      botonSecundario:
        'bg-white hover:bg-slate-100 text-slate-900 border-slate-400',
      botonPrimario:
        'bg-[#501228] hover:bg-[#6E1E3A] text-white border-[#501228]',
      botonControlMapa:
        'text-slate-900 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-[#501228]',
      tarjeta:
        'bg-white border-slate-300 hover:border-[#501228] text-slate-900',
      tarjetaSeleccionada:
        'bg-[#FDF2F4] border-[#501228] ring-2 ring-[#501228]/30 text-slate-900',
      badgeDemo:
        'bg-amber-100 text-amber-950 border-amber-400',
      badgePermitido:
        'bg-emerald-100 text-emerald-950 border-emerald-500',
      badgeNoPermitido:
        'bg-rose-100 text-rose-950 border-rose-500',
      badgeDesconocido:
        'bg-slate-200 text-slate-900 border-slate-400',
      alertaAsfalto:
        'bg-amber-100 border-amber-500 text-amber-950',
      corredorVerde:
        'bg-emerald-100 border-emerald-500 text-emerald-950',
      focusRing:
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#501228] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
    };
  }

  if (tema === 'morado') {
    return {
      esClaro: false,
      nombre: 'morado',
      superficiePrincipal: 'bg-[#1A1017] border-[#F27B91]/35 text-[#FDF2F6]',
      superficieSecundaria: 'bg-[#251420] border-[#F27B91]/30 text-[#FDF2F6]',
      superficieMapa: 'bg-[#120910] border-[#F27B91]/30',
      superficieFlotante: 'bg-[#1A1017]/95 border-[#F27B91]/40 text-[#FDF2F6] shadow-xl',
      textoTitulo: 'text-[#FDF2F6]',
      textoCuerpo: 'text-[#EADAE2]',
      textoMuted: 'text-[#D2BBC7]',
      bordeSuave: 'border-[#F27B91]/30',
      inputClase:
        'bg-[#251420] border-[#F27B91]/40 text-[#FDF2F6] placeholder:text-[#C4AEBA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F27B91] focus-visible:border-[#F27B91]',
      chipInactivo:
        'bg-[#251420] text-[#F5E6EE] border-[#F27B91]/35 hover:bg-[#351B2C] hover:border-[#F27B91]/70',
      chipActivo:
        'bg-[#8A2348] text-white border-[#F9A8B8] font-bold shadow-sm',
      botonSecundario:
        'bg-[#251420] hover:bg-[#351B2C] text-[#FDF2F6] border-[#F27B91]/40',
      botonPrimario:
        'bg-[#7E1F41] hover:bg-[#992750] text-white border-[#F9A8B8]/60',
      botonControlMapa:
        'text-[#FDF2F6] hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#F27B91]',
      tarjeta:
        'bg-[#1A1017] border-[#F27B91]/30 hover:border-[#F27B91]/70 text-[#FDF2F6]',
      tarjetaSeleccionada:
        'bg-[#2F1625] border-[#F9A8B8] ring-2 ring-[#F27B91]/40 text-[#FDF2F6]',
      badgeDemo:
        'bg-amber-950/90 text-amber-200 border-amber-400/60',
      badgePermitido:
        'bg-emerald-950/90 text-emerald-200 border-emerald-400/60',
      badgeNoPermitido:
        'bg-rose-950/90 text-rose-200 border-rose-400/60',
      badgeDesconocido:
        'bg-[#2D1A26] text-[#EADAE2] border-[#F27B91]/40',
      alertaAsfalto:
        'bg-amber-950/85 border-amber-400/60 text-amber-100',
      corredorVerde:
        'bg-emerald-950/85 border-emerald-400/60 text-emerald-100',
      focusRing:
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F27B91] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1017]',
    };
  }

  // Oscuro (neutro alto contraste)
  return {
    esClaro: false,
    nombre: 'oscuro',
    superficiePrincipal: 'bg-[#111827] border-slate-600 text-slate-50',
    superficieSecundaria: 'bg-[#162032] border-slate-600 text-slate-50',
    superficieMapa: 'bg-[#090D14] border-slate-600',
    superficieFlotante: 'bg-[#111827]/95 border-slate-500 text-slate-50 shadow-xl',
    textoTitulo: 'text-white',
    textoCuerpo: 'text-slate-200',
    textoMuted: 'text-slate-300',
    bordeSuave: 'border-slate-600',
    inputClase:
      'bg-[#162032] border-slate-500 text-white placeholder:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F27B91] focus-visible:border-[#F27B91]',
    chipInactivo:
      'bg-[#162032] text-slate-100 border-slate-500 hover:bg-[#1E293B] hover:border-slate-300',
    chipActivo:
      'bg-[#8A2348] text-white border-[#F9A8B8] font-bold shadow-sm',
    botonSecundario:
      'bg-[#1E293B] hover:bg-[#334155] text-white border-slate-500',
    botonPrimario:
      'bg-[#7E1F41] hover:bg-[#992750] text-white border-[#F9A8B8]/60',
    botonControlMapa:
      'text-white hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#F27B91]',
    tarjeta:
      'bg-[#111827] border-slate-600 hover:border-slate-300 text-slate-50',
    tarjetaSeleccionada:
      'bg-[#1E293B] border-[#F27B91] ring-2 ring-[#F27B91]/40 text-white',
    badgeDemo:
      'bg-amber-950/90 text-amber-200 border-amber-400/60',
    badgePermitido:
      'bg-emerald-950/90 text-emerald-200 border-emerald-400/60',
    badgeNoPermitido:
      'bg-rose-950/90 text-rose-200 border-rose-400/60',
    badgeDesconocido:
      'bg-slate-800 text-slate-100 border-slate-500',
    alertaAsfalto:
      'bg-amber-950/85 border-amber-400/60 text-amber-100',
    corredorVerde:
      'bg-emerald-950/85 border-emerald-400/60 text-emerald-100',
    focusRing:
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F27B91] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111827]',
  };
}
