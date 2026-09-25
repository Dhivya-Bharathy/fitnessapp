import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, fontSize } from '../../theme';
import { ScreenScrollView } from '../../components/ScreenScrollView';
import { PremiumAtmosphereBackground } from '../../components/premium/PremiumAtmosphereBackground';
import {
  PREMIUM_BG,
  PREMIUM_TEXT,
  PREMIUM_MUTED,
  PREMIUM_ACCENT,
  PREMIUM_GLASS,
  PREMIUM_GLASS_BORDER,
  premiumGlassShadow,
} from '../../components/premium/premiumEffects';

const ORANGE = '#FFB347';
const BLUE = '#6699FF';
const GREEN = '#2DDC8C';
const PURPLE = '#B280FF';

function ConfettiCircles() {
  const colors_arr = ['#FF6B35', '#FFB830', '#2DDC8C', '#4A90E2', '#F0427C', '#9B6FE8'];
  return (
    <Svg width={300} height={300} viewBox="0 0 300 300" style={styles.confettiSvg}>
      {Array.from({ length: 30 }).map((_, i) => {
        const cx = 30 + Math.random() * 240;
        const cy = 30 + Math.random() * 240;
        const r = 3 + Math.random() * 6;
        const color = colors_arr[i % colors_arr.length];
        return (
          <Circle key={i} cx={cx} cy={cy} r={r} fill={color} opacity={0.8 + Math.random() * 0.2} />
        );
      })}
    </Svg>
  );
}

type GoalConfig = {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  formatDisplay: (n: number) => string;
  parse: (s: string) => number;
  stringify: (n: number) => string;
};

function GoalCard({
  config,
  valueStr,
  onChange,
}: {
  config: GoalConfig;
  valueStr: string;
  onChange: (next: string) => void;
}) {
  const num = config.parse(valueStr) || 0;
  const clamp = (n: number) => Math.min(config.max, Math.max(config.min, n));
  const progress = (clamp(num) - config.min) / (config.max - config.min);

  const bump = (delta: number) => {
    const next = clamp(num + delta);
    onChange(config.stringify(next));
  };

  return (
    <View style={[styles.goalCard, premiumGlassShadow(), { borderColor: PREMIUM_GLASS_BORDER, backgroundColor: PREMIUM_GLASS }]}>
      <Ionicons
        name={config.icon}
        size={88}
        color={config.color}
        style={styles.watermarkIcon}
      />
      <View style={styles.goalTop}>
        <View style={[styles.goalIconWrap, { backgroundColor: config.color + '22' }]}>
          <Ionicons name={config.icon} size={22} color={config.color} />
        </View>
        <View style={styles.goalTitles}>
          <Text style={styles.goalLabel}>{config.label}</Text>
          <Text style={styles.goalSubtitle}>{config.subtitle}</Text>
        </View>
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.valueText, { color: config.color }]}>{config.formatDisplay(num)}</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            onPress={() => bump(-config.step)}
            style={[styles.stepBtn, { borderColor: PREMIUM_GLASS_BORDER }]}
            accessibilityLabel={`Decrease ${config.label}`}
          >
            <Ionicons name="remove" size={20} color={config.color} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => bump(config.step)}
            style={[styles.stepBtn, { borderColor: PREMIUM_GLASS_BORDER }]}
            accessibilityLabel={`Increase ${config.label}`}
          >
            <Ionicons name="add" size={20} color={config.color} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: config.color }]} />
      </View>
      <Text style={styles.hint}>{config.hint}</Text>
    </View>
  );
}

export default function GoalsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, profile, updateProfile } = useAuthStore();

  const [calories, setCalories] = useState(
    profile?.daily_calorie_goal?.toString() ?? '2000',
  );
  const [water, setWater] = useState(
    profile?.water_goal_ml
      ? (profile.water_goal_ml / 1000).toString()
      : '2.5',
  );
  const [steps, setSteps] = useState(profile?.step_goal?.toString() ?? '10000');
  const [sleep, setSleep] = useState(profile?.sleep_goal_hrs?.toString() ?? '8');
  const [isSaving, setIsSaving] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);

  const isFirstTime = !profile?.daily_calorie_goal;

  const navigateBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Settings');
  };

  const goalConfigs: (GoalConfig & { value: string; setValue: (s: string) => void })[] = [
    {
      label: 'Daily Calorie Goal',
      subtitle: 'Energy and nutrition',
      icon: 'flame-outline',
      color: ORANGE,
      hint: 'Recommended: 1,800–2,500 kcal based on your activity level',
      min: 1000,
      max: 5000,
      step: 100,
      value: calories,
      setValue: setCalories,
      formatDisplay: (n) => `${Math.round(n).toLocaleString()} kcal`,
      parse: (s) => parseInt(s, 10) || 0,
      stringify: (n) => String(Math.round(n)),
    },
    {
      label: 'Daily Water Goal',
      subtitle: 'Stay hydrated',
      icon: 'water-outline',
      color: BLUE,
      hint: 'Recommended: 2–3 litres per day',
      min: 1,
      max: 5,
      step: 0.1,
      value: water,
      setValue: setWater,
      formatDisplay: (n) => `${(Math.round(n * 10) / 10).toFixed(1)} L`,
      parse: (s) => parseFloat(s) || 0,
      stringify: (n) => String(Math.round(n * 10) / 10),
    },
    {
      label: 'Daily Step Goal',
      subtitle: 'Daily movement',
      icon: 'footsteps-outline',
      color: GREEN,
      hint: 'Recommended: 8,000–12,000 steps per day',
      min: 2000,
      max: 20000,
      step: 500,
      value: steps,
      setValue: setSteps,
      formatDisplay: (n) => `${Math.round(n).toLocaleString()} steps`,
      parse: (s) => parseInt(s, 10) || 0,
      stringify: (n) => String(Math.round(n)),
    },
    {
      label: 'Daily Sleep Goal',
      subtitle: 'Rest and recovery',
      icon: 'moon-outline',
      color: PURPLE,
      hint: 'Recommended: 7–9 hours per night',
      min: 4,
      max: 12,
      step: 0.5,
      value: sleep,
      setValue: setSleep,
      formatDisplay: (n) => `${(Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '')} hrs`,
      parse: (s) => parseFloat(s) || 0,
      stringify: (n) => String(Math.round(n * 10) / 10),
    },
  ];

  const handleSave = async () => {
    const calorieNum = parseInt(calories, 10);
    const waterNum = parseFloat(water);
    const stepNum = parseInt(steps, 10);
    const sleepNum = parseFloat(sleep);

    if (!calorieNum || !waterNum || !stepNum || !sleepNum) {
      Alert.alert('Missing values', 'Please fill in all goals before saving.');
      return;
    }

    if (calorieNum < 1000 || calorieNum > 5000) {
      Alert.alert('Invalid calories', 'Calorie goal should be between 1,000 and 5,000 kcal.');
      return;
    }

    setIsSaving(true);
    try {
      const { updateProfile: updateDB } = await import('../../services/profileService');
      const userId = user?.id;
      if (!userId) throw new Error('Not logged in');

      const updates = {
        daily_calorie_goal: calorieNum,
        water_goal_ml: Math.round(waterNum * 1000),
        step_goal: stepNum,
        sleep_goal_hrs: sleepNum,
      };

      const success = await updateDB(userId, updates);
      if (success) {
        updateProfile(updates);
        setShowCongrats(true);
      } else {
        throw new Error('Save failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not save goals.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AndroidSafeView backgroundColor={PREMIUM_BG} style={styles.safe}>
      <PremiumAtmosphereBackground />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity onPress={navigateBack} style={styles.backCircle} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color={PREMIUM_TEXT} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.pageTitle}>Daily Goals</Text>
          <Text style={styles.pageSubtitleHeader}>Set your daily targets</Text>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.savePill, isSaving && { opacity: 0.7 }]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={PREMIUM_BG} />
          ) : (
            <Text style={styles.savePillText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScreenScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        <Text style={styles.intro}>
          These targets are used to measure your daily progress across the app.
        </Text>

        {goalConfigs.map((g) => (
          <GoalCard
            key={g.label}
            config={g}
            valueStr={g.value}
            onChange={g.setValue}
          />
        ))}

        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.88}
          style={[styles.saveFullBtn, isSaving && { opacity: 0.75 }]}
        >
          {isSaving ? (
            <ActivityIndicator color={PREMIUM_BG} />
          ) : (
            <Text style={styles.saveFullBtnText}>Save Goals</Text>
          )}
        </TouchableOpacity>
      </ScreenScrollView>

      <Modal visible={showCongrats} transparent animationType="fade" onRequestClose={() => setShowCongrats(false)}>
        <View style={styles.congratsOverlay}>
          <LinearGradient colors={['#0F0C29', '#302B63', '#24243E'] as [string, string, string]} style={styles.congratsBg}>
            <ConfettiCircles />
            <View style={styles.congratsContent}>
              <View style={[styles.congratsIconWrap, { backgroundColor: PREMIUM_ACCENT + '22' }]}>
                <Ionicons name="trophy" size={48} color={PREMIUM_ACCENT} />
              </View>
              <Text style={styles.congratsTitle}>Goals saved</Text>
              <Text style={styles.congratsSub}>
                {isFirstTime
                  ? "You've set your daily targets. Your fitness journey starts now!"
                  : "You've updated your goals. Stay consistent and crush them!"}
              </Text>

              <View style={styles.congratsStats}>
                {[
                  { label: 'Calories', value: `${parseInt(calories, 10).toLocaleString()} kcal`, icon: 'flame-outline' as const, color: ORANGE },
                  { label: 'Water', value: `${water}L`, icon: 'water-outline' as const, color: BLUE },
                  { label: 'Steps', value: `${parseInt(steps, 10).toLocaleString()}`, icon: 'footsteps-outline' as const, color: GREEN },
                  { label: 'Sleep', value: `${sleep} hrs`, icon: 'moon-outline' as const, color: PURPLE },
                ].map((s) => (
                  <View key={s.label} style={[styles.congratsStat, { borderColor: s.color + '33' }]}>
                    <Ionicons name={s.icon} size={16} color={s.color} />
                    <View>
                      <Text style={styles.congratsStatLabel}>{s.label}</Text>
                      <Text style={styles.congratsStatValue}>{s.value}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => { setShowCongrats(false); navigateBack(); }}
                activeOpacity={0.85}
                style={styles.congratsBtn}
              >
                <Text style={styles.congratsBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingTop: spacing.sm },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    zIndex: 10,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM_GLASS,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  pageTitle: { fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_TEXT, letterSpacing: -0.2 },
  pageSubtitleHeader: { fontSize: fontSize.xs, color: PREMIUM_MUTED, marginTop: 2 },
  savePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.lg,
    backgroundColor: PREMIUM_ACCENT,
    minWidth: 56,
    alignItems: 'center',
  },
  savePillText: { fontSize: fontSize.sm, fontWeight: '800', color: PREMIUM_BG },

  intro: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    color: PREMIUM_MUTED,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },

  goalCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg + 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  watermarkIcon: {
    position: 'absolute',
    right: -8,
    top: spacing.md,
    opacity: 0.12,
  },
  goalTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  goalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitles: { flex: 1 },
  goalLabel: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_TEXT },
  goalSubtitle: { fontSize: fontSize.xs, color: PREMIUM_MUTED, marginTop: 2 },

  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  valueText: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, flex: 1 },
  stepper: { flexDirection: 'row', gap: spacing.sm },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
  },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  hint: { fontSize: 11, lineHeight: 16, color: PREMIUM_MUTED },

  saveFullBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
    alignItems: 'center',
    backgroundColor: PREMIUM_ACCENT,
  },
  saveFullBtnText: { fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_BG },

  congratsOverlay: { flex: 1 },
  congratsBg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  confettiSvg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  congratsContent: { alignItems: 'center', paddingHorizontal: spacing.xxl, gap: spacing.md },
  congratsIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  congratsTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5, textAlign: 'center' },
  congratsSub: { fontSize: fontSize.base, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22 },
  congratsStats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginVertical: spacing.md },
  congratsStat: {
    width: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  congratsStatLabel: { fontSize: 10, fontWeight: '600', color: PREMIUM_MUTED },
  congratsStatValue: { fontSize: fontSize.base, fontWeight: '800', color: '#fff' },
  congratsBtn: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.md,
    backgroundColor: PREMIUM_ACCENT,
  },
  congratsBtnText: { fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_BG },
});
