import { Platform, type ViewStyle } from 'react-native';

export const PREMIUM_BG = '#050608';
export const PREMIUM_GLASS = 'rgba(255,255,255,0.05)';
export const PREMIUM_GLASS_BORDER = 'rgba(255,255,255,0.09)';
export const PREMIUM_TEXT = '#FFFFFF';
export const PREMIUM_MUTED = 'rgba(255,255,255,0.55)';
export const PREMIUM_ACCENT = '#2DDC8C';

/** Soft card depth — avoid heavy neon shadows. */
export function premiumGlassShadow(): ViewStyle {
  return Platform.select({
    web: { boxShadow: '0 4px 16px rgba(0,0,0,0.22)' } as ViewStyle,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 10,
      elevation: 3,
    },
  }) as ViewStyle;
}

/** Very subtle accent hint (optional). */
export function premiumGlowCyan(): ViewStyle {
  return Platform.select({
    web: { boxShadow: '0 0 10px rgba(45,220,140,0.12)' } as ViewStyle,
    default: {
      shadowColor: '#2DDC8C',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 2,
    },
  }) as ViewStyle;
}

export function premiumPurplePillShadow(): ViewStyle {
  return Platform.select({
    web: { boxShadow: '0 0 8px rgba(178,128,255,0.15)' } as ViewStyle,
    default: {
      shadowColor: '#B280FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 1,
    },
  }) as ViewStyle;
}
