import { useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { useLayoutWidth } from '../../hooks/useLayoutWidth';

const STEP_PX = 10;
const ACCENT = '#2DDC8C';

type Props = {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  formatLabel?: (value: number) => string;
  majorEvery?: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function snapToStep(n: number, min: number, step: number) {
  return min + Math.round((n - min) / step) * step;
}

export function HorizontalValueRuler({
  min,
  max,
  step = 1,
  value,
  onChange,
  formatLabel,
  majorEvery = 10,
}: Props) {
  const layoutWidth = useLayoutWidth();
  const scrollRef = useRef<ScrollView>(null);
  const dragging = useRef(false);
  const lastEmitted = useRef(value);

  const stepsCount = Math.round((max - min) / step);
  const contentPad = layoutWidth / 2 - STEP_PX;

  const scrollToValue = useCallback(
    (v: number, animated: boolean) => {
      const x = ((clamp(v, min, max) - min) / step) * STEP_PX;
      scrollRef.current?.scrollTo({ x, animated });
    },
    [min, max, step],
  );

  useEffect(() => {
    if (dragging.current) return;
    if (Math.abs(lastEmitted.current - value) < step / 2) return;
    scrollToValue(value, false);
    lastEmitted.current = value;
  }, [value, step, scrollToValue]);

  const onScrollEnd = (x: number) => {
    const raw = min + (x / STEP_PX) * step;
    const next = snapToStep(raw, min, step);
    const clamped = clamp(next, min, max);
    lastEmitted.current = clamped;
    onChange(clamped);
    scrollToValue(clamped, true);
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    dragging.current = false;
    onScrollEnd(e.nativeEvent.contentOffset.x);
  };

  const ticks = Array.from({ length: stepsCount + 1 }, (_, i) => min + i * step);

  return (
    <View style={styles.wrap}>
      <View style={styles.centerNeedle} pointerEvents="none">
        <View style={styles.needleLine} />
        <Text style={styles.needleValue}>
          {formatLabel ? formatLabel(value) : String(Math.round(value))}
        </Text>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={STEP_PX}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: contentPad }]}
        onScrollBeginDrag={() => { dragging.current = true; }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        scrollEventThrottle={16}
        {...Platform.select({
          web: { style: styles.scrollWeb },
          default: {},
        })}
      >
        {ticks.map((tick) => {
          const major = majorEvery > 0 && (tick - min) % majorEvery === 0;
          return (
            <View key={tick} style={[styles.tickCol, { width: STEP_PX }]}>
              <View style={[styles.tick, major && styles.tickMajor]} />
              {major ? (
                <Text style={styles.tickLabel}>{tick}</Text>
              ) : (
                <Text style={styles.tickLabelSpacer} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 52,
    marginTop: 4,
    position: 'relative',
  },
  scrollWeb: { overflowX: 'auto' as const, maxWidth: '100%' as const },
  scrollContent: {
    alignItems: 'flex-end',
    paddingBottom: 2,
  },
  tickCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 48,
  },
  tick: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 1,
  },
  tickMajor: {
    height: 18,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  tickLabel: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    width: 28,
    textAlign: 'center',
  },
  tickLabelSpacer: { height: 11 },
  centerNeedle: {
    position: 'absolute',
    left: '50%',
    marginLeft: -1,
    top: 0,
    bottom: 0,
    width: 2,
    zIndex: 2,
    alignItems: 'center',
  },
  needleLine: {
    width: 2,
    height: 28,
    backgroundColor: ACCENT,
    borderRadius: 1,
    shadowColor: ACCENT,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  needleValue: {
    position: 'absolute',
    top: -2,
    fontSize: 10,
    fontWeight: '800',
    color: ACCENT,
    opacity: 0,
  },
});
