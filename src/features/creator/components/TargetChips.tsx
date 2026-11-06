import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { spacing } from '@/theme/tokens';

import type { AgeChip, GenderChip } from '../domain/target';

type Props = {
  ages: readonly AgeChip[];
  gender: GenderChip;
  onAges: (ages: AgeChip[]) => void;
  onGender: (gender: GenderChip) => void;
};

const AGES: readonly AgeChip[] = ['18-24', '25-34', '35+'];
const GENDERS: readonly GenderChip[] = ['all', 'female', 'male'];

// "Per chi" (CreaSerata.dc.html): ages are multi-select, gender is single. Nothing selected = everybody.
export function TargetChips({ ages, gender, onAges, onGender }: Props) {
  const { t } = useTranslation('ui');
  const toggle = (age: AgeChip) =>
    onAges(ages.includes(age) ? ages.filter((chip) => chip !== age) : [...ages, age]);
  return (
    <View style={styles.block}>
      <View style={styles.row}>
        {AGES.map((age) => (
          <Chip
            key={age}
            label={t(`target.age.${age}`)}
            selected={ages.includes(age)}
            onPress={() => toggle(age)}
          />
        ))}
      </View>
      <MonoLabel>{t('target.genderTitle')}</MonoLabel>
      <View style={styles.row}>
        {GENDERS.map((value) => (
          <Chip
            key={value}
            label={t(`target.gender.${value}`)}
            tone="maybe"
            selected={gender === value}
            onPress={() => onGender(value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
