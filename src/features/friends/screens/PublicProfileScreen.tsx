import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

import { PersonRow } from '../components/PersonRow';
import { usePublicProfile } from '../hooks';
import { useFollowActions } from '../useFollowActions';

// Landing page of rightplace://u/<handle>: public identity and the Request button, nothing more.
export function PublicProfileScreen({ handle }: { handle: string }) {
  const { t } = useTranslation('friends');
  const profile = usePublicProfile(handle);
  const actions = useFollowActions();
  const person = profile.data;
  return (
    <Screen>
      <Text accessibilityRole="header" variant="display22">
        {t('publicProfile.title')}
      </Text>
      {person ? (
        <PersonRow
          person={person}
          followState={person.followState}
          followsMe={person.followsMe}
          venueName={person.tonightVenueName}
          onAction={actions.run}
        />
      ) : null}
      {person === null ? <EmptyState message={t('publicProfile.notFound')} /> : null}
      <Button
        label={t('publicProfile.back')}
        variant="ghost"
        size="md"
        style={styles.back}
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/friends'))}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({ back: { alignSelf: 'stretch' } });
