import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

/** Decorative avatars + chart from the Accountability mockup (top card, right side). */
export function AccountabilityFeatureArt() {
  return (
    <View style={styles.wrap}>
      <View style={[styles.chartBubble, styles.chartPos]}>
        <Ionicons name="bar-chart" size={14} color="#B280FF" />
      </View>
      <LinearGradient colors={['#4A90E2', '#6699FF']} style={[styles.ring, styles.avatarBack]}>
        <View style={styles.avatarInner}>
          <Ionicons name="person" size={22} color="rgba(255,255,255,0.9)" />
        </View>
      </LinearGradient>
      <LinearGradient colors={['#B280FF', '#7B5CFF']} style={[styles.ring, styles.avatarFront]}>
        <View style={styles.avatarInner}>
          <Ionicons name="person" size={22} color="rgba(255,255,255,0.9)" />
        </View>
      </LinearGradient>
    </View>
  );
}

export function EmptyPartnersArt() {
  return (
    <View style={styles.emptyWrap}>
      <LinearGradient colors={['rgba(102,153,255,0.4)', 'rgba(74,144,226,0.2)']} style={[styles.emptyRing, { marginRight: -18 }]}>
        <View style={styles.emptyInner}>
          <Ionicons name="person" size={28} color="#9CC4FF" />
        </View>
      </LinearGradient>
      <LinearGradient colors={['rgba(178,128,255,0.4)', 'rgba(123,92,255,0.2)']} style={styles.emptyRing}>
        <View style={styles.emptyInner}>
          <Ionicons name="person" size={28} color="#D4B8FF" />
        </View>
        <View style={styles.emptyPlus}>
          <Ionicons name="add" size={16} color="#fff" />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 96, height: 88, position: 'relative' },
  ring: { width: 52, height: 52, borderRadius: 26, padding: 2 },
  avatarInner: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: 'rgba(5,6,8,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBack: { position: 'absolute', left: 0, bottom: 8 },
  avatarFront: { position: 'absolute', right: 4, top: 12 },
  chartBubble: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(178,128,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(178,128,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartPos: { position: 'absolute', right: 0, top: 0, zIndex: 2 },
  emptyWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyInner: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
    backgroundColor: '#050608',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPlus: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#7B5CFF',
    borderWidth: 2,
    borderColor: '#050608',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
