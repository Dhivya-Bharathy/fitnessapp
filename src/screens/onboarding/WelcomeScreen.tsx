import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  Image,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { isAssessmentCompleteForUser, isProfileSetupComplete } from '../../utils/onboardingFlags';
import { spacing, fontSize, radius } from '../../theme';

const ACCENT = '#2DDC8C';
const BG = '#050608';
const HERO = require('../../../assets/images/welcome-hero.jpg');

const HIGHLIGHTS = [
  'Log meals with photos, voice, or search — Indian foods included',
  'Train with workouts and plans built around your goals',
  'Real-time guidance from an AI coach that adapts to you',
];

export default function WelcomeScreen() {
  const navigation = useNavigation<any>();
  const { height: windowH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heroHeight = Math.min(Math.max(windowH * 0.42, 240), 360);

  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const authReady = useAuthStore((s) => s.authReady);
  const loadProfile = useAuthStore((s) => s.loadProfile);
  const [googleLoading, setGoogleLoading] = useState(false);
  const autoNavDone = useRef(false);

  const continueAfterAuth = useCallback(async () => {
    const { user: u, profile: p } = useAuthStore.getState();
    if (!u || u.is_anonymous) return;

    let prof = p;
    if (!prof && u.id) {
      prof = await loadProfile(u.id);
    }

    if (!isProfileSetupComplete(prof)) {
      navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
      return;
    }
    const { forceAssessmentRetake } = useAuthStore.getState();
    const intakeDone = await isAssessmentCompleteForUser(u.id, prof, {
      forceRetake: forceAssessmentRetake,
    });
    if (!intakeDone) {
      navigation.reset({ index: 0, routes: [{ name: 'FitnessAssessment' }] });
      return;
    }
    useAuthStore.getState().setOnboarding(false);
  }, [navigation, loadProfile]);

  useEffect(() => {
    if (!authReady || Platform.OS !== 'web') return;
    import('../../utils/completeOAuthRedirect').then(({ consumeOAuthError }) => {
      const err = consumeOAuthError();
      if (err && typeof window !== 'undefined') {
        window.alert(`Google sign-in\n\n${err}`);
      }
    });
  }, [authReady]);

  useEffect(() => {
    if (!authReady || autoNavDone.current) return;
    if (!user || user.is_anonymous) return;

    autoNavDone.current = true;
    void continueAfterAuth();
  }, [authReady, user?.id, user?.is_anonymous, continueAfterAuth]);

  const onGetStarted = async () => {
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);
    if (!result.ok) {
      const msg = result.message ?? 'Google sign-in failed.';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert(`Google sign-in\n\n${msg}`);
      } else {
        Alert.alert('Google sign-in', msg);
      }
      return;
    }
    if (Platform.OS !== 'web') {
      await continueAfterAuth();
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: BG, paddingTop: insets.top }]}>
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.heroWrap, { height: heroHeight }]}>
          <Image source={HERO} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(5,6,8,0.35)', BG]}
            locations={[0.15, 0.55, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.heroBadgeRow}>
            <View style={styles.langPill}>
              <Text style={styles.langText}>EN</Text>
            </View>
          </View>
          <View style={styles.heroGlowRing} pointerEvents="none" />
        </View>

        <View style={styles.body}>
          <Text style={styles.kicker}>FITNESS APP</Text>
          <Text style={styles.headline}>
            Lose fat.{'\n'}Build muscle.{'\n'}
            <Text style={styles.headlineAccent}>Stay consistent.</Text>
          </Text>
          <Text style={styles.subhead}>
            One place for training, Indian nutrition, and an AI coach that actually knows your routine.
          </Text>

          <View style={styles.list}>
            {HIGHLIGHTS.map((line) => (
              <View key={line} style={styles.listRow}>
                <View style={styles.checkWrap}>
                  <Ionicons name="checkmark" size={16} color={ACCENT} />
                </View>
                <Text style={styles.listText}>{line}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TouchableOpacity
          disabled={googleLoading}
          onPress={onGetStarted}
          activeOpacity={0.88}
          style={styles.primaryBtn}
          accessibilityRole="button"
          accessibilityLabel="Get started with Google"
        >
          {googleLoading ? (
            <ActivityIndicator color="#050608" />
          ) : (
            <>
              <Text style={styles.primaryBtnText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#050608" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          disabled={googleLoading}
          onPress={onGetStarted}
          activeOpacity={0.85}
          style={styles.googleRow}
        >
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.googleLabel}>Continue with Google</Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          By continuing, you agree to our Terms & Privacy. Your progress syncs when you sign in.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  heroWrap: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  heroImage: { width: '100%', height: '100%' },
  heroBadgeRow: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  langText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  heroGlowRing: {
    position: 'absolute',
    bottom: -40,
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(45,220,140,0.25)',
    backgroundColor: 'rgba(45,220,140,0.04)',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  kicker: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: spacing.sm,
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: spacing.md,
  },
  headlineAccent: { color: ACCENT },
  subhead: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: fontSize.base,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  list: { gap: spacing.sm },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  checkWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45,220,140,0.14)',
    marginTop: 1,
  },
  listText: {
    flex: 1,
    color: 'rgba(255,255,255,0.92)',
    fontSize: fontSize.sm,
    lineHeight: 20,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: BG,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 999,
    minHeight: 54,
  },
  primaryBtnText: {
    color: '#050608',
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  googleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  googleG: {
    fontSize: 17,
    fontWeight: '900',
    color: '#4285F4',
    width: 20,
    textAlign: 'center',
  },
  googleLabel: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  legal: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.38)',
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: spacing.sm,
    marginTop: 2,
  },
});
