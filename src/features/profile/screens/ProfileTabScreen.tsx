import { Link } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/useSession';
import { UiKitLink } from '@/features/dev/UiKitLink';
import type { RpcErrorCode } from '@/lib/rpcError';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { setLocale, type ProfileInput } from '../api';
import { AccountSection } from '../components/AccountSection';
import { BlockedSection } from '../components/BlockedSection';
import { FindMeByPhone } from '../components/FindMeByPhone';
import { FollowersSection } from '../components/FollowersSection';
import { ProfileForm } from '../components/ProfileForm';
import { ShareHandleButton } from '../components/ShareHandleButton';
import { useSaveProfile } from '../useSaveProfile';

export function ProfileTabScreen() {
  const { t } = useTranslation('profile');
  const { profile, email } = useSession();
  const save = useSaveProfile();
  const [result, setResult] = useState<'saved' | RpcErrorCode | null>(null);
  if (!profile) return null;

  const submit = async (input: ProfileInput) => setResult((await save(input)) ?? 'saved');

  return (
    <Screen scroll>
      <MonoLabel tone="going" size="large">
        {t('app.step')}
      </MonoLabel>
      <Text accessibilityRole="header" variant="display26">
        {t('setup.title')}
      </Text>
      <Text color="textSecondary">{t('setup.body')}</Text>
      <ProfileForm
        initial={profile}
        submitLabel={t('app.save')}
        onSubmit={submit}
        // principle: the UI and profiles.locale (push, AI, emails) switch together, right away
        onLanguageChange={(locale) => void setLocale(locale).catch(() => setResult('NETWORK'))}
        errorMessage={result && result !== 'saved' ? t(`errors:rpc.${result}`) : undefined}
      />
      {result === 'saved' ? <Toast tone="success" message={t('app.saved')} /> : null}
      <Link href="/creator" style={styles.link}>
        {profile.isCreator ? t('app.creatorProfile') : t('app.becomeCreator')}
      </Link>
      <ShareHandleButton handle={profile.handle} />
      {profile.contactsOptIn ? <FindMeByPhone /> : null}
      <FollowersSection />
      <BlockedSection />
      <AccountSection email={email ?? ''} />
      <UiKitLink />
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: {
    ...typography.body14,
    color: colors.secondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
