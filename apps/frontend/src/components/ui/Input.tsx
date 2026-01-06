import React, { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-semibold text-[#F5F7FA] mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-2.5 surface rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#F5F7FA] placeholder-[#7C8496] ${
            error ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[#1F232B] focus:border-[#3B82F6]'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-[#EF4444]">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-[#7C8496]">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
