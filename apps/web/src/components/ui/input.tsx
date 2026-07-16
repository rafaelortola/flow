import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
