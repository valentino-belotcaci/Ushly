import type { ReactNode } from 'react';
import { PageContainer } from './PageContainer';

export function PageLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <PageContainer className="page-layout">
      <h1>{title}</h1>
      {children}
    </PageContainer>
  );
}
