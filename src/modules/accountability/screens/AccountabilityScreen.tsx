import {
  View, Text, StyleSheet, ScrollView, Modal, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AndroidSafeView } from '../../shared/AndroidSafeView';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { useAuthStore } from '../../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../../theme';
import { PartnerCard } from '../components/PartnerCard';
import { PartnerInviteSheet } from '../components/PartnerInviteSheet';
import { EmptyState } from '../../shared/EmptyState';
import { UserAvatar } from '../../shared/UserAvatar';
import { usePartner } from '../hooks/usePartner';
// ── SAFE COLORS ───────────────────────────────────────────────
const BLUE   = '#6699FF';
const PURPLE = '#B280FF';
const ORANGE = '#FFB347';
const GREEN  = '#2DDC8C';
const PINK   = '#FF6B9D';
const GOLD   = '#FFD133';

const MAX_PARTNERS = 3;

// ── SHARED DASHBOARD CARD ─────────────────────────────────────
// Side-by-side comparison of my stats vs partner's
function SharedDashboard({
  theme, myName, partnerName, myStreak, partnerStreak,
  myAvatar, partnerAvatar,
}: {
  theme: typeof colors.dark;
  myName: string; partnerName: string;
  myStreak: number; partnerStreak: number;
  myAvatar?: string | null; partnerAvatar?: string | null;
}) {
  const maxStreak = Math.max(myStreak, partnerStreak, 1);
  const myPct     = myStreak / maxStreak;
  const theirPct  = partnerStreak / maxStreak;
  const iWin      = myStreak >= partnerStreak;

  return (
    <View style={[sd.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={sd.header}>
        <Ionicons name="people" size={16} color={BLUE} />
        <Text style={[sd.headerText, { color: theme.textPrimary }]}>Shared Dashboard</Text>
      </View>

      {/* Side by side streak comparison */}
      <View style={sd.row}>
        {/* Me */}
        <View style={sd.side}>
          <UserAvatar uri={myAvatar ?? null} name={myName} size={48} theme={theme} />
          <Text style={[sd.name, { color: theme.textPrimary }]} numberOfLines={1}>
            {myName.split(' ')[0]} (You)
          </Text>
          <View style={[sd.streakBadge, { backgroundColor: iWin ? ORANGE + '22' : theme.border }]}>
            <Text style={[sd.streakNum, { color: iWin ? ORANGE : theme.textMuted }]}>
              🔥 {myStreak}
            </Text>
          </View>
          <View style={[sd.bar, { backgroundColor: theme.border }]}>
            <View style={[sd.fill, { height: `${myPct * 100}%`, backgroundColor: ORANGE }]} />
          </View>
        </View>

        {/* VS divider */}
        <View style={sd.vs}>
          <Text style={[sd.vsText, { color: theme.textMuted }]}>VS</Text>
          <View style={[sd.vsDivider, { backgroundColor: theme.border }]} />
        </View>

        {/* Partner */}
        <View style={sd.side}>
          <UserAvatar uri={partnerAvatar ?? null} name={partnerName} size={48} theme={theme} />
          <Text style={[sd.name, { color: theme.textPrimary }]} numberOfLines={1}>
            {partnerName.split(' ')[0]}
          </Text>
          <View style={[sd.streakBadge, { backgroundColor: !iWin ? PURPLE + '22' : theme.border }]}>
            <Text style={[sd.streakNum, { color: !iWin ? PURPLE : theme.textMuted }]}>
              🔥 {partnerStreak}
            </Text>
          </View>
          <View style={[sd.bar, { backgroundColor: theme.border }]}>
            <View style={[sd.fill, { height: `${theirPct * 100}%`, backgroundColor: PURPLE }]} />
          </View>
        </View>
      </View>

      {/* Status line */}
      <View style={[sd.status, { backgroundColor: iWin ? ORANGE + '12' : PURPLE + '12', borderColor: iWin ? ORANGE + '30' : PURPLE + '30' }]}>
        <Text style={[sd.statusText, { color: iWin ? ORANGE : PURPLE }]}>
          {myStreak === partnerStreak
            ? "You're both tied! Keep pushing 🤝"
            : iWin
              ? `You're ahead by ${myStreak - partnerStreak} day${myStreak - partnerStreak !== 1 ? 's' : ''} 🔥`
              : `${partnerName.split(' ')[0]} is ahead by ${partnerStreak - myStreak} day${partnerStreak - myStreak !== 1 ? 's' : ''} 💪`}
        </Text>
      </View>
    </View>
  );
}

const sd = StyleSheet.create({
  card:       { marginHorizontal: spacing.lg, marginBottom: spacing.md, borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  header:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerText: { fontSize: fontSize.base, fontWeight: '700' },
  row:        { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.lg },
  side:       { flex: 1, alignItems: 'center', gap: spacing.xs },
  name:       { fontSize: fontSize.xs, fontWeight: '600', textAlign: 'center' },
  streakBadge:{ paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.md },
  streakNum:  { fontSize: fontSize.lg, fontWeight: '900' },
  bar:        { width: '80%', height: 60, borderRadius: radius.sm, overflow: 'hidden', justifyContent: 'flex-end' },
  fill:       { width: '100%', borderRadius: radius.sm },
  vs:         { alignItems: 'center', gap: spacing.xs, paddingBottom: 8 },
  vsText:     { fontSize: fontSize.xs, fontWeight: '800' },
  vsDivider:  { width: 1, height: 60 },
  status:     { padding: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  statusText: { fontSize: fontSize.sm, fontWeight: '700', textAlign: 'center' },
});

// ── SHARED GOAL CARD ──────────────────────────────────────────
// Uses Modal + TextInput instead of Alert.prompt (Alert.prompt is iOS-only)
function SharedGoalCard({
  theme, partnerName, partnerId, currentUserId,
}: {
  theme: typeof colors.dark;
  partnerName: string; partnerId: string; currentUserId: string;
}) {
  const [goal, setGoal]           = useState('');
  const [showModal, setShowModal] = useState(false);
  const [draft, setDraft]         = useState('');

  const handleSave = async () => {
    if (!draft.trim()) return;
    setGoal(draft.trim());
    setShowModal(false);
    try {
      const { supabase } = await import('../../../services/supabase');
      await supabase.from('partners')
        .update({ shared_goal: draft.trim() })
        .eq('user_id', currentUserId)
        .eq('partner_id', partnerId);
    } catch {}
  };

  return (
    <>
      <View style={[sg.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={sg.row}>
          <View style={[sg.icon, { backgroundColor: GREEN + '18' }]}>
            <Ionicons name="flag-outline" size={16} color={GREEN} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[sg.title, { color: theme.textPrimary }]}>Shared Goal</Text>
            <Text style={[sg.sub, { color: theme.textMuted }]}>
              {goal || `No shared goal with ${partnerName.split(' ')[0]} yet`}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => { setDraft(goal); setShowModal(true); }}
            style={[sg.editBtn, { backgroundColor: GREEN + '18' }]}
          >
            <Ionicons name="pencil-outline" size={14} color={GREEN} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Cross-platform goal input modal */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView
          style={sg.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[sg.modal, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[sg.modalTitle, { color: theme.textPrimary }]}>Set Shared Goal</Text>
            <Text style={[sg.modalSub, { color: theme.textMuted }]}>
              A goal you and {partnerName.split(' ')[0]} will work toward together
            </Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="e.g. Work out 4x per week for 30 days"
              placeholderTextColor={theme.textMuted}
              style={[sg.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.bg }]}
              multiline
              autoFocus
              maxLength={120}
            />
            <View style={sg.modalBtns}>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={[sg.modalBtn, { backgroundColor: theme.border }]}
              >
                <Text style={[sg.modalBtnText, { color: theme.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!draft.trim()}
                style={[sg.modalBtn, { backgroundColor: draft.trim() ? GREEN : theme.border, flex: 1 }]}
              >
                <Text style={[sg.modalBtnText, { color: draft.trim() ? '#fff' : theme.textMuted }]}>Save Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
const sg = StyleSheet.create({
  card:       { marginHorizontal: spacing.lg, marginBottom: spacing.sm, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  row:        { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon:       { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title:      { fontSize: fontSize.sm, fontWeight: '700' },
  sub:        { fontSize: fontSize.xs, marginTop: 2 },
  editBtn:    { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  overlay:    { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(0,0,0,0.55)' },
  modal:      { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '800' },
  modalSub:   { fontSize: fontSize.sm },
  input:      { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.base, minHeight: 80 },
  modalBtns:  { flexDirection: 'row', gap: spacing.sm },
  modalBtn:   { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', paddingHorizontal: spacing.lg },
  modalBtnText: { fontSize: fontSize.base, fontWeight: '700' },
});

// ── MAIN SCREEN ───────────────────────────────────────────────
export default function AccountabilityScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const { user, profile } = useAuthStore();
  const theme = colors[colorScheme];

  const [showInvite, setShowInvite]     = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { partners, isLoading, isAdding, add, remove, reload } = usePartner(user?.id ?? '');

  const handleAdd = async (calfitId: string) => {
    const result = await add(calfitId);
    if (result.success) {
      setShowInvite(false);
      Alert.alert('Partner Added! 🎉', result.message);
    } else {
      Alert.alert('Could not add partner', result.message);
    }
  };

  const handleRemove = (partnerId: string, partnerName: string) => {
    Alert.alert(
      'Remove Partner',
      `Remove ${partnerName} as your accountability partner?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => remove(partnerId) },
      ]
    );
  };

  const refresh = async () => {
    setIsRefreshing(true);
    await reload();
    setIsRefreshing(false);
  };

  const userName = profile?.full_name || user?.email?.split('@')[0] || 'You';
  const myStreak = (profile as any)?.streak_count ?? 0;
  const myAvatar = (profile as any)?.avatar_url ?? null;

  const safePartners = partners
    .filter(p => p !== null && p !== undefined)
    .map(p => ({
      ...p,
      partner_profile: p.partner_profile ?? {
        full_name: 'Fitness App User',
        calfit_id: '',
        streak_count: 0,
        avatar_url: null,
        goal: '',
      } as any,
    }));

  const firstPartner     = safePartners[0]?.partner_profile as any;
  const partnerStreak    = firstPartner?.streak_count ?? 0;
  const partnerName      = firstPartner?.full_name ?? 'Partner';
  const partnerAvatar    = firstPartner?.avatar_url ?? null;

  const milestoneNotified = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user || safePartners.length === 0) return;
    const milestones = [7, 14, 21, 30, 60, 90, 100];
    safePartners.forEach((p) => {
      const streak = (p.partner_profile as any)?.streak_count ?? 0;
      const name = (p.partner_profile as any)?.full_name ?? 'Your partner';
      const key = `${p.partner_id}-${streak}`;
      if (milestones.includes(streak) && !milestoneNotified.current.has(key)) {
        milestoneNotified.current.add(key);
        import('../../../services/notificationService').then(({ notifyPartnerStreak }) =>
          notifyPartnerStreak(user.id, name, streak)
        );
      }
    });
  }, [safePartners, user]);

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
          <Text style={styles.headerTitle}>Accountability</Text>
          <Text style={styles.headerSub}>Keep each other on track</Text>
        </View>
        {safePartners.length < MAX_PARTNERS && (
          <TouchableOpacity onPress={() => setShowInvite(true)} style={styles.addBtn}>
            <Ionicons name="person-add-outline" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* ── PARTNER LIMIT BAR ── */}
      <View style={[styles.limitBar, { backgroundColor: theme.accentDim as string, borderColor: theme.accent }]}>
        <Ionicons name="people-outline" size={13} color={theme.accent} />
        <Text style={[styles.limitText, { color: theme.accent }]}>
          {safePartners.length}/{MAX_PARTNERS} partners · Fitness progress only is shared
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.accent} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={BLUE} colors={[BLUE]} />
          }
        >
          {safePartners.length === 0 ? (
            <>
              {/* Empty state with feature preview */}
              <View style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border, marginHorizontal: spacing.lg, marginTop: spacing.lg }]}>
                <LinearGradient
                  colors={[BLUE + '30', PURPLE + '20'] as [string, string]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.featureGrad}
                >
                  <Text style={styles.featureTitle}>Stay Consistent Together</Text>
                  <Text style={[styles.featureSub, { color: 'rgba(255,255,255,0.75)' }]}>
                    Add up to 3 partners by Fitness ID. Share streaks, set goals, and stay accountable together.
                  </Text>
                  {[
                    { icon: 'flame-outline',   text: 'Compare streaks side by side',   color: ORANGE },
                    { icon: 'flag-outline',    text: 'Set and track shared goals',     color: GREEN  },
                  ].map((f) => (
                    <View key={f.text} style={styles.featureRow}>
                      <View style={[styles.featureIcon, { backgroundColor: f.color + '22' }]}>
                        <Ionicons name={f.icon as any} size={14} color={f.color} />
                      </View>
                      <Text style={styles.featureRowText}>{f.text}</Text>
                    </View>
                  ))}
                </LinearGradient>
              </View>

              <EmptyState
                theme={theme}
                icon="people-outline"
                title="No partners yet"
                subtitle="Add a partner by their Fitness ID to start keeping each other accountable."
                buttonLabel="Add a Partner"
                onButtonPress={() => setShowInvite(true)}
              />
            </>
          ) : (
            <>
              {/* Shared dashboard with first partner */}
              <View style={{ marginTop: spacing.md }}>
                <SharedDashboard
                  theme={theme}
                  myName={userName}
                  partnerName={partnerName}
                  myStreak={myStreak}
                  partnerStreak={partnerStreak}
                  myAvatar={myAvatar}
                  partnerAvatar={partnerAvatar}
                />
              </View>

              {/* Shared goal */}
              {safePartners[0] && (
                <SharedGoalCard
                  theme={theme}
                  partnerName={partnerName}
                  partnerId={(safePartners[0] as any)?.partner_id}
                  currentUserId={user?.id ?? ''}
                />
              )}

              {/* Partner cards */}
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                  Your Partners
                </Text>
              </View>
              {safePartners.map((partner) => (
                <PartnerCard
                  key={(partner as any).id}
                  partner={partner}
                  theme={theme}
                  currentUserId={user?.id ?? ''}
                  onRemove={() => handleRemove((partner as any).partner_id, (partner as any).partner_profile?.full_name ?? 'Fitness App User')}
                  onProfilePress={() => navigation.navigate('PartnerChat', { partnerId: (partner as any).partner_id, partnerName: (partner as any).partner_profile?.full_name ?? 'Partner' } as never)}
                  onChatPress={() => navigation.navigate('PartnerChat', {
                    partnerId: (partner as any).partner_id,
                    partnerName: (partner as any).partner_profile?.full_name ?? 'Partner',
                  })}
                />
              ))}

              {/* Add more button if slots remain */}
              {safePartners.length < MAX_PARTNERS && (
                <TouchableOpacity
                  onPress={() => setShowInvite(true)}
                  style={[styles.addMoreBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <Ionicons name="person-add-outline" size={18} color={theme.accent} />
                  <Text style={[styles.addMoreText, { color: theme.accent }]}>
                    Add another partner ({MAX_PARTNERS - safePartners.length} slot{MAX_PARTNERS - safePartners.length !== 1 ? 's' : ''} left)
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* How it works */}
          <View style={[styles.howCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.howTitle, { color: theme.textPrimary }]}>How Accountability Works</Text>
              {[
                { icon: '🔍', text: 'Find partners by their @Fitness ID' },
                { icon: '🔥', text: 'Only streaks & workout activity are shared' },
                { icon: '🎯', text: 'Set shared goals to stay focused together' },
              ].map((r) => (
              <View key={r.text} style={styles.howRow}>
                <Text style={{ fontSize: 16 }}>{r.icon}</Text>
                <Text style={[styles.howText, { color: theme.textSecondary }]}>{r.text}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      <PartnerInviteSheet
        theme={theme}
        visible={showInvite}
        isAdding={isAdding}
        currentUserId={user?.id ?? ''}
        onClose={() => setShowInvite(false)}
        onAdd={handleAdd}
      />
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1 },
  scroll:   { paddingBottom: 40 },
  loading:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 4 },
  backBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.65)', marginTop: 1 },
  addBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.18)' },
  addBtnText: { color: '#fff', fontSize: fontSize.xs, fontWeight: '700' },
  limitBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginHorizontal: spacing.lg, marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.sm, borderWidth: 1 },
  limitText:{ fontSize: fontSize.xs, fontWeight: '600', flex: 1 },
  featureCard: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  featureGrad: { padding: spacing.lg, gap: spacing.md },
  featureTitle: { fontSize: fontSize.xl, fontWeight: '800', color: '#fff' },
  featureSub: { fontSize: fontSize.sm, lineHeight: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon:{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featureRowText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '500' },
  sectionHeader: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm, marginTop: spacing.sm },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700' },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed' },
  addMoreText:{ fontSize: fontSize.sm, fontWeight: '600' },
  howCard:    { marginHorizontal: spacing.lg, marginTop: spacing.lg, borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.sm },
  howTitle:   { fontSize: fontSize.base, fontWeight: '700', marginBottom: spacing.xs },
  howRow:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  howText:    { fontSize: fontSize.sm, lineHeight: 20, flex: 1 },
});