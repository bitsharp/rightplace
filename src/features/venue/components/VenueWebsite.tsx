import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { useLinkActions } from '@/lib/links/linkActionsStore';
import { openLink } from '@/lib/links/links';
import { heights, spacing } from '@/theme/tokens';

import { websiteDomain } from '../domain/website';

type Props = { url: string | null };

// Tap opens the system browser, long press offers open / copy (the app-wide link actions). Absent or not a web link:
// the row is not there at all.
export function VenueWebsite({ url }: Props) {
  const { t } = useTranslation('venue');
  const openSheet = useLinkActions((state) => state.openSheet);
  const domain = url ? websiteDomain(url) : null;
  if (!url || !domain) return null;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={t('website.open', { domain })}
      onPress={() => void openLink(url)}
      onLongPress={() => openSheet(url)}
      style={styles.row}
    >
      <Icon name="globe" color="going" />
      <View style={styles.texts}>
        <MonoLabel>{t('website.label')}</MonoLabel>
        <Text variant="body13Medium" color="going" numberOfLines={1}>
          {domain}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: heights.minTapTarget,
  },
  texts: { flex: 1, gap: spacing.xs },
});
