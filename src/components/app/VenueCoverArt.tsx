import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

// A Metro asset (a number): .webp is in Expo's default assetExts.
const PLACEHOLDER = require('../../../assets/images/venue-placeholder.webp') as number;

type Props = {
  // The venue kind as the server sends it. Every kind shares the same illustration, so it is not drawn.
  kind: string;
};

// Illustration shown where a venue has no photo (or it failed to load). It fills its container ("cover"), so
// it works as a 72 px thumbnail and as a full-width cover. It is not a photo: it never carries the
// "Foto da Google Maps" caption.
export function VenueCoverArt(_props: Props) {
  const { t } = useTranslation('ui');
  return (
    <View
      testID="venue-cover-art"
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('ui:coverArt.label')}
      style={styles.fill}
    >
      <Image
        testID="venue-cover-art-image"
        source={PLACEHOLDER}
        contentFit="cover"
        accessible={false}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%', backgroundColor: colors.surface, overflow: 'hidden' },
});
