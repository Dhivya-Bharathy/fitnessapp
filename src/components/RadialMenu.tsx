import { Modal, View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { colors, spacing, radius, fontSize } from '../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface RadialItem {
  key: string;
  label: string;
  icon: string;
  gradient: [string, string];
  textColor: string;
}

const ITEMS: RadialItem[] = [
  { key: 'Activity',     label: 'Activity',     icon: 'barbell-outline',    gradient: ['#FFB347', '#FF8C00'],  textColor: '#FFB347' },
  { key: 'Health',       label: 'Health',       icon: 'heart-outline',      gradient: ['#FF6B9D', '#E04A7A'],  textColor: '#FF6B9D' },
  { key: 'FoodScanner',  label: 'Scan Food',   icon: 'camera-outline',     gradient: ['#4A90E2', '#357ABD'],  textColor: '#4A90E2' },
  { key: 'MealPlans',    label: 'Meal Plans',  icon: 'restaurant-outline', gradient: ['#34D98A', '#0DAE6C'],  textColor: '#34D98A' },
  { key: 'Progress',     label: 'Progress',    icon: 'trending-up',        gradient: ['#9B6FE8', '#7B3FE4'],  textColor: '#9B6FE8' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (key: string) => void;
  theme: typeof colors.light;
}

export function RadialMenu({ visible, onClose, onSelect, theme }: Props) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const itemAnims = useRef(ITEMS.map(() => new Animated.Value(0))).current;
  const ringAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      Animated.spring(ringAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }).start();
      ITEMS.forEach((_, i) => {
        Animated.spring(itemAnims[i], {
          toValue: 1, delay: 60 * i, friction: 5, tension: 120,
          useNativeDriver: true,
        }).start();
      });
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start();
      ringAnim.setValue(0);
      itemAnims.forEach(anim => anim.setValue(0));
    }
  }, [visible]);

  if (!visible) return null;

  const cx = SCREEN_W / 2;
  const cy = SCREEN_H - 72;
  const RING_RADIUS = 140;
  const ARC_RADIUS  = 95;
  const ITEM_SIZE   = 72;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.backdropTouch}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableOpacity>

        <Animated.View
          pointerEvents="none"
          style={[
            styles.ringBg,
            {
              backgroundColor: theme.bg,
              left: cx - RING_RADIUS - 20,
              top: cy - RING_RADIUS - 20,
              borderColor: theme.border,
              opacity: ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.95] }),
              transform: [{ scale: ringAnim }],
            },
          ]}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.ringTrack,
            {
              borderColor: theme.textMuted,
              left: cx - RING_RADIUS - 8,
              top: cy - RING_RADIUS - 8,
              opacity: ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }),
              transform: [{ scale: ringAnim }],
            },
          ]}
        />

        {ITEMS.map((item, i) => {
          const t = ITEMS.length > 1 ? i / (ITEMS.length - 1) : 0.5;
          const angle = -Math.PI * 0.44 + t * Math.PI * 0.88;
          const x = cx + ARC_RADIUS * Math.sin(angle) - ITEM_SIZE / 2;
          const y = cy - ARC_RADIUS * Math.cos(angle) - ITEM_SIZE / 2;

          return (
            <Animated.View
              key={item.key}
              style={[
                styles.itemWrap,
                {
                  left: x,
                  top: y,
                  opacity: itemAnims[i],
                  transform: [{ scale: itemAnims[i] }],
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => onSelect(item.key)}
                activeOpacity={0.85}
                style={styles.itemBtn}
              >
                <LinearGradient
                  colors={item.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.itemGrad}
                >
                  <Ionicons name={item.icon as any} size={28} color="#fff" />
                  <Text style={styles.itemLabel}>{item.label}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          );
        })}

        <Animated.View
          style={[
            styles.closeBtn,
            {
              left: cx - 26,
              top: cy - 26,
              backgroundColor: theme.card,
              borderColor: theme.border,
              opacity: fadeAnim,
              transform: [{
                rotate: ringAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '135deg'] }),
              }],
            },
          ]}
        >
          <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={styles.closeBtnInner}>
            <Ionicons name="close" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:      { flex: 1 },
  backdropTouch: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  backdrop:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  ringBg: {
    position: 'absolute',
    width: (140 + 20) * 2,
    height: (140 + 20) * 2,
    borderRadius: 140 + 20,
    borderWidth: 0.5,
  },
  ringTrack: {
    position: 'absolute',
    width: (140 + 8) * 2,
    height: (140 + 8) * 2,
    borderRadius: 140 + 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  itemWrap: {
    position: 'absolute',
    width: 72,
    alignItems: 'center',
    zIndex: 2,
  },
  itemBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  itemGrad: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  itemLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  closeBtn: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 3,
  },
  closeBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
