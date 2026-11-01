import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { Toggle } from '@/components/ui/Toggle';
import { changeLanguage } from '@/i18n';
import type { Language } from '@/i18n/domain/pickLanguage';
import { spacing } from '@/theme/tokens';

import type { Gender } from '../api';
import { requestLocationPermission } from '../location';

const GENDERS: Gender[] = ['female', 'male', 'other'];

export function GenderPicker({
  value,
  onChange,
}: {
  value: Gender | null;
  onChange: (gender: Gender) => void;
}) {
  const { t } = useTranslation('profile');
  return (
    <View style={styles.field}>
      <Text variant="body13Medium" color="textSecondary">
        {t('form.gender.label')}
      </Text>
      <View style={styles.row}>
        {GENDERS.map((gender) => (
          <Chip
            key={gender}
            label={t(`form.gender.${gender}`)}
            selected={value === gender}
            onPress={() => onChange(gender)}
          />
        ))}
      </View>
    </View>
  );
}

export function LanguagePicker({
  value,
  onChange,
}: {
  value: Language;
  onChange: (locale: Language) => void;
}) {
  const { t } = useTranslation('profile');
  const select = (locale: Language) => {
    onChange(locale);
    // the UI follows the choice immediately; profiles.locale is saved with the form (or set_locale)
    changeLanguage(locale).catch((error: unknown) => console.warn('Cambio lingua fallito', error));
  };
  const options = [
    { value: 'it', label: t('form.language.it') },
    { value: 'en', label: t('form.language.en') },
  ] as const;
  return (
    <View style={styles.field}>
      <Text variant="body13Medium" color="textSecondary">
        {t('form.language.label')}
      </Text>
      <SegmentedControl options={options} value={value} onChange={select} />
    </View>
  );
}

type LocationToggleProps = { value: boolean; onChange: (value: boolean) => void };

// Principle 3: off by default; switching it on asks for "when in use" only, and a refusal keeps it off.
export function LocationToggle({ value, onChange }: LocationToggleProps) {
  const { t } = useTranslation('profile');
  const [denied, setDenied] = useState(false);
  const toggle = async (next: boolean) => {
    if (!next) return onChange(false);
    const granted = await requestLocationPermission();
    setDenied(!granted);
    onChange(granted);
  };
  return (
    <View style={styles.field}>
      <Toggle
        icon="map"
        title={t('form.location.title')}
        description={t('form.location.body')}
        value={value}
        onValueChange={toggle}
      />
      {denied ? (
        <Text variant="body13" color="textSecondary">
          {t('form.location.denied')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2 },
});
