import { useId, type ComponentProps } from 'react';

export type InputProps = ComponentProps<'input'> & {
  label: string;
  hint?: string;
  error?: string;
};
export function Input({
  label,
  hint,
  error,
  id,
  className = '',
  'aria-describedby': describedBy,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const description = [
    describedBy,
    hint ? `${inputId}-hint` : '',
    error ? `${inputId}-error` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input
        {...props}
        id={inputId}
        className={`input ${className}`}
        aria-describedby={description || undefined}
        aria-invalid={error ? true : props['aria-invalid']}
      />
      {hint && (
        <p className="field__hint" id={`${inputId}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field__error" id={`${inputId}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
