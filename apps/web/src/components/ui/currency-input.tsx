'use client';

import { InputHTMLAttributes, forwardRef } from 'react';
import { cn, formatCurrencyInput } from '@/lib/utils';

interface CurrencyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: string;
  onChange: (value: string) => void;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, placeholder = 'R$ 0,00', ...props }, ref) => (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(formatCurrencyInput(e.target.value))}
      className={cn(
        'flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40',
        className,
      )}
      {...props}
    />
  ),
);
CurrencyInput.displayName = 'CurrencyInput';
