import { useMemo } from 'react';

import { loadEnv } from '@/lib/env';

import { creatorUi, type CreatorUi } from './domain/creatorAccess';

export function useCreatorUi(): CreatorUi {
  const enabled = useMemo(() => loadEnv().creatorEnabled, []);
  return creatorUi(enabled);
}
