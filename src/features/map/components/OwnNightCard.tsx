import { useTranslation } from 'react-i18next';

import { PromoCard } from '@/components/app/PromoCard';
import { colors } from '@/theme/tokens';

import type { MyDeclaration } from '../api';

type Props = { declaration: MyDeclaration; onPress: (venueId: string) => void };

// "Stasera" layer: purple for "Ci vai", cyan for "Forse", the same colours as the intent itself.
const LOOK = {
  going: { tone: 'going', borderColor: colors.goingBorder },
  maybe: { tone: 'maybe', borderColor: colors.maybeBorder },
} as const;

export function OwnNightCard({ declaration, onPress }: Props) {
  const { t } = useTranslation('map');
  const intent = t(`own.${declaration.intent}`);
  return (
    <PromoCard
      {...LOOK[declaration.intent]}
      label={t('cards.own.label')}
      name={declaration.venueName}
      meta={intent}
      accessibilityLabel={t('cards.own.a11y', { venue: declaration.venueName, intent })}
      onPress={() => onPress(declaration.venueId)}
    />
  );
}
