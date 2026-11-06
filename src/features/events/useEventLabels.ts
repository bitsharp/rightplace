import { useTranslation } from 'react-i18next';

import { eventWhenLabel } from '@/features/creator/domain/eventRow';
import { fromTargetArrays } from '@/features/creator/domain/target';

// "18–24, 25–34 · Tutti": age chips first, then the gender (empty arrays mean everybody).
export function useTargetLabel(): (
  ageBands: readonly string[],
  genders: readonly string[],
) => string {
  const { t } = useTranslation('ui');
  return (ageBands, genders) => {
    const { ages, gender } = fromTargetArrays(ageBands, genders);
    const agePart =
      ages.length > 0 ? ages.map((age) => t(`target.age.${age}`)).join(', ') : t('target.allAges');
    return `${agePart} · ${t(`target.gender.${gender}`)}`;
  };
}

// "Stasera · 22:00–04:00": the city's clock and the user's language, never the device's time zone.
export function useWhenLabel(): (startsAt: string, endsAt: string, timeZone: string) => string {
  const { t, i18n } = useTranslation('ui');
  return (startsAt, endsAt, timeZone) => {
    const { day, ...values } = eventWhenLabel(
      startsAt,
      endsAt,
      new Date(),
      timeZone,
      i18n.language,
    );
    return t(
      `eventWhen.${day}`,
      day === 'date' ? values : { time: values.time, endTime: values.endTime },
    );
  };
}
