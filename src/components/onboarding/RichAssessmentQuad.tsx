import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageBackground,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { assessmentUseNativeDriver, ensureAnimatedValues } from './assessmentAnim';

export type RichOption = {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  imageUri?: string;
};

type Props = {
  options: RichOption[];
  selectedValues: string[];
  onPress: (value: string) => void;
  accent: string;
  animateKey: number;
};

function tileBorder(active: boolean, color: string) {
  return Platform.select({
    web: { boxShadow: active ? `0 0 18px ${color}88` : '0 0 8px rgba(0,0,0,0.25)' },
    ios: active
      ? { shadowColor: color, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } }
      : {},
    android: active ? { elevation: 4 } : { elevation: 0 },
    default: {},
  });
}

export function RichAssessmentQuad({
  options,
  selectedValues,
  onPress,
  accent,
  animateKey,
}: Props) {
  const animsRef = useRef<Animated.Value[]>([]);
  const anims = ensureAnimatedValues(animsRef, options.length, 0);

  useEffect(() => {
    anims.forEach((a) => a.setValue(0));
    Animated.stagger(
      50,
      anims.map((a) =>
        Animated.spring(a, {
          toValue: 1,
          friction: 7,
          tension: 75,
          useNativeDriver: assessmentUseNativeDriver,
        }),
      ),
    ).start();
  }, [animateKey, options.length]);

  return (
    <View style={styles.grid}>
      {options.map((opt, i) => {
        const active = selectedValues.includes(opt.value);
        const color = opt.color ?? accent;
        const anim = anims[i];
        const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });

        return (
          <Animated.View key={opt.value} style={[styles.cell, { opacity: anim, transform: [{ scale }] }]}>
            <Pressable
              onPress={() => onPress(opt.value)}
              style={({ pressed }) => [
                styles.tile,
                { borderColor: active ? color : `${color}55` },
                tileBorder(active, color),
                pressed && { opacity: 0.94 },
              ]}
            >
              <ImageBackground
                source={{ uri: opt.imageUri ?? 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80' }}
                style={styles.bg}
                imageStyle={styles.bgImage}
              >
                <LinearGradient
                  colors={[`${color}33`, 'rgba(8,10,15,0.88)']}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={[styles.iconBubble, { borderColor: `${color}66`, backgroundColor: `${color}22` }]}>
                  <Ionicons name={(opt.icon ?? 'ellipse-outline') as never} size={16} color={color} />
                </View>
                <View style={[styles.radio, active && { borderColor: color, backgroundColor: color }]}>
                  {active ? <View style={styles.radioInner} /> : null}
                </View>
                <View style={styles.labels}>
                  <Text style={styles.title} numberOfLines={2}>{opt.label}</Text>
                  {opt.description ? (
                    <Text style={styles.desc} numberOfLines={2}>{opt.description}</Text>
                  ) : null}
                </View>
              </ImageBackground>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    width: '100%',
  },
  cell: { width: '48%' },
  tile: {
    height: 132,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  bg: { flex: 1, justifyContent: 'flex-end' },
  bgImage: { borderRadius: 14 },
  iconBubble: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radio: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#080A0F',
  },
  labels: { padding: 10, paddingTop: 28 },
  title: { color: '#fff', fontSize: 12, fontWeight: '800', lineHeight: 15 },
  desc: { color: 'rgba(255,255,255,0.58)', fontSize: 10, marginTop: 2, lineHeight: 13 },
});
