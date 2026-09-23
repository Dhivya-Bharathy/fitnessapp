import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { supabase } from '../../services/supabase';

const PURPLE = '#B280FF';
const ORANGE = '#FFB347';

// ── EQUIPMENT OPTIONS ─────────────────────────────────────────
// 'none' = bodyweight only. When selected, all others are cleared.
// Equipment IDs must match the filter values used in useExercise hook.
const EQUIPMENT_OPTIONS = [
  { id: 'none',              label: 'No Equipment',      subtitle: 'Bodyweight exercises only', emoji: '🧘' },
  { id: 'dumbbells',         label: 'Dumbbells',          subtitle: 'Free weights',              emoji: '🏋️' },
  { id: 'barbell',           label: 'Barbell',            subtitle: 'Olympic bar + plates',      emoji: '🔩' },
  { id: 'resistance_bands',  label: 'Resistance Bands',   subtitle: 'Light to heavy bands',      emoji: '🎗️' },
  { id: 'pull_up_bar',       label: 'Pull-Up Bar',        subtitle: 'Door frame or wall mounted',emoji: '🚪' },
  { id: 'bench',             label: 'Bench / Box',        subtitle: 'Flat bench or plyo box',    emoji: '📦' },
  { id: 'kettlebell',        label: 'Kettlebell',         subtitle: 'Single or double',          emoji: '🫙' },
  { id: 'gym_machines',      label: 'Gym Machines',       subtitle: 'Cable, press, row machines',emoji: '🏢' },
  { id: 'jump_rope',         label: 'Jump Rope',          subtitle: 'Speed or weighted rope',    emoji: '🪢' },
  { id: 'yoga_mat',          label: 'Yoga / Exercise Mat',subtitle: 'For floor work',            emoji: '🟩' },
];

// ── ITEM ──────────────────────────────────────────────────────
function EquipmentItem({
  item, selected, theme, onToggle,
}: {
  item: typeof EQUIPMENT_OPTIONS[0];
  selected: boolean;
  theme: typeof colors.light;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.8}
      style={[
        ei.card,
        {
          backgroundColor: selected ? theme.accent + '18' : theme.card,
          borderColor:     selected ? theme.accent : theme.border,
        },
      ]}
    >
      <Text style={ei.emoji}>{item.emoji}</Text>
      <View style={ei.text}>
        <Text style={[ei.label, { color: theme.textPrimary }]}>{item.label}</Text>
        <Text style={[ei.sub, { color: theme.textMuted }]}>{item.subtitle}</Text>
      </View>
      <View style={[
        ei.check,
        {
          backgroundColor: selected ? theme.accent : 'transparent',
          borderColor:     selected ? theme.accent : theme.border,
        },
      ]}>
        {selected && <Ionicons name="checkmark" size={14} color={theme.bg} />}
      </View>
    </TouchableOpacity>
  );
}

const ei = StyleSheet.create({
  card:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, marginBottom: spacing.sm },
  emoji: { fontSize: 28, width: 36, textAlign: 'center' },
  text:  { flex: 1, gap: 2 },
  label: { fontSize: fontSize.base, fontWeight: '700' },
  sub:   { fontSize: fontSize.xs },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});

// ── MAIN SCREEN ───────────────────────────────────────────────
export default function EquipmentPreferencesScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const { user, updateProfile } = useAuthStore();
  const theme = colors[colorScheme];

  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);

  // Load existing preferences from DB
  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('equipment_preferences')
        .eq('id', user.id)
        .single();

      if (data?.equipment_preferences?.length) {
        setSelected(data.equipment_preferences);
      } else {
        setSelected(['none']); // default to bodyweight
      }
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const toggle = (id: string) => {
    if (id === 'none') {
      // Selecting "no equipment" clears all others
      setSelected(['none']);
      return;
    }
    setSelected(prev => {
      const withoutNone = prev.filter(e => e !== 'none');
      if (withoutNone.includes(id)) {
        const next = withoutNone.filter(e => e !== id);
        return next.length === 0 ? ['none'] : next;
      }
      return [...withoutNone, id];
    });
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ equipment_preferences: selected })
      .eq('id', user.id);

    setSaving(false);

    if (error) {
      Alert.alert('Error', 'Could not save preferences. Please try again.');
      return;
    }

    // Update Zustand so the exercise filter reacts immediately
    updateProfile({ equipment_preferences: selected } as any);
    Alert.alert('Saved ✓', 'Your exercise library will now be filtered to your equipment.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const selectedCount = selected.filter(e => e !== 'none').length;

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>
      {/* Header */}
      <LinearGradient
        colors={[PURPLE, '#6699FF'] as [string, string]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Equipment</Text>
          <Text style={styles.headerSub}>Filter your exercise library</Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={styles.saveBtn}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: spacing.xl * 2 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Context card */}
          <View style={[styles.contextCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="filter-outline" size={20} color={theme.accent} />
            <Text style={[styles.contextText, { color: theme.textSecondary }]}>
              {selectedCount === 0
                ? 'All bodyweight exercises will be shown in your workout library.'
                : `Exercises using ${selected.filter(e => e !== 'none').join(', ')} will be shown. You can always change this.`}
            </Text>
          </View>

          {/* Equipment list */}
          {EQUIPMENT_OPTIONS.map(item => (
            <EquipmentItem
              key={item.id}
              item={item}
              selected={selected.includes(item.id)}
              theme={theme}
              onToggle={() => toggle(item.id)}
            />
          ))}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 4 },
  backBtn:      { width: 40 },
  headerTitle:  { color: '#fff', fontSize: fontSize.lg, fontWeight: '900' },
  headerSub:    { color: '#ffffffCC', fontSize: fontSize.xs, marginTop: 2 },
  saveBtn:      { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, minWidth: 60, alignItems: 'center' },
  saveBtnText:  { color: '#fff', fontSize: fontSize.base, fontWeight: '800' },
  scroll:       { padding: spacing.lg },
  contextCard:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.lg },
  contextText:  { flex: 1, fontSize: fontSize.sm, lineHeight: 20 },
});