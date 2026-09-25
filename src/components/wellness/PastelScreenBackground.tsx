import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { WELLNESS_PASTEL_GRADIENT } from './wellnessTheme';

export function PastelScreenBackground() {
  return (
    <LinearGradient
      colors={[...WELLNESS_PASTEL_GRADIENT]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    />
  );
}
