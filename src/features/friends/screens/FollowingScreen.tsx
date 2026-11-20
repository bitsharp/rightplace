import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Screen';
import { Toast } from '@/components/ui/Toast';
import { BackHeader } from '@/features/profile/components/BackHeader';

import type { Person } from '../api';
import { FollowingSection } from '../components/FollowingSection';
import { PersonSheet, type PersonNotice } from '../components/PersonSheet';
import { useFollowActions } from '../useFollowActions';

const NOTICE_MS = 4000;

// The people I follow (accepted), open from the counter of the profile: unfollow, or report / block on a long press.
export function FollowingScreen() {
  const { t } = useTranslation('friends');
  const { t: tProfile } = useTranslation('profile');
  const actions = useFollowActions();
  const [selected, setSelected] = useState<Person | null>(null);
  const [notice, setNotice] = useState<PersonNotice | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <Screen scroll>
      <BackHeader title={tProfile('header.following')} />
      <FollowingSection onAction={actions.run} onLongPress={setSelected} />
      {notice ? <Toast tone="success" message={t(`person.${notice}`)} /> : null}
      <PersonSheet person={selected} onClose={() => setSelected(null)} onDone={setNotice} />
    </Screen>
  );
}
