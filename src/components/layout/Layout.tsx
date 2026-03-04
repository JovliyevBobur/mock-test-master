import { ReactNode } from 'react';
import { Header } from './Header';
import { FloatingSpaceObjects } from '@/components/ui/FloatingSpaceObjects';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background relative">
      <FloatingSpaceObjects />
      <Header />
      <main className="relative z-10">{children}</main>
    </div>
  );
}
