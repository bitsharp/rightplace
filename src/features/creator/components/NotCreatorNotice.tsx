import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

// Creator screens are only for creators: everyone else is sent to the profile toggle.
export function NotCreatorNotice() {
  const { t } = useTranslation('creator');
  const router = useRouter();
  return (
    <Card tone="dashed" style={styles.card}>
      <Text variant="display17">{t('notCreator.title')}</Text>
      <Text variant="body14" color="textSecondary">
        {t('notCreator.body')}
      </Text>
      <View>
        <Button
          label={t('notCreator.cta')}
          variant="creator"
          onPress={() => router.replace('/profile')}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({ card: { gap: spacing.md, padding: spacing.lg } });
