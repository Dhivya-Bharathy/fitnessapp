import { Platform, ViewStyle } from 'react-native';

export const WELLNESS_PASTEL_GRADIENT = ['#F9F7FF', '#EEF9F4', '#F5F3FA'] as const;
export const WELLNESS_GREEN = '#34C759';
export const WELLNESS_MINT = '#2DDC8C';

export function isWellnessLight(colorScheme: 'light' | 'dark'): boolean {
  return colorScheme === 'light';
}

export function glassSurface(tint = 'rgba(255,255,255,0.72)'): ViewStyle {
  return {
    backgroundColor: tint,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.88)',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 8px 32px rgba(15, 23, 42, 0.08)' as any }
      : {
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 4,
        }),
  };
}

export function softCardShadow(): ViewStyle {
  return Platform.OS === 'web'
    ? ({ boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06)' } as ViewStyle)
    : {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      };
}
