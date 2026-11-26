import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Divider } from '@/components/ui/Divider';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { useCreatorUi } from '@/features/creator/useCreatorUi';
import { useOpenFeedback } from '@/features/feedback/useOpenFeedback';
import { useCurrentCityName } from '@/features/map/useCurrentCityName';
import { useTourStore } from '@/features/tour/store/tourStore';
import { colors, radius, spacing } from '@/theme/tokens';

import type { MyProfile } from '../api';
import { formatHandle } from '../domain/handle';
import { settingsGroups, type SettingsRow as Row } from '../domain/settingsRows';
import { SettingsRow } from './SettingsRow';

// The profile settings as a list of rows grouped like the mock-up; each row opens its own screen.
export function SettingsList({ profile }: { profile: MyProfile }) {
  const { t } = useTranslation('profile');
  const router = useRouter();
  const openFeedback = useOpenFeedback();
  const { showCreatorProfileLink } = useCreatorUi();
  const values = useSettingsValues(profile);
  const resetTour = useTourStore((state) => state.resetTour);
  const open = (row: Row) => {
    if (row.target === 'feedback') return void openFeedback();
    // The tips come back too: they show again the next time each screen opens.
    if (row.target === 'tour') {
      resetTour();
      return router.push({ pathname: '/welcome', params: { mode: 'review' } });
    }
    router.push(row.target);
  };
  const groups = settingsGroups({
    creatorEnabled: showCreatorProfileLink,
    isCreator: profile.isCreator,
    isSupport: profile.isSupport,
  });
  return (
    <>
      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          <MonoLabel tone="maybe">{t(`settings.groups.${group.key}`)}</MonoLabel>
          <View style={styles.card}>
            {group.rows.map((row, index) => (
              <View key={row.key}>
                {index > 0 ? <Divider /> : null}
                <SettingsRow
                  icon={row.icon}
                  title={t(row.titleKey)}
                  value={values[row.key]}
                  onPress={() => open(row)}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </>
  );
}

// The right-hand side of the rows that show a current value.
function useSettingsValues(profile: MyProfile): Partial<Record<Row['key'], string>> {
  const { t } = useTranslation('profile');
  const city = useCurrentCityName();
  return {
    language: t(`form.language.${profile.locale}`),
    city: city ?? undefined,
    tag: formatHandle(profile.handle),
  };
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
});
