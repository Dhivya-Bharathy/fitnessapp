import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PREMIUM } from '../../theme/premiumOnboarding';
import { spacing } from '../../theme';

type Props = {
  progress: number;
  onBack: () => void;
};

export function PremiumProgressHeader({ progress, onBack }: Props) {
  const pct = `${Math.min(100, Math.max(0, progress * 100))}%`;
  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        onPress={onBack}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={22} color={PREMIUM.text} />
      </TouchableOpacity>
      <View style={styles.track}>
        <View style={[styles.fill, { width: pct }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  back: { alignSelf: 'flex-start' },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: PREMIUM.progressTrack,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: PREMIUM.progress,
  },
});
