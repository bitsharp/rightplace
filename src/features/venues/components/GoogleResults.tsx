import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { rowStyles } from '@/components/app/VenueRow';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import type { GoogleSearchErrorCode, GoogleSuggestion } from '../googleApi';
import type { GoogleStatus } from '../useGoogleSearch';

type Props = {
  status: GoogleStatus;
  suggestions: readonly GoogleSuggestion[];
  selectError: GoogleSearchErrorCode | null;
  selecting: boolean;
  onSelect: (suggestion: GoogleSuggestion) => void;
};

function StatusLine({ status, selectError }: Pick<Props, 'status' | 'selectError'>) {
  const { t } = useTranslation('venues');
  const key =
    selectError === 'OUT_OF_CITY'
      ? 'outOfCity'
      : selectError
        ? 'selectError'
        : (
            { loading: 'loading', error: 'error', limit: 'limit' } as Partial<
              Record<GoogleStatus, string>
            >
          )[status];
  if (!key) return null;
  return (
    <Text variant="body13" color="textSecondary">
      {t(`google.${key}`)}
    </Text>
  );
}

// Below the catalog: places Google suggests for the typed text. Every Google answer carries the attribution.
export function GoogleResults({ status, suggestions, selectError, selecting, onSelect }: Props) {
  const { t } = useTranslation('venues');
  const hasRows = suggestions.length > 0;
  if (status === 'idle' || (status === 'ready' && !hasRows && !selectError)) return null;
  return (
    <View style={styles.section}>
      <Text variant="display17">{t('google.title')}</Text>
      <StatusLine status={status} selectError={selectError} />
      {suggestions.map((row) => (
        <Pressable
          key={row.placeId}
          accessibilityRole="button"
          accessibilityLabel={t('google.rowA11y', {
            name: row.primaryText,
            place: row.secondaryText,
          })}
          disabled={selecting}
          onPress={() => onSelect(row)}
          style={rowStyles.row}
        >
          <View style={rowStyles.texts}>
            <Text variant="body15Strong" numberOfLines={1}>
              {row.primaryText}
            </Text>
            <Text variant="body12" color="textSecondary" numberOfLines={1}>
              {row.secondaryText}
            </Text>
          </View>
        </Pressable>
      ))}
      {hasRows ? <MonoLabel>{t('google.attribution')}</MonoLabel> : null}
    </View>
  );
}

const styles = StyleSheet.create({ section: { gap: spacing.sm + 2 } });
