import { useTranslation } from 'react-i18next';

import type { Band } from '@/features/nights/domain/band';

// Numeric bands are language-neutral; only "pochi" (fewer than k=3 or a tiny group) is translated.
export function useBandLabel(): (band: Band) => string {
  const { t } = useTranslation('ui');
  return (band) => (band === 'pochi' ? t('band.few') : band);
}
