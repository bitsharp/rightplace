import { useMemo } from 'react';

import { loadEnv } from '@/lib/env';

import { shareUi, type ShareUi } from './domain/shareAccess';

export function useShareUi(): ShareUi {
  const enabled = useMemo(() => loadEnv().shareEnabled, []);
  return shareUi(enabled);
}
