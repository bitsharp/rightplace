import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { PhotoFrame } from '@/components/app/PhotoFrame';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { formatHandle } from '@/features/profile/domain/handle';
import { radius, spacing } from '@/theme/tokens';

export type StripPhoto = { id: string; handle: string; uri?: string };

const THUMB = 72;

export function PhotoStrip({ photos }: { photos: StripPhoto[] }) {
  const { t } = useTranslation('chat');
  if (photos.length === 0) return null;
  return (
    <View style={styles.box}>
      <MonoLabel tone="maybe">{t('photos', { count: photos.length })}</MonoLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {photos.map((photo, index) => (
          <View key={photo.id} style={styles.thumb}>
            <PhotoFrame
              height={THUMB}
              uri={photo.uri}
              scene={index}
              accessibilityLabel={t('photoThumb', { handle: formatHandle(photo.handle) })}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  row: { gap: spacing.sm },
  thumb: { width: THUMB, borderRadius: radius.segmented, overflow: 'hidden' },
});
