import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Toast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/useSession';
import type { Language } from '@/i18n/domain/pickLanguage';
import type { RpcErrorCode } from '@/lib/rpcError';

import { LanguagePicker } from '../components/ProfileFields';
import { SettingsPage } from '../components/SettingsPage';
import { useSaveLocale } from '../useSaveLocale';

// The UI and profiles.locale (push, AI, emails) switch together, right away: no Save button.
export function LanguageScreen() {
  const { t } = useTranslation('profile');
  const { profile } = useSession();
  const saveLocale = useSaveLocale();
  const [locale, setLocale] = useState<Language | null>(null);
  const [error, setError] = useState<RpcErrorCode | null>(null);
  if (!profile) return null;
  const change = async (next: Language) => {
    setLocale(next);
    setError(await saveLocale(next));
  };
  return (
    <SettingsPage title={t('settings.rows.language')}>
      <LanguagePicker value={locale ?? profile.locale} onChange={(next) => void change(next)} />
      {error ? <Toast tone="info" message={t(`errors:rpc.${error}`)} /> : null}
    </SettingsPage>
  );
}
