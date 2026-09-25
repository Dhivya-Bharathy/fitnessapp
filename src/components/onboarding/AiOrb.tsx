import { View, StyleSheet } from 'react-native';

const DOTS = [
  { left: '38%', top: '8%', size: 10, color: '#FF6B9D', opacity: 0.95 },
  { left: '52%', top: '18%', size: 8, color: '#6699FF', opacity: 0.9 },
  { left: '28%', top: '22%', size: 7, color: '#B280FF', opacity: 0.85 },
  { left: '48%', top: '42%', size: 14, color: '#2DDC8C', opacity: 1 },
  { left: '62%', top: '38%', size: 9, color: '#FFD133', opacity: 0.9 },
  { left: '34%', top: '48%', size: 6, color: '#6699FF', opacity: 0.75 },
  { left: '58%', top: '58%', size: 7, color: '#FF6B9D', opacity: 0.8 },
  { left: '42%', top: '62%', size: 5, color: '#FFFFFF', opacity: 0.5 },
] as const;

type Props = { size?: number };

/** Glowing particle cluster (AI / premium onboarding accent). */
export function AiOrb({ size = 72 }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {DOTS.map((d, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              left: d.left,
              top: d.top,
              width: d.size,
              height: d.size,
              borderRadius: d.size / 2,
              backgroundColor: d.color,
              opacity: d.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'center', position: 'relative', marginVertical: 8 },
  dot: {
    position: 'absolute',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
});
