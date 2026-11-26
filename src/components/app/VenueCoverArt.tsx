import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme/tokens';

import { CANVAS, SCENES, SKY_ACCENT, sceneForKind } from './venueCoverScenes';

type Props = {
  // The venue kind as the server sends it; anything unknown (spots, "other") gets the generic city lights.
  kind: string;
};

// Stylised night illustration shown where a venue has no photo (or it failed to load): drawn in SVG from the
// theme tokens, nothing downloaded. It fills its container ("slice"), so it works as a 72 px thumbnail and as a
// full-width cover. It is not a photo: it never carries the "Foto da Google Maps" caption.
export function VenueCoverArt({ kind }: Props) {
  const { t } = useTranslation('ui');
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const scene = sceneForKind(kind);
  const Scene = SCENES[scene];
  return (
    <View
      testID={`venue-cover-art-${scene}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('ui:coverArt.label', { kind: t(`ui:coverArt.kind.${scene}`) })}
      style={styles.fill}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.background} stopOpacity={1} />
            <Stop offset="1" stopColor={SKY_ACCENT[scene]} stopOpacity={0.45} />
          </LinearGradient>
        </Defs>
        <Rect width={CANVAS.width} height={CANVAS.height} fill={`url(#${gradientId})`} />
        <Scene />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%', backgroundColor: colors.surface, overflow: 'hidden' },
});
