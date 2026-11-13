import React from 'react';

export function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size = 'md',        // 'sm' | 'md' | 'lg'
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  icon: Icon,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#501228]/30 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5'
  };

  const variantStyles = {
    primary: 'bg-[#501228] text-white hover:bg-[#6E1E3A] shadow-sm hover:shadow-md border border-transparent',
    secondary: 'bg-white text-[#501228] hover:bg-[#FDF2F4] border border-slate-200/80 shadow-sm hover:border-[#501228]/30',
    outline: 'bg-transparent text-[#501228] hover:bg-[#501228]/5 border border-[#501228]/30 hover:border-[#501228]',
    ghost: 'bg-transparent text-[#4B5563] hover:text-[#501228] hover:bg-[#501228]/5 border border-transparent',
    danger: 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon className={`shrink-0 ${size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'}`} />}
      <span>{children}</span>
    </button>
  );
}

