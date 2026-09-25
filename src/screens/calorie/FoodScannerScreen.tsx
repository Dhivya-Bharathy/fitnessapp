import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Image, Alert, Platform, Animated, Easing,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { spacing, radius, fontSize } from '../../theme';
import { useAuthStore } from '../../store/authStore';
import { scanFoodImage } from '../../services/nvidia-client';
import { supabase } from '../../services/supabase';
import { ScreenScrollView } from '../../components/ScreenScrollView';
import { PremiumAtmosphereBackground } from '../../components/premium/PremiumAtmosphereBackground';
import {
  PREMIUM_BG,
  PREMIUM_TEXT,
  PREMIUM_MUTED,
  PREMIUM_ACCENT,
  PREMIUM_GLASS,
  PREMIUM_GLASS_BORDER,
  premiumGlassShadow,
} from '../../components/premium/premiumEffects';

const ORANGE = '#FFB347';
const PINK = '#FF6B9D';
const BLUE = '#6699FF';
const PURPLE = '#B280FF';
const NEON_GREEN = '#22C55E';

interface ScanResult {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  serving_size: string;
}

interface RecentFoodLog {
  id: number;
  food_name: string;
  calories: number;
  protein_g: number | null;
  carbs_g: number | null;
  logged_at: string;
}

const WHY_SCAN = [
  {
    title: 'Get Nutrition Info',
    desc: 'Calories, macros and more instantly',
    icon: 'flash-outline' as const,
    color: ORANGE,
  },
  {
    title: 'Stay on Track',
    desc: 'Helps you reach your fitness goals',
    icon: 'radio-button-on-outline' as const,
    color: PREMIUM_ACCENT,
  },
  {
    title: 'Smart Insights',
    desc: 'AI-powered meal analysis',
    icon: 'bar-chart-outline' as const,
    color: PURPLE,
  },
];

async function uriToBase64Web(uri: string): Promise<string | null> {
  try {
    const res = await fetch(uri);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const data = reader.result as string;
        resolve(typeof data === 'string' ? data.split(',')[1] ?? null : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function showScanMessage(title: string, message: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function formatScanTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const time = d.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString('en', { month: 'short', day: 'numeric' })}, ${time}`;
}

function ScannerLaser() {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [y]);
  const translateY = y.interpolate({ inputRange: [0, 1], outputRange: [-36, 36] });
  return (
    <Animated.View style={[styles.laser, { transform: [{ translateY }] }]}>
      <LinearGradient
        colors={['transparent', NEON_GREEN, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function Viewfinder({ imageUri, scanning }: { imageUri: string | null; scanning: boolean }) {
  return (
    <View style={styles.viewfinderWrap}>
      <View style={styles.cornerTL} />
      <View style={styles.cornerTR} />
      <View style={styles.cornerBL} />
      <View style={styles.cornerBR} />
      <View style={styles.circleFrame}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.circleImage} resizeMode="cover" />
        ) : (
          <LinearGradient colors={['#1a2a1f', '#0f1520']} style={styles.circlePlaceholder}>
            <Ionicons name="restaurant" size={40} color={PREMIUM_MUTED} />
          </LinearGradient>
        )}
        {(scanning || !imageUri) && <ScannerLaser />}
      </View>
    </View>
  );
}

export default function FoodScannerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[] | null>(null);
  const [recentScans, setRecentScans] = useState<RecentFoodLog[]>([]);
  const [showCamera, setShowCamera] = useState(false);

  const loadRecent = useCallback(async () => {
    if (!user?.id) {
      setRecentScans([]);
      return;
    }
    const { data } = await supabase
      .from('food_logs')
      .select('id, food_name, calories, protein_g, carbs_g, logged_at')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(5);
    setRecentScans((data ?? []) as RecentFoodLog[]);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadRecent(); }, [loadRecent]));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to scan food images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      let b64 = asset.base64 ?? null;
      if (!b64 && asset.uri && Platform.OS === 'web') {
        b64 = await uriToBase64Web(asset.uri);
      }
      setImageBase64(b64);
      setResults(null);
      setShowCamera(false);
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
    if (photo) {
      setImageUri(photo.uri);
      setImageBase64(photo.base64 ?? null);
      setResults(null);
      setShowCamera(false);
    }
  };

  const handleScan = async () => {
    if (!user?.id) {
      showScanMessage('Account needed', 'Finish onboarding first so we can save your scans.');
      return;
    }
    if (!imageBase64) {
      showScanMessage('No image', 'Choose a photo from your gallery first.');
      return;
    }
    setIsScanning(true);
    try {
      const data = await scanFoodImage(user.id, imageBase64);
      if (data?.items?.length) {
        setResults(data.items);
      } else {
        showScanMessage('No food detected', 'Try a clearer photo with the meal centered.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scan failed.';
      const hint = Platform.OS === 'web' && typeof window !== 'undefined' && /netlify\.app/i.test(window.location.hostname)
        ? '\n\nOn Netlify: set OPENAI_API_KEY in site env and redeploy.'
        : '\n\nLocal dev: run npm run proxy:ai on your PC (port 8787).';
      showScanMessage('Food scan failed', msg + hint);
    } finally {
      setIsScanning(false);
    }
  };

  const handleLogFood = async (item: ScanResult) => {
    if (!user) return;
    try {
      const { logFood } = await import('../../services/profileService');
      await logFood(user.id, {
        meal_type: 'snacks',
        food_name: item.name,
        calories: Math.round(item.calories),
        protein_g: Math.round(item.protein_g),
        carbs_g: Math.round(item.carbs_g),
        fats_g: Math.round(item.fats_g),
      });
      await loadRecent();
      Alert.alert('Logged!', `${item.name} added to your meals.`, [
        { text: 'Scan Another', onPress: resetScan },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not save food item.');
    }
  };

  const handleLogAll = async () => {
    if (!results || !user) return;
    try {
      const { logFood } = await import('../../services/profileService');
      for (const item of results) {
        await logFood(user.id, {
          meal_type: 'snacks',
          food_name: item.name,
          calories: Math.round(item.calories),
          protein_g: Math.round(item.protein_g),
          carbs_g: Math.round(item.carbs_g),
          fats_g: Math.round(item.fats_g),
        });
      }
      await loadRecent();
      Alert.alert('Logged!', `${results.length} items added to your meals.`, [
        { text: 'Scan Another', onPress: resetScan },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not save food items.');
    }
  };

  const resetScan = () => {
    setImageUri(null);
    setImageBase64(null);
    setResults(null);
    setShowCamera(false);
  };

  const showHelp = () => {
    showScanMessage(
      'Food scan tips',
      'Use good lighting and fill the frame with your meal. One dish per photo works best. After analysis, tap Log to add items to today\'s calories.',
    );
  };

  const navigateBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Main', { screen: 'Calorie' });
  };

  const landingMode = !results && !imageUri && !showCamera;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <PremiumAtmosphereBackground />
      {landingMode && (
        <>
          <Text style={[styles.floatDeco, styles.deco1]}>🥬</Text>
          <Text style={[styles.floatDeco, styles.deco2]}>🍅</Text>
          <Text style={[styles.floatDeco, styles.deco3]}>🥑</Text>
        </>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={navigateBack} style={styles.headerIconBtn}>
          <Ionicons name="chevron-back" size={22} color={PREMIUM_TEXT} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Food Scanner</Text>
          <Text style={styles.headerSub}>Scan your food to get instant nutrition insights</Text>
        </View>
        <TouchableOpacity onPress={showHelp} style={styles.headerIconBtn}>
          <Ionicons name="help-circle-outline" size={22} color={PREMIUM_MUTED} />
        </TouchableOpacity>
      </View>

      {showCamera && Platform.OS !== 'web' ? (
        <View style={styles.cameraFull}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
          <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.cameraClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={takePhoto} style={styles.cameraShutter}>
            <View style={styles.cameraShutterInner} />
          </TouchableOpacity>
        </View>
      ) : (
        <ScreenScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {results ? (
            <View style={styles.resultsBlock}>
              {imageUri && <Image source={{ uri: imageUri }} style={styles.resultHeroImage} resizeMode="cover" />}
              <LinearGradient colors={[PREMIUM_ACCENT, '#0DAE6C']} style={styles.resultBanner}>
                <Ionicons name="checkmark-circle" size={28} color="#fff" />
                <Text style={styles.resultBannerTitle}>Food detected</Text>
                <Text style={styles.resultBannerSub}>{results.length} item{results.length > 1 ? 's' : ''} found</Text>
              </LinearGradient>

              {results.map((item, i) => (
                <View key={i} style={[styles.foodCard, premiumGlassShadow(), { borderColor: PREMIUM_GLASS_BORDER }]}>
                  <View style={styles.foodHeader}>
                    <Text style={styles.foodName}>{item.name}</Text>
                    <Text style={[styles.foodCal, { color: ORANGE }]}>{item.calories} kcal</Text>
                  </View>
                  <Text style={styles.foodServing}>Per {item.serving_size}</Text>
                  <View style={styles.macroRow}>
                    <MacroPill icon="barbell-outline" value={`${item.protein_g}g`} color={PINK} />
                    <MacroPill icon="nutrition-outline" value={`${item.carbs_g}g`} color={BLUE} />
                    <MacroPill icon="water-outline" value={`${item.fats_g}g`} color={BLUE} />
                  </View>
                  <TouchableOpacity onPress={() => handleLogFood(item)} style={styles.logBtn}>
                    <Ionicons name="add-circle-outline" size={18} color={PREMIUM_BG} />
                    <Text style={styles.logBtnText}>Log this item</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <View style={styles.bulkRow}>
                <TouchableOpacity onPress={handleLogAll} style={[styles.bulkBtn, styles.bulkPrimary]}>
                  <Text style={styles.bulkPrimaryText}>Log all</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={resetScan} style={[styles.bulkBtn, styles.bulkGhost]}>
                  <Text style={styles.bulkGhostText}>Scan again</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <LinearGradient
                colors={['#2DDC8C55', '#B280FF55', '#2DDC8C33']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroGradientBorder}
              >
                <View style={[styles.heroCard, premiumGlassShadow()]}>
                  <Viewfinder imageUri={imageUri} scanning={isScanning || landingMode} />
                  <Text style={styles.scanFromTitle}>Scan from Photo</Text>
                  <Text style={styles.scanFromSub}>
                    Take a clear photo of your food. Our AI will analyze the nutrition for you.
                  </Text>

                  {imageUri ? (
                    <View style={styles.previewActions}>
                      <TouchableOpacity onPress={resetScan} style={styles.ghostBtn}>
                        <Text style={styles.ghostBtnText}>Retake</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleScan}
                        disabled={isScanning}
                        style={[styles.chooseBtn, isScanning && { opacity: 0.75 }]}
                      >
                        {isScanning ? (
                          <ActivityIndicator color={PREMIUM_BG} />
                        ) : (
                          <>
                            <Ionicons name="scan-outline" size={20} color={PREMIUM_BG} />
                            <Text style={styles.chooseBtnText}>Analyze food</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity onPress={pickImage} activeOpacity={0.88} style={styles.chooseBtn}>
                        <Ionicons name="images-outline" size={22} color={PREMIUM_BG} />
                        <Text style={styles.chooseBtnText}>Choose Photo</Text>
                      </TouchableOpacity>
                      {Platform.OS !== 'web' && (
                        <TouchableOpacity
                          onPress={async () => {
                            if (!permission?.granted) {
                              const res = await requestPermission();
                              if (!res.granted) return;
                            }
                            setShowCamera(true);
                          }}
                          style={styles.cameraLink}
                        >
                          <Ionicons name="camera-outline" size={16} color={PREMIUM_ACCENT} />
                          <Text style={styles.cameraLinkText}>Use camera instead</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </LinearGradient>

              <Text style={styles.sectionTitle}>Why Scan Food?</Text>
              <View style={styles.whyRow}>
                {WHY_SCAN.map((w) => (
                  <View key={w.title} style={[styles.whyCard, premiumGlassShadow(), { borderColor: PREMIUM_GLASS_BORDER }]}>
                    <View style={[styles.whyIcon, { backgroundColor: w.color + '22' }]}>
                      <Ionicons name={w.icon} size={20} color={w.color} />
                    </View>
                    <Text style={styles.whyTitle}>{w.title}</Text>
                    <Text style={styles.whyDesc}>{w.desc}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.recentHeader}>
                <Text style={styles.sectionTitle}>Recent Scans</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Calorie' })}>
                  <Text style={styles.viewAll}>View All ›</Text>
                </TouchableOpacity>
              </View>

              {recentScans.length === 0 ? (
                <View style={[styles.emptyRecent, { borderColor: PREMIUM_GLASS_BORDER }]}>
                  <Ionicons name="fast-food-outline" size={28} color={PREMIUM_MUTED} />
                  <Text style={styles.emptyRecentText}>Logged meals appear here after you scan or add food.</Text>
                </View>
              ) : (
                recentScans.slice(0, 3).map((row) => (
                  <TouchableOpacity
                    key={row.id}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('Main', { screen: 'Calorie' })}
                    style={[styles.recentRow, premiumGlassShadow(), { borderColor: PREMIUM_GLASS_BORDER }]}
                  >
                    <View style={styles.recentThumb}>
                      <Ionicons name="restaurant-outline" size={18} color={PREMIUM_ACCENT} />
                    </View>
                    <View style={styles.recentMid}>
                      <Text style={styles.recentName} numberOfLines={1}>{row.food_name}</Text>
                      <Text style={styles.recentTime}>{formatScanTime(row.logged_at)}</Text>
                    </View>
                    <View style={styles.recentPills}>
                      <MacroPill compact icon="flame-outline" value={`${row.calories}`} suffix=" kcal" color={ORANGE} />
                      <MacroPill compact icon="barbell-outline" value={`${Math.round(row.protein_g ?? 0)}`} suffix="g" color={PINK} />
                      <MacroPill compact icon="nutrition-outline" value={`${Math.round(row.carbs_g ?? 0)}`} suffix="g" color={BLUE} />
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={PREMIUM_MUTED} />
                  </TouchableOpacity>
                ))
              )}
            </>
          )}
        </ScreenScrollView>
      )}
    </View>
  );
}

function MacroPill({
  icon,
  value,
  suffix = '',
  color,
  compact,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  suffix?: string;
  color: string;
  compact?: boolean;
}) {
  return (
    <View style={[mp.pill, compact && mp.compact, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={compact ? 10 : 12} color={color} />
      <Text style={[mp.text, { color }, compact && mp.textCompact]}>{value}{suffix}</Text>
    </View>
  );
}

const mp = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
  compact: { paddingHorizontal: 6, paddingVertical: 3 },
  text: { fontSize: 11, fontWeight: '700' },
  textCompact: { fontSize: 9 },
});

const corner = {
  position: 'absolute' as const,
  width: 18,
  height: 18,
  borderColor: NEON_GREEN,
};
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PREMIUM_BG },
  floatDeco: { position: 'absolute', fontSize: 28, opacity: 0.35, zIndex: 1 },
  deco1: { top: '18%', left: '8%' },
  deco2: { top: '12%', right: '12%' },
  deco3: { bottom: '38%', left: '6%' },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    zIndex: 10,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM_GLASS,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    marginTop: 2,
  },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xs },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_TEXT },
  headerSub: { fontSize: 11, color: PREMIUM_MUTED, textAlign: 'center', marginTop: 4, lineHeight: 15 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },

  heroGradientBorder: {
    borderRadius: radius.xl + 4,
    padding: 2,
    marginBottom: spacing.xl,
  },
  heroCard: {
    borderRadius: radius.xl + 2,
    backgroundColor: 'rgba(8,12,18,0.92)',
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    padding: spacing.lg,
    alignItems: 'center',
  },
  viewfinderWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  circleFrame: {
    width: 132,
    height: 132,
    borderRadius: 66,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleImage: { width: '100%', height: '100%' },
  circlePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  laser: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.9,
  },
  cornerTL: { ...corner, top: 8, left: 24, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { ...corner, top: 8, right: 24, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { ...corner, bottom: 8, left: 24, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { ...corner, bottom: 8, right: 24, borderBottomWidth: 2, borderRightWidth: 2 },

  scanFromTitle: { fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_TEXT, marginBottom: spacing.xs },
  scanFromSub: {
    fontSize: fontSize.sm,
    color: PREMIUM_MUTED,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  chooseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: PREMIUM_ACCENT,
  },
  chooseBtnText: { color: PREMIUM_BG, fontWeight: '800', fontSize: fontSize.base },
  cameraLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  cameraLinkText: { color: PREMIUM_ACCENT, fontWeight: '600', fontSize: fontSize.sm },
  previewActions: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  ghostBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    alignItems: 'center',
  },
  ghostBtnText: { color: PREMIUM_MUTED, fontWeight: '700' },

  sectionTitle: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_TEXT, marginBottom: spacing.md },
  whyRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  whyCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: PREMIUM_GLASS,
    padding: spacing.sm,
    paddingTop: spacing.md,
    minHeight: 120,
  },
  whyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  whyTitle: { fontSize: 11, fontWeight: '800', color: PREMIUM_TEXT, marginBottom: 4 },
  whyDesc: { fontSize: 9, lineHeight: 13, color: PREMIUM_MUTED },

  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  viewAll: { color: PREMIUM_ACCENT, fontWeight: '700', fontSize: fontSize.sm },
  emptyRecent: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: PREMIUM_GLASS,
  },
  emptyRecentText: { fontSize: fontSize.sm, color: PREMIUM_MUTED, textAlign: 'center' },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: PREMIUM_GLASS,
    marginBottom: spacing.sm,
  },
  recentThumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: PREMIUM_ACCENT + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentMid: { flex: 1, minWidth: 0 },
  recentName: { fontSize: fontSize.sm, fontWeight: '700', color: PREMIUM_TEXT },
  recentTime: { fontSize: 10, color: PREMIUM_MUTED, marginTop: 2 },
  recentPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, maxWidth: 110, justifyContent: 'flex-end' },

  resultsBlock: { gap: spacing.md },
  resultHeroImage: { width: '100%', height: 180, borderRadius: radius.xl },
  resultBanner: { alignItems: 'center', padding: spacing.lg, borderRadius: radius.xl, gap: spacing.xs },
  resultBannerTitle: { color: '#fff', fontSize: fontSize.xl, fontWeight: '800' },
  resultBannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: fontSize.sm },
  foodCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: PREMIUM_GLASS,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  foodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  foodName: { fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_TEXT, flex: 1 },
  foodCal: { fontSize: fontSize.base, fontWeight: '800' },
  foodServing: { fontSize: fontSize.xs, color: PREMIUM_MUTED },
  macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: PREMIUM_ACCENT,
    marginTop: spacing.xs,
  },
  logBtnText: { color: PREMIUM_BG, fontWeight: '800' },
  bulkRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  bulkBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.lg, alignItems: 'center' },
  bulkPrimary: { backgroundColor: PREMIUM_ACCENT },
  bulkPrimaryText: { color: PREMIUM_BG, fontWeight: '800' },
  bulkGhost: { borderWidth: 1, borderColor: PREMIUM_GLASS_BORDER },
  bulkGhostText: { color: PREMIUM_MUTED, fontWeight: '700' },

  cameraFull: { flex: 1, margin: spacing.lg, borderRadius: radius.xl, overflow: 'hidden' },
  cameraClose: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraShutter: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -36,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraShutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: PREMIUM_ACCENT },
});
