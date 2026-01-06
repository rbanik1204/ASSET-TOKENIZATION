import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'default';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'default', size = 'md', className = '' }: BadgeProps) {
  const variants = {
    success: 'bg-[rgba(34,197,94,0.15)] text-[#22C55E]',
    error: 'bg-[rgba(239,68,68,0.15)] text-[#EF4444]',
    warning: 'bg-[rgba(250,204,21,0.15)] text-[#FACC15]',
    info: 'bg-[rgba(59,130,246,0.15)] text-[#3B82F6]',
    default: 'bg-[rgba(176,183,195,0.15)] text-[#B0B7C3]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  return (
    <span className={`inline-flex items-center font-semibold rounded-md ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}
