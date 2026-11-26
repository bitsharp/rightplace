import { useCallback, type ComponentRef, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { useAnchorRegistry } from '../anchorRegistry';
import { placeBubble, spotlightRect, type Rect } from '../domain/layout';
import type { TourScreen } from '../domain/steps';
import { useTourStore } from '../store/tourStore';
import { useCurrentTip } from '../useCurrentTip';
import { TourBubble } from './TourBubble';
import { TourSpotlight } from './TourSpotlight';

const SPOTLIGHT_PADDING = 6;

// Where this overlay sits in the window: anchors are measured in window coordinates, the overlay
// draws in its own, so the difference is its origin (the safe area, the header...).
function useWindowBox() {
  const window = useWindowDimensions();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [box, setBox] = useState<Rect>({ x: 0, y: 0, width: window.width, height: window.height });
  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => setBox({ x, y, width, height }));
  }, []);
  return [box, ref, measure] as const;
}

// Mounted once per screen: dims it and points at the anchor of the first unseen tip. Renders nothing
// (and so blocks nothing) when there is no tip to show.
export function TourOverlay({ screen }: { screen: TourScreen }) {
  const tip = useCurrentTip(screen);
  const registry = useAnchorRegistry();
  const markStepSeen = useTourStore((state) => state.markStepSeen);
  const { t } = useTranslation('tour');
  const [box, boxRef, measureBox] = useWindowBox();
  const step = tip?.step;
  useEffect(() => {
    // The screen may have scrolled or moved since the anchor was first measured.
    if (step) registry.remeasure(step);
    if (step) measureBox();
  }, [step, registry, measureBox]);
  if (!tip) return null;
  const local = { ...tip.anchor, x: tip.anchor.x - box.x, y: tip.anchor.y - box.y };
  const hole = spotlightRect(local, box, SPOTLIGHT_PADDING);
  const dismiss = () => markStepSeen(tip.step);
  return (
    <View
      ref={boxRef}
      onLayout={measureBox}
      pointerEvents="box-none"
      style={StyleSheet.absoluteFill}
    >
      <Pressable
        testID="tour-backdrop"
        accessible={false}
        onPress={dismiss}
        style={StyleSheet.absoluteFill}
      />
      <TourSpotlight container={box} hole={hole} />
      <TourBubble
        key={tip.step}
        text={t(`tips.${tip.step}`)}
        placement={placeBubble(hole, box)}
        onDismiss={dismiss}
      />
    </View>
  );
}
