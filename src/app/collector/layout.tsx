import type { ReactNode } from 'react';
import { AppProvider } from '@/components/AppProvider';
import { DemoReset } from '@/components/DemoReset';
import { CollectorNav } from '@/components/CollectorNav';

export default function CollectorLayout({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      {/* pb-24 leaves room for the fixed bottom nav; the nav is fixed so it
          survives the on-screen keyboard appearing during weight entry. */}
      <div data-surface="collector" className="mx-auto min-h-dvh max-w-md pb-24">{children}</div>
      <CollectorNav />
          <DemoReset />
    </AppProvider>
  );
}
