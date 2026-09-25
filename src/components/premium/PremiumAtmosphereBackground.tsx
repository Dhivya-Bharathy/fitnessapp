import { View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';

/** Shared dark scenic backdrop (mountains + soft nebula glow). */
export function PremiumAtmosphereBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#050608', '#0A1218', '#050608']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.nebulaTop} />
      <View style={styles.nebulaLeft} />
      <Svg
        width="100%"
        height={220}
        viewBox="0 0 400 220"
        preserveAspectRatio="xMidYMax slice"
        style={styles.mountains}
      >
        <Path
          d="M0 220 L0 140 L60 100 L120 150 L200 70 L280 130 L360 90 L400 120 L400 220 Z"
          fill="rgba(12,28,32,0.95)"
        />
        <Path
          d="M0 220 L0 165 L80 130 L160 175 L260 115 L340 155 L400 140 L400 220 Z"
          fill="rgba(8,18,22,0.98)"
        />
        <Path
          d="M0 220 L0 185 L100 160 L220 190 L320 165 L400 180 L400 220 Z"
          fill="#030506"
        />
      </Svg>
      {Platform.OS === 'web' && (
        <View
          style={
            {
              ...StyleSheet.absoluteFillObject,
              opacity: 0.04,
              backgroundImage:
                'radial-gradient(circle at 20% 10%, #fff 0.5px, transparent 1px)',
              backgroundSize: '48px 48px',
            } as ViewStyle
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  nebulaTop: {
    position: 'absolute',
    top: -100,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(45,220,140,0.04)',
  },
  nebulaLeft: {
    position: 'absolute',
    top: 180,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(178,128,255,0.03)',
  },
  mountains: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
