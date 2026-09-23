import { Platform } from 'react-native';

// ── Glass-aware shadows ───────────────────────────────────────
// On dark mode, shadows are coloured (green tint) not pure black
// This is what gives Apple UI its "glow" feel on dark backgrounds
export const shadow = {
  card: Platform.select({
    ios: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius:  8,
    },
    android: { elevation: 4 },
    web: { boxShadow: '0 2px 8px rgba(0,0,0,0.25)' },
  }),

  modal: Platform.select({
    ios: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius:  20,
    },
    android: { elevation: 12 },
    web: { boxShadow: '0 8px 20px rgba(0,0,0,0.35)' },
  }),

  accent: Platform.select({
    ios: {
      shadowColor:   '#2DDC8C',
      shadowOffset:  { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius:  12,
    },
    android: { elevation: 6 },
    web: { boxShadow: '0 4px 12px rgba(45,220,140,0.30)' },
  }),

  subtle: Platform.select({
    ios: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius:  4,
    },
    android: { elevation: 2 },
    web: { boxShadow: '0 1px 4px rgba(0,0,0,0.15)' },
  }),
};


export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  massive: 64,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  full: 9999,
};