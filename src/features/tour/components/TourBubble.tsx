import { useEffect, useRef, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { colors, heights, radius, spacing } from '@/theme/tokens';

import type { BubblePlacement } from '../domain/layout';
import { useReduceMotion } from '../useReduceMotion';

const FADE_MS = 180;
const ARROW = 10;

type Props = { text: string; placement: BubblePlacement; onDismiss: () => void };

function FadeIn({ style, children, ...rest }: ViewProps) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withTiming(1, { duration: FADE_MS });
  }, [opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[style, fade]} {...rest}>
      {children}
    </Animated.View>
  );
}

// The speech bubble: text, arrow towards the anchor and "Got it". Tapping anywhere on it dismisses.
export function TourBubble({ text, placement, onDismiss }: Props) {
  const { t } = useTranslation('tour');
  const reduceMotion = useReduceMotion();
  const bodyRef = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (bodyRef.current) AccessibilityInfo.sendAccessibilityEvent(bodyRef.current, 'focus');
  }, []);
  const Container = reduceMotion ? View : FadeIn;
  const { placement: side, offset, left, width, arrowX } = placement;
  const position = side === 'below' ? { top: offset } : { bottom: offset };
  const arrowStyle = side === 'below' ? styles.arrowUp : styles.arrowDown;
  return (
    // Reduce motion: a plain View at full opacity, no animation at all.
    <Container
      testID="tour-bubble"
      accessibilityViewIsModal
      style={[styles.bubble, position, { left, width }]}
    >
      <Pressable ref={bodyRef} accessibilityRole="none" onPress={onDismiss} style={styles.body}>
        <View style={[styles.arrow, arrowStyle, { left: arrowX - ARROW }]} />
        <Text variant="body15">{text}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('tip.gotIt')}
        onPress={onDismiss}
        style={styles.gotIt}
      >
        <Text variant="body14Medium" color="primary">
          {t('tip.gotIt')}
        </Text>
      </Pressable>
    </Container>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.goingBorder,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  body: { gap: spacing.sm },
  gotIt: {
    alignSelf: 'flex-end',
    minHeight: heights.minTapTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  arrow: {
    position: 'absolute',
    width: ARROW * 2,
    height: ARROW * 2,
    backgroundColor: colors.surface,
    borderColor: colors.goingBorder,
    transform: [{ rotate: '45deg' }],
  },
  arrowUp: { top: -ARROW - spacing.lg - 1, borderLeftWidth: 1, borderTopWidth: 1 },
  arrowDown: { bottom: -ARROW - spacing.lg - 1, borderRightWidth: 1, borderBottomWidth: 1 },
});
