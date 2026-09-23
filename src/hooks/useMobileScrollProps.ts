import { Platform } from 'react-native';

/** ScrollView props that fix touch scrolling on mobile browsers (Expo web). */
export function useMobileScrollProps() {
  if (Platform.OS !== 'web') {
    return {
      scrollViewStyle: { flex: 1 as const },
      scrollProps: { showsVerticalScrollIndicator: true },
    };
  }
  return {
    scrollViewStyle: {
      flex: 1,
      overflow: 'scroll' as const,
      WebkitOverflowScrolling: 'touch' as const,
    },
    scrollProps: {
      showsVerticalScrollIndicator: true,
      nestedScrollEnabled: true,
    },
  };
}
