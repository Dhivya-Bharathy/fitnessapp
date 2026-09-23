import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fontSize, radius } from '../../theme';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export function PrimaryCTA({ label, onPress, disabled, style }: Props) {
  return (
    <Pressable
      onPress={() => !disabled && onPress()}
      style={[styles.wrap, style, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
    >
      <LinearGradient
        colors={disabled ? ['#8a8a8a', '#6a6a6a'] : ['#2DDC8C', '#0DAE6C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.btn}
      >
        <Text style={styles.text}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.xl, overflow: 'hidden' },
  disabled: { opacity: 0.85 },
  btn: { paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center', minHeight: 52, justifyContent: 'center' },
  text: { color: '#fff', fontSize: fontSize.lg, fontWeight: '800' },
});
