import { useWindowDimensions } from 'react-native';

/** Width of the active app column (matches App.tsx maxWidth 480 on web). */
export function useLayoutWidth(): number {
  const { width } = useWindowDimensions();
  return Math.min(width, 480);
}

export function useIsCompactPhone(): boolean {
  return useLayoutWidth() < 380;
}
