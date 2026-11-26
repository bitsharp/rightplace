import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// "Reduce motion" from the system settings: tips then appear without any animation.
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => active && setReduce(enabled));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduce;
}
