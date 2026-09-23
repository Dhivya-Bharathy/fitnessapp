import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { supabase } from '../../services/supabase';

const PURPLE = '#B280FF';
const PINK   = '#FF6B9D';
const GREEN  = '#2DDC8C';

interface Measurement {
  id?: string; measured_at: string;
  chest_cm?: number; waist_cm?: number; hips_cm?: number;
  arms_cm?: number; thighs_cm?: number; neck_cm?: number;
  body_fat_pct?: number; notes?: string;
}

const FIELDS: Array<{ key: keyof Measurement; label: string; icon: string; color: string }> = [
  { key: 'chest_cm',    label: 'Chest',       icon: 'body-outline',         color: PINK   },
  { key: 'waist_cm',    label: 'Waist',        icon: 'resize-outline',       color: PURPLE },
  { key: 'hips_cm',     label: 'Hips',         icon: 'body-outline',         color: '#FF8C42' },
  { key: 'arms_cm',     label: 'Arms (bicep)', icon: 'barbell-outline',      color: '#6699FF' },
  { key: 'thighs_cm',   label: 'Thighs',       icon: 'walk-outline',         color: '#2DDC8C' },
  { key: 'neck_cm',     label: 'Neck',         icon: 'person-outline',       color: '#FFD133' },
  { key: 'body_fat_pct',label: 'Body Fat %',   icon: 'pie-chart-outline',    color: '#FF5959' },
];

export default function BodyMeasurementsScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const { user } = useAuthStore();
  const theme = colors[colorScheme];

  const [history, setHistory]   = useState<Measurement[]>([]);
  const [form, setForm]         = useState<Partial<Measurement>>({});
  const [notes, setNotes]       = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(useCallback(() => { load(); }, [user?.id]));

  const load = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    const { data } = await supabase
      .from('body_measurements')
      .select('id,user_id,chest_cm,waist_cm,hips_cm,arms_cm,thighs_cm,neck_cm,measured_at')
      .eq('user_id', user.id)
      .order('measured_at', { ascending: false })
      .limit(10);
    setHistory((data ?? []) as Measurement[]);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    const hasAnyValue = FIELDS.some(f => form[f.key] != null && form[f.key] !== '');
    if (!hasAnyValue) {
      Alert.alert('Nothing to save', 'Enter at least one measurement before saving.');
      return;
    }
    setIsSaving(true);
    try {
      const payload: any = {
        user_id: user.id,
        measured_at: new Date().toISOString(),
        notes: notes.trim() || null,
      };
      FIELDS.forEach(f => {
        const v = form[f.key];
        if (v != null && v !== '') payload[f.key] = parseFloat(String(v));
      });
      const { error } = await supabase.from('body_measurements').insert(payload);
      if (error) throw error;
      setForm({});
      setNotes('');
      await load();
      Alert.alert('Saved! 📏', 'Your measurements have been logged.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const latest = history[0];
  const prev   = history[1];

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>
      <LinearGradient
        colors={[PURPLE + 'DD', PINK + 'CC'] as [string, string]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Body Measurements</Text>
          <Text style={styles.headerSub}>Track your body composition</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── LOG NEW ── */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Log Today's Measurements</Text>
            <Text style={[styles.sectionSub, { color: theme.textMuted }]}>All fields in cm unless noted</Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {FIELDS.map((f) => (
              <View key={f.key} style={[styles.fieldRow, { borderBottomColor: theme.border }]}>
                <View style={[styles.fieldIcon, { backgroundColor: f.color + '18' }]}>
                  <Ionicons name={f.icon as any} size={16} color={f.color} />
                </View>
                <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>{f.label}</Text>
                <TextInput
                  value={form[f.key] != null ? String(form[f.key]) : ''}
                  onChangeText={(v) => setForm(p => ({ ...p, [f.key]: v }))}
                  placeholder="—"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="decimal-pad"
                  style={[styles.fieldInput, { color: theme.textPrimary, borderColor: theme.border }]}
                />
              </View>
            ))}

            <View style={styles.notesWrap}>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes (optional)…"
                placeholderTextColor={theme.textMuted}
                multiline
                style={[styles.notesInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.bg }]}
              />
            </View>
          </View>

          <TouchableOpacity onPress={handleSave} disabled={isSaving} style={[styles.saveBtn, { opacity: isSaving ? 0.7 : 1 }]}>
            <LinearGradient
              colors={[PURPLE, PINK] as [string, string]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.saveGrad}
            >
              {isSaving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Ionicons name="save-outline" size={18} color="#fff" />}
              <Text style={styles.saveBtnText}>{isSaving ? 'Saving…' : 'Save Measurements'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* ── HISTORY ── */}
          {history.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Measurement History</Text>
              </View>

              {/* Latest vs previous comparison */}
              {latest && prev && (
                <View style={[styles.compCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.compTitle, { color: theme.textPrimary }]}>Latest vs Previous</Text>
                  <View style={styles.compRow}>
                    {FIELDS.filter(f => latest[f.key] != null).map(f => {
                      const curr = latest[f.key] as number;
                      const prevVal = prev[f.key] as number | undefined;
                      const diff = prevVal != null ? curr - prevVal : null;
                      return (
                        <View key={f.key} style={[styles.compItem, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                          <Text style={[styles.compLabel, { color: theme.textMuted }]}>{f.label}</Text>
                          <Text style={[styles.compValue, { color: theme.textPrimary }]}>{curr}cm</Text>
                          {diff !== null && diff !== 0 && (
                            <Text style={[styles.compDiff, { color: diff < 0 ? GREEN : '#FF5959' }]}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* History list */}
              {history.map((m) => (
                <View key={m.measured_at} style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.historyDate, { color: theme.accent }]}>
                    {new Date(m.measured_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                  <View style={styles.historyGrid}>
                    {FIELDS.filter(f => m[f.key] != null).map(f => (
                      <View key={f.key} style={styles.historyItem}>
                        <Text style={[styles.historyItemLabel, { color: theme.textMuted }]}>{f.label}</Text>
                        <Text style={[styles.historyItemValue, { color: f.color }]}>{m[f.key]}{f.key === 'body_fat_pct' ? '%' : 'cm'}</Text>
                      </View>
                    ))}
                  </View>
                  {m.notes && <Text style={[styles.historyNotes, { color: theme.textMuted }]}>{m.notes}</Text>}
                </View>
              ))}
            </>
          )}

          {/* SQL hint for first time */}
          {!isLoading && history.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="body-outline" size={40} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No measurements yet</Text>
              <Text style={[styles.emptySub, { color: theme.textMuted }]}>
                Log your first measurements above to start tracking your body composition over time.
              </Text>
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1 },
  scroll:        { paddingBottom: 40 },
  header:        { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 4 },
  backBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: fontSize.xl, fontWeight: '800', color: '#fff' },
  headerSub:     { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  sectionHeader: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionTitle:  { fontSize: fontSize.base, fontWeight: '700' },
  sectionSub:    { fontSize: fontSize.xs, marginTop: 2 },
  formCard:      { marginHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  fieldRow:      { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  fieldIcon:     { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  fieldLabel:    { flex: 1, fontSize: fontSize.sm, fontWeight: '600' },
  fieldInput:    { width: 80, textAlign: 'right', fontSize: fontSize.base, fontWeight: '700', borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  notesWrap:     { padding: spacing.md },
  notesInput:    { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.sm, minHeight: 60 },
  saveBtn:       { marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.lg, overflow: 'hidden' },
  saveGrad:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md + 2 },
  saveBtnText:   { color: '#fff', fontSize: fontSize.base, fontWeight: '800' },
  compCard:      { marginHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  compTitle:     { fontSize: fontSize.sm, fontWeight: '700' },
  compRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  compItem:      { padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', minWidth: 72 },
  compLabel:     { fontSize: 9, fontWeight: '600' },
  compValue:     { fontSize: fontSize.sm, fontWeight: '800', marginTop: 1 },
  compDiff:      { fontSize: 10, fontWeight: '700', marginTop: 1 },
  historyCard:   { marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  historyDate:   { fontSize: fontSize.sm, fontWeight: '700', marginBottom: spacing.sm },
  historyGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  historyItem:   { alignItems: 'center', minWidth: 64 },
  historyItemLabel: { fontSize: 9, fontWeight: '600' },
  historyItemValue: { fontSize: fontSize.sm, fontWeight: '800', marginTop: 1 },
  historyNotes:  { fontSize: fontSize.xs, marginTop: spacing.sm, fontStyle: 'italic' },
  emptyCard:     { marginHorizontal: spacing.lg, padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', gap: spacing.md },
  emptyTitle:    { fontSize: fontSize.lg, fontWeight: '700' },
  emptySub:      { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
});