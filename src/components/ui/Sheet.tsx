import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing } from '@/theme/tokens';

import { shouldDismissSheet } from './sheetGesture';

type Props = {
  visible: boolean;
  onClose: () => void;
  // Fires when the Modal is fully gone (iOS only): the moment it is safe to present something native.
  onDismiss?: () => void;
  children?: ReactNode;
};

function useDragToDismiss(onClose: () => void) {
  const [translateY] = useState(() => new Animated.Value(0));
  const [height, setHeight] = useState(0);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => translateY.setValue(Math.max(0, gesture.dy)),
        onPanResponderRelease: (_, { dy, vy }) => {
          if (shouldDismissSheet({ dy, vy, height })) return onClose();
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [height, onClose, translateY],
  );
  return { translateY, responder, setHeight };
}

export function Sheet({ visible, onClose, onDismiss, children }: Props) {
  const insets = useSafeAreaInsets();
  const { translateY, responder, setHeight } = useDragToDismiss(onClose);

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onDismiss={onDismiss}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Backdrop onClose={onClose} />
        <View testID="sheet-panel" accessibilityViewIsModal onAccessibilityEscape={onClose}>
          <Animated.View
            onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
            style={[
              styles.panel,
              { paddingBottom: insets.bottom + spacing.lg, transform: [{ translateY }] },
            ]}
            {...responder.panHandlers}
          >
            <View testID="sheet-handle" style={styles.handle} />
            {children}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

// Pointer-only: screen readers close the sheet with the escape gesture / Android back.
function Backdrop({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('ui');
  return (
    <Pressable
      testID="sheet-backdrop"
      accessibilityRole="button"
      accessibilityLabel={t('sheet.close')}
      onPress={onClose}
      style={StyleSheet.absoluteFill}
    >
      <View style={styles.backdrop} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: colors.backdrop },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.cardLarge,
    borderTopRightRadius: radius.cardLarge,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
  },
});
