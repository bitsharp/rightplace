import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useFindMeByPhone, type FindMeStatus } from '@/features/friends/useFindMeByPhone';
import { spacing } from '@/theme/tokens';

function statusMessage(status: FindMeStatus, t: (key: string) => string): string | null {
  if (status === 'idle') return null;
  if (status === 'saved' || status === 'invalid' || status === 'cleared') {
    return t(`findMe.${status}`);
  }
  return t(`errors:rpc.${status}`);
}

// Shown only with the contacts toggle on. The number stays on the phone: only its hash is sent.
export function FindMeByPhone() {
  const { t } = useTranslation('profile');
  const findMe = useFindMeByPhone();
  const message = statusMessage(findMe.status, t);
  const isError = findMe.status !== 'saved' && findMe.status !== 'cleared';
  return (
    <View style={styles.section}>
      <MonoLabel tone="maybe">{t('findMe.title')}</MonoLabel>
      <Text variant="body13" color="textSecondary">
        {t('findMe.body')}
      </Text>
      {findMe.registered ? (
        <View style={styles.registered}>
          <Text variant="body13" color="maybe" accessibilityElementsHidden>
            ✓
          </Text>
          <Text variant="body13" color="maybe">
            {t('findMe.registered')}
          </Text>
        </View>
      ) : (
        <TextField
          label={t('findMe.label')}
          placeholder={t('findMe.placeholder')}
          value={findMe.number}
          onChangeText={findMe.setNumber}
          keyboardType="phone-pad"
          autoComplete="off"
          textContentType="none"
        />
      )}
      {message ? (
        <Text variant="body13" color={isError ? 'error' : 'maybe'}>
          {message}
        </Text>
      ) : null}
      {findMe.registered ? (
        <Button
          label={t('findMe.remove')}
          variant="ghost"
          size="md"
          onPress={() => void findMe.clear()}
        />
      ) : (
        <Button label={t('findMe.save')} size="md" onPress={() => void findMe.save()} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  registered: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
