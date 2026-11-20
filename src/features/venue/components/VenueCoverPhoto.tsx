import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { PhotoViewer } from '@/components/app/PhotoViewer';
import { ScenePlaceholder } from '@/components/app/PhotoFrame';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { colors, radius, spacing } from '@/theme/tokens';

const ASPECT_RATIO = 16 / 9;
const PLACEHOLDER_HEIGHT = 200;

type Props = { photoUrl: string | null };

// Public cover photo of the venue (third party, switchable server-side). Absent or broken: nothing is rendered,
// never an empty box. A public photo can be cached on disk, unlike the ephemeral user photos (principle 5).
export function VenueCoverPhoto({ photoUrl }: Props) {
  const { t } = useTranslation('venue');
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  if (!photoUrl || failed) return null;
  return (
    <View style={styles.block}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('cover.open')}
        onPress={() => setViewerOpen(true)}
        testID="venue-cover-photo"
        style={styles.frame}
      >
        {loaded ? null : <ScenePlaceholder height={PLACEHOLDER_HEIGHT} scene={0} />}
        <Image
          testID="venue-cover-image"
          source={{ uri: photoUrl }}
          cachePolicy="memory-disk"
          contentFit="cover"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={StyleSheet.absoluteFill}
        />
      </Pressable>
      <MonoLabel>{t('cover.caption')}</MonoLabel>
      <PhotoViewer
        photos={[{ id: 'cover', uri: photoUrl }]}
        index={viewerOpen ? 0 : null}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  frame: {
    aspectRatio: ASPECT_RATIO,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
});
