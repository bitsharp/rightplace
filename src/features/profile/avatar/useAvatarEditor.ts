import { useState } from 'react';

import { useSession } from '@/features/auth/useSession';
import { usePhotoFlow } from '@/lib/photos/usePhotoFlow';
import { rpcErrorCodeOf } from '@/lib/rpcError';

import { useAvatarUrls, useChangeAvatar, useRemoveAvatar } from './hooks';

// Everything the "my profile photo" control needs: my photo (if any), the sheet, the picker flow and the two writes.
export function useAvatarEditor() {
  const { userId } = useSession();
  const urls = useAvatarUrls([userId]);
  const change = useChangeAvatar(userId ?? '');
  const remove = useRemoveAvatar();
  const photoFlow = usePhotoFlow((cleanUri) => {
    if (userId) change.mutate(cleanUri);
  }, 'avatar');
  const [removing, setRemoving] = useState(false);
  const photoUri = userId ? urls[userId] : undefined;

  const removePhoto = () => {
    setRemoving(true);
    photoFlow.closeSheet();
    remove.mutate(undefined, { onSettled: () => setRemoving(false) });
  };

  return {
    userId,
    photoUri,
    photoFlow,
    removePhoto,
    busy: change.isPending || removing,
    errorCode: rpcErrorCodeOf(change.error ?? remove.error),
  };
}
