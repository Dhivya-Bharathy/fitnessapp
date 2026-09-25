import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Alert, Platform,
} from 'react-native';
import { confirmDialog } from '../../utils/confirmDialog';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import Avatar from '../../components/Avatar';
import {
  scheduleMealReminders,
  scheduleWaterReminder,
  scheduleWorkoutReminder,
  scheduleSleepReminder,
  cancelAllReminders,
  requestNotificationPermissions,
} from '../../services/reminderService';


const PREFS_KEY = 'calfit_notification_prefs';

interface NotifPrefs {
  pushEnabled:       boolean;
  mealReminders:    boolean;
  waterReminders:   boolean;
  workoutReminders:  boolean;
  sleepReminders:    boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  pushEnabled:      true,
  mealReminders:    false,
  waterReminders:   false,
  workoutReminders: false,
  sleepReminders:   false,
};

async function loadPrefs(): Promise<NotifPrefs> {
  try {
    const raw = await SecureStore.getItemAsync(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { return DEFAULT_PREFS; }
}

async function savePrefs(prefs: NotifPrefs): Promise<void> {
  try { await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(prefs)); } catch {}
}

// ── SAFE COLORS ───────────────────────────────────────────────
const ORANGE = '#FFB347';
const GOLD   = '#FFD133';
const PURPLE = '#B280FF';
const RED    = '#FF5959';


// ── SETTINGS GROUP ────────────────────────────────────────────
function SettingsGroup({ theme, title, items }: {
  theme: typeof colors.dark;
  title: string;
  items: Array<{
    label: string; value?: string; icon: string; iconColor?: string;
    toggle?: boolean; toggleValue?: boolean;
    onToggle?: (val: boolean) => void;
    onPress?: () => void; danger?: boolean;
  }>;
}) {
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: theme.textMuted }]}>{title.toUpperCase()}</Text>
      <View style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            onPress={item.onPress}
            disabled={item.toggle && !item.onPress}
            activeOpacity={item.toggle ? 1 : 0.7}
            style={[
              styles.settingsRow,
              i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: (item.iconColor ?? theme.accent) + '18' }]}>
              <Ionicons name={item.icon as any} size={17} color={item.iconColor ?? theme.accent} />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={[styles.settingsLabel, {
                color: item.danger ? RED : theme.textPrimary,
              }]}>{item.label}</Text>
              {item.value && (
                <Text style={[styles.settingsValue, { color: theme.textMuted }]} numberOfLines={1}>
                  {item.value}
                </Text>
              )}
            </View>
            {item.toggle ? (
              <Switch
                value={item.toggleValue ?? false}
                onValueChange={item.onToggle}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor="#fff"
              />
            ) : !item.danger ? (
              <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────
export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme, toggleTheme } = useThemeStore();
  const { user, profile, signOut, deleteAccount, updateProfile } = useAuthStore();
  const theme = colors[colorScheme];

  const [darkMode, setDarkMode]       = useState(colorScheme === 'dark');
  const [prefs, setPrefs]             = useState<NotifPrefs>(DEFAULT_PREFS);

  const name = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'User';
  const username = profile?.calfit_id?.trim() || '';

  // ── LOAD PREFS ON EVERY FOCUS — fixes the toggle reset bug ──
  useFocusEffect(useCallback(() => {
    let active = true;
    const init = async () => {
      // Reload profile
      if (user?.id) {
        try {
          const { supabase } = await import('../../services/supabase');
          const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (data && active) updateProfile(data);
        } catch {}
      }
      // Reload notification prefs from SecureStore
      const saved = await loadPrefs();
      if (active) {
        setPrefs(saved);
        setDarkMode(colorScheme === 'dark');
      }
    };
    init();
    return () => { active = false; };
  }, [user?.id, colorScheme]));

  // ── PREF TOGGLE HELPER ────────────────────────────────────
  // Updates state + persists to SecureStore in one call
  const updatePref = async (key: keyof NotifPrefs, val: boolean, sideEffect?: () => Promise<void>) => {
    const updated = { ...prefs, [key]: val };
    setPrefs(updated);
    await savePrefs(updated);
    if (sideEffect) await sideEffect();
  };

  // ── HANDLERS ─────────────────────────────────────────────
  const handleDarkMode = async (val: boolean) => {
    setDarkMode(val);
    toggleTheme();
  };

  const handlePushToggle = async (val: boolean) => {
    const granted = val ? await requestNotificationPermissions() : true;
    if (val && !granted) {
      Alert.alert('Permission Required', 'Allow notifications in your device Settings to enable reminders.');
      return;
    }
    if (!val) {
      await cancelAllReminders();
      // Turn off all reminders too
      const updated: NotifPrefs = {
        ...prefs, pushEnabled: false,
        mealReminders: false, waterReminders: false,
        workoutReminders: false, sleepReminders: false,
      };
      setPrefs(updated);
      await savePrefs(updated);
    } else {
      await updatePref('pushEnabled', true);
    }
    Alert.alert(
      val ? 'Notifications On' : 'Notifications Off',
      val ? "You'll get streak, goal and activity alerts." : 'All Fitness App notifications disabled.',
      [{ text: 'OK' }]
    );
  };

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

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>

      {/* ── HEADER ── */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.navigate('Main' as never)} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── PROFILE CARD ── */}
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile' as never)} activeOpacity={0.85}
          style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Avatar size={56} borderWidth={2} />
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.textPrimary }]}>{name}</Text>
            <Text style={[styles.profileHandle, { color: theme.textMuted }]}>
              {username ? `@${username}` : 'Set username in Edit Profile'}
            </Text>
             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Ionicons name="settings-outline" size={12} color={theme.accent} />
              <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600' }}>Edit Profile</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Main', { screen: 'Progress' })}
          style={[styles.progressRow, { backgroundColor: theme.accentDim as string, borderColor: theme.accent }]}
        >
          <Ionicons name="trending-up" size={18} color={theme.accent} />
          <Text style={[styles.progressRowText, { color: theme.accent }]}>View My Progress</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.accent} style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>

        {/* ── APPEARANCE ── */}
        <SettingsGroup theme={theme} title="Appearance" items={[
          {
            label: 'Dark Mode',
            value: darkMode ? 'Dark theme active' : 'Light theme active',
            icon: darkMode ? 'moon' : 'sunny',
            iconColor: darkMode ? PURPLE : GOLD,
            toggle: true, toggleValue: darkMode, onToggle: handleDarkMode,
          },
        ]} />

        {/* ── FITNESS GOALS ── */}
        <SettingsGroup theme={theme} title="Fitness" items={[
          {
            label: 'Goals',
            value: `${(profile as any)?.daily_calorie_goal ?? 2000} kcal · ${((profile as any)?.water_goal_ml ?? 2500) / 1000}L water`,
            icon: 'flag-outline', iconColor: theme.accent,
            onPress: () => navigation.navigate('Main', { screen: 'Goals' }),
          },
          {
            label: 'Units',
            value: (profile as any)?.units === 'imperial' ? 'Imperial (lbs, ft)' : 'Metric (kg, cm)',
            icon: 'speedometer-outline', iconColor: theme.accentSecond,
            onPress: () => navigation.navigate('EditProfile' as never),
          },
        ]} />

        {/* ── NOTIFICATIONS ── */}
        <SettingsGroup theme={theme} title="Notifications" items={[
          {
            label: 'Push Notifications',
            value: prefs.pushEnabled ? 'All alerts enabled' : 'All alerts disabled',
            icon: 'notifications-outline', iconColor: GOLD,
            toggle: true, toggleValue: prefs.pushEnabled, onToggle: handlePushToggle,
          },
          {
            label: 'Streak Reminders',
            value: 'Daily check-in alert',
            icon: 'flame-outline', iconColor: ORANGE,
            onPress: () => navigation.navigate('Main', { screen: 'Streaks' }),
          },
          {
            label: 'Meal Reminders',
            value: prefs.mealReminders ? '8am · 12pm · 7pm' : 'Off',
            icon: 'restaurant-outline', iconColor: theme.accentSecond,
            toggle: true, toggleValue: prefs.mealReminders, onToggle: handleMealReminders,
          },
          {
            label: 'Water Reminder',
            value: prefs.waterReminders ? 'Daily at 12:00 PM' : 'Off',
            icon: 'water-outline', iconColor: theme.accentSecond,
            toggle: true, toggleValue: prefs.waterReminders, onToggle: handleWaterReminder,
          },
          {
            label: 'Workout Reminder',
            value: prefs.workoutReminders ? 'Daily at 7:00 AM' : 'Off',
            icon: 'barbell-outline', iconColor: theme.accent,
            toggle: true, toggleValue: prefs.workoutReminders, onToggle: handleWorkoutReminder,
          },
          {
            label: 'Sleep Reminder',
            value: prefs.sleepReminders ? 'Daily at 10:00 PM' : 'Off',
            icon: 'moon-outline', iconColor: PURPLE,
            toggle: true, toggleValue: prefs.sleepReminders, onToggle: handleSleepReminder,
          },
        ]} />

        {/* ── ACCOUNT & PRIVACY ── */}
        <SettingsGroup theme={theme} title="Account & Privacy" items={[
          {
            label: 'Privacy & Data Policy',
            value: 'How we use your data',
            icon: 'shield-outline', iconColor: theme.accentSecond,
            onPress: () => navigation.navigate('Main', { screen: 'Privacy' }),
          },
          {
            label: 'Download My Data',
            value: 'Export all your activity as PDF or CSV',
            icon: 'download-outline', iconColor: theme.textSecondary,
            onPress: () => navigation.navigate('Main', { screen: 'DownloadData' }),
          },
          {
            label: 'Sign Out',
            icon: 'log-out-outline', iconColor: RED,
            danger: true, onPress: handleSignOut,
          },
          {
            label: 'Delete Account',
            icon: 'trash-outline', iconColor: RED,
            danger: true, onPress: handleDeleteAccount,
          },
        ]} />

        {/* ── APP INFO ── */}
        <View style={styles.appInfo}>
          <Text style={[styles.appInfoText, { color: theme.textMuted }]}>Fitness App v1.0.0 — Demo</Text>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1 },
  backBtn:{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700' },

  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  profileInfo: { flex: 1 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  profileName: { fontSize: fontSize.base, fontWeight: '700' },
  tierBadge:   { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.sm, borderWidth: 1 },
  tierText:    { fontSize: 10, fontWeight: '700' },
  profileHandle:{ fontSize: fontSize.sm, marginTop: 2 },
  editLink:    { fontSize: fontSize.sm, fontWeight: '600', marginTop: 4 },

  progressRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  progressRowText: { fontSize: fontSize.sm, fontWeight: '600', flex: 1 },

  group:      { marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  groupTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: spacing.xs },
  groupCard:  { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  settingsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  iconWrap:   { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  settingsInfo:{ flex: 1 },
  settingsLabel:{ fontSize: fontSize.base },
  settingsValue:{ fontSize: fontSize.xs, marginTop: 1 },
  appInfo: { alignItems: 'center', paddingVertical: spacing.xl, gap: 4 },
  appInfoText: { fontSize: fontSize.xs },

  supportCard: { marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  supportGrad: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  supportIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  supportInfo: { flex: 1 },
  supportTitle: { fontSize: fontSize.base, fontWeight: '700' },
  supportDesc: { fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },

  commissionCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  commissionIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  commissionInfo: { flex: 1 },
  commissionTitle: { fontSize: fontSize.base, fontWeight: '700' },
  commissionDesc: { fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },

  socialCard: { marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  socialTitle: { fontSize: fontSize.sm, fontWeight: '700', marginBottom: spacing.sm, textAlign: 'center' },
  socialRow: { flexDirection: 'row', gap: spacing.sm },
  socialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  socialBtnLabel: { fontSize: fontSize.sm, fontWeight: '700' },
});