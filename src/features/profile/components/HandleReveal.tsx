import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { confirmFeedback } from '@/lib/haptics';

export function HandleReveal({ handle }: { handle: string }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    confirmFeedback();
    progress.setValue(0);
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  }, [handle, progress]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  return (
    <Animated.View style={[styles.wrap, { opacity: progress, transform: [{ scale }] }]}>
      <Text variant="display30" color="primary" accessibilityRole="header" style={styles.handle}>
        {formatHandle(handle)}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  handle: { textAlign: 'center' },
});
