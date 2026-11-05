import { uploadPhoto } from '@/lib/photos/photos';

import { createPost } from './api';

export type PublishInput = {
  userId: string;
  caption: string;
  // Output of preparePhoto (EXIF-free JPEG, <= 1280 px), never the original picture.
  cleanUri: string | null;
  // Present only while the night chat is alive and I am a member (get_post_target).
  roomId: string | null;
};

// Two files from one JPEG: the post lives 7 days and the chat photo 2, so each needs its own object
// in its own bucket. Known limit: if create_post fails after the uploads, the files stay orphaned
// (backlog: orphan cleanup).
export async function publishPost({ userId, caption, cleanUri, roomId }: PublishInput) {
  const photoPath = cleanUri ? await uploadPhoto('posts', userId, cleanUri) : undefined;
  const chatPhotoPath =
    cleanUri && roomId ? await uploadPhoto('chat-photos', userId, cleanUri) : undefined;
  return createPost({ caption, photoPath, chatPhotoPath });
}
