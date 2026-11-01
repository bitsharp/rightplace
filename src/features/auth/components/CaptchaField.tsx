import { useTranslation } from 'react-i18next';

import { isSupportedLanguage } from '@/i18n/domain/pickLanguage';

import type { useCaptcha } from '../useCaptcha';
import { TurnstileBox } from './TurnstileBox';

type Props = { captcha: ReturnType<typeof useCaptcha> };

// Hidden while Turnstile is not configured (no site key): Supabase captcha must then be off too.
export function CaptchaField({ captcha }: Props) {
  const { i18n } = useTranslation();
  if (!captcha.siteKey) return null;
  const language = isSupportedLanguage(i18n?.language) ? i18n.language : 'en';
  return (
    <TurnstileBox
      key={captcha.widgetKey}
      siteKey={captcha.siteKey}
      language={language}
      onToken={captcha.setToken}
    />
  );
}
