import { useEffect, useState } from 'react';

import { useAfterModalDismiss } from '@/lib/useAfterModalDismiss';

import { AVATAR_MAX_SIDE, MAX_PHOTO_SIDE } from './photoSize';
import { pickPhoto, preparePhoto, type PhotoShape, type PhotoSource } from './photos';

export type PhotoNotice = 'denied' | 'failed';
// 'avatar' = square crop and a 512 px file; 'photo' = free framing and 1280 px (posts, chat).
export type PhotoKind = 'photo' | 'avatar';

const KINDS: Record<PhotoKind, { shape: PhotoShape; maxSide: number }> = {
  photo: { shape: 'free', maxSide: MAX_PHOTO_SIDE },
  avatar: { shape: 'square', maxSide: AVATAR_MAX_SIDE },
};

// Source sheet -> picker -> EXIF-free JPEG -> `onReady(cleanUri)`. The original file never leaves the phone.
// The picker is launched only once the sheet's Modal is gone: on iOS a picker presented while the
// Modal is still closing is silently dropped.
async function pick(
  source: PhotoSource,
  kind: PhotoKind,
  onReady: (cleanUri: string) => void,
  setNotice: (notice: PhotoNotice) => void,
) {
  try {
    const { shape, maxSide } = KINDS[kind];
    const result = await pickPhoto(source, shape);
    if (result.status === 'denied') return setNotice('denied');
    if (result.status === 'picked') onReady(await preparePhoto(result.photo, maxSide));
  } catch {
    setNotice('failed');
  }
}

export function usePhotoFlow(onReady: (cleanUri: string) => void, kind: PhotoKind = 'photo') {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [notice, setNotice] = useState<PhotoNotice | null>(null);

  const [launch, setLaunch] = useState<{ source: PhotoSource } | null>(null);
  // Not an effect on `launch` alone: onReady may change identity between the tap and onDismiss.
  const deferred = useAfterModalDismiss<PhotoSource>((source) => setLaunch({ source }));

  useEffect(() => {
    if (launch) void pick(launch.source, kind, onReady, setNotice);
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
