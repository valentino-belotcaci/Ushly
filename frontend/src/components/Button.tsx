import type { ComponentProps } from 'react';

export type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  loading?: boolean;
};
export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  type = 'button',
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`button button--${variant} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}
