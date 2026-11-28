import { useState } from 'react';

import { DEFAULT_USAGE_PERIOD, USAGE_PERIODS, type UsagePeriod } from './domain/types';

// Screen state only (period and search text); the data lives in TanStack Query.
export function useUsageFilters() {
  const [period, setPeriodState] = useState<UsagePeriod>(DEFAULT_USAGE_PERIOD);
  const [search, setSearch] = useState('');
  const setPeriod = (days: number) => {
    const next = USAGE_PERIODS.find((candidate) => candidate === days);
    if (next !== undefined) setPeriodState(next);
  };
  return { period, setPeriod, search, setSearch };
}
