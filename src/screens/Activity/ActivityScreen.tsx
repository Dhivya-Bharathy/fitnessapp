import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, Platform, RefreshControl,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { ScreenScrollView } from '../../components/ScreenScrollView';
import Svg from 'react-native-svg';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, fontSize } from '../../theme';
import { getExerciseIllustration } from '../../components/ExerciseIllustrations';
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
import { ALL_CATEGORIES, CATEGORY_MAP, getCategoryTotalExercises } from '../../data/exerciseLibrary';
import type { ExerciseCategory } from '../../data/exerciseLibrary';

const { width: SW } = Dimensions.get('window');

interface SavedRoutine {
  id: string; name: string; description?: string;
  exercises: { name: string; calories_per_minute: number; category: string }[];
  duration_est?: number; calories_est?: number; created_at: string;
}

interface WorkoutSession {
  id: string; name: string; completed_at: string;
  duration_seconds: number; calories_burned: number;
}

const CAT_COLORS: Record<string, string> = {
  Cardio: '#FF6B35', Chest: '#F0427C', Back: '#4A90E2',
  Core: '#2BBCB0', Legs: '#9B6FE8', Shoulders: '#FFB830',
  Arms: '#34D98A', Flexibility: '#FF8C42', 'Full Body': '#FF6B9D',
};

const categoryExercises = getCategoryTotalExercises();

const WORKOUT_CATEGORIES: { key: ExerciseCategory; icon: string; color: string; label: string; exercises: number }[] = ALL_CATEGORIES.map(cat => {
  const meta = CATEGORY_MAP[cat];
  return { key: cat, icon: meta.icon, color: meta.color, label: meta.label, exercises: categoryExercises[cat] };
});

const PURPLE = '#B280FF';

export default function WorkoutScreen() {
  const navigation = useNavigation<any>();
  const { user, profile } = useAuthStore();
  const [routines, setRoutines] = useState<SavedRoutine[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const goalSteps = (profile as any)?.step_goal ?? 10000;
  const { liveSteps: steps } = useAuthStore();

  const loadRoutines = async () => {
    if (!user?.id) return;
    try {
      const { supabase } = await import('../../services/supabase');
      const { data } = await supabase.from('workout_routines').select('id,user_id,name,exercises,created_at,updated_at').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setRoutines(data.map((r: any) => ({ ...r, exercises: r.exercises ?? [] })));
    } catch {}
  };

  const loadRecentSessions = async () => {
    if (!user?.id) return;
    try {
      const { supabase } = await import('../../services/supabase');
      const { data } = await supabase.from('workout_sessions').select('id,user_id,name,status,calories_burned,duration_seconds,exercises,completed_at').eq('user_id', user.id).eq('status', 'completed').order('completed_at', { ascending: false }).limit(5);
      if (data) setSessions(data);
    } catch {}
  };

  const loadData = async () => {
    setLoadingData(true);
    try {
      await Promise.all([loadRoutines(), loadRecentSessions()].map(p => p.catch(() => {})));
    } finally {
      setLoadingData(false);
    }
  };

  useFocusEffect(useCallback(() => {
    if (user?.id) loadData();
  }, [user?.id]));

  useEffect(() => { loadData(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const todaySessions = sessions.filter(s =>
    new Date(s.completed_at).toDateString() === new Date().toDateString()
  );
  const todayCalories = todaySessions.reduce((sum, s) => sum + s.calories_burned, 0);
  const todayDuration = todaySessions.reduce((sum, s) => sum + s.duration_seconds, 0);
  const streak = sessions.length;
  const stepsCalories = Math.round(steps * 0.04);
  const totalCalories = todayCalories + stepsCalories;

  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  return (
    <AndroidSafeView backgroundColor={PREMIUM_BG} style={{ flex: 1 }}>
      <PremiumAtmosphereBackground />
      {loadingData ? (
        <View style={[styles.loadingInit, { backgroundColor: 'transparent' }]}>
          <View style={[styles.loadingInitCard, premiumGlassShadow(), { backgroundColor: PREMIUM_GLASS, borderColor: PREMIUM_GLASS_BORDER }]}>
            <LinearGradient colors={['#2DDC8C', '#0A9A5E'] as [string, string]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.loadingInitIcon}>
              <Ionicons name="barbell-outline" size={32} color="#fff" />
            </LinearGradient>
            <Text style={[styles.loadingInitText, { color: PREMIUM_TEXT }]}>Loading your workouts...</Text>
          </View>
        </View>
      ) : (
      <ScreenScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PREMIUM_ACCENT} />}
      >
        <View style={[styles.header, { paddingTop: spacing.md }]}>
          <View>
            <Text style={[styles.greeting, { color: PREMIUM_MUTED }]}>Ready to work out?</Text>
            <Text style={[styles.title, { color: PREMIUM_TEXT }]}>Let's crush it 💪</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={[styles.profileBtn, { backgroundColor: PREMIUM_GLASS, borderColor: PREMIUM_GLASS_BORDER }]}>
            <Ionicons name="person-outline" size={20} color={PREMIUM_TEXT} />
          </TouchableOpacity>
        </View>

        {/* Hero stat card */}
        <View style={[styles.heroCard, premiumGlassShadow(), { backgroundColor: PREMIUM_GLASS, borderColor: PREMIUM_GLASS_BORDER, borderWidth: 1 }]}>
          <View style={styles.heroTop}>
            <View style={styles.heroStat}>
              <Ionicons name="flame" size={18} color="#FF6B35" />
              <Text style={styles.heroStatValue}>{totalCalories}</Text>
              <Text style={styles.heroStatLabel}>kcal today</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Ionicons name="time-outline" size={18} color="#2DDC8C" />
              <Text style={styles.heroStatValue}>{formatDuration(todayDuration)}</Text>
              <Text style={styles.heroStatLabel}>active</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Ionicons name="footsteps" size={18} color="#4A90E2" />
              <Text style={styles.heroStatValue}>{steps}</Text>
              <Text style={styles.heroStatLabel}>steps</Text>
            </View>
          </View>
          <View style={[styles.heroProgressBg, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
            <LinearGradient colors={['#2DDC8C', '#0A9A5E'] as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.heroProgressFill, { width: `${Math.min((totalCalories / 500) * 100, 100)}%` as any }]} />
          </View>
          <Text style={styles.heroProgressLabel}>{Math.min(Math.round((totalCalories / 500) * 100), 100)}% of daily goal</Text>
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity onPress={() => navigation.navigate('QuickStart', { category: 'Full Body' })} activeOpacity={0.85}
            style={[styles.quickBtn, styles.quickBtnPrimary, { backgroundColor: PREMIUM_ACCENT }]}>
            <Ionicons name="play-circle" size={22} color="#fff" />
            <Text style={styles.quickBtnText}>Start Workout</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('AICoach')} activeOpacity={0.85}
            style={[styles.quickBtn, { backgroundColor: PURPLE }]}>
            <Ionicons name="bulb" size={22} color="#fff" />
            <Text style={styles.quickBtnText}>AI Coach</Text>
          </TouchableOpacity>
        </View>

        {/* AI Analysis CTA */}
        <TouchableOpacity onPress={() => navigation.navigate('Analysis')} activeOpacity={0.85}
          style={[styles.analysisCta, premiumGlassShadow(), { backgroundColor: PREMIUM_GLASS, borderColor: PREMIUM_GLASS_BORDER }]}>
          <LinearGradient colors={['#FFB830', '#FF8C42'] as [string, string]} style={styles.analysisCtaGrad}>
            <Ionicons name="bulb" size={20} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.analysisCtaTitle, { color: PREMIUM_TEXT }]}>AI Workout Analysis</Text>
            <Text style={[styles.analysisCtaSub, { color: PREMIUM_MUTED }]}>See your progress, trends & predictions</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={PREMIUM_MUTED} />
        </TouchableOpacity>

        {/* Categories */}
        <Text style={[styles.sectionTitle, { color: PREMIUM_TEXT }]}>Workout Categories</Text>
        <View style={styles.categoryGrid}>
          {WORKOUT_CATEGORIES.map(cat => {
            const IllusComp = getExerciseIllustration(cat.key);
            return (
              <TouchableOpacity key={cat.key} onPress={() => navigation.navigate('QuickStart', { category: cat.key })} activeOpacity={0.85}
                style={[styles.catCard, premiumGlassShadow(), { backgroundColor: PREMIUM_GLASS, borderColor: PREMIUM_GLASS_BORDER }]}>
                <View style={[styles.catIllusWrap, { backgroundColor: cat.color + '15' }]}>
                  <Svg width={52} height={52} viewBox="0 0 100 100">
                    <IllusComp color={cat.color} />
                  </Svg>
                </View>
                <Text style={[styles.catLabel, { color: PREMIUM_TEXT }]}>{cat.label}</Text>
                <Text style={[styles.catCount, { color: PREMIUM_MUTED }]}>{cat.exercises} ex</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* My Routines */}
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: PREMIUM_TEXT }]}>My Routines</Text>
          <TouchableOpacity onPress={() => navigation.navigate('QuickStart', { category: 'Full Body' })}>
            <Text style={[styles.seeAll, { color: PREMIUM_ACCENT }]}>+ New</Text>
          </TouchableOpacity>
        </View>
        {routines.length === 0 ? (
          <View style={[styles.emptyCard, premiumGlassShadow(), { backgroundColor: PREMIUM_GLASS, borderColor: PREMIUM_GLASS_BORDER }]}>
            <Ionicons name="barbell-outline" size={32} color={PREMIUM_MUTED} />
            <Text style={[styles.emptyText, { color: PREMIUM_TEXT }]}>No routines yet</Text>
            <Text style={[styles.emptySub, { color: PREMIUM_MUTED }]}>Tap "Start Workout" to build one</Text>
          </View>
        ) : (
          <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routineScroll}>
            {routines.slice(0, 5).map(r => {
              const firstCat = r.exercises[0]?.category || 'Full Body';
              const cardColor = CAT_COLORS[firstCat] || PREMIUM_ACCENT;
              return (
                <TouchableOpacity key={r.id} onPress={() => navigation.navigate('QuickStart')} activeOpacity={0.85}
                  style={[styles.routineCard, premiumGlassShadow(), { backgroundColor: PREMIUM_GLASS, borderColor: PREMIUM_GLASS_BORDER, borderLeftColor: cardColor }]}>
                  <Text style={[styles.routineName, { color: PREMIUM_TEXT }]} numberOfLines={1}>{r.name}</Text>
                  <View style={styles.routineMeta}>
                    <Text style={[styles.routineMetaText, { color: PREMIUM_MUTED }]}>{r.exercises.length} exercises</Text>
                    {r.duration_est && <Text style={[styles.routineMetaText, { color: PREMIUM_MUTED }]}>~{r.duration_est} min</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: PREMIUM_TEXT }]}>Recent Workouts</Text>
            {sessions.slice(0, 3).map(s => {
              const date = new Date(s.completed_at);
              const hrs = Math.floor(s.duration_seconds / 3600);
              const mins = Math.floor((s.duration_seconds % 3600) / 60);
              return (
                <View key={s.id} style={[styles.sessionCard, premiumGlassShadow(), { backgroundColor: PREMIUM_GLASS, borderColor: PREMIUM_GLASS_BORDER }]}>
                  <LinearGradient colors={['rgba(45,220,140,0.35)', 'rgba(45,220,140,0.08)'] as [string, string]} style={styles.sessionTop}>
                    <Text style={styles.sessionName}>{s.name}</Text>
                    <View style={styles.sessionCal}>
                      <Text style={[styles.sessionCalVal, { color: '#FF6B35' }]}>{s.calories_burned}</Text>
                      <Text style={[styles.sessionCalUnit, { color: '#FF6B35' }]}>kcal</Text>
                    </View>
                  </LinearGradient>
                  <View style={[styles.sessionBottom, { backgroundColor: 'transparent' }]}>
                    <Text style={[styles.sessionDate, { color: PREMIUM_MUTED }]}>
                      {date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </Text>
                    <Text style={[styles.sessionTime, { color: PREMIUM_MUTED }]}>{hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`}</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

      </ScreenScrollView>
      )}
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.huge + 60 },

  loadingInit: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  loadingInitCard: { borderRadius: radius.lg, padding: spacing.xxl, borderWidth: 1, alignItems: 'center', gap: spacing.md },
  loadingInitIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  loadingInitText: { fontSize: fontSize.base, fontWeight: '700', marginTop: spacing.sm },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  greeting: { fontSize: fontSize.sm, letterSpacing: 0.2 },
  title: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  profileBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  heroCard: { marginHorizontal: spacing.lg, borderRadius: 20, padding: spacing.lg, marginBottom: spacing.md },
  quickBtnPrimary: { flex: 1.35 },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  heroStat: { flex: 1, alignItems: 'center', gap: 2 },
  heroDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.15)' },
  heroStatValue: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  heroStatLabel: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroProgressBg: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  heroProgressFill: { height: '100%', borderRadius: 3 },
  heroProgressLabel: { fontSize: 10, color: 'rgba(255,255,255,0.55)', textAlign: 'right', letterSpacing: 0.3 },

  quickActions: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 14, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 }, android: { elevation: 5 }, web: { boxShadow: '0 4px 8px rgba(0,0,0,0.15)' } }) },
  quickBtnText: { color: '#fff', fontSize: fontSize.base, fontWeight: '700', letterSpacing: 0.3 },

  analysisCta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.md, borderRadius: 16, borderWidth: 1, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }, android: { elevation: 2 }, web: { boxShadow: '0 2px 6px rgba(0,0,0,0.06)' } }) },
  analysisCtaGrad: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  analysisCtaTitle: { fontSize: fontSize.base, fontWeight: '700' },
  analysisCtaSub: { fontSize: fontSize.xs, marginTop: 1 },

  sectionTitle: { fontSize: fontSize.lg, fontWeight: '800', marginHorizontal: spacing.lg, marginBottom: spacing.sm, letterSpacing: -0.3 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: spacing.lg },
  seeAll: { fontSize: fontSize.sm, fontWeight: '700' },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.lg },
  catCard: { width: '23%', paddingVertical: spacing.sm, paddingHorizontal: 4, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 4, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }, android: { elevation: 2 }, web: { boxShadow: '0 2px 6px rgba(0,0,0,0.06)' } }) },
  catIllusWrap: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catLabel: { fontSize: 9, fontWeight: '700', textAlign: 'center' },
  catCount: { fontSize: 8, textAlign: 'center' },

  emptyCard: { marginHorizontal: spacing.lg, padding: spacing.xl, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  emptyText: { fontSize: fontSize.base, fontWeight: '700' },
  emptySub: { fontSize: fontSize.sm, textAlign: 'center' },

  routineScroll: { paddingLeft: spacing.lg, paddingRight: spacing.sm, gap: spacing.sm, marginBottom: spacing.lg },
  routineCard: { width: SW * 0.55, padding: spacing.md, borderRadius: 16, borderWidth: 1, borderLeftWidth: 4, gap: spacing.xs, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8 }, android: { elevation: 4 }, web: { boxShadow: '0 3px 8px rgba(0,0,0,0.1)' } }) },
  routineName: { fontSize: fontSize.base, fontWeight: '800', letterSpacing: -0.2 },
  routineMeta: { flexDirection: 'row', gap: spacing.sm },
  routineMetaText: { fontSize: fontSize.xs },

  sessionCard: { marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: 14, overflow: 'hidden', borderWidth: 1, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6 }, android: { elevation: 3 }, web: { boxShadow: '0 3px 6px rgba(0,0,0,0.1)' } }) },
  sessionTop: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  sessionName: { flex: 1, fontSize: fontSize.base, fontWeight: '700', color: '#fff' },
  sessionCal: { alignItems: 'center' },
  sessionCalVal: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  sessionCalUnit: { fontSize: 9, fontWeight: '600' },
  sessionBottom: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sessionDate: { fontSize: fontSize.xs },
  sessionTime: { fontSize: fontSize.xs },
});
