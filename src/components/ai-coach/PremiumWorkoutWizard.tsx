import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing, radius, fontSize } from '../../theme';
import {
  PREMIUM_TEXT,
  PREMIUM_MUTED,
  PREMIUM_ACCENT,
  PREMIUM_GLASS,
  PREMIUM_GLASS_BORDER,
  PREMIUM_BG,
} from '../premium/premiumEffects';
import type { FitnessLevel, FitnessGoal, Equipment } from '../../types/ai-coach.types';

const GOAL_OPTIONS: { key: FitnessGoal; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'weight_loss', label: 'Weight Loss', icon: 'flame-outline', color: '#FFB347' },
  { key: 'muscle_gain', label: 'Muscle Gain', icon: 'fitness-outline', color: PREMIUM_ACCENT },
  { key: 'strength', label: 'Strength', icon: 'barbell-outline', color: '#6699FF' },
  { key: 'endurance', label: 'Endurance', icon: 'heart-outline', color: '#FF6B9D' },
  { key: 'flexibility', label: 'Flexibility', icon: 'body-outline', color: '#B280FF' },
  { key: 'general_fitness', label: 'General Fitness', icon: 'walk-outline', color: '#60A5FA' },
];

const EQUIPMENT_OPTIONS: { key: Equipment | 'machine' | 'none'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'body-weight', label: 'Body Weight', icon: 'body-outline' },
  { key: 'dumbbells', label: 'Dumbbells', icon: 'barbell-outline' },
  { key: 'barbell', label: 'Barbell', icon: 'barbell' },
  { key: 'kettlebell', label: 'Kettlebell', icon: 'fitness-outline' },
  { key: 'bands', label: 'Resistance Bands', icon: 'resize-outline' },
  { key: 'machine', label: 'Machine', icon: 'hardware-chip-outline' },
  { key: 'none', label: 'None (Home)', icon: 'home-outline' },
];

const FOCUS_AREAS = ['Full Body', 'Upper Body', 'Lower Body', 'Core'] as const;
const DIFFICULTIES = ['Easy', 'Moderate', 'Hard'] as const;
const DAYS_OPTIONS = [3, 4, 5, 6];

const STEPS = ['Goal', 'Equipment', 'Preferences'] as const;

interface Props {
  fitnessLevel: FitnessLevel;
  goals: FitnessGoal[];
  duration: number;
  equipment: Equipment[];
  onChangeLevel: (v: FitnessLevel) => void;
  onToggleGoal: (v: FitnessGoal) => void;
  onSetPrimaryGoal: (g: FitnessGoal) => void;
  onChangeDuration: (v: number) => void;
  onToggleEquipment: (e: Equipment) => void;
  onSetEquipmentSingle: (e: Equipment) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export function PremiumWorkoutWizard(props: Props) {
  const [step, setStep] = useState(0);
  const [primaryGoal, setPrimaryGoal] = useState<FitnessGoal>(props.goals[0] ?? 'weight_loss');
  const [focusAreas, setFocusAreas] = useState<string[]>(['Full Body']);
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>('Moderate');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [injuries, setInjuries] = useState('');

  const selectGoal = (g: FitnessGoal) => {
    setPrimaryGoal(g);
    props.onSetPrimaryGoal(g);
  };

  const toggleFocus = (area: string) => {
    setFocusAreas(prev =>
      prev.includes(area) ? (prev.length > 1 ? prev.filter(a => a !== area) : prev) : [...prev, area],
    );
  };

  const pickEquipment = (key: Equipment | 'machine' | 'none') => {
    if (key === 'none' || key === 'body-weight') {
      props.onSetEquipmentSingle('body-weight');
      return;
    }
    if (key === 'machine') {
      props.onSetEquipmentSingle('dumbbells');
      return;
    }
    props.onSetEquipmentSingle(key);
  };

  const selectedEquipmentKey = (): Equipment | 'machine' | 'none' => {
    if (props.equipment.length === 0) return 'body-weight';
    if (props.equipment.includes('body-weight') && props.equipment.length === 1) return 'body-weight';
    const first = props.equipment[0];
    return first;
  };

  const applyDifficultyToLevel = () => {
    if (difficulty === 'Easy') props.onChangeLevel('beginner');
    else if (difficulty === 'Hard') props.onChangeLevel('advanced');
    else props.onChangeLevel('intermediate');
  };

  const canStep1 = Boolean(primaryGoal) && props.duration > 0;
  const canStep2 = props.equipment.length > 0;
  const canGenerate = canStep1 && canStep2;

  const next = () => {
    if (step === 1) applyDifficultyToLevel();
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const back = () => setStep(s => Math.max(0, s - 1));

  const handleGenerate = () => {
    applyDifficultyToLevel();
    props.onGenerate();
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.stepper}>
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <View key={label} style={styles.stepperItem}>
              <View
                style={[
                  styles.stepDot,
                  done && styles.stepDotDone,
                  active && styles.stepDotActive,
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={14} color={PREMIUM_BG} />
                ) : (
                  <Text style={[styles.stepNum, active && styles.stepNumActive]}>{i + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, (active || done) && styles.stepLabelActive]}>{label}</Text>
              {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step && styles.stepLineDone]} />}
            </View>
          );
        })}
      </View>

      {step === 0 && (
        <>
          <Text style={styles.sectionLabel}>Primary Goal</Text>
          <View style={styles.goalGrid}>
            {GOAL_OPTIONS.map(g => {
              const selected = primaryGoal === g.key;
              return (
                <TouchableOpacity
                  key={g.key}
                  onPress={() => selectGoal(g.key)}
                  activeOpacity={0.85}
                  style={[
                    styles.goalTile,
                    selected && { borderColor: PREMIUM_ACCENT, backgroundColor: PREMIUM_ACCENT + '12' },
                  ]}
                >
                  <Ionicons name={g.icon} size={22} color={selected ? g.color : PREMIUM_MUTED} />
                  <Text style={[styles.goalTileText, selected && { color: PREMIUM_TEXT }]}>{g.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Fitness Level</Text>
          <View style={styles.pillRow}>
            {(['beginner', 'intermediate', 'advanced'] as FitnessLevel[]).map(lvl => {
              const selected = props.fitnessLevel === lvl;
              const label = lvl.charAt(0).toUpperCase() + lvl.slice(1);
              return (
                <TouchableOpacity
                  key={lvl}
                  onPress={() => props.onChangeLevel(lvl)}
                  style={[styles.pill, selected && styles.pillActive]}
                >
                  <Text style={[styles.pillText, selected && styles.pillTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Workout Duration</Text>
          <View style={styles.pillRow}>
            {[15, 30, 45, 60].map(d => {
              const selected = props.duration === d;
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => props.onChangeDuration(d)}
                  style={[styles.pill, selected && styles.pillActive]}
                >
                  <Text style={[styles.pillText, selected && styles.pillTextActive]}>{d} min</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={next}
            disabled={!canStep1}
            activeOpacity={0.9}
            style={{ opacity: canStep1 ? 1 : 0.45 }}
          >
            <LinearGradient colors={[PREMIUM_ACCENT, '#28C07A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Next →</Text>
            </LinearGradient>
          </TouchableOpacity>
        </>
      )}

      {step === 1 && (
        <>
          <Text style={styles.sectionLabel}>Available Equipment</Text>
          <View style={styles.equipGrid}>
            {EQUIPMENT_OPTIONS.map(eq => {
              const selected = selectedEquipmentKey() === eq.key;
              return (
                <TouchableOpacity
                  key={eq.key}
                  onPress={() => pickEquipment(eq.key)}
                  activeOpacity={0.85}
                  style={[styles.equipTile, selected && styles.equipTileActive]}
                >
                  {selected && (
                    <View style={styles.equipCheck}>
                      <Ionicons name="checkmark-circle" size={18} color={PREMIUM_ACCENT} />
                    </View>
                  )}
                  <Ionicons name={eq.icon} size={24} color={selected ? PREMIUM_ACCENT : PREMIUM_MUTED} />
                  <Text style={[styles.equipLabel, selected && { color: PREMIUM_TEXT }]}>{eq.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.navRow}>
            <TouchableOpacity onPress={back} style={styles.backBtn}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={next} disabled={!canStep2} style={{ flex: 1, opacity: canStep2 ? 1 : 0.45 }}>
              <LinearGradient colors={[PREMIUM_ACCENT, '#28C07A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Next →</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}

      {step === 2 && (
        <>
          <Text style={styles.sectionLabel}>Focus Areas</Text>
          <View style={styles.goalGrid}>
            {FOCUS_AREAS.map(area => {
              const selected = focusAreas.includes(area);
              return (
                <TouchableOpacity
                  key={area}
                  onPress={() => toggleFocus(area)}
                  style={[styles.goalTile, selected && styles.equipTileActive]}
                >
                  {selected && (
                    <Ionicons name="checkmark-circle" size={16} color={PREMIUM_ACCENT} style={{ position: 'absolute', top: 8, right: 8 }} />
                  )}
                  <Text style={[styles.goalTileText, selected && { color: PREMIUM_TEXT }]}>{area}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Difficulty</Text>
          <View style={styles.pillRow}>
            {DIFFICULTIES.map(d => {
              const selected = difficulty === d;
              return (
                <TouchableOpacity key={d} onPress={() => setDifficulty(d)} style={[styles.pill, selected && styles.pillActive]}>
                  <Text style={[styles.pillText, selected && styles.pillTextActive]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Days per Week</Text>
          <View style={styles.pillRow}>
            {DAYS_OPTIONS.map(d => {
              const selected = daysPerWeek === d;
              return (
                <TouchableOpacity key={d} onPress={() => setDaysPerWeek(d)} style={[styles.pill, selected && styles.pillActive]}>
                  <Text style={[styles.pillText, selected && styles.pillTextActive]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>Any injuries or limitations?</Text>
          <TextInput
            value={injuries}
            onChangeText={setInjuries}
            placeholder="e.g. knee pain, lower back…"
            placeholderTextColor={PREMIUM_MUTED}
            style={styles.injuryInput}
            multiline
          />

          <View style={styles.navRow}>
            <TouchableOpacity onPress={back} style={styles.backBtn}>
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleGenerate}
              disabled={!canGenerate || props.isLoading}
              style={{ flex: 1, opacity: !canGenerate || props.isLoading ? 0.5 : 1 }}
            >
              <LinearGradient colors={[PREMIUM_ACCENT, '#28C07A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryBtn}>
                <Ionicons name="sparkles-outline" size={20} color={PREMIUM_BG} />
                <Text style={styles.primaryBtnText}>{props.isLoading ? 'Generating…' : 'Generate Workout'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.huge + 48 },

  stepper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  stepperItem: { flex: 1, alignItems: 'center', position: 'relative' },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { borderColor: PREMIUM_ACCENT, backgroundColor: PREMIUM_ACCENT + '22' },
  stepDotDone: { backgroundColor: PREMIUM_ACCENT, borderColor: PREMIUM_ACCENT },
  stepNum: { fontSize: 12, fontWeight: '800', color: PREMIUM_MUTED },
  stepNumActive: { color: PREMIUM_ACCENT },
  stepLabel: { fontSize: 10, fontWeight: '600', color: PREMIUM_MUTED, marginTop: 6, textAlign: 'center' },
  stepLabelActive: { color: PREMIUM_ACCENT, fontWeight: '800' },
  stepLine: {
    position: 'absolute',
    top: 14,
    left: '55%',
    width: '90%',
    height: 2,
    backgroundColor: PREMIUM_GLASS_BORDER,
    zIndex: -1,
  },
  stepLineDone: { backgroundColor: PREMIUM_ACCENT },

  sectionLabel: { fontSize: fontSize.sm, fontWeight: '800', color: PREMIUM_TEXT, marginBottom: spacing.sm, marginTop: spacing.md },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  goalTile: {
    width: '47%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    alignItems: 'center',
    gap: 6,
  },
  goalTileText: { fontSize: fontSize.xs, fontWeight: '700', color: PREMIUM_MUTED, textAlign: 'center' },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
  },
  pillActive: { borderColor: PREMIUM_ACCENT, backgroundColor: PREMIUM_ACCENT + '18' },
  pillText: { fontSize: fontSize.sm, fontWeight: '600', color: PREMIUM_MUTED },
  pillTextActive: { color: PREMIUM_ACCENT, fontWeight: '800' },

  equipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  equipTile: {
    width: '47%',
    minHeight: 88,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  equipTileActive: { borderColor: PREMIUM_ACCENT, backgroundColor: PREMIUM_ACCENT + '10' },
  equipCheck: { position: 'absolute', top: 8, right: 8 },
  equipLabel: { fontSize: fontSize.xs, fontWeight: '700', color: PREMIUM_MUTED, textAlign: 'center' },

  injuryInput: {
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 72,
    color: PREMIUM_TEXT,
    fontSize: fontSize.sm,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as object : {}),
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg + 2,
    marginTop: spacing.xl,
  },
  primaryBtnText: { color: PREMIUM_BG, fontSize: fontSize.lg, fontWeight: '800' },

  navRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'stretch', marginTop: spacing.md },
  backBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg + 2,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    justifyContent: 'center',
  },
  backBtnText: { color: PREMIUM_MUTED, fontWeight: '700', fontSize: fontSize.base },
});
