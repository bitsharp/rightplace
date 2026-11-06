import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { EventRow } from '@/components/app/EventRow';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { spacing } from '@/theme/tokens';

import { CreatorShell } from '../components/CreatorShell';
import { useCreatorProfile } from '../useCreatorProfile';

type Screen = ReturnType<typeof useCreatorProfile>;

export function CreatorProfileScreen() {
  const { t } = useTranslation('creator');
  const screen = useCreatorProfile();
  return (
    <CreatorShell title={t('title')} onBack={screen.goBack}>
      <CreatorBody screen={screen} />
    </CreatorShell>
  );
}

function CreatorBody({ screen }: { screen: Screen }) {
  return (
    <View style={styles.body}>
      <ProfileHeader handle={screen.handle} />
      {/* Plan and billing arrive with prompt 13: the slot stays empty on purpose. */}
      <View testID="creator-plan-slot" />
      <EventsSection screen={screen} />
    </View>
  );
}

function ProfileHeader({ handle }: { handle: string }) {
  const { t } = useTranslation('creator');
  const shown = formatHandle(handle);
  return (
    <View style={styles.header}>
      <Avatar intent="maybe" initial={shown.charAt(1)} size={56} />
      <View style={styles.headerTexts}>
        <MonoLabel tone="maybe" size="large">
          {t('profile.label')}
        </MonoLabel>
        <Text variant="display17">{shown}</Text>
      </View>
    </View>
  );
}

function EventsSection({ screen }: { screen: Screen }) {
  const { t } = useTranslation('creator');
  const options = [
    { value: 'upcoming' as const, label: t('scope.upcoming'), tone: 'maybe' as const },
    { value: 'past' as const, label: t('scope.past'), tone: 'maybe' as const },
  ];
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text variant="display17">{t('events.title')}</Text>
        <Button label={t('events.new')} variant="creator" size="md" onPress={screen.openNewEvent} />
      </View>
      <SegmentedControl options={options} value={screen.scope} onChange={screen.setScope} />
      {screen.rows.map((row) => (
        <EventRow
          key={row.id}
          name={row.name}
          meta={row.meta}
          whenLabel={row.whenLabel}
          goingBand={row.event.goingBand}
          maybeBand={row.event.maybeBand}
          targetLabel={row.targetLabel}
          cancelled={row.event.cancelledAt !== null}
          onPress={() => screen.openAttendance(row.id)}
        />
      ))}
      <Empty screen={screen} />
      <Text variant="body12" color="textSecondary">
        {t('events.note')}
      </Text>
    </View>
  );
}

function Empty({ screen }: { screen: Screen }) {
  const { t } = useTranslation('creator');
  if (screen.loadFailed) return <EmptyState message={t('events.loadError')} />;
  if (!screen.loaded || screen.rows.length > 0) return null;
  return (
    <EmptyState
      message={t(screen.scope === 'upcoming' ? 'events.emptyUpcoming' : 'events.emptyPast')}
    />
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerTexts: { gap: spacing.xs },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
