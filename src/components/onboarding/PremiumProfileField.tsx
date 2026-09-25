import { View, Text, StyleSheet, TextInput, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fontSize, spacing } from '../../theme';

const ACCENT = '#2DDC8C';
const BORDER = 'rgba(45,220,140,0.45)';

type Props = {
  label: string;
  icon: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  prefix?: string;
  autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters';
  sanitize?: (text: string) => string;
};

export function PremiumProfileField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  prefix,
  autoCapitalize = 'none',
  sanitize,
}: Props) {
  const handleChange = (text: string) => {
    onChangeText(sanitize ? sanitize(text) : text);
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.field, value.trim() ? styles.fieldActive : null]}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon as never} size={20} color="rgba(255,255,255,0.55)" />
        </View>
        <View style={styles.inputCol}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.valueRow}>
            {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
            <TextInput
              value={value}
              onChangeText={handleChange}
              placeholder={placeholder}
              placeholderTextColor="rgba(255,255,255,0.28)"
              autoCapitalize={autoCapitalize}
              autoCorrect={false}
              style={styles.input}
            />
          </View>
        </View>
        {value.length > 0 ? (
          <Pressable
            onPress={() => onChangeText('')}
            hitSlop={8}
            style={styles.clearBtn}
            accessibilityLabel={`Clear ${label}`}
          >
            <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.35)" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: 'rgba(255,255,255,0.04)',
    ...Platform.select({
      web: { boxShadow: '0 0 20px rgba(45,220,140,0.06)' as unknown as number },
      default: {},
    }),
  },
  fieldActive: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(45,220,140,0.06)',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  inputCol: { flex: 1, minWidth: 0 },
  label: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: 'rgba(255,255,255,0.42)',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  valueRow: { flexDirection: 'row', alignItems: 'center' },
  prefix: {
    color: '#fff',
    fontSize: fontSize.base,
    fontWeight: '700',
    marginRight: 1,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: fontSize.base,
    fontWeight: '700',
    paddingVertical: 0,
    minHeight: 22,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as const } : {}),
  },
  clearBtn: { padding: 2 },
});
