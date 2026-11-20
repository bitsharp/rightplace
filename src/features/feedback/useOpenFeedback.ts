import { usePathname } from 'expo-router';
import { useCallback, useRef } from 'react';

import { captureScreenshot } from './captureScreenshot';
import { normalizeScreenPath } from './domain/screenPath';
import { useFeedback } from './store/feedbackStore';

// The screenshot is taken BEFORE the sheet opens, otherwise it would show the sheet instead of the page.
export function useOpenFeedback(): () => Promise<void> {
  const pathname = usePathname();
  const open = useFeedback((state) => state.open);
  const capturing = useRef(false);
  return useCallback(async () => {
    if (capturing.current) return;
    capturing.current = true;
    try {
      const screenshotUri = await captureScreenshot();
      open({ screen: normalizeScreenPath(pathname), screenshotUri });
    } finally {
      capturing.current = false;
    }
  }, [pathname, open]);
}
