import type { IconName } from '@/components/ui/Icon';

export type SettingsRowKey =
  | 'language'
  | 'notifications'
  | 'privacy'
  | 'city'
  | 'tag'
  | 'personal'
  | 'password'
  | 'creator'
  | 'feedback'
  | 'supportFeedback'
  | 'about'
  | 'terms'
  | 'privacyPolicy';

export type SettingsTarget =
  | '/profile/language'
  | '/profile/notifications'
  | '/profile/privacy'
  | '/profile/city'
  | '/profile/tag'
  | '/profile/personal'
  | '/reset-password'
  | '/creator'
  | '/support/feedback'
  | '/profile/about'
  | '/legal/terms'
  | '/legal/privacy'
  // not a route: the feedback sheet over the current screen
  | 'feedback';

export type SettingsRow = {
  key: SettingsRowKey;
  // key in the "profile" namespace
  titleKey: string;
  icon: IconName;
  target: SettingsTarget;
};

export type SettingsGroupKey = 'account' | 'help' | 'info';
export type SettingsGroup = { key: SettingsGroupKey; rows: SettingsRow[] };

type Context = { creatorEnabled: boolean; isCreator: boolean; isSupport: boolean };

const row = (
  key: SettingsRowKey,
  icon: IconName,
  target: SettingsTarget,
  titleKey = `settings.rows.${key}`,
): SettingsRow => ({ key, titleKey, icon, target });

function accountRows({ creatorEnabled, isCreator }: Context): SettingsRow[] {
  const creator = row(
    'creator',
    'star',
    '/creator',
    isCreator ? 'app.creatorProfile' : 'app.becomeCreator',
  );
  return [
    row('language', 'globe', '/profile/language'),
    row('notifications', 'bell', '/profile/notifications'),
    row('privacy', 'eyeOff', '/profile/privacy'),
    row('city', 'map', '/profile/city'),
    row('tag', 'at', '/profile/tag'),
    row('personal', 'profile', '/profile/personal'),
    row('password', 'lock', '/reset-password'),
    ...(creatorEnabled ? [creator] : []),
  ];
}

function helpRows({ isSupport }: Context): SettingsRow[] {
  return [
    row('feedback', 'feedback', 'feedback'),
    ...(isSupport
      ? [row('supportFeedback', 'chat', '/support/feedback', 'app.supportFeedback')]
      : []),
  ];
}

const INFO_ROWS: SettingsRow[] = [
  row('about', 'info', '/profile/about'),
  row('terms', 'document', '/legal/terms'),
  row('privacyPolicy', 'eye', '/legal/privacy'),
];

// Every setting of the profile, grouped as in the mock-up. Conditional rows (creator area, support team)
// are decided here, in a pure function, so the screen only renders.
export function settingsGroups(context: Context): SettingsGroup[] {
  return [
    { key: 'account', rows: accountRows(context) },
    { key: 'help', rows: helpRows(context) },
    { key: 'info', rows: INFO_ROWS },
  ];
}
