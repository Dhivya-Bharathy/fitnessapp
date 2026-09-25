import { Platform } from 'react-native';

/** ScrollView props that fix touch scrolling on mobile browsers (Expo web) and native. */
export function useMobileScrollProps() {
  if (Platform.OS === 'web') {
    return {
      scrollViewStyle: {
        flex: 1 as const,
        minHeight: 0 as const,
        height: 0 as const,
        overflowY: 'auto' as const,
        overflowX: 'hidden' as const,
        WebkitOverflowScrolling: 'touch' as const,
        touchAction: 'pan-y' as const,
        overscrollBehavior: 'contain' as const,
      },
      scrollProps: {
        showsVerticalScrollIndicator: true,
        nestedScrollEnabled: true,
      },
    };
  }
  return {
    scrollViewStyle: { flex: 1 as const },
    scrollProps: {
      showsVerticalScrollIndicator: true,
      nestedScrollEnabled: Platform.OS === 'android',
      keyboardShouldPersistTaps: 'handled' as const,
    },
  };
}
