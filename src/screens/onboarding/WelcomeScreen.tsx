import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { useIsCompactPhone } from '../../hooks/useLayoutWidth';
import { StickyFooterLayout } from '../../components/onboarding/StickyFooterLayout';
import { useAuthStore } from '../../store/authStore';
import { isFitnessAssessmentComplete } from '../../utils/onboardingFlags';

export default function WelcomeScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];
  const compact = useIsCompactPhone();
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

    if (!prof?.goal) {
      navigation.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
      return;
    }
    if (!isFitnessAssessmentComplete(prof)) {
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

  const features = [
    { icon: 'nutrition-outline', text: 'Calories, water & Indian food search' },
    { icon: 'chatbubble-ellipses-outline', text: '22-question AI training + Indian diet' },
    { icon: 'barbell-outline', text: 'Workouts, sleep & steps' },
    { icon: 'flash-outline', text: 'Progress tracking & AI coach' },
  ];

  return (
    <StickyFooterLayout
      backgroundColor={theme.bg}
      footer={
        <View style={styles.footerStack}>
          <TouchableOpacity
            disabled={googleLoading}
            onPress={async () => {
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
            }}
            style={[styles.googleBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            accessibilityRole="button"
          >
            {googleLoading ? (
              <ActivityIndicator color={theme.accent} />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={[styles.googleText, { color: theme.textPrimary }]}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={[styles.footerHint, { color: theme.textMuted }]}>
            One tap with Google — your progress stays when you switch tabs or come back later.
          </Text>
        </View>
      }
    >
      <View style={styles.logoWrap}>
        <View style={[styles.logoCircle, compact && styles.logoCircleCompact, {
          backgroundColor: theme.accentDim as string,
          borderColor: theme.accent,
        }]}>
          <Text style={[styles.logoLetter, compact && styles.logoLetterCompact, { color: theme.accent }]}>F</Text>
        </View>
        <Text style={[styles.logoText, compact && styles.logoTextCompact, { color: theme.textPrimary }]}>
          FITNESS APP
        </Text>
        <Text style={[styles.logoSub, { color: theme.textSecondary }]}>
          Your personal fitness & nutrition coach
        </Text>
      </View>

      <View style={styles.features}>
        {features.map((f) => (
          <View key={f.text} style={[styles.featureRow, {
            backgroundColor: theme.card,
            borderColor: theme.border,
          }]}>
            <View style={[styles.featureIcon, { backgroundColor: theme.accentDim as string }]}>
              <Ionicons name={f.icon as any} size={22} color={theme.accent} />
            </View>
            <Text style={[styles.featureText, { color: theme.textPrimary }]}>{f.text}</Text>
          </View>
        ))}
      </View>
      <Text style={[styles.disclaimer, { color: theme.textMuted }]}>
        Answer 22 questions for your personalized plan.
      </Text>
    </StickyFooterLayout>
  );
}

const styles = StyleSheet.create({
  logoWrap: { alignItems: 'center', marginBottom: spacing.lg, paddingTop: spacing.sm },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, marginBottom: spacing.md,
  },
  logoCircleCompact: { width: 64, height: 64, borderRadius: 32 },
  logoLetter: { fontSize: 34, fontWeight: '800' },
  logoLetterCompact: { fontSize: 28 },
  logoText: { fontSize: 26, fontWeight: '800', letterSpacing: 2, marginBottom: spacing.sm },
  logoTextCompact: { fontSize: 22, letterSpacing: 1 },
  logoSub: { fontSize: fontSize.base, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.sm },
  features: { gap: spacing.sm },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, minHeight: 56,
  },
  featureIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  featureText: { fontSize: fontSize.base, fontWeight: '500', flex: 1, lineHeight: 20 },
  disclaimer: { textAlign: 'center', fontSize: fontSize.sm, marginTop: spacing.lg, lineHeight: 18 },
  footerStack: { gap: spacing.sm },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.xl,
    borderWidth: 1,
    minHeight: 52,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4285F4',
    width: 22,
    textAlign: 'center',
  },
  googleText: { fontSize: fontSize.base, fontWeight: '700' },
  footerHint: { fontSize: fontSize.xs, textAlign: 'center', lineHeight: 16, paddingHorizontal: spacing.sm },
});
