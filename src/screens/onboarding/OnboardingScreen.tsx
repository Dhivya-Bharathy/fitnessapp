import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Platform,
} from 'react-native';
import { StickyFooterLayout } from '../../components/onboarding/StickyFooterLayout';
import { PrimaryCTA } from '../../components/onboarding/PrimaryCTA';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { supabase } from '../../services/supabase';
import { useIsCompactPhone, useLayoutWidth } from '../../hooks/useLayoutWidth';
import { isFitnessAssessmentComplete } from '../../utils/onboardingFlags';
const ACCENT = '#2DDC8C';

const ONBOARDING_FLOW = ['welcome', 'goal', 'stats', 'account', 'generating'] as const;
type OnboardingStepKey = (typeof ONBOARDING_FLOW)[number];

function showUserMessage(title: string, message: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

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
      <Text style={styles.welcomeHint}>
        Step 1 of setup — pick what to track. The 22-question AI intake starts right after you save your profile.
      </Text>
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
function StepGoal({ theme, selected, onSelect }: {
  theme: typeof colors.light;
  selected: string;
  onSelect: (g: string) => void;
}) {
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
      <StepSub text="Tap one — we'll take you to the next step." theme={theme} />
      <View style={styles.gridRow}>
        {goals.map((g) => (
          <TouchableOpacity key={g.label} activeOpacity={0.88} onPress={() => onSelect(g.label)}
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
function StepAccount({ theme, name, setName, username, setUsername }: {
  theme: typeof colors.light; name: string; setName: (v: string) => void;
  username: string; setUsername: (v: string) => void;
}) {
  return (
    <StepWrap>
      <View style={styles.accountHeader}>
        <LinearGradient colors={['#F0427C', '#FF6B35', '#FFB830']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoCircle}>
          <Text style={styles.logoLetter}>F</Text>
        </LinearGradient>
        <StepTitle text="Your Profile" theme={theme} />
        <StepSub
          text="Confirm your name and pick a username — then your AI plan intake begins."
          theme={theme}
        />
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

  const [step, setStep] = useState<OnboardingStepKey>('welcome');
  const [goal, setGoal] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [trackingPrefs, setTrackingPrefs] = useState<string[]>(['calories']);
  const [isLoading, setIsLoading] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  useEffect(() => {
    const { user: u, profile, forceAssessmentRetake } = useAuthStore.getState();
    if (!u?.id) return;

    if (profile?.goal && profile?.full_name && profile?.calfit_id) {
      if (forceAssessmentRetake || !isFitnessAssessmentComplete(profile)) {
        navigation.reset({ index: 0, routes: [{ name: 'FitnessAssessment' }] });
      } else {
        setOnboarding(false);
      }
      return;
    }

    if (profile?.full_name) setName(profile.full_name);
    else {
      const meta = u.user_metadata ?? {};
      const googleName =
        (typeof meta.full_name === 'string' && meta.full_name)
        || (typeof meta.name === 'string' && meta.name)
        || [meta.given_name, meta.family_name].filter(Boolean).join(' ');
      if (googleName) setName(googleName);
    }

    if (profile?.calfit_id) {
      setUsername(String(profile.calfit_id).replace(/^@/, ''));
    } else if (u.email) {
      const local = u.email.split('@')[0].replace(/[^a-z0-9_]/g, '').toLowerCase().slice(0, 20);
      if (local.length >= 3) setUsername(local);
    }

    if (profile?.goal) setGoal(profile.goal);
    if (profile?.height_cm != null) setHeight(String(profile.height_cm));
    if (profile?.current_weight_kg != null) setWeight(String(profile.current_weight_kg));

    if (profile?.goal && profile?.height_cm && profile?.current_weight_kg) {
      setStep('account');
    } else if (profile?.goal) {
      setStep('stats');
    }
  }, [navigation, setOnboarding]);

  const autoStepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goNext = useCallback(() => {
    setStep((current) => {
      const idx = ONBOARDING_FLOW.indexOf(current);
      const next = ONBOARDING_FLOW[idx + 1];
      return next ?? current;
    });
  }, []);

  const scheduleAutoStep = useCallback((advance: () => void) => {
    if (autoStepTimer.current) clearTimeout(autoStepTimer.current);
    autoStepTimer.current = setTimeout(advance, 340);
  }, []);

  useEffect(() => () => {
    if (autoStepTimer.current) clearTimeout(autoStepTimer.current);
  }, []);

  const toggleTrackingPref = (id: string) => {
    setTrackingPrefs((prev) => {
      const next = prev.includes(id)
        ? (prev.length > 1 ? prev.filter((x) => x !== id) : prev)
        : [...prev, id];
      if (step === 'welcome' && next.length > 0) {
        scheduleAutoStep(goNext);
      }
      return next;
    });
  };

  const selectGoal = (g: string) => {
    setGoal(g);
    scheduleAutoStep(goNext);
  };

  const currentIndex = ONBOARDING_FLOW.indexOf(step);
  const isWelcome = step === 'welcome';
  const isGenerating = step === 'generating';
  const progress = (currentIndex + 1) / (ONBOARDING_FLOW.length - 1);
  const showPrimaryFooter = step === 'stats' || step === 'account';
  const goPrev = () => {
    if (isGenerating) return;
    const prev = ONBOARDING_FLOW[currentIndex - 1];
    if (prev) setStep(prev); else navigation.goBack();
  };

  const handleSignUp = async () => {
    if (!name.trim()) {
      showUserMessage('Display name', 'Please enter your display name.');
      return;
    }
    if (username.trim().length < 3) {
      showUserMessage('Username', 'Pick a username with at least 3 characters (a–z, 0–9, underscore).');
      return;
    }
    setProfileSaveError(null);
    setIsLoading(true);
    try {
      setOnboarding(true);
      let userId = useAuthStore.getState().user?.id;
      let session = useAuthStore.getState().session;

      if (!userId) {
        if (Platform.OS === 'web') {
          showUserMessage(
            'Sign in with Google',
            'Go back to Welcome and tap Continue with Google, then complete this profile step.',
          );
          setOnboarding(false);
          setIsLoading(false);
          return;
        }
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
        if (error || !anonData?.session?.user) {
          Alert.alert('Error', error?.message ?? 'Could not create account.');
          setOnboarding(false);
          setIsLoading(false);
          return;
        }
        session = anonData.session;
        userId = anonData.session.user.id;
      }

      const { saveOnboardingProfile, getProfile } = await import('../../services/profileService');
      const saved = await saveOnboardingProfile(userId!, {
        full_name: name,
        calfit_id: username,
        goal,
        height_cm: parseFloat(height) || null,
        current_weight_kg: parseFloat(weight) || null,
        tracking_preferences: trackingPrefs,
      });
      if (!saved.ok) {
        setProfileSaveError(saved.message);
        showUserMessage('Profile not saved', saved.message);
        setOnboarding(false);
        setIsLoading(false);
        return;
      }

      const full = await getProfile(userId!);
      const profileRow = full ?? (saved.profile as any);

      if (session?.user) {
        useAuthStore.setState({
          session,
          user: session.user,
          isAuthenticated: true,
          isOnboarding: true,
          profile: profileRow,
        });
        const { sendWelcomeNotification } = await import('../../services/notificationService');
        await sendWelcomeNotification(session.user.id, name || 'there');
      } else {
        useAuthStore.getState().updateProfile(profileRow);
      }

      useAuthStore.getState().setOnboarding(true);
      setIsLoading(false);
      navigation.reset({ index: 0, routes: [{ name: 'FitnessAssessment' }] });
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

  const btnLabel = step === 'account' ? 'Save & continue' : 'Continue';

  const getStep = () => {
    switch (step) {
      case 'welcome':  return <StepWelcome selected={trackingPrefs} onToggle={toggleTrackingPref} layoutWidth={layoutWidth} compact={compact} />;
      case 'goal':     return <StepGoal theme={theme} selected={goal} onSelect={selectGoal} />;
      case 'stats':    return <StepStats theme={theme} height={height} setHeight={setHeight} weight={weight} setWeight={setWeight} />;
      case 'account':  return (
        <>
          {profileSaveError ? (
            <View style={[styles.saveErrorBanner, { borderColor: '#F87171', backgroundColor: 'rgba(248,113,113,0.12)' }]}>
              <Text style={styles.saveErrorText}>{profileSaveError}</Text>
            </View>
          ) : null}
          <StepAccount
            theme={theme}
            name={name}
            setName={setName}
            username={username}
            setUsername={setUsername}
          />
        </>
      );
      case 'generating': return <StepGenerating theme={theme} />;
      default: return null;
    }
  };

  const bg = isWelcome ? '#080A0F' : theme.bg;

  const header = !isWelcome && !isGenerating ? (
    <View>
      <View style={styles.header}>
        <TouchableOpacity onPress={goPrev} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerLogo, { color: theme.accent }]}>Fitness App</Text>
        <Text style={[styles.headerStep, { color: theme.textMuted }]}>{currentIndex}/{ONBOARDING_FLOW.length - 2}</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
        <LinearGradient
          colors={[theme.accent, '#0DAE6C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%` }]}
        />
      </View>
    </View>
  ) : undefined;

  const footerHint = step === 'welcome'
    ? 'Tap what you want to track'
    : step === 'goal'
      ? 'Tap your goal to continue'
      : null;

  const footer = isGenerating ? null : showPrimaryFooter ? (
    isLoading ? (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={theme.accent} />
      </View>
    ) : (
      <PrimaryCTA label={btnLabel} onPress={handleNext} />
    )
  ) : footerHint ? (
    <Text style={[styles.footerHint, { color: isWelcome ? 'rgba(255,255,255,0.45)' : theme.textMuted }]}>
      {footerHint}
    </Text>
  ) : null;

  return (
    <StickyFooterLayout
      backgroundColor={bg}
      header={header}
      footer={footer}
      padHorizontal={false}
      scrollPaddingBottom={spacing.lg}
    >
      <View style={isGenerating ? styles.scrollCenter : undefined}>{getStep()}</View>
    </StickyFooterLayout>
  );
}

// ── STYLES ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollCenter: { flexGrow: 1, justifyContent: 'center', minHeight: 280 },
  loadingFooter: { paddingVertical: spacing.md, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  progressTrack: { height: 4, marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%' },
  footerHint: { textAlign: 'center', fontSize: fontSize.sm, fontWeight: '600', paddingVertical: spacing.md },
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

  signInRow: { alignItems: 'center', marginTop: spacing.md },
  signInText: { fontSize: fontSize.sm },
  saveErrorBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  saveErrorText: { color: '#FCA5A5', fontSize: fontSize.sm, lineHeight: 20 },
});
