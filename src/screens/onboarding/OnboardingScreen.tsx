import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Platform, Image,
} from 'react-native';
import { StickyFooterLayout } from '../../components/onboarding/StickyFooterLayout';
import { PrimaryCTA } from '../../components/onboarding/PrimaryCTA';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BodyMeasureCard, type MeasureUnit } from '../../components/onboarding/BodyMeasureCard';
import { PremiumProfileField } from '../../components/onboarding/PremiumProfileField';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { supabase } from '../../services/supabase';
import { useIsCompactPhone } from '../../hooks/useLayoutWidth';
import { CompactOptionGrid } from '../../components/onboarding/CompactOptionGrid';
import { isAssessmentCompleteForUser, isProfileSetupComplete } from '../../utils/onboardingFlags';
import { showUserMessage, showSaveSuccess } from '../../utils/userMessages';
import type { Profile } from '../../services/profileService';

const ACCENT = '#2DDC8C';
const ONBOARDING_TRACK_HERO = require('../../../assets/images/onboarding-track-hero.png');
const ONBOARDING_FLOW = ['welcome', 'goal', 'stats', 'account', 'generating'] as const;
type OnboardingStepKey = (typeof ONBOARDING_FLOW)[number];

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
  {
    id: 'calories',
    icon: 'nutrition-outline',
    title: 'Nutrition Tracking',
    sub: 'Track meals, calories & hydration',
    color: '#2DDC8C',
  },
  {
    id: 'workouts',
    icon: 'barbell-outline',
    title: 'Activity Tracking',
    sub: 'Monitor workouts & daily movement',
    color: '#FFB347',
  },
  {
    id: 'sleep',
    icon: 'moon-outline',
    title: 'Recovery & Health',
    sub: 'Sleep, body stats & wellness insights',
    color: '#B280FF',
  },
  {
    id: 'progress',
    icon: 'stats-chart-outline',
    title: 'Progress Insights',
    sub: 'Track trends & reflect on your journey',
    color: '#6699FF',
  },
] as const;

/** Hero image only (icons are in the asset — no duplicate overlays). */
const TRACK_HERO_HEIGHT = 268;

// ── WELCOME ────────────────────────────────────────────────────
function StepWelcome({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <View style={styles.welcomeWrap}>
      <View style={[styles.trackHeroWrap, { height: TRACK_HERO_HEIGHT }]}>
        <Image
          source={ONBOARDING_TRACK_HERO}
          style={styles.trackHeroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(8,10,15,0.4)', '#080A0F']}
          locations={[0.5, 0.85, 1]}
          style={styles.heroBottomFade}
        />
      </View>

      <View style={styles.welcomeCopy}>
        <Text style={styles.welcomeHeadline}>
          Your Fitness Journey{'\n'}
          <Text style={styles.welcomeHeadlineAccent}>Starts Here</Text>
        </Text>
        <View style={styles.stepDots}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={styles.stepDot} />
          <View style={styles.stepDot} />
          <View style={styles.stepDot} />
        </View>
        <Text style={styles.welcomeSub}>
          Personalized plan powered by AI & tailored nutrition.
        </Text>
      </View>

      <View style={styles.trackCardList}>
        {WELCOME_FEATURES.map((c) => {
          const active = selected.includes(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              activeOpacity={0.88}
              onPress={() => onToggle(c.id)}
              style={[
                styles.trackCard,
                {
                  borderColor: active ? c.color : `${c.color}44`,
                  backgroundColor: active ? `${c.color}14` : 'rgba(255,255,255,0.04)',
                },
              ]}
            >
              <View style={[styles.trackIconBox, { borderColor: `${c.color}66`, backgroundColor: `${c.color}18` }]}>
                <Ionicons name={c.icon as any} size={22} color={c.color} />
              </View>
              <View style={styles.trackCardText}>
                <Text style={styles.trackCardTitle}>{c.title}</Text>
                <Text style={styles.trackCardSub}>{c.sub}</Text>
              </View>
              <View style={[styles.trackChevron, active && { backgroundColor: `${c.color}22`, borderColor: c.color }]}>
                {active ? (
                  <Ionicons name="checkmark" size={16} color={c.color} />
                ) : (
                  <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.45)" />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const GOAL_OPTIONS = [
  { label: 'Lose Weight', icon: 'flame-outline', color: '#FF6B35', glow: 'rgba(255,107,53,0.35)' },
  { label: 'Build Muscle', icon: 'barbell-outline', color: '#2DDC8C', glow: 'rgba(45,220,140,0.35)' },
  { label: 'Get Fit', icon: 'walk-outline', color: '#6699FF', glow: 'rgba(102,153,255,0.35)' },
  { label: 'Maintain', icon: 'leaf-outline', color: '#B280FF', glow: 'rgba(178,128,255,0.35)' },
  { label: 'Gain Weight', icon: 'trending-up-outline', color: '#FF6B9D', glow: 'rgba(255,107,157,0.35)' },
  { label: 'Improve Diet', icon: 'nutrition-outline', color: '#FFD133', glow: 'rgba(255,209,51,0.35)' },
] as const;

// ── GOAL ───────────────────────────────────────────────────────
function StepGoal({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (g: string) => void;
}) {
  const gridOptions = GOAL_OPTIONS.map((g) => ({
    value: g.label,
    label: g.label,
    icon: g.icon,
    color: g.color,
  }));

  return (
    <View style={styles.goalWrap}>
      <View style={styles.goalCopy}>
        <Text style={styles.goalTitle}>What&apos;s your goal?</Text>
        <Text style={styles.goalSub}>Pick one — all six fit on this screen.</Text>
      </View>

      <View style={styles.goalGrid}>
        <CompactOptionGrid
          options={gridOptions}
          selectedValues={selected ? [selected] : []}
          onPress={onSelect}
        />
      </View>
    </View>
  );
}

// ── STATS ──────────────────────────────────────────────────────
function StepStats({
  height,
  setHeight,
  weight,
  setWeight,
}: {
  height: string;
  setHeight: (v: string) => void;
  weight: string;
  setWeight: (v: string) => void;
}) {
  const [heightUnit, setHeightUnit] = useState<MeasureUnit>('metric');
  const [weightUnit, setWeightUnit] = useState<MeasureUnit>('metric');

  const heightCm = useMemo(() => {
    const n = parseFloat(height);
    return Number.isFinite(n) && n > 0 ? n : 175;
  }, [height]);

  const weightKg = useMemo(() => {
    const n = parseFloat(weight);
    return Number.isFinite(n) && n > 0 ? n : 70;
  }, [weight]);

  useEffect(() => {
    if (!height.trim()) setHeight('175');
    if (!weight.trim()) setWeight('70');
  }, [height, weight, setHeight, setWeight]);

  return (
    <View style={styles.statsWrap}>
      <View style={styles.statsTitleRow}>
        <View style={styles.statsTitleCol}>
          <Text style={styles.statsTitle}>
            Your <Text style={styles.statsAccent}>height & weight</Text>
          </Text>
          <Text style={styles.statsSub}>For calculating your BMI and calorie targets.</Text>
        </View>
        <View style={styles.statsHeroArt}>
          <LinearGradient
            colors={['rgba(45,220,140,0.35)', 'transparent']}
            style={styles.statsHeroGlow}
          />
          <Ionicons name="scale-outline" size={36} color={ACCENT} style={styles.statsHeroScale} />
          <Ionicons name="analytics-outline" size={20} color="rgba(45,220,140,0.55)" style={styles.statsHeroChart} />
        </View>
      </View>

      <BodyMeasureCard
        kind="height"
        icon="body-outline"
        valueMetric={heightCm}
        unit={heightUnit}
        onUnitChange={setHeightUnit}
        onChangeMetric={(v) => setHeight(String(v))}
      />
      <BodyMeasureCard
        kind="weight"
        icon="scale-outline"
        valueMetric={weightKg}
        unit={weightUnit}
        onUnitChange={setWeightUnit}
        onChangeMetric={(v) => setWeight(String(v))}
      />
    </View>
  );
}

// ── ACCOUNT ────────────────────────────────────────────────────
function StepAccount({
  name,
  setName,
  username,
  setUsername,
  saveError,
  saveSuccess,
}: {
  name: string;
  setName: (v: string) => void;
  username: string;
  setUsername: (v: string) => void;
  saveError: string | null;
  saveSuccess: string | null;
}) {
  return (
    <View style={styles.accountWrap}>
      <View style={styles.accountOrbTop} pointerEvents="none" />
      <View style={styles.accountOrbBottom} pointerEvents="none" />

      <Text style={styles.accountStepBadge}>STEP 3</Text>

      <View style={styles.accountTitleRow}>
        <View style={styles.accountTitleCol}>
          <Text style={styles.accountTitle}>
            Your <Text style={styles.statsAccent}>Profile</Text>
          </Text>
          <Text style={styles.accountSub}>
            Confirm your name and pick a username — then your AI plan intake begins.
          </Text>
        </View>
        <View style={styles.profileHeroArt}>
          <LinearGradient
            colors={['rgba(45,220,140,0.4)', 'rgba(45,220,140,0.05)']}
            style={styles.profileHeroRing}
          />
          <View style={styles.profileCardIllus}>
            <LinearGradient
              colors={['rgba(45,220,140,0.25)', 'rgba(255,255,255,0.06)']}
              style={StyleSheet.absoluteFillObject}
            />
            <Ionicons name="person" size={28} color={ACCENT} />
            <View style={styles.profileCardLines}>
              <View style={styles.profileLine} />
              <View style={[styles.profileLine, styles.profileLineShort]} />
            </View>
          </View>
          <View style={styles.profileEditBadge}>
            <Ionicons name="pencil" size={12} color="#080A0F" />
          </View>
        </View>
      </View>

      {saveSuccess ? (
        <View style={[styles.saveOkBanner, styles.accountBanner]}>
          <Text style={[styles.saveOkText, { color: ACCENT }]}>{saveSuccess}</Text>
        </View>
      ) : null}
      {saveError ? (
        <View style={[styles.saveErrorBanner, styles.accountBanner]}>
          <Text style={styles.saveErrorText}>{saveError}</Text>
        </View>
      ) : null}

      <PremiumProfileField
        label="Display name"
        icon="person-outline"
        value={name}
        onChangeText={setName}
        placeholder="e.g. John Doe"
        autoCapitalize="words"
      />
      <PremiumProfileField
        label="Username"
        icon="at"
        value={username}
        onChangeText={setUsername}
        placeholder="johndoe"
        prefix="@"
        sanitize={(t) => t.replace(/[^a-z0-9_]/g, '').toLowerCase()}
      />
      <Text style={styles.accountHelper}>This will be your unique identity in the app.</Text>
    </View>
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
  const { setOnboarding, profile, user } = useAuthStore();
  const theme = colors[colorScheme];
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
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { user: u, profile: p, forceAssessmentRetake } = useAuthStore.getState();
      if (!u?.id || !active) return;

      if (isProfileSetupComplete(p)) {
        const intakeDone = await isAssessmentCompleteForUser(u.id, p, {
          forceRetake: forceAssessmentRetake,
        });
        if (!active) return;
        if (!intakeDone) {
          navigation.reset({ index: 0, routes: [{ name: 'FitnessAssessment' }] });
        } else {
          setOnboarding(false);
        }
        return;
      }

    if (p?.full_name) setName(p.full_name);
    else {
      const meta = u.user_metadata ?? {};
      const googleName =
        (typeof meta.full_name === 'string' && meta.full_name)
        || (typeof meta.name === 'string' && meta.name)
        || [meta.given_name, meta.family_name].filter(Boolean).join(' ');
      if (googleName) setName(googleName);
    }

    if (p?.calfit_id) {
      setUsername(String(p.calfit_id).replace(/^@/, ''));
    } else if (u.email) {
      const local = u.email.split('@')[0].replace(/[^a-z0-9_]/g, '').toLowerCase().slice(0, 20);
      if (local.length >= 3) setUsername(local);
    }

    if (p?.goal) setGoal(p.goal);
    if (p?.height_cm != null) setHeight(String(p.height_cm));
    if (p?.current_weight_kg != null) setWeight(String(p.current_weight_kg));

      if (p?.goal && p?.height_cm && p?.current_weight_kg) {
        setStep('account');
      } else if (p?.goal) {
        setStep('stats');
      }
    })();
    return () => {
      active = false;
    };
  }, [
    navigation,
    setOnboarding,
    user?.id,
    profile?.goal,
    profile?.full_name,
    profile?.calfit_id,
    profile?.height_cm,
    profile?.current_weight_kg,
    profile?.tracking_preferences,
  ]);

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
      if (prev.includes(id)) {
        return prev.length > 1 ? prev.filter((x) => x !== id) : prev;
      }
      return [...prev, id];
    });
  };

  const selectGoal = (g: string) => {
    setGoal(g);
    scheduleAutoStep(goNext);
  };

  const currentIndex = ONBOARDING_FLOW.indexOf(step);
  const isWelcome = step === 'welcome';
  const isGoal = step === 'goal';
  const isStats = step === 'stats';
  const isAccount = step === 'account';
  const isDarkStep = isWelcome || isGoal || isStats || isAccount;
  const isGenerating = step === 'generating';
  const progress = (currentIndex + 1) / (ONBOARDING_FLOW.length - 1);
  const showPrimaryFooter =
    step === 'stats' || step === 'account' || (step === 'welcome' && trackingPrefs.length > 0);
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
    setProfileSaveSuccess(null);
    setIsLoading(true);
    try {
      setOnboarding(true);

      const { data: { session: freshSession } } = await supabase.auth.getSession();
      let userId = freshSession?.user?.id ?? useAuthStore.getState().user?.id;
      let session = freshSession ?? useAuthStore.getState().session;
      if (freshSession?.user) {
        useAuthStore.setState({
          session: freshSession,
          user: freshSession.user,
          isAuthenticated: true,
        });
      }

      if (!goal?.trim()) {
        showUserMessage('Pick a goal', 'Go back and choose your primary fitness goal, then save again.');
        setIsLoading(false);
        return;
      }

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

      const { saveOnboardingProfile } = await import('../../services/profileService');
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

      const profileRow = saved.profile as Profile;

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

      await useAuthStore.getState().loadProfile(userId!);

      const intakeDone = await isAssessmentCompleteForUser(userId!, profileRow, {
        forceRetake: useAuthStore.getState().forceAssessmentRetake,
      });

      setProfileSaveSuccess(`Welcome, ${name.trim()}! Your Fitness ID is @${username.trim().toLowerCase()}.`);
      setIsLoading(false);

      if (intakeDone) {
        showSaveSuccess('You are all set. Opening the app…');
        useAuthStore.getState().setOnboarding(false);
        return;
      }

      showSaveSuccess('Next: a short AI intake (22 questions) for your personalized workout and diet plan.');
      useAuthStore.getState().setOnboarding(true);
      navigation.reset({ index: 0, routes: [{ name: 'FitnessAssessment' }] });
    } catch (e: unknown) {
      setOnboarding(false);
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      showUserMessage('Could not save profile', msg);
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

  const btnLabel =
    step === 'account' ? 'Save profile →' : step === 'stats' ? 'Continue →' : 'Continue';

  const getStep = () => {
    switch (step) {
      case 'welcome':  return <StepWelcome selected={trackingPrefs} onToggle={toggleTrackingPref} />;
      case 'goal':     return <StepGoal selected={goal} onSelect={selectGoal} />;
      case 'stats':    return <StepStats height={height} setHeight={setHeight} weight={weight} setWeight={setWeight} />;
      case 'account':  return (
        <StepAccount
          name={name}
          setName={setName}
          username={username}
          setUsername={setUsername}
          saveError={profileSaveError}
          saveSuccess={profileSaveSuccess}
        />
      );
      case 'generating': return <StepGenerating theme={theme} />;
      default: return null;
    }
  };

  const darkOnboarding = isDarkStep;
  const bg = darkOnboarding ? '#080A0F' : theme.bg;

  const header = !isWelcome && !isGenerating ? (
    <View style={isDarkStep && !isWelcome ? styles.headerDark : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goPrev} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={isDarkStep ? '#fff' : theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerLogo, { color: isDarkStep ? ACCENT : theme.accent }]}>Fitness App</Text>
        <Text style={[styles.headerStep, { color: isDarkStep ? 'rgba(255,255,255,0.45)' : theme.textMuted }]}>
          {currentIndex}/{ONBOARDING_FLOW.length - 2}
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: isDarkStep ? 'rgba(255,255,255,0.12)' : theme.border }]}>
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
    ? 'Select your goals to continue'
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
    <Text style={[styles.footerHint, { color: darkOnboarding ? 'rgba(255,255,255,0.45)' : theme.textMuted }]}>
      {footerHint}
    </Text>
  ) : null;

  return (
    <StickyFooterLayout
      backgroundColor={bg}
      header={header}
      footer={footer}
      padHorizontal={false}
      scrollPaddingBottom={darkOnboarding ? spacing.xl * 2 : spacing.lg}
      scrollFlexGrow={!darkOnboarding}
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

  // Welcome — track selection (step 1)
  welcomeWrap: {
    backgroundColor: '#080A0F',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    paddingBottom: spacing.md,
    flexShrink: 0,
    alignSelf: 'stretch',
  },
  trackHeroWrap: {
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
    backgroundColor: '#080A0F',
  },
  trackHeroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
  },
  welcomeCopy: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    flexShrink: 0,
    backgroundColor: '#080A0F',
  },
  welcomeHeadline: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  welcomeHeadlineAccent: { color: ACCENT },
  stepDots: { flexDirection: 'row', gap: 6, marginTop: spacing.sm, marginBottom: 6 },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  stepDotActive: { width: 22, backgroundColor: ACCENT },
  welcomeSub: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  trackCardList: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    flexShrink: 0,
    maxWidth: '100%',
  },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  trackIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackCardText: { flex: 1 },
  trackCardTitle: { color: '#fff', fontSize: fontSize.base, fontWeight: '800', marginBottom: 2 },
  trackCardSub: { color: 'rgba(255,255,255,0.48)', fontSize: 12, lineHeight: 16 },
  trackChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  headerDark: { backgroundColor: '#080A0F' },

  // Goal step
  goalWrap: {
    backgroundColor: '#080A0F',
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    flexShrink: 0,
  },
  goalCopy: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  goalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  goalSub: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    lineHeight: 17,
  },
  goalGrid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    maxWidth: '100%',
  },

  statsWrap: {
    backgroundColor: '#080A0F',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    width: '100%',
    maxWidth: '100%',
  },
  statsTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  statsTitleCol: { flex: 1 },
  statsTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  statsAccent: { color: ACCENT },
  statsSub: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  statsHeroArt: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  statsHeroGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
  },
  statsHeroScale: { zIndex: 1 },
  statsHeroChart: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    zIndex: 1,
  },

  // Stats fields
  fieldsWrap: { gap: spacing.md },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: 6 },
  fieldInput: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: 12, borderWidth: 1.5, marginBottom: spacing.sm },
  fieldTextInput: { flex: 1, fontSize: fontSize.lg, paddingVertical: 2 },
  fieldSuffix: { fontSize: fontSize.base, fontWeight: '600' },

  accountWrap: {
    backgroundColor: '#080A0F',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  accountOrbTop: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(45,220,140,0.12)',
  },
  accountOrbBottom: {
    position: 'absolute',
    bottom: 20,
    left: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(45,220,140,0.08)',
  },
  accountStepBadge: {
    color: ACCENT,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: spacing.sm,
  },
  accountTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  accountTitleCol: { flex: 1 },
  accountTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  accountSub: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  profileHeroArt: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeroRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 44,
    opacity: 0.85,
  },
  profileCardIllus: {
    width: 64,
    height: 72,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(45,220,140,0.45)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  profileCardLines: {
    marginTop: 6,
    gap: 4,
    width: '70%',
  },
  profileLine: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    width: '100%',
  },
  profileLineShort: { width: '65%', alignSelf: 'center' },
  profileEditBadge: {
    position: 'absolute',
    right: 6,
    bottom: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountHelper: {
    color: 'rgba(255,255,255,0.42)',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
    textAlign: 'center',
  },
  accountBanner: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: spacing.sm,
  },
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
    borderColor: '#F87171',
    backgroundColor: 'rgba(248,113,113,0.12)',
  },
  saveErrorText: { color: '#FCA5A5', fontSize: fontSize.sm, lineHeight: 20 },
  saveOkBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'rgba(45,220,140,0.12)',
  },
  saveOkText: { fontSize: fontSize.sm, lineHeight: 20, fontWeight: '600' },
});
