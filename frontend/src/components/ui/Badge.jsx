import React from 'react';

export function Badge({
  children,
  variant = 'default', // 'default' | 'burdeos' | 'success' | 'warning' | 'danger' | 'neutral'
  className = '',
  icon: Icon
}) {
  const variantStyles = {
    default: 'bg-[#FDF2F4] text-[#6E1E3A] border-[#F9E2E8]',
    burdeos: 'bg-[#501228] text-white border-transparent',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-800 border-amber-200/60',
    danger: 'bg-rose-50 text-rose-800 border-rose-200/60',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant]} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}

