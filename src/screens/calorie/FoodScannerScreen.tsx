import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Image, Alert, ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, fontSize } from '../../theme';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { scanFoodImage } from '../../services/nvidia-client';

interface ScanResult {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  serving_size: string;
}

export default function FoodScannerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const { user } = useAuthStore();
  const theme = colors[colorScheme];
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[] | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to your photo library to scan food images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 ?? null);
      setResults(null);
    }
  };

  const takePhoto = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert('Permission needed', 'Camera access is required to scan food.');
        return;
      }
    }
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      if (photo) {
        setImageUri(photo.uri);
        setImageBase64(photo.base64 ?? null);
        setResults(null);
      }
    }
  };

  const handleScan = async () => {
    if (!imageBase64 || !user) return;
    setIsScanning(true);
    try {
      const data = await scanFoodImage(user.id, imageBase64);
      if (data && data.items.length > 0) {
        setResults(data.items);
      } else {
        Alert.alert('No food detected', 'Could not identify any food items. Try a clearer photo.');
      }
    } catch {
      Alert.alert('Scan failed', 'Something went wrong. Please try again.');
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
      Alert.alert('Logged!', `${item.name} added to your meals.`, [
        { text: 'Scan Another', onPress: () => { setImageUri(null); setImageBase64(null); setResults(null); } },
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
      Alert.alert('Logged!', `${results.length} items added to your meals.`, [
        { text: 'Scan Another', onPress: () => { setImageUri(null); setImageBase64(null); setResults(null); } },
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
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Food Scanner</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {results ? (
          <View style={styles.resultsContainer}>
            {imageUri && (
              <Image source={{ uri: imageUri }} style={styles.resultImage} resizeMode="cover" />
            )}
            <LinearGradient colors={['#2DDC8C', '#0DAE6C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.resultHeader}>
              <Ionicons name="checkmark-circle" size={32} color="#fff" />
              <Text style={styles.resultTitle}>Food Detected!</Text>
              <Text style={styles.resultSub}>{results.length} item{results.length > 1 ? 's' : ''} found</Text>
            </LinearGradient>

            {results.map((item, i) => (
              <View key={i} style={[styles.foodCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.foodHeader}>
                  <Text style={[styles.foodName, { color: theme.textPrimary }]}>{item.name}</Text>
                  <Text style={[styles.foodCal, { color: theme.accent }]}>{item.calories} kcal</Text>
                </View>
                <Text style={[styles.foodServing, { color: theme.textMuted }]}>Per {item.serving_size}</Text>
                <View style={styles.macroRow}>
                  <MacroBadge label="Protein" value={`${item.protein_g}g`} color="#FF6B9D" />
                  <MacroBadge label="Carbs" value={`${item.carbs_g}g`} color="#FFB830" />
                  <MacroBadge label="Fat" value={`${item.fats_g}g`} color="#6699FF" />
                </View>
                <TouchableOpacity
                  onPress={() => handleLogFood(item)}
                  style={[styles.logBtn, { backgroundColor: theme.accent }]}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#fff" />
                  <Text style={styles.logBtnText}>Log This Item</Text>
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.bulkActions}>
              <TouchableOpacity onPress={handleLogAll} style={[styles.bulkBtn, { backgroundColor: theme.accent }]}>
                <Ionicons name="bookmark-outline" size={18} color="#fff" />
                <Text style={styles.bulkBtnText}>Log All Items</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={resetScan} style={[styles.bulkBtn, { borderColor: theme.border, borderWidth: 1 }]}>
                <Ionicons name="camera-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.bulkBtnText, { color: theme.textSecondary }]}>Scan Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : imageUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="contain" />
            <View style={styles.previewActions}>
              <TouchableOpacity onPress={resetScan} style={[styles.previewBtn, { borderColor: theme.border, borderWidth: 1 }]}>
                <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
                <Text style={[styles.previewBtnText, { color: theme.textSecondary }]}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleScan}
                disabled={isScanning}
                style={[styles.previewBtn, { backgroundColor: theme.accent, opacity: isScanning ? 0.7 : 1 }]}
              >
                {isScanning ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="scan-outline" size={20} color="#fff" />
                    <Text style={styles.previewBtnTextActive}>Analyze Food</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.captureContainer}>
            <View style={styles.cameraBox}>
              <CameraView ref={cameraRef} style={styles.camera} facing="back" />
            </View>

            <View style={styles.captureActions}>
              <TouchableOpacity onPress={pickImage} style={[styles.captureBtn, { borderColor: theme.border }]}>
                <View style={[styles.captureIcon, { backgroundColor: theme.accentDim }]}>
                  <Ionicons name="images-outline" size={24} color={theme.accent} />
                </View>
                <Text style={[styles.captureLabel, { color: theme.textPrimary }]}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={takePhoto} style={styles.shutterWrap}>
                <View style={styles.shutterOuter}>
                  <View style={[styles.shutterInner, { backgroundColor: theme.accent }]} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={pickImage} style={[styles.captureBtn, { borderColor: 'transparent', opacity: 0 }]}>
                <View style={[styles.captureIcon, { backgroundColor: theme.accentDim }]}>
                  <Ionicons name="images-outline" size={24} color={theme.accent} />
                </View>
                <Text style={[styles.captureLabel, { color: theme.textPrimary }]}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MacroBadge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[mb.badge, { backgroundColor: color + '18' }]}>
      <Text style={[mb.value, { color }]}>{value}</Text>
      <Text style={mb.label}>{label}</Text>
    </View>
  );
}
const mb = StyleSheet.create({
  badge: { flex: 1, alignItems: 'center', padding: spacing.sm, borderRadius: radius.md, gap: 2 },
  value: { fontSize: fontSize.base, fontWeight: '800' },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '800' },
  scroll: { flexGrow: 1 },

  // Capture mode
  captureContainer: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  cameraBox: { height: 360, borderRadius: radius.xl, overflow: 'hidden', marginBottom: spacing.xl },
  camera: { flex: 1 },
  captureActions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 40 },
  captureBtn: { alignItems: 'center', gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  captureIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  captureLabel: { fontSize: fontSize.sm, fontWeight: '600' },
  shutterWrap: { alignItems: 'center', justifyContent: 'center' },
  shutterOuter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 28 },

  // Preview mode
  previewContainer: { flex: 1, padding: spacing.lg },
  preview: { flex: 1, borderRadius: radius.xl, minHeight: 300, marginBottom: spacing.lg },
  previewActions: { flexDirection: 'row', gap: spacing.md, paddingBottom: 40 },
  previewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.lg },
  previewBtnText: { fontSize: fontSize.base, fontWeight: '600' },
  previewBtnTextActive: { color: '#fff', fontSize: fontSize.base, fontWeight: '700' },

  // Results mode
  resultsContainer: { padding: spacing.lg, gap: spacing.md },
  resultImage: { width: '100%', height: 200, borderRadius: radius.xl, marginBottom: spacing.sm },
  resultHeader: { alignItems: 'center', padding: spacing.xl, borderRadius: radius.xl, gap: spacing.sm },
  resultTitle: { color: '#fff', fontSize: fontSize.display, fontWeight: '800' },
  resultSub: { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.base },
  foodCard: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  foodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  foodName: { fontSize: fontSize.xl, fontWeight: '700', flex: 1 },
  foodCal: { fontSize: fontSize.lg, fontWeight: '800' },
  foodServing: { fontSize: fontSize.xs },
  macroRow: { flexDirection: 'row', gap: spacing.sm },
  logBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md },
  logBtnText: { color: '#fff', fontSize: fontSize.base, fontWeight: '700' },
  bulkActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  bulkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.lg },
  bulkBtnText: { color: '#fff', fontSize: fontSize.base, fontWeight: '700' },
});
