import { useTranslation } from 'react-i18next';

import type { Person } from './api';
import { ageBandLabel } from './domain/personMeta';

// "18–24 · Donna": the only description of a person other users ever get (principle 1).
export function usePersonMeta(): (person: Pick<Person, 'ageBand' | 'gender'>) => string {
  const { t } = useTranslation('friends');
  return (person) =>
    t('meta', { age: ageBandLabel(person.ageBand), gender: t(`gender.${person.gender}`) });
}
