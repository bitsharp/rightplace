import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { TransportRow } from '@/components/app/TransportRow';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import type { TransportDirection, TransportLink } from '../domain/transport';

type Props = {
  venueName: string;
  cityName: string;
  taxiNumber: string | null;
  direction: TransportDirection;
  onDirection: (direction: TransportDirection) => void;
  links: readonly TransportLink[];
  onOpen: (link: TransportLink) => void;
};

export function GettingThere(props: Props) {
  const { t } = useTranslation('venue');
  const { direction, onDirection, links, onOpen } = props;
  const options = [
    { value: 'there' as const, label: t('transport.there'), tone: 'neutral' as const },
    { value: 'back' as const, label: t('transport.back'), tone: 'neutral' as const },
  ];
  return (
    <View style={styles.block}>
      <Text variant="display17">{t('transport.title')}</Text>
      <SegmentedControl options={options} value={direction} onChange={onDirection} />
      {links.map((link) => (
        <TransportLine key={link.provider} link={link} context={props} onOpen={onOpen} />
      ))}
      <Text variant="body12" color="textSecondary">
        {t('transport.note')}
      </Text>
    </View>
  );
}

type LineProps = { link: TransportLink; context: Props; onOpen: (link: TransportLink) => void };

function TransportLine({ link, context, onOpen }: LineProps) {
  const { t } = useTranslation('venue');
  const { provider } = link;
  const name = t(`transport.name.${provider}`, { city: context.cityName });
  const number = context.taxiNumber ?? '';
  const call = provider === 'taxi';
  return (
    <TransportRow
      badge={t(`transport.badge.${provider}`)}
      name={name}
      detail={
        call
          ? number
          : t(`transport.detail.${provider}.${context.direction}`, { venue: context.venueName })
      }
      // A phone icon replaces the word "Chiama": the label says what the tap calls.
      action={call ? { icon: 'phone' } : t('transport.action.open')}
      accessibilityLabel={call ? t('transport.a11y.call', { name, number }) : undefined}
      onPress={() => onOpen(link)}
    />
  );
}

const styles = StyleSheet.create({ block: { gap: spacing.md } });
