import type { ReactNode } from 'react';
import { AppProvider } from '@/components/AppProvider';
import { DemoReset } from '@/components/DemoReset';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AppProvider forceLocale="en">
      <div data-surface="business" className="mx-auto min-h-dvh max-w-5xl">{children}</div>
          <DemoReset />
    </AppProvider>
  );
}
