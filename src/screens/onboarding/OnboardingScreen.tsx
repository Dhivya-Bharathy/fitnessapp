import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, TextInput,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { supabase } from '../../services/supabase';
import { useIsCompactPhone, useLayoutWidth } from '../../hooks/useLayoutWidth';
import { useFooterInset } from '../../hooks/useFooterInset';

const ACCENT = '#2DDC8C';

// ── HELPERS ────────────────────────────────────────────────────
function StepWrap({ children }: { children: React.ReactNode }) {
  return <View style={styles.stepContent}>{children}</View>;
}
function StepTitle({ text, theme }: { text: string; theme: typeof colors.light }) {
  return <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>{text}</Text>;
}
function StepSub({ text, theme }: { text: string; theme: typeof colors.light }) {
  return <Text style={[styles.stepSub, { color: theme.textSecondary }]}>{text}</Text>;
}

const WELCOME_FEATURES = [
  { id: 'calories', icon: 'flame-outline', title: 'Calorie Tracking', sub: 'Log meals, macros & water' },
  { id: 'workouts', icon: 'barbell-outline', title: 'Workouts & Steps', sub: 'Track exercises & daily steps' },
  { id: 'sleep', icon: 'moon-outline', title: 'Sleep & Health', sub: 'Sleep logs, body stats & fasting' },
  { id: 'progress', icon: 'trending-up-outline', title: 'Progress & Notes', sub: 'See trends & journal your journey' },
] as const;

// ── WELCOME ────────────────────────────────────────────────────
function StepWelcome({
  selected,
  onToggle,
  layoutWidth,
  compact,
}: {
  selected: string[];
  onToggle: (id: string) => void;
  layoutWidth: number;
  compact: boolean;
}) {
  const cardWidth = compact ? layoutWidth - spacing.lg * 2 : (layoutWidth - spacing.lg * 2 - 12) / 2;
  return (
    <View style={styles.welcomeWrap}>
      <View style={styles.welcomeGlow} />
      <Text style={[styles.welcomeLogo, compact && styles.welcomeLogoCompact]}>FITNESS APP</Text>
      <Text style={styles.welcomeTagline}>
        <Text style={{ color: ACCENT }}>22 questions</Text> → AI training +{' '}
        <Text style={{ color: ACCENT }}>Indian diet</Text>
      </Text>
      <Text style={styles.welcomeHint}>Tap to choose what you want to track (pick one or more)</Text>
      <View style={styles.featureGrid}>
        {WELCOME_FEATURES.map((c) => {
          const active = selected.includes(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              activeOpacity={0.85}
              onPress={() => onToggle(c.id)}
              style={[styles.featureCard, { width: cardWidth }, active && styles.featureCardActive]}
            >
              {active && (
                <View style={styles.featureCheck}>
                  <Ionicons name="checkmark-circle" size={18} color={ACCENT} />
                </View>
              )}
              <View style={[styles.featureIconWrap, { borderColor: active ? ACCENT : 'rgba(45,220,140,0.25)' }]}>
                <Ionicons name={c.icon as any} size={24} color={ACCENT} />
              </View>
              <Text style={styles.featureCardTitle}>{c.title}</Text>
              <Text style={styles.featureCardSub}>{c.sub}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── GOAL ───────────────────────────────────────────────────────
function StepGoal({ theme, selected, onSelect }: { theme: typeof colors.light; selected: string; onSelect: (g: string) => void }) {
  const goals = [
    { label: 'Lose Weight', emoji: '🔥' },
    { label: 'Build Muscle', emoji: '💪' },
    { label: 'Get Fit', emoji: '⚡' },
    { label: 'Maintain', emoji: '⚖️' },
    { label: 'Gain Weight', emoji: '📈' },
    { label: 'Improve Diet', emoji: '🥗' },
  ];
  return (
    <StepWrap>
      <StepTitle text="What's your goal?" theme={theme} />
      <StepSub text="We'll tailor your experience around this." theme={theme} />
      <View style={styles.gridRow}>
        {goals.map((g) => (
          <TouchableOpacity key={g.label} onPress={() => onSelect(g.label)}
            style={[styles.gridTile, { backgroundColor: selected === g.label ? theme.accent : theme.card, borderColor: selected === g.label ? theme.accent : theme.border }]}>
            <Text style={styles.gridEmoji}>{g.emoji}</Text>
            <Text style={[styles.gridLabel, { color: selected === g.label ? '#fff' : theme.textPrimary }]}>{g.label}</Text>
            {selected === g.label && <View style={styles.gridCheck}><Ionicons name="checkmark-circle" size={18} color="#fff" /></View>}
          </TouchableOpacity>
        ))}
      </View>
    </StepWrap>
  );
}

// ── STATS ──────────────────────────────────────────────────────
function StepStats({ theme, height, setHeight, weight, setWeight }: {
  theme: typeof colors.light; height: string; setHeight: (v: string) => void;
  weight: string; setWeight: (v: string) => void;
}) {
  return (
    <StepWrap>
      <StepTitle text="Your height & weight" theme={theme} />
      <StepSub text="For calculating your BMI and calorie targets." theme={theme} />
      <View style={styles.fieldsWrap}>
        {[
          { label: 'Height', value: height, onChange: setHeight, suffix: 'cm', placeholder: '175', icon: 'resize-outline' },
          { label: 'Weight', value: weight, onChange: setWeight, suffix: 'kg', placeholder: '70', icon: 'scale-outline' },
        ].map((f) => (
          <View key={f.label}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{f.label}</Text>
            <View style={[styles.fieldInput, { backgroundColor: theme.card, borderColor: f.value ? theme.accent : theme.border }]}>
              <Ionicons name={f.icon as any} size={18} color={theme.textMuted} />
              <TextInput value={f.value} onChangeText={f.onChange} placeholder={f.placeholder}
                placeholderTextColor={theme.textMuted} keyboardType="decimal-pad"
                style={[styles.fieldTextInput, { color: theme.textPrimary }]} />
              <Text style={[styles.fieldSuffix, { color: theme.textMuted }]}>{f.suffix}</Text>
            </View>
          </View>
        ))}
      </View>
    </StepWrap>
  );
}

// ── ACCOUNT ────────────────────────────────────────────────────
function StepAccount({ theme, name, setName, username, setUsername, isLoading, onSignUp }: {
  theme: typeof colors.light; name: string; setName: (v: string) => void;
  username: string; setUsername: (v: string) => void;
  isLoading: boolean; onSignUp: () => void;
}) {
  return (
    <StepWrap>
      <View style={styles.accountHeader}>
        <LinearGradient colors={['#F0427C', '#FF6B35', '#FFB830']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoCircle}>
          <Text style={styles.logoLetter}>F</Text>
        </LinearGradient>
        <StepTitle text="Your Profile" theme={theme} />
        <StepSub text="Set your display name and username to personalise your experience." theme={theme} />
      </View>
      <View style={styles.fieldsWrap}>
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Display Name</Text>
        <View style={[styles.fieldInput, { backgroundColor: theme.card, borderColor: name ? theme.accent : theme.border }]}>
          <Ionicons name="person-outline" size={18} color={theme.textMuted} />
          <TextInput value={name} onChangeText={setName} placeholder="e.g. John Doe"
            placeholderTextColor={theme.textMuted} autoCapitalize="words"
            style={[styles.fieldTextInput, { color: theme.textPrimary }]} />
        </View>
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Username</Text>
        <View style={[styles.fieldInput, { backgroundColor: theme.card, borderColor: username ? theme.accent : theme.border }]}>
          <Ionicons name="at-outline" size={18} color={theme.textMuted} />
          <TextInput value={username} onChangeText={(t) => setUsername(t.replace(/[^a-z0-9_]/g, '').toLowerCase())}
            placeholder="e.g. johndoe" placeholderTextColor={theme.textMuted} autoCapitalize="none"
            style={[styles.fieldTextInput, { color: theme.textPrimary }]} />
        </View>
      </View>
      <TouchableOpacity onPress={onSignUp} disabled={isLoading} activeOpacity={0.85} style={styles.signUpBtnWrap}>
        <LinearGradient colors={[theme.accent, '#0DAE6C'] as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.signUpBtn}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signUpBtnText}>Save & Continue →</Text>}
        </LinearGradient>
      </TouchableOpacity>
      <View style={[styles.privacyNote, { backgroundColor: theme.accentDim as string, borderColor: theme.accent + '33' }]}>
        <Ionicons name="shield-checkmark-outline" size={16} color={theme.accent} />
        <Text style={[styles.privacyText, { color: theme.textSecondary }]}>Your data stays on this device. No sign-up or email required.</Text>
      </View>
    </StepWrap>
  );
}

// ── GENERATING ─────────────────────────────────────────────────
function StepGenerating({ theme }: { theme: typeof colors.light }) {
  return (
    <View style={styles.generatingWrap}>
      <ActivityIndicator size="large" color={theme.accent} />
      <Text style={[styles.generatingTitle, { color: theme.textPrimary }]}>Setting up your dashboard...</Text>
    </View>
  );
}

// ── MAIN ────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const { setOnboarding } = useAuthStore();
  const theme = colors[colorScheme];
  const layoutWidth = useLayoutWidth();
  const compact = useIsCompactPhone();
  const footerInset = useFooterInset();
  const footerSpace = footerInset + 88;

  type StepKey = 'welcome' | 'goal' | 'stats' | 'account' | 'generating';
  const flow: StepKey[] = ['welcome', 'goal', 'stats', 'account', 'generating'];

  const [step, setStep] = useState<StepKey>('welcome');
  const [goal, setGoal] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [trackingPrefs, setTrackingPrefs] = useState<string[]>(['calories']);
  const [isLoading, setIsLoading] = useState(false);

  const toggleTrackingPref = (id: string) => {
    setTrackingPrefs((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev) : [...prev, id],
    );
  };

  const currentIndex = flow.indexOf(step);
  const isWelcome = step === 'welcome';
  const isGenerating = step === 'generating';
  const showCTA = !isGenerating;

  const goNext = () => {
    const next = flow[currentIndex + 1];
    if (next) setStep(next);
  };
  const goPrev = () => {
    if (isGenerating) return;
    const prev = flow[currentIndex - 1];
    if (prev) setStep(prev); else navigation.goBack();
  };

  const saveProfile = async (userId: string) => {
    await supabase.from('profiles').upsert({
      id: userId,
      full_name: name || null,
      calfit_id: username || null,
      goal: goal || null,
      height_cm: parseFloat(height) || null,
      current_weight_kg: parseFloat(weight) || null,
      tracking_preferences: trackingPrefs,
    });
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    try {
      setOnboarding(true);
      const { data: anonData, error } = await supabase.auth.signInAnonymously();
      if (error?.message?.includes('anonymous_provider_disabled') || (error as { code?: string })?.code === 'anonymous_provider_disabled') {
        Alert.alert(
          'Enable demo sign-in',
          'In Supabase Dashboard → Authentication → Providers → Anonymous sign-ins → Enable. Then tap Create My Account again.',
        );
        setOnboarding(false);
        setIsLoading(false);
        return;
      }
      if (error || !anonData?.session) {
        Alert.alert('Error', error?.message ?? 'Could not create account.');
        setOnboarding(false);
        setIsLoading(false);
        return;
      }
      useAuthStore.setState({
        session: anonData.session,
        user: anonData.session.user,
        isAuthenticated: true,
        isOnboarding: true,
      });
      if (anonData.user) {
        await saveProfile(anonData.user.id);
        await useAuthStore.getState().loadProfile(anonData.user.id);
        const { sendWelcomeNotification } = await import('../../services/notificationService');
        await sendWelcomeNotification(anonData.user.id, 'there');
      }
      setIsLoading(false);
      navigation.navigate('FitnessAssessment');
    } catch {
      setOnboarding(false);
      Alert.alert('Error', 'Something went wrong.');
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    if (step === 'welcome' && trackingPrefs.length === 0) {
      Alert.alert('Choose features', 'Select at least one area to track.');
      return;
    }
    if (step === 'goal' && !goal) { Alert.alert('Pick a goal', 'Select your primary goal to continue.'); return; }
    if (step === 'stats' && (!height || !weight)) { Alert.alert('Required', 'Please enter your height and weight.'); return; }
    if (step === 'account') { await handleSignUp(); return; }
    goNext();
  };

  const btnLabel = step === 'welcome' ? "Let's Go  →" : step === 'account' ? 'Create My Account' : 'Continue →';

  const getStep = () => {
    switch (step) {
      case 'welcome':  return <StepWelcome selected={trackingPrefs} onToggle={toggleTrackingPref} layoutWidth={layoutWidth} compact={compact} />;
      case 'goal':     return <StepGoal theme={theme} selected={goal} onSelect={setGoal} />;
      case 'stats':    return <StepStats theme={theme} height={height} setHeight={setHeight} weight={weight} setWeight={setWeight} />;
      case 'account':  return <StepAccount theme={theme} name={name} setName={setName} username={username} setUsername={setUsername} isLoading={isLoading} onSignUp={handleSignUp} />;
      case 'generating': return <StepGenerating theme={theme} />;
      default: return null;
    }
  };

  return (
    <AndroidSafeView backgroundColor={isWelcome ? '#080A0F' : theme.bg} style={styles.safe}>
      {!isWelcome && !isGenerating && (
        <View style={styles.header}>
          <TouchableOpacity onPress={goPrev} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerLogo, { color: theme.accent }]}>Fitness App</Text>
          <Text style={[styles.headerStep, { color: theme.textMuted }]}>{currentIndex}/{flow.length - 2}</Text>
        </View>
      )}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          isGenerating && styles.scrollCenter,
          (isWelcome || !isGenerating) && { paddingBottom: footerSpace },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {getStep()}
      </ScrollView>
      {showCTA && (
        <View style={[styles.bottomBar, { backgroundColor: isWelcome ? '#080A0F' : theme.bg, paddingBottom: footerInset }]}>
          <TouchableOpacity onPress={handleNext} disabled={isLoading} activeOpacity={0.85} style={styles.ctaBtnWrap}>
            <LinearGradient colors={[theme.accent, '#0DAE6C'] as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaBtn}>
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaBtnText}>{btnLabel}</Text>}
            </LinearGradient>
          </TouchableOpacity>
          {step === 'welcome' && (
            <Text style={[styles.signInText, { color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: spacing.md }]}>
              Your data stays on this device
            </Text>
          )}
        </View>
      )}
    </AndroidSafeView>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollView: { flex: 1 },
  scroll: { paddingBottom: spacing.lg, flexGrow: 1 },
  scrollCenter: { flexGrow: 1, justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  headerLogo: { fontSize: fontSize.xl, fontWeight: '800' },
  headerStep: { fontSize: fontSize.sm, fontWeight: '600' },
  stepContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  stepTitle: { fontSize: 24, fontWeight: '800', marginBottom: spacing.sm, lineHeight: 30 },
  stepSub: { fontSize: fontSize.base, marginBottom: 24, lineHeight: 22 },

  // Welcome
  welcomeWrap: { backgroundColor: '#080A0F', paddingHorizontal: spacing.lg, paddingTop: 24, paddingBottom: 12, alignItems: 'center', width: '100%' },
  welcomeGlow: { position: 'absolute', top: 20, width: 280, height: 120, backgroundColor: 'rgba(45,220,140,0.08)', borderRadius: 140 },
  welcomeLogo: { fontSize: 36, fontWeight: '900', color: '#2DDC8C', letterSpacing: 4, marginBottom: 12, textAlign: 'center' },
  welcomeLogoCompact: { fontSize: 28, letterSpacing: 2 },
  welcomeTagline: { fontSize: fontSize.base, color: 'rgba(255,255,255,0.60)', textAlign: 'center', marginBottom: 12, lineHeight: 22 },
  welcomeHint: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.40)', textAlign: 'center', marginBottom: 24, paddingHorizontal: spacing.sm },
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, width: '100%' },
  featureCard: { backgroundColor: '#111318', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(45,220,140,0.15)', position: 'relative', minHeight: 120 },
  featureCheck: { position: 'absolute', top: 10, right: 10, zIndex: 1 },
  featureCardActive: { borderColor: 'rgba(45,220,140,0.50)', backgroundColor: '#131a15' },
  featureIconWrap: { width: 44, height: 44, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 10, backgroundColor: 'rgba(45,220,140,0.08)' },
  featureCardTitle: { fontSize: 13, fontWeight: '800', color: '#fff', marginBottom: 4 },
  featureCardSub: { fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 14 },

  // Goal grid
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridTile: { width: '48%', padding: spacing.md, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', gap: spacing.sm, minHeight: 96, justifyContent: 'center', position: 'relative' },
  gridEmoji: { fontSize: 28 },
  gridLabel: { fontSize: fontSize.sm, fontWeight: '700', textAlign: 'center' },
  gridCheck: { position: 'absolute', top: 8, right: 8 },

  // Stats fields
  fieldsWrap: { gap: spacing.md },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: 6 },
  fieldInput: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 12, borderWidth: 1.5, marginBottom: spacing.sm },
  fieldTextInput: { flex: 1, fontSize: fontSize.lg, paddingVertical: 2 },
  fieldSuffix: { fontSize: fontSize.base, fontWeight: '600' },

  // Account
  accountHeader: { alignItems: 'center', marginBottom: spacing.md },
  logoCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  logoLetter: { fontSize: 28, fontWeight: '900', color: '#fff' },
  demoBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.lg },
  demoBadgeText: { flex: 1, fontSize: fontSize.sm, fontWeight: '600' },
  signUpBtnWrap: { borderRadius: 20, overflow: 'hidden', marginBottom: spacing.md },
  signUpBtn: { padding: 18, alignItems: 'center' },
  signUpBtnText: { fontSize: fontSize.lg, fontWeight: '800', color: '#fff' },
  privacyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  privacyText: { flex: 1, fontSize: fontSize.xs, lineHeight: 18 },

  // Generating
  generatingWrap: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  generatingTitle: { fontSize: 20, fontWeight: '700' },

  // Bottom bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.2)',
  },
  ctaBtnWrap: { borderRadius: 20, overflow: 'hidden' },
  ctaBtn: { padding: 18, alignItems: 'center' },
  ctaBtnText: { fontSize: fontSize.lg, fontWeight: '800', color: '#fff' },
  signInRow: { alignItems: 'center', marginTop: spacing.md },
  signInText: { fontSize: fontSize.sm },
});
