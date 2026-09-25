import { ReactNode } from 'react';
import { View, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { radius } from '../../theme';
import { glassSurface } from './wellnessTheme';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  borderRadius?: number;
  tint?: string;
  activeOpacity?: number;
}

export function GlassCard({
  children,
  style,
  onPress,
  borderRadius = radius.lg,
  tint,
  activeOpacity = 0.88,
}: Props) {
  const shell = (
    <View style={[glassSurface(tint), { borderRadius }, style]}>{children}</View>
  );
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={activeOpacity}>
        {shell}
      </TouchableOpacity>
    );
  }
  return shell;
}
