import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { useEffect, useRef } from 'react';
import { colors, spacing, radius } from '../theme';
import { useThemeStore } from '../store/themeStore';

export function AILoadingSkeleton() {
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3, duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1, duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Animated.View style={[styles.row, { opacity: pulseAnim }]}>
            <View style={[styles.iconSquare, { backgroundColor: theme.border }]} />
            <View style={{ flex: 1 }}>
              <View style={[styles.lineW60, { backgroundColor: theme.border }]} />
              <View style={[styles.lineW40, { backgroundColor: theme.border, marginTop: 6 }]} />
            </View>
          </Animated.View>
          <Animated.View style={{ opacity: pulseAnim }}>
            <View style={[styles.lineW90, { backgroundColor: theme.border, marginTop: 10 }]} />
            <View style={[styles.lineW70, { backgroundColor: theme.border, marginTop: 5 }]} />
          </Animated.View>
        </View>
      ))}
    </View>
  );
}

export function LoadingSpinner({ theme, message }: { theme: typeof colors.light & typeof colors.dark; message?: string }) {
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1, duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, [spinAnim]);

  const rotate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={spinnerStyles.container}>
      <Animated.View style={[spinnerStyles.circle, { borderColor: theme.accent + '30', borderTopColor: theme.accent, transform: [{ rotate }] }]} />
      {message && <Text style={[spinnerStyles.text, { color: theme.textSecondary }]}>{message}</Text>}
    </View>
  );
}

const spinnerStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.md },
  circle: { width: 32, height: 32, borderRadius: 16, borderWidth: 3 },
  text: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.sm },
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconSquare: { width: 40, height: 40, borderRadius: 10 },
  lineW60: { height: 14, borderRadius: radius.sm, width: '60%' },
  lineW40: { height: 12, borderRadius: radius.sm, width: '40%' },
  lineW90: { height: 12, borderRadius: radius.sm, width: '90%' },
  lineW70: { height: 12, borderRadius: radius.sm, width: '70%' },
});
