import { ViewStyle } from 'react-native';
import { ThemeColors } from './colors';
import { radius, shadow } from './spacing';

/** Shared GymApp-style card chrome (visual only). */
export function gymCard(theme: ThemeColors, extra?: ViewStyle): ViewStyle {
  return {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: radius.xl,
    ...shadow.card,
    ...extra,
  };
}

/** Chip / category pill on dark surfaces */
export function gymChip(theme: ThemeColors, tint?: string): ViewStyle {
  const c = tint ?? theme.accent;
  return {
    backgroundColor: `${c}18`,
    borderColor: `${c}44`,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  };
}
