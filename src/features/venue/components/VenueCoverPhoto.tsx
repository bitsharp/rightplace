import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { PhotoViewer } from '@/components/app/PhotoViewer';
import { ScenePlaceholder } from '@/components/app/PhotoFrame';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { colors, spacing } from '@/theme/tokens';

import { HeroBackdrop, HeroFade } from './HeroGradients';

const ASPECT_RATIO = 4 / 3;
const PLACEHOLDER_HEIGHT = 240;

type Props = { photoUrl: string | null };

// Full-width cover of the venue page. The photo is public and third party (switchable server-side, caption
// "Foto da Google Maps"); it can be cached on disk, unlike the ephemeral user photos (principle 5).
// Absent or broken: a violet gradient with a halo, never an empty box.
export function VenueCoverPhoto({ photoUrl }: Props) {
  const { t } = useTranslation('venue');
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const hasPhoto = Boolean(photoUrl) && !failed;
  return (
    <View testID="venue-hero" style={styles.hero}>
      {hasPhoto && photoUrl ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('cover.open')}
            onPress={() => setViewerOpen(true)}
            testID="venue-cover-photo"
            style={StyleSheet.absoluteFill}
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
          <HeroFade />
          <View pointerEvents="none" style={styles.caption}>
            <MonoLabel>{t('cover.caption')}</MonoLabel>
          </View>
          <PhotoViewer
            photos={[{ id: 'cover', uri: photoUrl }]}
            index={viewerOpen ? 0 : null}
            onClose={() => setViewerOpen(false)}
          />
        </>
      ) : (
        <HeroBackdrop />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', aspectRatio: ASPECT_RATIO, backgroundColor: colors.surface },
  caption: { position: 'absolute', right: spacing.xl, bottom: spacing.sm },
});
