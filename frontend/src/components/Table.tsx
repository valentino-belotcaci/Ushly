import { useId, type ComponentProps } from 'react';

export function Table({
  caption,
  children,
  className = '',
  ...props
}: ComponentProps<'table'> & { caption: string }) {
  const id = useId();
  return (
    <div
      className="table-scroll"
      role="region"
      aria-labelledby={id}
      tabIndex={0}
    >
      <table {...props} className={`table ${className}`}>
        <caption id={id}>{caption}</caption>
        {children}
      </table>
    </div>
  );
}
