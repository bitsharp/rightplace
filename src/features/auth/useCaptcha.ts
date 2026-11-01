import { useMemo, useState } from 'react';

import { loadEnv } from '@/lib/env';

// Turnstile tokens are single use: after every auth call the widget is remounted for a fresh one.
export function useCaptcha() {
  const siteKey = useMemo(() => loadEnv().turnstileSiteKey, []);
  const [token, setToken] = useState<string | null>(null);
  const [widgetKey, setWidgetKey] = useState(0);

  const consume = (): string | null => {
    const current = token;
    setToken(null);
    setWidgetKey((key) => key + 1);
    return current;
  };

  return {
    siteKey,
    token,
    setToken,
    ready: siteKey === null || token !== null,
    consume,
    widgetKey,
  };
}
