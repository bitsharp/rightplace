import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useSession } from '@/features/auth/useSession';
import { rpcErrorCodeOf } from '@/lib/rpcError';
import { usePhotoFlow } from '@/lib/photos/usePhotoFlow';

import { MAX_CAPTION_LENGTH } from './domain/caption';
import { useCreatePost, usePostTarget } from './hooks';

// State and actions of the "day after" screen. The photo is the EXIF-free JPEG from preparePhoto.
export function useNewPost() {
  const router = useRouter();
  const { userId } = useSession();
  const target = usePostTarget();
  const create = useCreatePost();
  const [caption, setCaption] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const photoFlow = usePhotoFlow(setPhotoUri);
  const hasContent = caption.trim() !== '' || photoUri !== null;

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/feed'));
  const publish = () => {
    if (!userId || !hasContent) return;
    create.mutate(
      { userId, caption, cleanUri: photoUri, roomId: target.data?.roomId ?? null },
      { onSuccess: leave },
    );
  };

  return {
    target: target.data ?? null,
    targetLoaded: target.isSuccess,
    targetFailed: target.isError,
    caption,
    setCaption: (text: string) => setCaption(text.slice(0, MAX_CAPTION_LENGTH)),
    photoUri,
    removePhoto: () => setPhotoUri(null),
    photoFlow,
    canPublish: hasContent && !create.isPending,
    isPublishing: create.isPending,
    errorCode: rpcErrorCodeOf(create.error),
    publish,
    close: leave,
    goToMap: () => router.replace('/map'),
  };
}
