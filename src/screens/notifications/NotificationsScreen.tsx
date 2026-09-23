import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { supabase } from '../../services/supabase';

const ORANGE = '#FFB347';
const GOLD   = '#FFD133';
const PINK   = '#FF6B9D';
const BLUE   = '#6699FF';
const GREEN  = '#2DDC8C';
const PURPLE = '#B280FF';
const RED    = '#FF5959';

type FilterTab = 'All' | 'Unread' | 'Activity' | 'Achievements' | 'System';

interface Notification {
  id: string; type: string; title: string; message: string;
  read: boolean; action_label?: string; created_at: string;
}

function getNotifStyle(type: string): { icon: string; color: string } {
  const map: Record<string, { icon: string; color: string }> = {
    streak:      { icon: 'flame',              color: ORANGE },
    goal:        { icon: 'trophy',             color: GOLD   },
    social:      { icon: 'heart',              color: PINK   },
    workout:     { icon: 'barbell',            color: BLUE   },
    nutrition:   { icon: 'restaurant',         color: GREEN  },
    community:   { icon: 'people',             color: PURPLE },
    upgrade:     { icon: 'star',               color: GOLD   },
    system:      { icon: 'notifications',      color: BLUE   },
    reminder:    { icon: 'alarm',              color: ORANGE },
    achievement: { icon: 'ribbon',             color: GOLD   },
  };
  return map[type] ?? { icon: 'notifications-outline', color: BLUE };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1) return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function NotifCard({
  notif, theme, onTap, onDelete,
}: {
  notif: Notification; theme: typeof colors.dark;
  onTap: (n: Notification) => void; onDelete: (id: string) => void;
}) {
  const style = getNotifStyle(notif.type);
  return (
    <TouchableOpacity
      onPress={() => onTap(notif)}
      onLongPress={() => Alert.alert('Delete Notification', 'Remove this notification?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(notif.id) },
      ])}
      style={[styles.card, {
        backgroundColor: notif.read ? theme.card : theme.accentDim as string,
        borderColor: notif.read ? theme.border : theme.accent + '40',
        borderWidth: notif.read ? 1 : 1.5,
      }]}
    >
      {/* Icon */}
      <View style={[styles.iconWrap, { backgroundColor: style.color + '20' }]}>
        <Ionicons name={style.icon as any} size={20} color={style.color} />
        {!notif.read && <View style={[styles.unreadDot, { backgroundColor: style.color }]} />}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.contentTop}>
          <Text style={[styles.title, { color: theme.textPrimary, fontWeight: notif.read ? '600' : '800' }]} numberOfLines={1}>
            {notif.title}
          </Text>
          <Text style={[styles.time, { color: theme.textMuted }]}>{timeAgo(notif.created_at)}</Text>
        </View>
        <Text style={[styles.message, { color: theme.textSecondary }]} numberOfLines={2}>
          {notif.message}
        </Text>
        {notif.action_label && (
          <View style={[styles.actionPill, { backgroundColor: style.color + '18', borderColor: style.color + '40' }]}>
            <Text style={[styles.actionText, { color: style.color }]}>{notif.action_label}</Text>
            <Ionicons name="chevron-forward" size={10} color={style.color} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const { user } = useAuthStore();
  const theme = colors[colorScheme];

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab]         = useState<FilterTab>('All');
  const [isRefreshing, setIsRefreshing]   = useState(false);

  useFocusEffect(useCallback(() => { if (user?.id) load(); }, [user?.id]));

  const load = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('notifications')
      .select('id,type,title,body,action_label,read,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(60);
    setNotifications((data ?? []) as Notification[]);
  };

  const refresh = async () => { setIsRefreshing(true); await load(); setIsRefreshing(false); };

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
    // Mark as read
    if (!notif.read) {
      await supabase.from('notifications').update({ read: true }).eq('id', notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }
    // Navigate
    if (!notif.action_label) return;
    const map: Record<string, () => void> = {
      'View Streaks':     () => navigation.navigate('Streaks'),
      'Check In':         () => navigation.navigate('Streaks'),
      'View Progress':    () => navigation.navigate('Progress'),
      'View Fasting':     () => navigation.navigate('IntermittentFasting'),
      'View Sleep':       () => navigation.navigate('Sleep'),
      'View Calories':    () => navigation.navigate('Main', { screen: 'Calorie' }),
      'View History':     () => navigation.navigate('Main', { screen: 'Activity' }),
      'View Plan':        () => navigation.navigate('Main', { screen: 'Meals' }),
      'Open Coach':       () => navigation.navigate('AICoach'),
      'Reply':            () => navigation.navigate('Chat'),
      'View Plans':       () => navigation.navigate('Subscription'),
      'Complete Profile': () => navigation.navigate('Settings'),
    };
    map[notif.action_label]?.();
  };

  const TABS: FilterTab[] = ['All', 'Unread', 'Activity', 'Achievements', 'System'];
  const TAB_COLORS: Record<FilterTab, string> = {
    All: theme.accent, Unread: PINK, Activity: BLUE,
    Achievements: GOLD, System: PURPLE,
  };

  const filtered = notifications.filter(n => {
    if (activeTab === 'All')          return true;
    if (activeTab === 'Unread')       return !n.read;
    if (activeTab === 'Activity')     return ['streak','workout','nutrition','goal','reminder'].includes(n.type);
    if (activeTab === 'Achievements') return ['achievement','goal'].includes(n.type);
    if (activeTab === 'System')       return ['system','upgrade'].includes(n.type);
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>

      {/* ── GRADIENT HEADER ── */}
      <LinearGradient
        colors={[BLUE + 'EE', PURPLE + 'CC'] as [string, string]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* ── FILTER TABS ── */}
      <View style={[styles.tabRow, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TABS}
          keyExtractor={t => t}
          contentContainerStyle={styles.tabList}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && { backgroundColor: TAB_COLORS[tab], borderColor: TAB_COLORS[tab] },
                { borderColor: activeTab === tab ? TAB_COLORS[tab] : theme.border }]}
            >
              <Text style={[styles.tabText, { color: activeTab === tab ? '#fff' : theme.textMuted }]}>
                {tab}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* ── NOTIFICATION LIST ── */}
      <FlatList
        data={filtered}
        keyExtractor={n => n.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={BLUE} colors={[BLUE]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={48} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              {activeTab === 'Unread' ? 'All caught up!' : 'No notifications'}
            </Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              {activeTab === 'Unread' ? "You've read everything." : 'Notifications will appear here as you use the app.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <NotifCard notif={item} theme={theme} onTap={handleTap} onDelete={handleDelete} />
        )}
      />
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1 },
  header:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 4 },
  backBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  markAllBtn:  { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.18)' },
  markAllText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '700' },
  tabRow:   { borderBottomWidth: 1 },
  tabList:  { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.sm },
  tab:      { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5 },
  tabText:  { fontSize: fontSize.xs, fontWeight: '700' },
  list:     { padding: spacing.lg, gap: spacing.sm, paddingBottom: 80 },
  card:     { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg },
  iconWrap: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' },
  unreadDot:{ position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#fff' },
  content:  { flex: 1, gap: 3 },
  contentTop:{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  title:    { flex: 1, fontSize: fontSize.sm },
  time:     { fontSize: 10, fontWeight: '500', flexShrink: 0 },
  message:  { fontSize: fontSize.xs, lineHeight: 16 },
  actionPill: { flexDirection: 'row', alignItems: 'center', gap: 3, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1, marginTop: 2 },
  actionText: { fontSize: 10, fontWeight: '700' },
  empty:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: spacing.md },
  emptyTitle:{ fontSize: fontSize.lg, fontWeight: '700' },
  emptySub: { fontSize: fontSize.sm, textAlign: 'center', maxWidth: 260 },
});