import { useCallback, type ComponentRef, useEffect, useRef, useState, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useAnchorRegistry } from '../anchorRegistry';
import type { TourStepId } from '../domain/steps';

type Props = {
  id: TourStepId;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

// Wraps the element a tip points at and reports where it is in the window. It adds no behaviour:
// without a tip waiting for it, it is a plain View.
export function TourAnchor({ id, children, style, testID }: Props) {
  const registry = useAnchorRegistry();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [token] = useState(() => ({}));
  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) =>
      registry.setRect(id, token, { x, y, width, height }),
    );
  }, [registry, id, token]);
  useEffect(() => {
    const unregister = registry.register(id, token, measure);
    measure();
    return unregister;
  }, [registry, id, token, measure]);
  // collapsable={false}: Android would otherwise flatten the wrapper and there would be nothing to measure.
  return (
    <View ref={ref} testID={testID} collapsable={false} onLayout={measure} style={style}>
      {children}
    </View>
  );
}
