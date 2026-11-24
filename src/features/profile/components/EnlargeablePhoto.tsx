import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import type { AvatarPhoto } from '@/components/ui/Avatar';
import { PhotoViewer } from '@/components/app/PhotoViewer';

type Props = {
  // Only given when the server signed a URL for this viewer: without it there is nothing to enlarge (principle 1).
  photo?: AvatarPhoto;
  size: number;
  onLongPress?: () => void;
  disabled?: boolean;
  children: ReactNode;
};

// Wraps a profile avatar: a tap opens the photo alone in the full-screen viewer; with only the initial it is inert.
export function EnlargeablePhoto({ photo, size, onLongPress, disabled, children }: Props) {
  const { t } = useTranslation('profile');
  const [open, setOpen] = useState(false);
  const enlargeable = photo !== undefined;
  return (
    <>
      <Pressable
        accessible={enlargeable}
        accessibilityRole={enlargeable ? 'button' : undefined}
        accessibilityLabel={enlargeable ? t('avatar.enlarge') : undefined}
        disabled={disabled}
        onPress={enlargeable ? () => setOpen(true) : undefined}
        onLongPress={onLongPress}
        style={{ width: size, height: size }}
      >
        {children}
      </Pressable>
      <PhotoViewer
        photos={photo ? [{ id: photo.cacheKey, uri: photo.uri, cacheKey: photo.cacheKey }] : []}
        index={open ? 0 : null}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
