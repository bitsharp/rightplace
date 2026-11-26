import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { heights, spacing } from '@/theme/tokens';

import { PageDots } from './PageDots';
import { WelcomePage } from './WelcomePage';
import type { WelcomeArtKind } from './WelcomeArt';

const PAGES: readonly WelcomeArtKind[] = ['where', 'declare', 'privacy'];
const LAST = PAGES.length - 1;

type Props = {
  // "review" = opened again from the profile: closing goes back, no "Skip".
  review: boolean;
  onFinish: () => void;
};

// Three horizontal pages with dots; "Skip" is always visible on the first visit.
export function WelcomePages({ review, onFinish }: Props) {
  const { t } = useTranslation('tour');
  const scroller = useRef<ScrollViewInstance>(null);
  const [index, setIndex] = useState(0);
  const { width } = useWindowDimensions();
  const pageWidth = width - spacing.xl * 2;
  const goTo = (page: number) => {
    setIndex(page);
    scroller.current?.scrollTo({ x: page * pageWidth, animated: true });
  };
  const onSettle = (event: NativeSyntheticEvent<NativeScrollEvent>) =>
    setIndex(Math.round(event.nativeEvent.contentOffset.x / pageWidth));
  const isLast = index === LAST;
  return (
    <Screen testID="welcome-screen">
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          onPress={onFinish}
          style={styles.skip}
          accessibilityLabel={t(review ? 'welcome.close' : 'welcome.skip')}
        >
          <Text variant="body15Strong" color="textSecondary">
            {t(review ? 'welcome.close' : 'welcome.skip')}
          </Text>
        </Pressable>
      </View>
      <ScrollView
        ref={scroller}
        testID="welcome-pager"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onSettle}
        style={styles.pager}
      >
        {PAGES.map((kind) => (
          <WelcomePage key={kind} kind={kind} width={pageWidth} />
        ))}
      </ScrollView>
      <PageDots count={PAGES.length} index={index} />
      {review && isLast ? <Toast message={t('welcome.reviewToast')} /> : null}
      <Button
        label={t(isLast ? (review ? 'welcome.close' : 'welcome.start') : 'welcome.next')}
        onPress={isLast ? onFinish : () => goTo(index + 1)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { alignItems: 'flex-end' },
  skip: {
    minHeight: heights.minTapTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  pager: { flex: 1 },
});
