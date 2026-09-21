import { useId, type ReactNode } from 'react';

export function Card({
  title,
  description,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <section className={`card ${className}`} aria-labelledby={id}>
      <header className="card__header">
        <h2 id={id}>{title}</h2>
        {description && <p>{description}</p>}
      </header>
      <div className="card__body">{children}</div>
    </section>
  );
}
