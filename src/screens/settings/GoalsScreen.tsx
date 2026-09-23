import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Path } from 'react-native-svg';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';

function ConfettiCircles() {
  const colors_arr = ['#FF6B35', '#FFB830', '#2DDC8C', '#4A90E2', '#F0427C', '#9B6FE8'];
  return (
    <Svg width={300} height={300} viewBox="0 0 300 300" style={styles.confettiSvg}>
      {Array.from({ length: 30 }).map((_, i) => {
        const cx = 30 + Math.random() * 240;
        const cy = 30 + Math.random() * 240;
        const r = 3 + Math.random() * 6;
        const color = colors_arr[i % colors_arr.length];
        const delay = Math.random() * 0.5;
        return (
          <Circle key={i} cx={cx} cy={cy} r={r} fill={color} opacity={0.8 + Math.random() * 0.2} />
        );
      })}
    </Svg>
  );
}

export default function GoalsScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const { user, profile, updateProfile } = useAuthStore();
  const theme = colors[colorScheme];

  const [calories, setCalories] = useState(
    profile?.daily_calorie_goal?.toString() ?? '2000'
  );
  const [water, setWater] = useState(
    profile?.water_goal_ml
      ? (profile.water_goal_ml / 1000).toString()
      : '2.5'
  );
  const [steps, setSteps] = useState(
    profile?.step_goal?.toString() ?? '10000'
  );
  const [sleep, setSleep] = useState(
    profile?.sleep_goal_hrs?.toString() ?? '8'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);

  const isFirstTime = !profile?.daily_calorie_goal;

  const goals = [
    {
      label: 'Daily Calorie Goal',
      value: calories,
      onChange: setCalories,
      icon: 'flame-outline',
      color: '#FFB347',
      suffix: 'kcal',
      placeholder: '2000',
      keyboardType: 'number-pad',
      hint: 'Recommended: 1,800–2,500 kcal based on your activity level',
    },
    {
      label: 'Daily Water Goal',
      value: water,
      onChange: setWater,
      icon: 'water-outline',
      color: theme.accentSecond,
      suffix: 'L',
      placeholder: '2.5',
      keyboardType: 'decimal-pad',
      hint: 'Recommended: 2–3 litres per day',
    },
    {
      label: 'Daily Step Goal',
      value: steps,
      onChange: setSteps,
      icon: 'footsteps-outline',
      color: theme.accent,
      suffix: 'steps',
      placeholder: '10000',
      keyboardType: 'number-pad',
      hint: 'Recommended: 8,000–12,000 steps per day',
    },
    {
      label: 'Daily Sleep Goal',
      value: sleep,
      onChange: setSleep,
      icon: 'moon-outline',
      color: theme.purple,
      suffix: 'hrs',
      placeholder: '8',
      keyboardType: 'decimal-pad',
      hint: 'Recommended: 7–9 hours per night',
    },
  ];

  const handleSave = async () => {
    const calorieNum = parseInt(calories);
    const waterNum = parseFloat(water);
    const stepNum = parseInt(steps);
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
    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
          <Text style={[styles.backText, { color: theme.textPrimary }]}>Settings</Text>
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>Daily Goals</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <Text style={[styles.saveBtn, { color: theme.accent }]}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>
          These targets are used to measure your daily progress across the app.
        </Text>

        {goals.map((g) => (
          <View key={g.label} style={[styles.goalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.goalHeader}>
              <View style={[styles.goalIcon, { backgroundColor: g.color + '22' }]}>
                <Ionicons name={g.icon as any} size={20} color={g.color} />
              </View>
              <Text style={[styles.goalLabel, { color: theme.textPrimary }]}>{g.label}</Text>
            </View>
            <View style={[styles.inputRow, { backgroundColor: theme.bg, borderColor: theme.border }]}>
              <TextInput
                value={g.value}
                onChangeText={g.onChange}
                placeholder={g.placeholder}
                placeholderTextColor={theme.textMuted}
                keyboardType={g.keyboardType as any}
                style={[styles.input, { color: g.color }]}
              />
              <Text style={[styles.suffix, { color: theme.textMuted }]}>{g.suffix}</Text>
            </View>
            <Text style={[styles.hint, { color: theme.textMuted }]}>{g.hint}</Text>
          </View>
        ))}

        <TouchableOpacity
          onPress={handleSave}
          disabled={isSaving}
          style={[styles.saveFullBtn, { backgroundColor: theme.accent }]}
        >
          {isSaving ? (
            <ActivityIndicator color={theme.bg} />
          ) : (
            <Text style={[styles.saveFullBtnText, { color: theme.bg }]}>Save Goals</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Congrats Modal */}
      <Modal visible={showCongrats} transparent animationType="fade" onRequestClose={() => setShowCongrats(false)}>
        <View style={styles.congratsOverlay}>
          <LinearGradient colors={['#0F0C29', '#302B63', '#24243E'] as [string, string, string]} style={styles.congratsBg}>
            <ConfettiCircles />
            <View style={styles.congratsContent}>
              <View style={[styles.congratsIconWrap, { backgroundColor: theme.accent + '22' }]}>
                <Ionicons name="trophy" size={48} color={theme.accent} />
              </View>
              <Text style={styles.congratsTitle}>Goals Crushed! 🎉</Text>
              <Text style={styles.congratsSub}>
                {isFirstTime
                  ? "You've set your daily targets. Your fitness journey starts now!"
                  : "You've updated your goals. Stay consistent and crush them!"}
              </Text>

              <View style={styles.congratsStats}>
                {[
                  { label: 'Calories', value: `${parseInt(calories).toLocaleString()} kcal`, icon: 'flame-outline', color: '#FFB347' },
                  { label: 'Water', value: `${water}L`, icon: 'water-outline', color: theme.accentSecond },
                  { label: 'Steps', value: `${parseInt(steps).toLocaleString()}`, icon: 'footsteps-outline', color: theme.accent },
                  { label: 'Sleep', value: `${sleep} hrs`, icon: 'moon-outline', color: theme.purple },
                ].map((s) => (
                  <View key={s.label} style={[styles.congratsStat, { borderColor: s.color + '33' }]}>
                    <Ionicons name={s.icon as any} size={16} color={s.color} />
                    <View>
                      <Text style={[styles.congratsStatLabel, { color: theme.textMuted }]}>{s.label}</Text>
                      <Text style={[styles.congratsStatValue, { color: '#fff' }]}>{s.value}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                onPress={() => { setShowCongrats(false); navigation.goBack(); }}
                activeOpacity={0.85}
                style={[styles.congratsBtn, { backgroundColor: theme.accent }]}
              >
                <Text style={styles.congratsBtnText}>Let's Go! 🔥</Text>
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
  scrollContent: { paddingBottom: 100, paddingTop: spacing.sm },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { fontSize: fontSize.lg, fontWeight: '400' },
  pageTitle: { fontSize: fontSize.lg, fontWeight: '700' },
  saveBtn: { fontSize: fontSize.lg, fontWeight: '700' },

  pageSubtitle: {
    fontSize: fontSize.base,
    lineHeight: 20,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },

  goalCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
  },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  goalIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  goalLabel: { fontSize: fontSize.lg, fontWeight: '700' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  input: { flex: 1, fontSize: 28, fontWeight: '800' },
  suffix: { fontSize: fontSize.lg, fontWeight: '600' },
  hint: { fontSize: fontSize.xs, lineHeight: 16 },

  saveFullBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  saveFullBtnText: { fontSize: fontSize.lg, fontWeight: '700' },

  // Congrats Modal
  congratsOverlay: { flex: 1 },
  congratsBg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  confettiSvg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  congratsContent: { alignItems: 'center', paddingHorizontal: spacing.xxl, gap: spacing.md },
  congratsIconWrap: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  congratsTitle: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -0.5, textAlign: 'center' },
  congratsSub: { fontSize: fontSize.base, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22 },
  congratsStats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginVertical: spacing.md },
  congratsStat: {
    width: '46%', flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderRadius: radius.md, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  congratsStatLabel: { fontSize: 10, fontWeight: '600' },
  congratsStatValue: { fontSize: fontSize.base, fontWeight: '800' },
  congratsBtn: {
    paddingHorizontal: spacing.xxl, paddingVertical: spacing.md,
    borderRadius: radius.lg, marginTop: spacing.md,
  },
  congratsBtnText: { fontSize: fontSize.lg, fontWeight: '800', color: '#fff' },
});
