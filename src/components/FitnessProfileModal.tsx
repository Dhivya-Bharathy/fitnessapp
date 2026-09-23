import { Modal, View, Text, TouchableOpacity, ScrollView, TextInput, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { colors, spacing, radius, fontSize } from '../theme';
import { useThemeStore } from '../store/themeStore';
import { useAiCoachStore } from '../store/aiCoachStore';
import type { FitnessLevel, FitnessGoal, Equipment } from '../types/ai-coach.types';

const LEVELS: { key: FitnessLevel; label: string }[] = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
];

const GOALS: { key: FitnessGoal; label: string }[] = [
  { key: 'strength', label: 'Strength' },
  { key: 'endurance', label: 'Endurance' },
  { key: 'flexibility', label: 'Flexibility' },
  { key: 'weight_loss', label: 'Weight Loss' },
  { key: 'muscle_gain', label: 'Muscle Gain' },
  { key: 'general_fitness', label: 'General' },
];

const EQUIPMENT: { key: Equipment; label: string }[] = [
  { key: 'body-weight', label: 'Body' },
  { key: 'dumbbells', label: 'Dumbbells' },
  { key: 'barbell', label: 'Barbell' },
  { key: 'kettlebell', label: 'Kettlebell' },
  { key: 'bands', label: 'Bands' },
  { key: 'machine', label: 'Machine' },
];

const DURATIONS = [15, 30, 45, 60];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function FitnessProfileModal({ visible, onClose }: Props) {
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];
  const { userProfile, updateUserProfile } = useAiCoachStore();

  const [level, setLevel] = useState<FitnessLevel>(userProfile?.fitness_level ?? 'beginner');
  const [goals, setGoals] = useState<FitnessGoal[]>(userProfile?.goals ?? []);
  const [equipment, setEquipment] = useState<Equipment[]>(userProfile?.preferred_equipment ?? []);
  const [duration, setDuration] = useState(userProfile?.preferred_duration ?? 30);
  const [bio, setBio] = useState(userProfile?.bio ?? '');

  const toggleGoal = (g: FitnessGoal) => {
    setGoals((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  };

  const toggleEquipment = (e: Equipment) => {
    setEquipment((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);
  };

  const handleSave = () => {
    updateUserProfile({
      fitness_level: level,
      goals,
      preferred_equipment: equipment,
      preferred_duration: duration,
      bio: bio.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />

          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              Your Profile
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.desc, { color: theme.textMuted }]}>
              Help the AI understand you better for personalized responses.
            </Text>

            {/* LEVEL */}
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Fitness Level</Text>
            <View style={styles.chipRow}>
              {LEVELS.map((l) => {
                const selected = level === l.key;
                return (
                  <TouchableOpacity
                    key={l.key}
                    onPress={() => setLevel(l.key)}
                    style={[styles.chip, {
                      backgroundColor: selected ? theme.accent : theme.card,
                      borderColor: selected ? theme.accent : theme.border,
                    }]}
                  >
                    <Text style={[styles.chipText, {
                      color: selected ? '#fff' : theme.textSecondary,
                      fontWeight: selected ? '700' : '500',
                    }]}>{l.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* GOALS */}
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Goals</Text>
            <View style={styles.chipRow}>
              {GOALS.map((g) => {
                const selected = goals.includes(g.key);
                return (
                  <TouchableOpacity
                    key={g.key}
                    onPress={() => toggleGoal(g.key)}
                    style={[styles.chip, {
                      backgroundColor: selected ? theme.accent : theme.card,
                      borderColor: selected ? theme.accent : theme.border,
                    }]}
                  >
                    <Text style={[styles.chipText, {
                      color: selected ? '#fff' : theme.textSecondary,
                      fontWeight: selected ? '700' : '500',
                    }]}>{g.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* EQUIPMENT */}
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Available Equipment</Text>
            <View style={styles.chipRow}>
              {EQUIPMENT.map((e) => {
                const selected = equipment.includes(e.key);
                return (
                  <TouchableOpacity
                    key={e.key}
                    onPress={() => toggleEquipment(e.key)}
                    style={[styles.chip, {
                      backgroundColor: selected ? theme.accent : theme.card,
                      borderColor: selected ? theme.accent : theme.border,
                    }]}
                  >
                    <Text style={[styles.chipText, {
                      color: selected ? '#fff' : theme.textSecondary,
                      fontWeight: selected ? '700' : '500',
                    }]}>{e.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* DURATION */}
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Preferred Workout Duration</Text>
            <View style={styles.chipRow}>
              {DURATIONS.map((d) => {
                const selected = duration === d;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDuration(d)}
                    style={[styles.chip, {
                      backgroundColor: selected ? theme.accent : theme.card,
                      borderColor: selected ? theme.accent : theme.border,
                    }]}
                  >
                    <Text style={[styles.chipText, {
                      color: selected ? '#fff' : theme.textSecondary,
                      fontWeight: selected ? '700' : '500',
                    }]}>{d} min</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* BIO */}
            <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>About You</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell the AI about your fitness background, injuries, preferences..."
              placeholderTextColor={theme.textMuted}
              multiline
              style={[styles.bioInput, {
                color: theme.textPrimary,
                backgroundColor: theme.card,
                borderColor: theme.border,
              }]}
            />

            {/* SAVE */}
            <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: theme.accent }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save Profile</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl, paddingTop: spacing.md, maxHeight: '85%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xxl, paddingBottom: spacing.md },
  title: { fontSize: fontSize.xxl, fontWeight: '700' },
  body: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xxxl },
  desc: { fontSize: fontSize.sm, lineHeight: 18, marginBottom: spacing.lg },
  fieldLabel: { fontSize: fontSize.base, fontWeight: '700', marginBottom: spacing.sm, marginTop: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1 },
  chipText: { fontSize: fontSize.sm },
  bioInput: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, minHeight: 80, fontSize: fontSize.sm, lineHeight: 20, textAlignVertical: 'top', marginTop: spacing.xs },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: radius.lg, marginTop: spacing.xxl, marginBottom: spacing.xl, ...Platform.select({ ios: { shadowColor: '#2DDC8C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 }, android: { elevation: 6 }, web: { boxShadow: '0 4px 12px rgba(45,220,140,0.35)' } }) },
  saveBtnText: { color: '#fff', fontSize: fontSize.xl, fontWeight: '700' },
});
