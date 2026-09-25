import type { MutableRefObject } from 'react';
import { Animated } from 'react-native';

/** Create Animated.Value entries before first paint (avoids undefined on web). */
export function ensureAnimatedValues(
  ref: MutableRefObject<Animated.Value[]>,
  count: number,
  initial = 0,
): Animated.Value[] {
  while (ref.current.length < count) {
    ref.current.push(new Animated.Value(initial));
  }
  return ref.current.slice(0, count);
}

export const assessmentUseNativeDriver = false;
