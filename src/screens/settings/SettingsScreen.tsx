import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { confirmDialog } from '../../utils/confirmDialog';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useCallback, useState, type ReactNode } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, fontSize } from '../../theme';
import Avatar from '../../components/Avatar';
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
import {
  scheduleMealReminders,
  scheduleWaterReminder,
  scheduleWorkoutReminder,
  scheduleSleepReminder,
  scheduleStreakReminder,
  cancelAllReminders,
  requestNotificationPermissions,
} from '../../services/reminderService';

const PREFS_KEY = 'calfit_notification_prefs';

interface NotifPrefs {
  pushEnabled: boolean;
  streakReminders: boolean;
  mealReminders: boolean;
  waterReminders: boolean;
  workoutReminders: boolean;
  sleepReminders: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  pushEnabled: true,
  streakReminders: true,
  mealReminders: false,
  waterReminders: true,
  workoutReminders: false,
  sleepReminders: false,
};

async function loadPrefs(): Promise<NotifPrefs> {
  try {
    const raw = await SecureStore.getItemAsync(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFS, ...parsed, streakReminders: parsed.streakReminders ?? DEFAULT_PREFS.streakReminders };
  } catch {
    return DEFAULT_PREFS;
  }
}

async function savePrefs(prefs: NotifPrefs): Promise<void> {
  try {
    await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
}

const ORANGE = '#FFB347';
const GOLD = '#FFD133';
const PURPLE = '#B280FF';
const RED = '#FF5959';
const BLUE = '#6699FF';
type RowItem = {
  label: string;
  value?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (val: boolean) => void;
  onPress?: () => void;
};

function SettingsSection({
  icon,
  iconColor,
  title,
  subtitle,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionHeadIcon, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View style={styles.sectionHeadText}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.sectionSub}>{subtitle}</Text>
        </View>
      </View>
      <View style={[styles.sectionCard, premiumGlassShadow()]}>{children}</View>
    </View>
  );
}

function SettingsRow({ item, isLast }: { item: RowItem; isLast: boolean }) {
  return (
    <TouchableOpacity
      onPress={item.onPress}
      disabled={item.toggle && !item.onPress}
      activeOpacity={item.toggle ? 1 : 0.75}
      style={[styles.settingsRow, !isLast && styles.settingsRowBorder]}
    >
      <View style={[styles.iconWrap, { backgroundColor: (item.iconColor ?? PREMIUM_ACCENT) + '18' }]}>
        <Ionicons name={item.icon} size={18} color={item.iconColor ?? PREMIUM_ACCENT} />
      </View>
      <View style={styles.settingsInfo}>
        <Text style={styles.settingsLabel}>{item.label}</Text>
        {item.value ? (
          <Text style={styles.settingsValue} numberOfLines={2}>
            {item.value}
          </Text>
        ) : null}
      </View>
      {item.toggle ? (
        <Switch
          value={item.toggleValue ?? false}
          onValueChange={item.onToggle}
          trackColor={{ false: 'rgba(255,255,255,0.12)', true: PREMIUM_ACCENT }}
          thumbColor="#fff"
        />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={PREMIUM_MUTED} />
      )}
    </TouchableOpacity>
  );
}

function DangerAction({
  label,
  icon,
  onPress,
  variant,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant: 'signOut' | 'delete';
}) {
  const tint = variant === 'delete' ? 'rgba(255,89,89,0.12)' : 'rgba(255,89,89,0.08)';
  const border = variant === 'delete' ? 'rgba(255,89,89,0.35)' : 'rgba(255,89,89,0.22)';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.dangerCard, { backgroundColor: tint, borderColor: border }]}
    >
      <View style={[styles.dangerIcon, { backgroundColor: RED + '22' }]}>
        <Ionicons name={icon} size={20} color={RED} />
      </View>
      <Text style={styles.dangerLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={RED} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colorScheme, toggleTheme } = useThemeStore();
  const { user, profile, signOut, deleteAccount, updateProfile } = useAuthStore();

  const [darkMode, setDarkMode] = useState(colorScheme === 'dark');
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);

  const name = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'User';
  const username = profile?.calfit_id?.trim() || '';
  const calorieGoal = (profile as any)?.daily_calorie_goal ?? 2000;
  const waterGoalL = ((profile as any)?.water_goal_ml ?? 2500) / 1000;
  const unitsLabel =
    (profile as any)?.units === 'imperial' ? 'Imperial (lbs, ft)' : 'Metric (kg, cm)';

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const init = async () => {
        if (user?.id) {
          try {
            const { supabase } = await import('../../services/supabase');
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (data && active) updateProfile(data);
          } catch {}
        }
        const saved = await loadPrefs();
        if (active) {
          setPrefs(saved);
          setDarkMode(colorScheme === 'dark');
        }
      };
      init();
      return () => {
        active = false;
      };
    }, [user?.id, colorScheme]),
  );

  const updatePref = async (key: keyof NotifPrefs, val: boolean, sideEffect?: () => Promise<void>) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    await savePrefs(updated);
    if (sideEffect) await sideEffect();
  };

  const handleDarkMode = async (val: boolean) => {
    setDarkMode(val);
    if ((colorScheme === 'dark') !== val) toggleTheme();
  };

  const handlePushToggle = async (val: boolean) => {
    const granted = val ? await requestNotificationPermissions() : true;
    if (val && !granted) {
      Alert.alert('Permission Required', 'Allow notifications in your device Settings to enable reminders.');
      return;
    }
    if (!val) {
      await cancelAllReminders();
      const updated: NotifPrefs = {
        ...prefs,
        pushEnabled: false,
        streakReminders: false,
        mealReminders: false,
        waterReminders: false,
        workoutReminders: false,
        sleepReminders: false,
      };
      setPrefs(updated);
      await savePrefs(updated);
    } else {
      await updatePref('pushEnabled', true);
    }
  };

  const handleStreakReminders = async (val: boolean) =>
    updatePref('streakReminders', val, () => scheduleStreakReminder(val));

  const handleMealReminders = async (val: boolean) =>
    updatePref('mealReminders', val, () => scheduleMealReminders(val));

  const handleWaterReminder = async (val: boolean) =>
    updatePref('waterReminders', val, () => scheduleWaterReminder(val));

  const handleWorkoutReminder = async (val: boolean) =>
    updatePref('workoutReminders', val, () => scheduleWorkoutReminder(val));

  const handleSleepReminder = async (val: boolean) =>
    updatePref('sleepReminders', val, () => scheduleSleepReminder(val));

  const handleSignOut = async () => {
    const ok = await confirmDialog(
      'Sign Out',
      'You will return to the welcome screen. Your Supabase profile stays saved until you delete the account.',
      'Sign Out',
    );
    if (ok) await signOut();
  };

  const handleDeleteAccount = async () => {
    const ok = await confirmDialog(
      'Delete account',
      'This permanently deletes your profile, logs, and progress from the server and clears the 22-question assessment on this device. You will start from scratch. This cannot be undone.',
      'Continue',
    );
    if (!ok) return;

    const sure = await confirmDialog(
      'Delete forever?',
      'All your data will be removed and you will go back to Welcome → onboarding → 22 questions.',
      'Delete everything',
    );
    if (!sure) return;

    const result = await deleteAccount();
    if (!result.ok) {
      const msg = result.message ?? 'Could not delete account.';
      if (Platform.OS === 'web') {
        window.alert(msg + '\n\nIf delete is blocked, run 001_profiles_delete_policy.sql in Supabase SQL Editor.');
      } else {
        Alert.alert('Delete failed', msg);
      }
      return;
    }

    if (Platform.OS === 'web') {
      window.alert('Account deleted. Starting fresh.');
    } else {
      Alert.alert('Account deleted', 'You can create a new profile from Welcome.');
    }
  };

  const renderRows = (items: RowItem[]) =>
    items.map((item, i) => <SettingsRow key={item.label} item={item} isLast={i === items.length - 1} />);

  return (
    <AndroidSafeView backgroundColor={PREMIUM_BG} style={styles.safe}>
      <PremiumAtmosphereBackground />
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={PREMIUM_TEXT} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSub}>Personalize your fitness experience</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.88}
            style={[styles.profileCard, premiumGlassShadow()]}
          >
            <LinearGradient
              colors={['rgba(45,220,140,0.14)', 'rgba(45,220,140,0.04)', 'transparent'] as [string, string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Avatar size={56} borderWidth={2} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{name}</Text>
              <Text style={styles.profileHandle}>
                {username ? `@${username}` : 'Set username in Edit Profile'}
              </Text>
              <View style={styles.editRow}>
                <Ionicons name="settings-outline" size={13} color={PREMIUM_ACCENT} />
                <Text style={styles.editLink}>Edit Profile</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={PREMIUM_MUTED} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Main', { screen: 'Progress' })}
            activeOpacity={0.88}
            style={[styles.progressCard, premiumGlassShadow()]}
          >
            <LinearGradient
              colors={['rgba(45,220,140,0.12)', 'transparent'] as [string, string]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={[styles.progressIcon, { backgroundColor: PREMIUM_ACCENT + '22' }]}>
              <Ionicons name="trending-up" size={22} color={PREMIUM_ACCENT} />
            </View>
            <View style={styles.progressText}>
              <Text style={styles.progressTitle}>View My Progress</Text>
              <Text style={styles.progressSub}>Track your journey and see your improvements</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={PREMIUM_MUTED} />
          </TouchableOpacity>

          <SettingsSection
            icon="color-palette-outline"
            iconColor={PURPLE}
            title="Appearance"
            subtitle="Customize your look"
          >
            {renderRows([
              {
                label: 'Dark Mode',
                value: darkMode ? 'Switch between light and dark theme' : 'Switch between light and dark theme',
                icon: darkMode ? 'moon-outline' : 'sunny-outline',
                iconColor: darkMode ? PURPLE : GOLD,
                toggle: true,
                toggleValue: darkMode,
                onToggle: handleDarkMode,
              },
            ])}
          </SettingsSection>

          <SettingsSection icon="barbell-outline" iconColor={PREMIUM_ACCENT} title="Fitness" subtitle="Stay on track with smart reminders">
            {renderRows([
              {
                label: 'Goals',
                value: `${calorieGoal} kcal · ${waterGoalL}L water`,
                icon: 'flag-outline',
                iconColor: PREMIUM_ACCENT,
                onPress: () => navigation.navigate('Main', { screen: 'Goals' }),
              },
              {
                label: 'Units',
                value: unitsLabel,
                icon: 'speedometer-outline',
                iconColor: BLUE,
                onPress: () => navigation.navigate('EditProfile'),
              },
            ])}
          </SettingsSection>

          <SettingsSection icon="notifications-outline" iconColor={PURPLE} title="Notifications" subtitle="Get timely reminders">
            {renderRows([
              {
                label: 'Push Notifications',
                value: prefs.pushEnabled ? 'All alerts enabled' : 'All alerts disabled',
                icon: 'notifications-outline',
                iconColor: PREMIUM_ACCENT,
                toggle: true,
                toggleValue: prefs.pushEnabled,
                onToggle: handlePushToggle,
              },
              {
                label: 'Streak Reminders',
                value: 'Daily check-in alert',
                icon: 'flame-outline',
                iconColor: ORANGE,
                toggle: true,
                toggleValue: prefs.streakReminders,
                onToggle: handleStreakReminders,
              },
              {
                label: 'Meal Reminders',
                value: 'Remind me to log meals',
                icon: 'restaurant-outline',
                iconColor: PURPLE,
                toggle: true,
                toggleValue: prefs.mealReminders,
                onToggle: handleMealReminders,
              },
              {
                label: 'Water Reminder',
                value: 'Stay hydrated',
                icon: 'water-outline',
                iconColor: BLUE,
                toggle: true,
                toggleValue: prefs.waterReminders,
                onToggle: handleWaterReminder,
              },
              {
                label: 'Workout Reminder',
                value: 'Time for your workout',
                icon: 'barbell-outline',
                iconColor: RED,
                toggle: true,
                toggleValue: prefs.workoutReminders,
                onToggle: handleWorkoutReminder,
              },
              {
                label: 'Sleep Reminder',
                value: 'Get reminded to sleep',
                icon: 'moon-outline',
                iconColor: PURPLE,
                toggle: true,
                toggleValue: prefs.sleepReminders,
                onToggle: handleSleepReminder,
              },
            ])}
          </SettingsSection>

          <SettingsSection
            icon="shield-outline"
            iconColor={BLUE}
            title="Account & Privacy"
            subtitle="Manage your data and privacy"
          >
            {renderRows([
              {
                label: 'Privacy & Data Policy',
                value: 'How we use your data',
                icon: 'shield-outline',
                iconColor: BLUE,
                onPress: () => navigation.navigate('Main', { screen: 'Privacy' }),
              },
              {
                label: 'Download My Data',
                value: 'Export all your activity as PDF or CSV',
                icon: 'download-outline',
                iconColor: PURPLE,
                onPress: () => navigation.navigate('Main', { screen: 'DownloadData' }),
              },
            ])}
          </SettingsSection>

          <View style={styles.dangerBlock}>
            <DangerAction label="Sign Out" icon="log-out-outline" onPress={handleSignOut} variant="signOut" />
            <DangerAction label="Delete Account" icon="trash-outline" onPress={handleDeleteAccount} variant="delete" />
          </View>

          <Text style={styles.appInfo}>Fitness App v1.0.0 — Demo</Text>
          <View style={{ height: 48 }} />
        </ScrollView>
      </View>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PREMIUM_BG },
  root: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: PREMIUM_TEXT },
  headerSub: { fontSize: fontSize.sm, color: PREMIUM_MUTED, marginTop: 2 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg + 2,
    borderWidth: 1,
    borderColor: 'rgba(45,220,140,0.22)',
    backgroundColor: PREMIUM_GLASS,
    overflow: 'hidden',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_TEXT },
  profileHandle: { fontSize: fontSize.sm, color: PREMIUM_MUTED, marginTop: 2 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  editLink: { color: PREMIUM_ACCENT, fontSize: fontSize.sm, fontWeight: '700' },

  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg + 2,
    borderWidth: 1,
    borderColor: 'rgba(45,220,140,0.18)',
    backgroundColor: PREMIUM_GLASS,
    overflow: 'hidden',
  },
  progressIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: { flex: 1 },
  progressTitle: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_TEXT },
  progressSub: { fontSize: fontSize.xs, color: PREMIUM_MUTED, marginTop: 4, lineHeight: 16 },

  section: { marginTop: spacing.xl },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sectionHeadIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadText: { flex: 1 },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_TEXT },
  sectionSub: { fontSize: fontSize.xs, color: PREMIUM_MUTED, marginTop: 2 },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    overflow: 'hidden',
  },

  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2,
  },
  settingsRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: PREMIUM_GLASS_BORDER },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  settingsInfo: { flex: 1 },
  settingsLabel: { fontSize: fontSize.sm, fontWeight: '700', color: PREMIUM_TEXT },
  settingsValue: { fontSize: fontSize.xs, color: PREMIUM_MUTED, marginTop: 3, lineHeight: 16 },

  dangerBlock: { marginTop: spacing.xl, gap: spacing.sm },
  dangerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  dangerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerLabel: { flex: 1, fontSize: fontSize.base, fontWeight: '800', color: RED },

  appInfo: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: PREMIUM_MUTED,
    marginTop: spacing.xl,
  },
});
