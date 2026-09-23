import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme';

/** Bottom padding for sticky CTAs (home indicator + comfortable thumb reach). */
export function useFooterInset(extra = spacing.lg): number {
  const insets = useSafeAreaInsets();
  const base = Platform.OS === 'web' ? 20 : Math.max(insets.bottom, 12);
  return base + extra;
}
