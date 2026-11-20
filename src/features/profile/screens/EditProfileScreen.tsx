import { Link } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/useSession';
import { useCreatorUi } from '@/features/creator/useCreatorUi';
import { UiKitLink } from '@/features/dev/UiKitLink';
import { NotificationSettings } from '@/features/notifications/components/NotificationSettings';
import type { RpcErrorCode } from '@/lib/rpcError';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { useAvatarEditor } from '../avatar/useAvatarEditor';
import { setLocale, type MyProfile, type ProfileInput } from '../api';
import { AccountSection } from '../components/AccountSection';
import { AvatarEditor, AvatarEditorNotice } from '../components/AvatarEditor';
import { BackHeader } from '../components/BackHeader';
import { BlockedSection } from '../components/BlockedSection';
import { CityPicker } from '../components/CityPicker';
import { FindMeByPhone } from '../components/FindMeByPhone';
import { HandleSection } from '../components/HandleSection';
import { ProfileForm } from '../components/ProfileForm';
import { ShareHandleButton } from '../components/ShareHandleButton';
import { useSaveProfile } from '../useSaveProfile';
import { useShareUi } from '../useShareUi';

// Everything that used to be the profile tab, now behind "Edit profile": photo, @tag, age, gender, position,
// contacts, map city, notifications, phone, blocked users, creator link and account deletion.
export function EditProfileScreen() {
  const { t } = useTranslation('profile');
  const { profile, email } = useSession();
  const save = useSaveProfile();
  const { showCreatorProfileLink } = useCreatorUi();
  const avatar = useAvatarEditor();
  const [result, setResult] = useState<'saved' | RpcErrorCode | null>(null);
  if (!profile) return null;

  const submit = async (input: ProfileInput) => setResult((await save(input)) ?? 'saved');

  return (
    <Screen scroll>
      <BackHeader title={t('edit.title')} />
      <View style={styles.avatar}>
        <AvatarEditor handle={profile.handle} editor={avatar} />
      </View>
      <AvatarEditorNotice editor={avatar} />
      <MonoLabel tone="going" size="large">
        {t('app.step')}
      </MonoLabel>
      <Text accessibilityRole="header" variant="display26">
        {t('setup.title')}
      </Text>
      <Text color="textSecondary">{t('setup.body')}</Text>
      <HandleSection
        handle={profile.handle}
        handleChangedAt={profile.handleChangedAt}
        handleFreeChangeUsed={profile.handleFreeChangeUsed}
      />
      <ProfileForm
        initial={profile}
        submitLabel={t('app.save')}
        onSubmit={submit}
        // principle: the UI and profiles.locale (push, AI, emails) switch together, right away
        onLanguageChange={(locale) => void setLocale(locale).catch(() => setResult('NETWORK'))}
        errorMessage={result && result !== 'saved' ? t(`errors:rpc.${result}`) : undefined}
      />
      <CityPicker locationOn={profile.locationOptIn} />
      {result === 'saved' ? <Toast tone="success" message={t('app.saved')} /> : null}
      {showCreatorProfileLink ? (
        <Link href="/creator" style={styles.link}>
          {profile.isCreator ? t('app.creatorProfile') : t('app.becomeCreator')}
        </Link>
      ) : null}
      {profile.isSupport ? (
        <Link href="/support/feedback" style={styles.link}>
          {t('app.supportFeedback')}
        </Link>
      ) : null}
      <EditSections profile={profile} email={email ?? ''} />
    </Screen>
  );
}

function EditSections({ profile, email }: { profile: MyProfile; email: string }) {
  const { showShareHandle } = useShareUi();
  return (
    <>
      {showShareHandle ? <ShareHandleButton handle={profile.handle} /> : null}
      {profile.contactsOptIn ? <FindMeByPhone /> : null}
      <NotificationSettings />
      <BlockedSection />
      <AccountSection email={email} />
      <UiKitLink />
    </>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'flex-start' },
  link: {
    ...typography.body14,
    color: colors.secondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
});
