import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Dimensions, Platform, Alert,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { fetchWorkoutAnalysis, type WorkoutAnalysis, type TimeRange } from '../../services/aiAnalysisService';
import { exportWorkoutAnalysis } from '../../utils/pdf-export';

const { width: SW } = Dimensions.get('window');

const TREND_META: Record<string, { icon: string; label: string; color: string }> = {
  improving: { icon: 'trending-up', label: 'Improving', color: '#2DDC8C' },
  steady: { icon: 'remove', label: 'Steady', color: '#FFB830' },
  declining: { icon: 'trending-down', label: 'Declining', color: '#FF6B6B' },
  insufficient_data: { icon: 'remove', label: 'Not enough data', color: '#6A6690' },
};

const TIME_OPTIONS: { key: TimeRange; label: string }[] = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
];

export default function AnalysisScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const { user } = useAuthStore();
  const theme = colors[colorScheme];

  const [analysis, setAnalysis] = useState<WorkoutAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  const loadAnalysis = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await fetchWorkoutAnalysis(user.id, timeRange);
      setAnalysis(data);
    } catch {
      setAnalysis(null);
    }
    setLoading(false);
  }, [user?.id, timeRange]);

  useFocusEffect(useCallback(() => { loadAnalysis(); }, [loadAnalysis]));

  const [exporting, setExporting] = useState(false);

  const handleExportPDF = useCallback(async () => {
    if (!analysis) return;
    setExporting(true);
    try {
      const periodLabel = TIME_OPTIONS.find(o => o.key === timeRange)?.label || timeRange;
      await exportWorkoutAnalysis(analysis, periodLabel);
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message || 'Could not generate PDF');
    }
    setExporting(false);
  }, [analysis, timeRange]);

  const trendMeta = analysis ? TREND_META[analysis.recentTrend] ?? TREND_META.insufficient_data : TREND_META.insufficient_data;

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={{ flex: 1 }}>
      <View style={[styles.header, { backgroundColor: theme.bg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>AI Analysis</Text>
          <Text style={[styles.headerSub, { color: theme.textMuted }]}>Your workout insights</Text>
        </View>
        {analysis && (
          <TouchableOpacity onPress={handleExportPDF} disabled={exporting} style={[styles.exportBtn, { backgroundColor: theme.accent + '15' }]}>
            <Ionicons name={exporting ? 'hourglass-outline' : 'download-outline'} size={20} color={theme.accent} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.timeFilter}>
        {TIME_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => setTimeRange(opt.key)}
            style={[styles.timeChip, {
              backgroundColor: timeRange === opt.key ? theme.accent + '20' : theme.card,
              borderColor: timeRange === opt.key ? theme.accent : theme.border,
            }]}
          >
            <Text style={[styles.timeChipText, {
              color: timeRange === opt.key ? theme.accent : theme.textMuted,
              fontWeight: timeRange === opt.key ? '700' : '500',
            }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Analyzing your workouts...</Text>
        </View>
      ) : !analysis ? (
        <View style={styles.loadingWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>Could not load analysis</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Overview */}
          <LinearGradient colors={[theme.heroCard, '#1a1a2e'] as [string, string]} style={styles.heroCard}>
            <Text style={styles.heroTitle}>Workout Summary</Text>
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Ionicons name="barbell-outline" size={18} color="#2DDC8C" />
                <Text style={styles.heroStatValue}>{analysis.totalSessions}</Text>
                <Text style={styles.heroStatLabel}>workouts</Text>
              </View>
              <View style={styles.heroStat}>
                <Ionicons name="flame" size={18} color="#FF6B35" />
                <Text style={styles.heroStatValue}>{analysis.totalCalories}</Text>
                <Text style={styles.heroStatLabel}>kcal burned</Text>
              </View>
              <View style={styles.heroStat}>
                <Ionicons name="time-outline" size={18} color="#4A90E2" />
                <Text style={styles.heroStatValue}>{analysis.totalDurationMinutes}</Text>
                <Text style={styles.heroStatLabel}>minutes</Text>
              </View>
            </View>

            {/* Trend */}
            <View style={[styles.trendRow, { borderTopColor: 'rgba(255,255,255,0.1)' }]}>
              <Ionicons name={trendMeta.icon as any} size={20} color={trendMeta.color} />
              <Text style={[styles.trendLabel, { color: trendMeta.color }]}>{trendMeta.label}</Text>
              {analysis.streakDays > 0 && (
                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={14} color="#FFB830" />
                  <Text style={styles.streakText}>{analysis.streakDays} day streak</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {/* Averages */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Averages</Text>
            <View style={styles.avgRow}>
              <View style={styles.avgItem}>
                <Text style={[styles.avgValue, { color: theme.textPrimary }]}>{analysis.averageCaloriesPerSession}</Text>
                <Text style={[styles.avgLabel, { color: theme.textMuted }]}>kcal / workout</Text>
              </View>
              <View style={[styles.avgDivider, { backgroundColor: theme.border }]} />
              <View style={styles.avgItem}>
                <Text style={[styles.avgValue, { color: theme.textPrimary }]}>{analysis.averageDurationPerSession}</Text>
                <Text style={[styles.avgLabel, { color: theme.textMuted }]}>min / workout</Text>
              </View>
            </View>
          </View>

          {/* Weekly breakdown */}
          {analysis.weeklyBreakdown.length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Weekly Progress</Text>
              {analysis.weeklyBreakdown.map((week, i) => {
                const maxCal = Math.max(...analysis.weeklyBreakdown.map(w => w.totalCalories), 1);
                const barWidth = (week.totalCalories / maxCal) * 100;
                return (
                  <View key={week.weekStart} style={styles.weekRow}>
                    <Text style={[styles.weekLabel, { color: theme.textMuted }]}>
                      W{analysis.weeklyBreakdown.length - i}
                    </Text>
                    <View style={[styles.weekBarBg, { backgroundColor: theme.border }]}>
                      <LinearGradient
                        colors={[theme.accent, theme.accent + 'CC'] as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.weekBarFill, { width: `${Math.max(barWidth, 4)}%` as unknown as number }]}
                      />
                    </View>
                    <View style={styles.weekMeta}>
                      <Text style={[styles.weekCal, { color: theme.textPrimary }]}>{week.totalCalories}</Text>
                      <Text style={[styles.weekSessions, { color: theme.textMuted }]}>{week.sessions}x</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Category distribution */}
          {Object.keys(analysis.categoryDistribution).length > 0 && (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Categories Trained</Text>
              {Object.entries(analysis.categoryDistribution)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, count]) => {
                  const total = Object.values(analysis.categoryDistribution).reduce((s, v) => s + v, 0);
                  const pct = Math.round((count / total) * 100);
                  return (
                    <View key={cat} style={styles.catRow}>
                      <Text style={[styles.catName, { color: theme.textPrimary }]}>{cat}</Text>
                      <View style={[styles.catBarBg, { backgroundColor: theme.border }]}>
                        <View style={[styles.catBarFill, { width: `${pct}%` as unknown as number, backgroundColor: theme.accent }]} />
                      </View>
                      <Text style={[styles.catPct, { color: theme.textMuted }]}>{pct}%</Text>
                    </View>
                  );
                })}
            </View>
          )}

          {/* AI Goal Prediction */}
          <View style={[styles.card, { backgroundColor: theme.accent + '08', borderColor: theme.accent }]}>
            <View style={styles.predictionHeader}>
              <Ionicons name="bulb" size={20} color="#FFB830" />
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>AI Prediction</Text>
            </View>
            <Text style={[styles.predictionMessage, { color: theme.textSecondary }]}>
              {analysis.prediction.message}
            </Text>
            {analysis.prediction.estimatedDate && (
              <View style={[styles.predictionDate, { backgroundColor: theme.accent + '15' }]}>
                <Ionicons name="calendar-outline" size={16} color={theme.accent} />
                <Text style={[styles.predictionDateText, { color: theme.accent }]}>
                  Target: {analysis.prediction.estimatedDate}
                </Text>
              </View>
            )}

            {analysis.prediction.milestoneNext && (
              <View style={styles.milestoneWrap}>
                <Text style={[styles.milestoneLabel, { color: theme.textMuted }]}>
                  Next Milestone: {analysis.prediction.milestoneNext.label}
                </Text>
                <View style={[styles.milestoneBarBg, { backgroundColor: theme.border }]}>
                  <View style={[styles.milestoneBarFill, {
                    width: `${analysis.prediction.milestoneNext.currentProgress}%` as unknown as number,
                    backgroundColor: theme.accent,
                  }]} />
                </View>
                <Text style={[styles.milestonePct, { color: theme.accent }]}>
                  {analysis.prediction.milestoneNext.currentProgress}% complete
                </Text>
              </View>
            )}

            <View style={[styles.confidenceBadge, {
              backgroundColor: analysis.prediction.confidence === 'high' ? '#2DDC8C' + '20' :
                analysis.prediction.confidence === 'medium' ? '#FFB830' + '20' : '#6A6690' + '20',
            }]}>
              <Ionicons name="analytics-outline" size={14}
                color={analysis.prediction.confidence === 'high' ? '#2DDC8C' :
                  analysis.prediction.confidence === 'medium' ? '#FFB830' : '#6A6690'} />
              <Text style={[styles.confidenceText, {
                color: analysis.prediction.confidence === 'high' ? '#2DDC8C' :
                  analysis.prediction.confidence === 'medium' ? '#FFB830' : '#6A6690',
              }]}>
                {analysis.prediction.confidence.charAt(0).toUpperCase() + analysis.prediction.confidence.slice(1)} confidence
              </Text>
            </View>
          </View>

          {/* AI Suggestions */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.predictionHeader}>
              <Ionicons name="sparkles" size={20} color="#FFB830" />
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Suggestions</Text>
            </View>
            {analysis.suggestions.map((s, i) => (
              <View key={i} style={styles.suggestionRow}>
                <View style={[styles.suggestionDot, { backgroundColor: theme.accent }]} />
                <Text style={[styles.suggestionText, { color: theme.textSecondary }]}>{s}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  exportBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { fontSize: fontSize.xs, marginTop: 1 },

  timeFilter: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  timeChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: 99, borderWidth: 1 },
  timeChipText: { fontSize: fontSize.xs },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  loadingText: { fontSize: fontSize.sm, fontWeight: '600' },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.huge },

  heroCard: { borderRadius: 20, padding: spacing.lg, marginBottom: spacing.md, ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 14 }, android: { elevation: 8 }, web: { boxShadow: '0 6px 14px rgba(0,0,0,0.25)' } }) },
  heroTitle: { fontSize: fontSize.sm, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroStats: { flexDirection: 'row', marginBottom: spacing.md },
  heroStat: { flex: 1, alignItems: 'center', gap: 4 },
  heroStatValue: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  heroStatLabel: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1 },
  trendLabel: { fontSize: fontSize.sm, fontWeight: '700' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto', backgroundColor: 'rgba(255,184,48,0.15)', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  streakText: { fontSize: 9, fontWeight: '700', color: '#FFB830' },

  card: { borderRadius: 16, padding: spacing.lg, borderWidth: 1, marginBottom: spacing.md },
  cardTitle: { fontSize: fontSize.base, fontWeight: '800', marginBottom: spacing.md },

  avgRow: { flexDirection: 'row', alignItems: 'center' },
  avgItem: { flex: 1, alignItems: 'center', gap: 4 },
  avgDivider: { width: 1, height: 40 },
  avgValue: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  avgLabel: { fontSize: 9, fontWeight: '600' },

  weekRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  weekLabel: { width: 24, fontSize: fontSize.xs, fontWeight: '600' },
  weekBarBg: { flex: 1, height: 12, borderRadius: 6, overflow: 'hidden' },
  weekBarFill: { height: '100%', borderRadius: 6 },
  weekMeta: { flexDirection: 'row', gap: spacing.sm, width: 80, justifyContent: 'flex-end' },
  weekCal: { fontSize: fontSize.xs, fontWeight: '700' },
  weekSessions: { fontSize: fontSize.xs },

  catRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  catName: { width: 72, fontSize: fontSize.xs, fontWeight: '600' },
  catBarBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 4 },
  catPct: { width: 36, fontSize: fontSize.xs, textAlign: 'right' },

  predictionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  predictionMessage: { fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.md },
  predictionDate: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, alignSelf: 'flex-start', marginBottom: spacing.md },
  predictionDateText: { fontSize: fontSize.sm, fontWeight: '700' },

  milestoneWrap: { marginBottom: spacing.md },
  milestoneLabel: { fontSize: fontSize.xs, fontWeight: '600', marginBottom: spacing.xs },
  milestoneBarBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  milestoneBarFill: { height: '100%', borderRadius: 4 },
  milestonePct: { fontSize: 9, fontWeight: '700' },

  confidenceBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full, alignSelf: 'flex-start' },
  confidenceText: { fontSize: 9, fontWeight: '700' },

  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  suggestionDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 6 },
  suggestionText: { flex: 1, fontSize: fontSize.xs, lineHeight: 16 },
});
