import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../../theme';

interface Props {
  theme: typeof colors.dark;
  icon: string;
  title: string;
  subtitle: string;
  buttonLabel?: string;
  onButtonPress?: () => void;
}

export function EmptyState({
  theme,
  icon,
  title,
  subtitle,
  buttonLabel,
  onButtonPress,
}: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={52} color={theme.textMuted} />
      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
      {buttonLabel && onButtonPress && (
        <TouchableOpacity
          onPress={onButtonPress}
          style={[styles.btn, { backgroundColor: theme.accent }]}
        >
          <Text style={[styles.btnText, { color: theme.bg }]}>{buttonLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
  },
  title: { fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontSize: fontSize.base, textAlign: 'center', lineHeight: 20 },
  btn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  btnText: { fontSize: fontSize.base, fontWeight: '700' },
});