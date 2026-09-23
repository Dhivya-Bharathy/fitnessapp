import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { colors, spacing, radius, fontSize } from '../../theme';

const SECTIONS = [
  {
    title: 'Data We Collect',
    content: `Fitness App collects the following information to provide and improve your fitness experience:

- Account information: name, email address, and profile details you provide
- Body stats: height, weight, and fitness goals that you enter
- Activity data: food logs, water intake, workout sessions, steps, and notes you record
- AI interactions: prompts you send to the Fitness App Coach for personalised guidance

We only collect what is necessary to deliver your personalised fitness experience. No data is collected without your consent.`,
  },
  {
    title: 'How We Use Your Data',
    content: `Your data is used exclusively to:

- Calculate your personalised calorie targets and nutrition goals
- Power the Fitness App Coach AI with your fitness context for tailored advice
- Track your progress and generate workout recommendations
- Send you notifications and reminders you have opted into
- Improve app features through aggregated, anonymised analytics

We do not build advertising profiles or sell your personal information.`,
  },
  {
    title: 'Data Sharing',
    content: `Fitness App does not sell your personal data. We share limited data with:

- Supabase — our secure database and authentication provider
- NVIDIA — powers the Fitness App Coach AI (your prompts only, no health data shared)

All third-party providers are contractually bound to protect your data and use it only for the services they provide.`,
  },
  {
    title: 'Your Rights',
    content: `You have full control over your data:

- Access: view all data stored about you in the app
- Download: export your complete data from Settings
- Correct: update your information in Edit Profile at any time
- Delete: permanently delete your account and all associated data
- Opt out: disable AI coaching or notifications whenever you choose

To exercise any of these rights, use the controls in your Settings or contact us directly.`,
  },
  {
    title: 'Data Security',
    content: `We take security seriously:

- All data is encrypted in transit via HTTPS with TLS 1.3
- Authentication tokens are stored securely on your device
- Row Level Security ensures your data is only accessible to you
- No API keys or secrets are ever stored in the app codebase
- You must be logged in to access any stored information`,
  },
  {
    title: 'Data Retention',
    content: `We retain your data for as long as your account is active:

- All personal data is permanently deleted when you delete your account
- Anonymised, aggregated data may be retained for analytics purposes
- You can request immediate deletion by contacting our support team
- Backups are purged on a rolling cycle`,
  },
  {
    title: 'Contact Us',
    content: `For privacy questions, data requests, or support:

Contact your app administrator for privacy questions.`,
  },
];

export default function PrivacyScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];

  return (

    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color={theme.textPrimary} />
          <Text style={[styles.backText, { color: theme.textPrimary }]}>Settings</Text>
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>Privacy & Data</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={[styles.heroBadge, {
          backgroundColor: theme.accentDim as string,
          borderColor: theme.accent,
        }]}>
          <Ionicons name="shield-checkmark" size={24} color={theme.accent} />
          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, { color: theme.textPrimary }]}>
              Your data is protected
            </Text>
            <Text style={[styles.heroSub, { color: theme.textSecondary }]}>
              Fitness App never sells your data. You own it and can delete it anytime.
            </Text>
          </View>
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={[styles.sectionCard, {
            backgroundColor: theme.card,
            borderColor: theme.border,
          }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionContent, { color: theme.textSecondary }]}>
              {section.content}
            </Text>
          </View>
        ))}
      </ScrollView>

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

  heroBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  heroText: { flex: 1 },
  heroTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: 4 },
  heroSub: { fontSize: fontSize.sm, lineHeight: 18 },

  sectionCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.sm },
  sectionContent: { fontSize: fontSize.base, lineHeight: 22 },
});