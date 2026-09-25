import {
  View, Text, StyleSheet, Modal, TextInput,
  TouchableOpacity, Alert, ActivityIndicator, RefreshControl, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AndroidSafeView } from '../../shared/AndroidSafeView';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../../theme';
import { PartnerCard } from '../components/PartnerCard';
import { PartnerInviteSheet } from '../components/PartnerInviteSheet';
import { UserAvatar } from '../../shared/UserAvatar';
import { usePartner } from '../hooks/usePartner';
import { ScreenScrollView } from '../../../components/ScreenScrollView';
import { PremiumAtmosphereBackground } from '../../../components/premium/PremiumAtmosphereBackground';
import {
  PREMIUM_BG as BG,
  PREMIUM_GLASS as GLASS,
  PREMIUM_GLASS_BORDER as GLASS_BORDER,
  PREMIUM_TEXT as TEXT,
  PREMIUM_MUTED as MUTED,
  PREMIUM_ACCENT as ACCENT,
  premiumGlassShadow,
} from '../../../components/premium/premiumEffects';
import { AccountabilityFeatureArt, EmptyPartnersArt } from '../../../components/premium/AccountabilityFeatureArt';

const PURPLE = '#B280FF';
const ORANGE = '#FFB347';
const GREEN = '#2DDC8C';

const premiumTheme: typeof colors.dark = {
  ...colors.dark,
  bg: BG,
  card: GLASS,
  border: GLASS_BORDER,
  surface: GLASS,
};

const glassShadow = premiumGlassShadow();

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
  const { user, profile } = useAuthStore();
  const theme = premiumTheme;

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
    <AndroidSafeView backgroundColor={BG} style={styles.safe}>
      <PremiumAtmosphereBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Accountability</Text>
          <Text style={styles.headerSub}>Keep each other on track</Text>
        </View>
        {safePartners.length < MAX_PARTNERS && (
          <TouchableOpacity onPress={() => setShowInvite(true)} style={styles.addBtn}>
            <Ionicons name="person-add-outline" size={16} color="#E8D4FF" />
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={ACCENT} size="large" />
        </View>
      ) : (
        <ScreenScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={ACCENT} colors={[ACCENT]} />
          }
        >
          <View style={styles.featureOuter}>
            <LinearGradient
              colors={['rgba(45,220,140,0.22)', 'rgba(178,128,255,0.18)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.featureBorderGrad}
            >
              <View style={[styles.featureCard, glassShadow]}>
                <View style={styles.featureBody}>
                  <View style={styles.featureMain}>
                    <TouchableOpacity style={styles.limitRow} activeOpacity={0.85}>
                      <View style={styles.limitLeft}>
                        <View style={[styles.limitIcon, { backgroundColor: ACCENT + '22' }]}>
                          <Ionicons name="people" size={16} color={ACCENT} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.limitTitle}>
                            {safePartners.length}/{MAX_PARTNERS} partners
                          </Text>
                          <Text style={styles.limitSub}>Fitness progress only is shared</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={MUTED} />
                    </TouchableOpacity>
                    {[
                      { icon: 'flame-outline' as const, text: 'Compare streaks side by side', color: ORANGE },
                      { icon: 'flag-outline' as const, text: 'Set and track shared goals', color: GREEN },
                    ].map((f) => (
                      <View key={f.text} style={styles.featureRow}>
                        <View style={[styles.featureIcon, { backgroundColor: f.color + '22' }]}>
                          <Ionicons name={f.icon} size={14} color={f.color} />
                        </View>
                        <Text style={styles.featureRowText}>{f.text}</Text>
                      </View>
                    ))}
                  </View>
                  <AccountabilityFeatureArt />
                </View>
              </View>
            </LinearGradient>
          </View>

          {safePartners.length === 0 ? (
            <View style={styles.emptyBlock}>
              <EmptyPartnersArt />
              <Text style={styles.emptyTitle}>No partners yet</Text>
              <Text style={styles.emptySub}>
                Add a partner by their Fitness ID to start keeping each other accountable
              </Text>
              <TouchableOpacity onPress={() => setShowInvite(true)} activeOpacity={0.9}>
                <LinearGradient
                  colors={['#2DDC8C', '#28C07A']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.emptyCta}
                >
                  <Ionicons name="person-add" size={18} color="#fff" />
                  <Text style={styles.emptyCtaText}>Add a Partner</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
                <Text style={styles.sectionTitle}>Your Partners</Text>
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
                  style={[styles.addMoreBtn, glassShadow]}
                >
                  <Ionicons name="person-add-outline" size={18} color={ACCENT} />
                  <Text style={styles.addMoreText}>
                    Add another partner ({MAX_PARTNERS - safePartners.length} slot{MAX_PARTNERS - safePartners.length !== 1 ? 's' : ''} left)
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={[styles.howCard, glassShadow]}>
            <Text style={styles.howTitle}>How Accountability Works</Text>
            <View style={styles.howGrid}>
              {[
                { icon: 'search-outline' as const, color: PURPLE, text: 'Find partners by their @Fitness ID' },
                { icon: 'flame-outline' as const, color: ORANGE, text: 'Only streaks & workout activity are shared' },
                { icon: 'locate-outline' as const, color: ACCENT, text: 'Set shared goals to stay focused together' },
              ].map((r) => (
                <View key={r.text} style={styles.howCol}>
                  <View style={[styles.howIcon, { backgroundColor: r.color + '18', borderColor: r.color + '45' }]}>
                    <Ionicons name={r.icon} size={20} color={r.color} />
                  </View>
                  <Text style={styles.howText}>{r.text}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={{ height: 88 }} />
        </ScreenScrollView>
      )}

      <PartnerInviteSheet
        theme={theme}
        premium
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
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: fontSize.xl, fontWeight: '800', color: TEXT },
  headerSub: { fontSize: fontSize.xs, color: MUTED, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(178,128,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(178,128,255,0.5)',
  },
  addBtnText: { color: '#D4B8FF', fontSize: fontSize.xs, fontWeight: '700' },
  featureOuter: { marginHorizontal: spacing.lg, marginTop: spacing.sm },
  featureBorderGrad: { borderRadius: radius.lg + 2, padding: 1 },
  featureCard: {
    borderRadius: radius.lg + 1,
    backgroundColor: GLASS,
    padding: spacing.lg,
  },
  featureBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureMain: { flex: 1, gap: spacing.md, minWidth: 0 },
  limitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  limitLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  limitIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  limitTitle: { fontSize: fontSize.base, fontWeight: '800', color: TEXT },
  limitSub: { fontSize: fontSize.xs, color: MUTED, marginTop: 2 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  featureRowText: { color: 'rgba(255,255,255,0.85)', fontSize: fontSize.sm, fontWeight: '500', flex: 1 },
  emptyBlock: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '800', color: TEXT, textAlign: 'center' },
  emptySub: { fontSize: fontSize.sm, color: MUTED, textAlign: 'center', lineHeight: 20 },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.xl + 4,
    marginTop: spacing.sm,
    minWidth: 260,
  },
  emptyCtaText: { color: '#fff', fontSize: fontSize.base, fontWeight: '800' },
  sectionHeader: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm, marginTop: spacing.sm },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: TEXT },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    borderStyle: 'dashed',
    backgroundColor: GLASS,
  },
  addMoreText: { fontSize: fontSize.sm, fontWeight: '600', color: ACCENT },
  howCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
    backgroundColor: GLASS,
    padding: spacing.lg,
  },
  howTitle: { fontSize: fontSize.base, fontWeight: '700', color: TEXT, marginBottom: spacing.md },
  howGrid: { flexDirection: 'row', gap: spacing.sm },
  howCol: { flex: 1, alignItems: 'center', gap: spacing.sm },
  howIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howText: { fontSize: 10, lineHeight: 14, color: MUTED, textAlign: 'center', fontWeight: '600' },
});