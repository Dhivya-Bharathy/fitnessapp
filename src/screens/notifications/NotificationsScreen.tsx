import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, fontSize } from '../../theme';
import { supabase } from '../../services/supabase';
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

const ORANGE = '#FFB347';
const GOLD = '#FFD133';
const PINK = '#FF6B9D';
const BLUE = '#6699FF';
const GREEN = '#2DDC8C';
const PURPLE = '#B280FF';

type FilterTab = 'All' | 'Unread' | 'Activity' | 'Achievements' | 'System';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  action_label?: string;
  created_at: string;
}

const FILTER_TABS: { id: FilterTab; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'All', icon: 'notifications-outline' },
  { id: 'Unread', icon: 'mail-outline' },
  { id: 'Activity', icon: 'flame-outline' },
  { id: 'Achievements', icon: 'trophy-outline' },
  { id: 'System', icon: 'settings-outline' },
];

function getNotifStyle(type: string): { icon: keyof typeof Ionicons.glyphMap; color: string } {
  const map: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    streak: { icon: 'flame', color: ORANGE },
    goal: { icon: 'heart', color: PINK },
    social: { icon: 'heart', color: PINK },
    workout: { icon: 'barbell', color: BLUE },
    nutrition: { icon: 'restaurant', color: GREEN },
    community: { icon: 'people', color: PURPLE },
    upgrade: { icon: 'star', color: GOLD },
    system: { icon: 'notifications', color: BLUE },
    reminder: { icon: 'alarm', color: ORANGE },
    achievement: { icon: 'trophy', color: GOLD },
    coach: { icon: 'bulb', color: PURPLE },
    welcome: { icon: 'hand-left', color: GREEN },
  };
  return map[type] ?? { icon: 'notifications-outline', color: BLUE };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function sectionLabel(dateStr: string): 'Today' | 'Yesterday' | 'Earlier' {
  const d = new Date(dateStr);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((startToday.getTime() - startThat.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return 'Earlier';
}

function groupBySection(items: Notification[]): { title: string; data: Notification[] }[] {
  const order = ['Today', 'Yesterday', 'Earlier'] as const;
  const buckets: Record<string, Notification[]> = { Today: [], Yesterday: [], Earlier: [] };
  for (const n of items) {
    buckets[sectionLabel(n.created_at)].push(n);
  }
  return order.filter(t => buckets[t].length > 0).map(t => ({ title: t, data: buckets[t] }));
}

function matchesFilter(n: Notification, tab: FilterTab): boolean {
  if (tab === 'All') return true;
  if (tab === 'Unread') return !n.read;
  if (tab === 'Activity') return ['streak', 'workout', 'nutrition', 'goal', 'reminder'].includes(n.type);
  if (tab === 'Achievements') return ['achievement', 'goal'].includes(n.type);
  if (tab === 'System') return ['system', 'upgrade', 'welcome', 'coach'].includes(n.type);
  return true;
}

function NotifCard({
  notif,
  onTap,
  onDelete,
}: {
  notif: Notification;
  onTap: (n: Notification) => void;
  onDelete: (id: string) => void;
}) {
  const style = getNotifStyle(notif.type);
  return (
    <TouchableOpacity
      onPress={() => onTap(notif)}
      onLongPress={() =>
        Alert.alert('Delete Notification', 'Remove this notification?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDelete(notif.id) },
        ])
      }
      activeOpacity={0.88}
      style={[
        styles.card,
        premiumGlassShadow(),
        !notif.read && styles.cardUnread,
        { backgroundColor: PREMIUM_GLASS, borderColor: notif.read ? PREMIUM_GLASS_BORDER : 'rgba(45,220,140,0.35)' },
      ]}
    >
      <View style={[styles.iconSquare, { backgroundColor: style.color + '18', borderColor: style.color + '33' }]}>
        <Ionicons name={style.icon} size={22} color={style.color} />
      </View>
      <View style={styles.content}>
        <View style={styles.contentTop}>
          <View style={styles.titleRow}>
            {!notif.read && <View style={styles.unreadDot} />}
            <Text style={[styles.title, !notif.read && styles.titleUnread]} numberOfLines={1}>
              {notif.title}
            </Text>
          </View>
          <Text style={styles.time}>{timeAgo(notif.created_at)}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {notif.message}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={PREMIUM_MUTED} />
    </TouchableOpacity>
  );
}

function ActivityEmptyState() {
  const tips = [
    { icon: 'barbell-outline' as const, text: 'Log a workout to get activity alerts' },
    { icon: 'flame-outline' as const, text: 'Keep your streak alive with daily check-ins' },
    { icon: 'flag-outline' as const, text: 'Set goals to track progress' },
  ];
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyHero}>
        <Text style={styles.emptyBell}>🔔</Text>
        <Text style={styles.emptySpark}>✨</Text>
      </View>
      <Text style={styles.emptyTitle}>No activity notifications</Text>
      <Text style={styles.emptySub}>
        Workouts, streaks, and goal updates will show up here when you stay active.
      </Text>
      <View style={[styles.tipsCard, premiumGlassShadow()]}>
        <View style={styles.tipsHeader}>
          <View style={styles.tipsIconWrap}>
            <Ionicons name="bulb-outline" size={18} color={PREMIUM_ACCENT} />
          </View>
          <Text style={styles.tipsTitle}>Tips</Text>
        </View>
        {tips.map(t => (
          <View key={t.text} style={styles.tipRow}>
            <Ionicons name={t.icon} size={16} color={PREMIUM_MUTED} />
            <Text style={styles.tipText}>{t.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function GenericEmptyState({ tab }: { tab: FilterTab }) {
  const copy: Record<FilterTab, { title: string; sub: string }> = {
    All: { title: 'No notifications yet', sub: 'Stay updated on your fitness journey — alerts will appear here.' },
    Unread: { title: 'All caught up!', sub: "You've read everything." },
    Activity: { title: 'No activity notifications', sub: '' },
    Achievements: { title: 'No achievements yet', sub: 'Hit milestones and they will show up here.' },
    System: { title: 'No system updates', sub: 'App news and account messages appear here.' },
  };
  if (tab === 'Activity') return <ActivityEmptyState />;
  const { title, sub } = copy[tab];
  return (
    <View style={styles.emptyWrap}>
      <Ionicons name="notifications-outline" size={48} color={PREMIUM_MUTED} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {sub ? <Text style={styles.emptySub}>{sub}</Text> : null}
    </View>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { if (user?.id) load(); }, [user?.id]));

  const load = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('id,type,title,body,action_label,read,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(60);
    setNotifications(
      (data ?? []).map((row: any) => ({
        ...row,
        message: row.body ?? row.message ?? '',
      })) as Notification[],
    );
  };

  const refresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleDelete = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleTap = async (notif: Notification) => {
    if (!notif.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', notif.id);
      setNotifications(prev => prev.map(n => (n.id === notif.id ? { ...n, read: true } : n)));
    }
    if (!notif.action_label) return;
    const map: Record<string, () => void> = {
      'View Streaks': () => navigation.navigate('Streaks'),
      'Check In': () => navigation.navigate('Streaks'),
      'View Progress': () => navigation.navigate('Progress'),
      'View Fasting': () => navigation.navigate('IntermittentFasting'),
      'View Sleep': () => navigation.navigate('Sleep'),
      'View Calories': () => navigation.navigate('Calorie'),
      'View History': () => navigation.navigate('Activity'),
      'View Plan': () => navigation.navigate('Meals'),
      'Open Coach': () => navigation.navigate('AICoach'),
      'Reply': () => navigation.navigate('Chat'),
      'View Plans': () => navigation.navigate('Subscription'),
      'Complete Profile': () => navigation.navigate('Settings'),
    };
    map[notif.action_label]?.();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const filtered = useMemo(
    () => notifications.filter(n => matchesFilter(n, activeTab)),
    [notifications, activeTab],
  );

  const sections = useMemo(() => groupBySection(filtered), [filtered]);

  const headerSub =
    unreadCount > 0
      ? `${unreadCount} unread`
      : 'Stay updated on your fitness journey';

  return (
    <AndroidSafeView backgroundColor={PREMIUM_BG} style={styles.safe}>
      <PremiumAtmosphereBackground />
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={22} color={PREMIUM_TEXT} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSub}>{headerSub}</Text>
          </View>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn} activeOpacity={0.88}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.markAllPlaceholder} />
          )}
        </View>

        <View style={styles.filterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterRow}
          >
          {FILTER_TABS.map(tab => {
            const active = activeTab === tab.id;
            const showBadge = tab.id === 'Unread' && unreadCount > 0;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.85}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <View style={styles.filterIconWrap}>
                  <Ionicons
                    name={tab.icon}
                    size={20}
                    color={active ? PREMIUM_ACCENT : PREMIUM_MUTED}
                  />
                  {showBadge && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>{tab.id}</Text>
              </TouchableOpacity>
            );
          })}
          </ScrollView>
        </View>

        <SectionList
          style={styles.listFlex}
          sections={sections}
          keyExtractor={n => n.id}
          contentContainerStyle={sections.length === 0 ? styles.listEmpty : styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={PREMIUM_ACCENT} />
          }
          ListEmptyComponent={<GenericEmptyState tab={activeTab} />}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>
          )}
          renderItem={({ item }) => (
            <NotifCard notif={item} onTap={handleTap} onDelete={handleDelete} />
          )}
          SectionSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
        />
      </View>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PREMIUM_BG },
  root: { flex: 1 },
  listFlex: { flex: 1, minHeight: 0 },

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
  markAllBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
  },
  markAllPlaceholder: { width: 88 },
  markAllText: { color: PREMIUM_TEXT, fontSize: fontSize.xs, fontWeight: '700' },

  filterBar: {
    flexGrow: 0,
    flexShrink: 0,
    height: 88,
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 88,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  filterChip: {
    width: 72,
    minHeight: 76,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    marginRight: spacing.sm,
    alignSelf: 'flex-start',
  },
  filterChipActive: {
    borderColor: 'rgba(45,220,140,0.55)',
    backgroundColor: 'rgba(45,220,140,0.1)',
  },
  filterIconWrap: { position: 'relative', marginBottom: 4 },
  filterBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF5959',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  filterLabel: { fontSize: 10, fontWeight: '600', color: PREMIUM_MUTED },
  filterLabelActive: { color: PREMIUM_ACCENT, fontWeight: '800' },

  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: PREMIUM_MUTED,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  listEmpty: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: 100 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  cardUnread: {},
  iconSquare: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: 4 },
  contentTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: PREMIUM_ACCENT },
  title: { flex: 1, fontSize: fontSize.sm, fontWeight: '600', color: PREMIUM_MUTED },
  titleUnread: { fontWeight: '800', color: PREMIUM_TEXT },
  time: { fontSize: 10, fontWeight: '600', color: PREMIUM_MUTED, flexShrink: 0 },
  message: { fontSize: fontSize.xs, lineHeight: 17, color: PREMIUM_MUTED },

  emptyWrap: { flex: 1, alignItems: 'center', paddingTop: spacing.xxxl, paddingHorizontal: spacing.lg },
  emptyHero: { position: 'relative', marginBottom: spacing.lg },
  emptyBell: { fontSize: 56 },
  emptySpark: { position: 'absolute', right: -12, top: -8, fontSize: 24 },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '800', color: PREMIUM_TEXT, textAlign: 'center' },
  emptySub: {
    fontSize: fontSize.sm,
    color: PREMIUM_MUTED,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
    maxWidth: 300,
  },
  tipsCard: {
    width: '100%',
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
  },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  tipsIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(45,220,140,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsTitle: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_TEXT },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  tipText: { flex: 1, fontSize: fontSize.sm, color: PREMIUM_MUTED, lineHeight: 18 },
});
