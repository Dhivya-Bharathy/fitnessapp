import { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Svg from 'react-native-svg';
import { getExerciseIllustration } from './ExerciseIllustrations';
import { getExerciseImageUrl } from '../utils/exerciseImages';
import type { ExerciseCategory } from '../data/exerciseLibrary';

type Props = {
  name: string;
  category: ExerciseCategory;
  size?: number;
  accent: string;
  borderRadius?: number;
};

export function ExerciseThumbnail({ name, category, size = 56, accent, borderRadius = 14 }: Props) {
  const [failed, setFailed] = useState(false);
  const uri = getExerciseImageUrl(name, category);

  if (!failed) {
    return (
      <Image
        source={{ uri }}
        onError={() => setFailed(true)}
        style={{
          width: size,
          height: size,
          borderRadius,
          backgroundColor: accent + '15',
        }}
        resizeMode="cover"
      />
    );
  }

  const Illus = getExerciseIllustration(category);
  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius, backgroundColor: accent + '18' }]}>
      <Svg width={size * 0.65} height={size * 0.65} viewBox="0 0 100 100">
        <Illus color={accent} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
