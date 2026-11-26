import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { VenueCoverArt } from './VenueCoverArt';

type Props = {
  url: string | null;
  kind: string;
  // Size and radius of the box (default: fill the parent); the photo and the illustration both fill it.
  style?: StyleProp<ViewStyle>;
  photoTestID?: string;
};

// Venue cover in a card: the third-party photo (caption "Foto da Google Maps" for screen readers) while it
// exists and loads, the kind illustration when the URL is missing or the image fails.
export function VenueCoverImage({ url, kind, style, photoTestID }: Props) {
  const { t } = useTranslation('venue');
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = Boolean(url) && failedUrl !== url;
  return (
    <View style={[styles.clip, style]}>
      {showPhoto && url ? (
        <Image
          testID={photoTestID}
          accessible
          accessibilityLabel={t('venue:cover.caption')}
          source={{ uri: url }}
          cachePolicy="memory-disk"
          contentFit="cover"
          onError={() => setFailedUrl(url)}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <VenueCoverArt kind={kind} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ clip: { width: '100%', height: '100%', overflow: 'hidden' } });
