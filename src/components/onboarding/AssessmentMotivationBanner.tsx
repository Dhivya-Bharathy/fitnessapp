import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radius } from '../../theme';

type Props = {
  heroUri: string;
  section: string;
  accent: string;
  lead?: string;
  accentPhrase?: string;
  sub?: string;
  fallbackLine?: string;
};

export function AssessmentMotivationBanner({
  heroUri,
  section,
  accent,
  lead,
  accentPhrase,
  sub,
  fallbackLine,
}: Props) {
  const hasStructured = Boolean(lead || accentPhrase);

  return (
    <View style={styles.wrap}>
      <Image source={{ uri: heroUri }} style={styles.image} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(8,10,15,0.15)', 'rgba(8,10,15,0.55)', 'rgba(8,10,15,0.92)']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.badge, { borderColor: `${accent}88` }]}>
        <Text style={[styles.badgeText, { color: accent }]}>{section.toUpperCase()}</Text>
      </View>
      <View style={styles.copy}>
        {hasStructured ? (
          <>
            <Text style={styles.lead}>
              {lead}{' '}
              {accentPhrase ? <Text style={[styles.leadAccent, { color: accent }]}>{accentPhrase}</Text> : null}
            </Text>
            {sub ? <Text style={styles.sub}>{sub}</Text> : null}
          </>
        ) : (
          <Text style={[styles.fallback, { color: accent }]}>{fallbackLine}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 108,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 12,
    justifyContent: 'flex-end',
  },
  image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(8,10,15,0.55)',
  },
  badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.9 },
  copy: { paddingHorizontal: 12, paddingBottom: 10 },
  lead: { color: '#fff', fontSize: 15, fontWeight: '800', lineHeight: 20 },
  leadAccent: { fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.62)', fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  fallback: { fontSize: 12, fontWeight: '600', fontStyle: 'italic', lineHeight: 17 },
});
