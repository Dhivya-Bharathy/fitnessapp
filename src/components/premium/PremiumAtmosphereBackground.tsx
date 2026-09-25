import { View, StyleSheet, Platform, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/** Shared dark backdrop with soft nebula glow (no bottom SVG — avoids bright artifacts on mobile web). */
export function PremiumAtmosphereBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#050608', '#0A1218', '#050608']}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', 'rgba(5,8,10,0.5)', '#050608']}
        locations={[0, 0.45, 1]}
        style={styles.bottomVignette}
      />
      <View style={styles.nebulaTop} />
      <View style={styles.nebulaLeft} />
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
  bottomVignette: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 180,
  },
});
