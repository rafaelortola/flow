import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50',
          variant === 'default' && 'bg-primary text-primary-foreground hover:opacity-90',
          variant === 'outline' && 'border border-border bg-card hover:bg-muted',
          variant === 'ghost' && 'hover:bg-muted',
          variant === 'destructive' && 'bg-destructive text-white hover:opacity-90',
          size === 'sm' && 'h-8 px-3 text-sm',
          size === 'md' && 'h-10 px-4 text-sm',
          size === 'lg' && 'h-11 px-6',
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
