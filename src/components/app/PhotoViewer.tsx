import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, heights, spacing } from '@/theme/tokens';

import { pageIndexFromOffset } from './photoViewerMath';
import { ZoomableImage } from './ZoomableImage';

export type ViewerPhoto = { id: string; uri?: string; cacheKey?: string; scene?: number };

type Props = {
  photos: ViewerPhoto[];
  // Index of the photo to open on; null keeps the viewer closed.
  index: number | null;
  onClose: () => void;
};

// Full-screen viewer: horizontal pages, pinch / double tap zoom, swipe up or down (or back) to close.
// Deliberately no save / share: photos are ephemeral (CLAUDE.md principle 5).
export function PhotoViewer({ photos, index, onClose }: Props) {
  const open = index !== null && photos.length > 0;
  return (
    <Modal
      testID="photo-viewer-modal"
      visible={open}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {/* A Modal is its own native window: gestures need their own root view in it. */}
      <GestureHandlerRootView style={styles.root}>
        {open ? <Pages photos={photos} initialIndex={index} onClose={onClose} /> : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

type PagesProps = { photos: ViewerPhoto[]; initialIndex: number; onClose: () => void };

function Pages({ photos, initialIndex, onClose }: PagesProps) {
  const { t } = useTranslation('ui');
  const { width, height } = useWindowDimensions();
  const startAt = Math.min(Math.max(initialIndex, 0), photos.length - 1);
  const [current, setCurrent] = useState(startAt);
  // While a photo is zoomed, dragging moves the photo: paging between photos is off.
  const [zoomed, setZoomed] = useState(false);
  const position = Math.min(current, photos.length - 1) + 1;
  return (
    <>
      <FlatList
        testID="photo-viewer-list"
        horizontal
        pagingEnabled
        scrollEnabled={!zoomed}
        data={photos}
        keyExtractor={(photo) => photo.id}
        initialScrollIndex={startAt}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        showsHorizontalScrollIndicator={false}
        windowSize={3}
        onMomentumScrollEnd={(event) =>
          setCurrent(pageIndexFromOffset(event.nativeEvent.contentOffset.x, width, photos.length))
        }
        renderItem={({ item, index: i }) => (
          <ZoomableImage
            size={{ width, height }}
            uri={item.uri}
            cacheKey={item.cacheKey}
            scene={item.scene ?? i}
            label={t('photoViewer.photoOf', { current: i + 1, total: photos.length })}
            onZoomChange={setZoomed}
            onDismiss={onClose}
          />
        )}
      />
      <ViewerHeader position={position} total={photos.length} onClose={onClose} />
    </>
  );
}

type HeaderProps = { position: number; total: number; onClose: () => void };

function ViewerHeader({ position, total, onClose }: HeaderProps) {
  const { t } = useTranslation('ui');
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <Text variant="label12" accessibilityLiveRegion="polite">
        {t('photoViewer.counter', { current: position, total })}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('photoViewer.close')}
        onPress={onClose}
        hitSlop={spacing.sm}
        style={styles.close}
      >
        <Icon name="close" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  close: {
    width: heights.minTapTarget,
    height: heights.minTapTarget,
    borderRadius: heights.minTapTarget / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
