import type { ComponentProps } from 'react';

export function PageContainer({
  className = '',
  ...props
}: ComponentProps<'div'>) {
  return <div {...props} className={`page-container ${className}`} />;
}
