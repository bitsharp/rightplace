import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radius, spacing, type ColorToken } from '@/theme/tokens';
import { typography, type TypographyVariant } from '@/theme/typography';

import { Row, Section } from './Section';

const SWATCHES: ColorToken[] = [
  'background',
  'surface',
  'border',
  'going',
  'maybe',
  'text',
  'textSecondary',
  'female',
  'male',
  'error',
];

export function ColorsSection() {
  return (
    <Section name="colors">
      <Row>
        {SWATCHES.map((token) => (
          <View key={token} style={styles.swatchBox}>
            <View style={[styles.swatch, { backgroundColor: colors[token] }]} />
            <Text variant="label10" color="textSecondary">
              {token}
            </Text>
          </View>
        ))}
      </Row>
    </Section>
  );
}

export function TypographySection() {
  const { t } = useTranslation('dev');
  const variants = Object.keys(typography) as TypographyVariant[];
  return (
    <Section name="typography">
      {variants.map((variant) => (
        <View key={variant} style={styles.typeRow}>
          <Text variant="label10" color="textSecondary">
            {variant}
          </Text>
          <Text variant={variant} numberOfLines={1}>
            {variant.startsWith('label')
              ? t('sample.solelyDeclared').toUpperCase()
              : t('sample.headline')}
          </Text>
        </View>
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  swatchBox: { alignItems: 'center', gap: spacing.xs, width: 72 },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeRow: { gap: 2 },
});
