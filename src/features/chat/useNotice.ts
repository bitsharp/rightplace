import { useEffect, useState } from 'react';

import type { MessageNotice } from './components/MessageActionsSheet';

const NOTICE_MS = 4000;

// A confirmation toast that goes away by itself.
export function useNotice() {
  const [notice, setNotice] = useState<MessageNotice | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);
  return [notice, setNotice] as const;
}
