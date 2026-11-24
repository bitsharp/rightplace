import type { ReactNode } from 'react';

import { Screen } from '@/components/ui/Screen';

import { BackHeader } from './BackHeader';

// The frame of every sub-screen opened from the settings list: back arrow (to the list) and a title.
export function SettingsPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Screen scroll>
      <BackHeader title={title} fallback="/profile/edit" />
      {children}
    </Screen>
  );
}
