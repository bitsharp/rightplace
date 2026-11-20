import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

import { Text } from './Text';

export type AvatarIntent = 'going' | 'maybe' | 'neutral';

// Signed URLs change on every request: the cache key (the user id) keeps the picture in memory under a
// stable name, and never on disk (principle 1: the photo is private to the owner and accepted followers).
export type AvatarPhoto = { uri: string; cacheKey: string };

type Props = {
  intent: AvatarIntent;
  initial?: string;
  size?: number;
  // Only passed when the server returned a URL, i.e. the viewer is allowed to see the photo.
  photo?: AvatarPhoto;
};

const INTENT_COLORS: Record<AvatarIntent, { borderColor: string; backgroundColor: string }> = {
  going: { borderColor: colors.going, backgroundColor: colors.goingSoft },
  maybe: { borderColor: colors.maybe, backgroundColor: colors.maybeSoft },
  neutral: { borderColor: colors.border, backgroundColor: colors.neutralSoft },
};

// An expired or broken URL falls back to the initial; a new URL gets a fresh attempt.
function usePhotoFailed(uri: string | undefined) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  return {
    failed: uri !== undefined && failedUri === uri,
    markFailed: () => setFailedUri(uri ?? null),
  };
}

export function Avatar({ intent, initial, size = 44, photo }: Props) {
  const { failed, markFailed } = usePhotoFailed(photo?.uri);
  const showPhoto = photo !== undefined && !failed;
  return (
    <View
      testID="avatar"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        INTENT_COLORS[intent],
      ]}
    >
      {showPhoto ? (
        <Image
          testID="avatar-image"
          source={{ uri: photo.uri, cacheKey: photo.cacheKey }}
          cachePolicy="memory"
          contentFit="cover"
          onError={markFailed}
          style={StyleSheet.absoluteFill}
        />
      ) : initial ? (
        <Text style={[styles.initial, { fontSize: Math.round(size * 0.36) }]}>
          {initial.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  initial: { fontFamily: fonts.display, lineHeight: undefined },
});
