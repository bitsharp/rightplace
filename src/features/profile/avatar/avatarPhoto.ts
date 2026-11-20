import type { AvatarPhoto } from '@/components/ui/Avatar';

// The Avatar gets a photo only when the server signed one for this viewer; otherwise it keeps the initial.
export function avatarPhotoFor(
  urls: Record<string, string>,
  userId: string | null | undefined,
): AvatarPhoto | undefined {
  const uri = userId ? urls[userId] : undefined;
  return uri && userId ? { uri, cacheKey: userId } : undefined;
}
