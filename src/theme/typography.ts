import { Platform } from 'react-native';

/** Web loads Plus Jakarta via Google Fonts CSS (see App.tsx); native uses expo-google-fonts files. */
export const fontFamily = Platform.select({
  web: {
    regular: 'Plus Jakarta Sans',
    medium: 'Plus Jakarta Sans',
    semiBold: 'Plus Jakarta Sans',
    bold: 'Plus Jakarta Sans',
    extraBold: 'Plus Jakarta Sans',
  },
  default: {
    regular: 'PlusJakartaSans_400Regular',
    medium: 'PlusJakartaSans_500Medium',
    semiBold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
    extraBold: 'PlusJakartaSans_800ExtraBold',
  },
})!;

export const fontSize = {
  xs: 10,
  sm: 11,
  md: 12,
  base: 13,
  lg: 14,
  xl: 16,
  xxl: 18,
  xxxl: 20,
  display: 22,
  displayLg: 26,
  displayXl: 30,
  hero: 36,
  massive: 48,
};

export const lineHeight = {
  tight: 1.2,
  normal: 1.4,
  relaxed: 1.6,
};
