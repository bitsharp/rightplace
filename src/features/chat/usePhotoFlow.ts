import { useState } from 'react';

import { pickChatPhoto, preparePhoto, type PhotoSource } from './photos';

export type PhotoNotice = 'denied' | 'failed';

// Source sheet -> picker -> EXIF-free JPEG -> `onReady(cleanUri)`. The original file never leaves the phone.
export function usePhotoFlow(onReady: (cleanUri: string) => void) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notice, setNotice] = useState<PhotoNotice | null>(null);

  const choose = async (source: PhotoSource) => {
    setSheetOpen(false);
    setNotice(null);
    try {
      const result = await pickChatPhoto(source);
      if (result.status === 'denied') return setNotice('denied');
      if (result.status === 'picked') onReady(await preparePhoto(result.photo));
    } catch {
      setNotice('failed');
    }
  };

  return {
    sheetOpen,
    notice,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
    choose,
  };
}
