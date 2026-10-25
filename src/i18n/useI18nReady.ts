import { useEffect, useState } from 'react';

import { initI18n } from './index';

export function useI18nReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initI18n()
      // A failed init must never leave the app stuck on the splash screen.
      .catch((error: unknown) => console.warn('Inizializzazione i18n fallita', error))
      .finally(() => setReady(true));
  }, []);

  return ready;
}
