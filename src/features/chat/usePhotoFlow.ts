import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { afterModalDismiss } from '@/lib/afterModalDismiss';

import { pickChatPhoto, preparePhoto, type PhotoSource } from './photos';

export type PhotoNotice = 'denied' | 'failed';

// Source sheet -> picker -> EXIF-free JPEG -> `onReady(cleanUri)`. The original file never leaves the phone.
// The picker is launched only once the sheet's Modal is gone: on iOS a picker presented while the
// Modal is still closing is silently dropped.
async function pick(
  source: PhotoSource,
  onReady: (cleanUri: string) => void,
  setNotice: (notice: PhotoNotice) => void,
) {
  try {
    const result = await pickChatPhoto(source);
    if (result.status === 'denied') return setNotice('denied');
    if (result.status === 'picked') onReady(await preparePhoto(result.photo));
  } catch {
    setNotice('failed');
  }
}

export function usePhotoFlow(onReady: (cleanUri: string) => void) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notice, setNotice] = useState<PhotoNotice | null>(null);

  const [launch, setLaunch] = useState<{ source: PhotoSource } | null>(null);
  // Not an effect on `launch` alone: onReady may change identity between the tap and onDismiss.
  const [deferred] = useState(() =>
    afterModalDismiss<PhotoSource>(Platform.OS, (source) => setLaunch({ source })),
  );

  useEffect(() => {
    if (launch) void pick(launch.source, onReady, setNotice);
    // onReady identity must not re-launch the picker: only a new request does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launch]);

  const choose = (source: PhotoSource) => {
    setNotice(null);
    setSheetOpen(false);
    deferred.request(source);
  };

  return {
    sheetOpen,
    notice,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
    choose,
    onSheetDismiss: deferred.onDismiss,
  };
}
