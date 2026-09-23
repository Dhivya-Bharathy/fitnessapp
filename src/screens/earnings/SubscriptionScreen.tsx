import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { isFitnessAssessmentComplete } from '../../utils/onboardingFlags';
const ALL_FEATURES = [
  'Unlimited AI Coach prompts',
  'Food scanner (AI vision)',
  'Calorie & macro tracking',
  'Water & step logging',
  'Workout generation & library',
  'AI Meal Planner',
  'Accountability partners & chat',
  'Community groups',
  'Live streaming',
  'Fasting & sleep tracking',
  'Progress & streaks',
  'Data export',
];

const TIERS = [
  {
    id: 'free',
    name: 'Starter',
    price: '₦0',
    period: 'forever',
    color: '#6B7280',
    features: ALL_FEATURES,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '₦0',
    period: 'forever',
    color: '#0DAE6C',
    features: ALL_FEATURES,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '₦0',
    period: 'forever',
    color: '#F59E0B',
    badge: 'BEST VALUE',
    features: ALL_FEATURES,
  },
];

export default function SubscriptionScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colorScheme } = useThemeStore();
  const { userTier, setOnboarding } = useAuthStore();
  const theme = colors[colorScheme];

  // fromOnboarding flag — passed from paywall handleTrial/handlePayNow
  // When true, back button goes to main app instead of trying goBack()
  // which would fail because there's no screen behind it in the auth stack
  const fromOnboarding = route.params?.fromOnboarding ?? false;
  const preselectedPlan = route.params?.plan ?? null;

  const [selectedTier, setSelectedTier] = useState<string | null>(null);

 const handleBack = () => {
  if (navigation.canGoBack()) {
    navigation.goBack(); // goes back to paywall inside OnboardingScreen
  }
};

  const finishOnboardingIfAllowed = () => {
    const { profile, forceAssessmentRetake } = useAuthStore.getState();
    if (forceAssessmentRetake || !isFitnessAssessmentComplete(profile)) {
      return;
    }
    setOnboarding(false);
  };

  const handleSubscribe = async (tier: typeof TIERS[0]) => {
    if (tier.id === 'free') {
      finishOnboardingIfAllowed();
      return;
    }
    setSelectedTier(tier.id);
    setTimeout(() => {
      setSelectedTier(null);
      finishOnboardingIfAllowed();
    }, 600);
  };

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
          <Text style={[styles.backText, { color: theme.textPrimary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Upgrade Fitness App</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>Choose your plan</Text>
          <Text style={[styles.heroSub, { color: theme.textSecondary }]}>
            Everything is free during this demo. No limits, no payments.
          </Text>
        </View>


        {/* Current plan */}
        <View style={[styles.currentPlanBadge, { backgroundColor: theme.accentDim as string, borderColor: theme.accent }]}>
          <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
          <Text style={[styles.currentPlanText, { color: theme.accent }]}>
            Current plan: {userTier ? userTier.charAt(0).toUpperCase() + userTier.slice(1) : 'Free'}
          </Text>
        </View>

        {/* Tier cards */}
        {TIERS.map((tier) => {
          const isCurrent      = userTier === tier.id;
          const isPreselected  = preselectedPlan === tier.id;
          const isLoadingThis  = selectedTier === tier.id;

          return (
            <View
              key={tier.id}
              style={[styles.tierCard, {
                backgroundColor: theme.card,
                borderColor: isCurrent ? tier.color : isPreselected ? tier.color + '88' : theme.border,
                borderWidth: isCurrent || isPreselected ? 2 : 1,
              }]}
            >
              {tier.badge && (
                <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
                  <Text style={styles.tierBadgeText}>{tier.badge}</Text>
                </View>
              )}
              {isCurrent && (
                <View style={[styles.currentBadge, { backgroundColor: tier.color + '22' }]}>
                  <Text style={[styles.currentBadgeText, { color: tier.color }]}>Current Plan</Text>
                </View>
              )}
              {isPreselected && !isCurrent && (
                <View style={[styles.currentBadge, { backgroundColor: tier.color + '22' }]}>
                  <Text style={[styles.currentBadgeText, { color: tier.color }]}>Recommended</Text>
                </View>
              )}

              <View style={styles.tierHeader}>
                <Text style={[styles.tierName, { color: tier.color }]}>{tier.name}</Text>
                <View style={styles.tierPriceRow}>
                  <Text style={[styles.tierPrice, { color: theme.textPrimary }]}>{tier.price}</Text>
                  <Text style={[styles.tierPeriod, { color: theme.textMuted }]}>/{tier.period}</Text>
                </View>
              </View>

              <View style={styles.featureList}>
                {tier.features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={tier.color} />
                    <Text style={[styles.featureText, { color: theme.textPrimary }]}>{f}</Text>
                  </View>
                ))}
              </View>

              {/* CTA */}
              {tier.id !== 'free' && !isCurrent && (
                <TouchableOpacity
                  onPress={() => handleSubscribe(tier)}
                  disabled={!!selectedTier}
                  style={[styles.ctaBtn, { backgroundColor: tier.color }]}
                >
                  {isLoadingThis
                    ? <Text style={styles.ctaBtnText}>Activating...</Text>
                    : <Text style={styles.ctaBtnText}>
                        Get {tier.name} — Free
                      </Text>}
                </TouchableOpacity>
              )}

              {isCurrent && tier.id !== 'free' && (
                <View style={[styles.activeTag, { backgroundColor: tier.color + '18', borderColor: tier.color }]}>
                  <Ionicons name="checkmark-circle" size={16} color={tier.color} />
                  <Text style={[styles.activeTagText, { color: tier.color }]}>
                    Current plan — everything is free
                  </Text>
                </View>
              )}
            </View>
          );
        })}
        
          {/* Skip to free — only shown when coming from onboarding paywall */}
          {fromOnboarding && (
            <TouchableOpacity
             onPress={finishOnboardingIfAllowed}
               style={styles.skipBtn}
     >
            <Text style={[styles.skipText, { color: theme.textMuted }]}>
              Continue to Fitness App
           </Text>
              </TouchableOpacity>
)}

        <Text style={[styles.legalNote, { color: theme.textMuted }]}>
          Everything is free during this demo. No payment required.{'\n'}
          Enjoy all features — no limits, no subscriptions.
        </Text>
      </ScrollView>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingBottom: 60 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { fontSize: fontSize.lg, fontWeight: '400' },
  title: { fontSize: fontSize.lg, fontWeight: '700' },

  hero: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.xs },
  heroTitle: { fontSize: fontSize.xxl, fontWeight: '800', textAlign: 'center' },
  heroSub: { fontSize: fontSize.base, textAlign: 'center' },

  currentPlanBadge: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    alignSelf: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, borderWidth: 1, marginBottom: spacing.lg,
  },
  currentPlanText: { fontSize: fontSize.sm, fontWeight: '600' },

  tierCard: {
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    padding: spacing.lg, borderRadius: radius.xl, gap: spacing.md,
  },
  tierBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm, marginBottom: -spacing.xs },
  tierBadgeText: { fontSize: fontSize.xs, fontWeight: '800', color: '#fff' },
  currentBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  currentBadgeText: { fontSize: fontSize.xs, fontWeight: '700' },

  tierHeader: { gap: 4 },
  tierName: { fontSize: fontSize.xl, fontWeight: '800' },
  tierPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  tierPrice: { fontSize: 32, fontWeight: '900' },
  tierPeriod: { fontSize: fontSize.base },

  featureList: { gap: spacing.xs },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureText: { fontSize: fontSize.base, flex: 1 },

  ctaBtn: { padding: spacing.lg, borderRadius: radius.lg, alignItems: 'center' },
  ctaBtnText: { fontSize: fontSize.lg, fontWeight: '700', color: '#fff' },

  activeTag: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    padding: spacing.sm, borderRadius: radius.md, borderWidth: 1,
  },
  activeTagText: { fontSize: fontSize.sm, fontWeight: '600' },

  skipBtn: { padding: spacing.lg, alignItems: 'center' },
skipText: { fontSize: fontSize.sm, fontWeight: '600', textDecorationLine: 'underline' },

  legalNote: { fontSize: fontSize.xs, lineHeight: 16, textAlign: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
});