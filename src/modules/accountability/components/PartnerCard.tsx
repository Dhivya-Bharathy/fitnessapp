import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../../../theme';
import { UserAvatar } from '../../shared/UserAvatar';
import { PartnerData } from '../services/PartnerService';

const ORANGE = '#FFB347';

interface Props {
  partner: PartnerData;
  theme: typeof colors.dark;
  currentUserId: string;
  onRemove: () => void;
  onProfilePress: () => void;
  onChatPress?: () => void;
}

export function PartnerCard({
  partner,
  theme,
  onRemove,
  onProfilePress,
  onChatPress,
}: Props) {
  const profile = partner.partner_profile;
  if (!profile) return null;

  return (
    <View style={[styles.container, {
      backgroundColor: theme.card,
      borderColor: theme.accent,
    }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.partnerBadge, {
          backgroundColor: theme.accentDim as string,
        }]}>
          <Ionicons name="people" size={12} color={theme.accent} />
          <Text style={[styles.partnerBadgeText, { color: theme.accent }]}>
            Accountability Partner
          </Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              'Remove Partner',
              `Remove ${profile.full_name} as your accountability partner?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: onRemove },
              ]
            )
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="person-remove-outline" size={16} color={theme.red} />
        </TouchableOpacity>
      </View>

      {/* Profile */}
      <TouchableOpacity onPress={onProfilePress} style={styles.profileRow}>
        <UserAvatar
          uri={profile.avatar_url}
          name={profile.full_name}
          size={56}
          theme={theme}
          showOnline
        />
        <View style={styles.profileInfo}>
          <Text style={[styles.name, { color: theme.textPrimary }]}>
            {profile.full_name}
          </Text>
          <Text style={[styles.handle, { color: theme.textMuted }]}>
            @{profile.calfit_id}
          </Text>
          {profile.goal && (
            <Text style={[styles.goal, { color: theme.accent }]}>
              🎯 {profile.goal}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.stat, { backgroundColor: ORANGE + '18' }]}>
          <Text style={[styles.statValue, { color: ORANGE }]}>
            {profile.streak_count ?? 0}🔥
          </Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Streak</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: theme.accentDim as string }]}>
          <Text style={[styles.statValue, { color: theme.accent }]}>
            {partner.partner_streak}🔥
          </Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Partner Streak</Text>
        </View>
        {partner.shared_goal && (
          <View style={[styles.stat, { backgroundColor: theme.gold + '18', flex: 2 }]}>
            <Text style={[styles.statValue, { color: theme.gold }]} numberOfLines={1}>
              {partner.shared_goal}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textMuted }]}>Shared Goal</Text>
          </View>
        )}
      </View>

      {onChatPress && (
        <TouchableOpacity onPress={onChatPress} style={styles.chatRow}>
          <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.accent} />
          <Text style={[styles.chatText, { color: theme.accent }]}>Send Message</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 2,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  partnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  partnerBadgeText: { fontSize: 11, fontWeight: '700' },
  profileRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  profileInfo: { flex: 1 },
  name: { fontSize: fontSize.xl, fontWeight: '800' },
  handle: { fontSize: fontSize.sm, marginTop: 2 },
  goal: { fontSize: fontSize.sm, marginTop: 4, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: 2,
  },
  statValue: { fontSize: fontSize.base, fontWeight: '800' },
  statLabel: { fontSize: 9 },
  chatRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.md,
    borderWidth: 1, borderColor: 'rgba(45,220,140,0.3)',
  },
  chatText: { fontSize: fontSize.sm, fontWeight: '700' },
});