import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { pickImageFromGallery } from '../../services/imageService';

const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
const lbsToKg = (lbs: number) => Math.round(lbs / 2.20462 * 10) / 10;
const cmToFt = (cm: number) => Math.round(cm / 30.48 * 100) / 100;
const ftToCm = (ft: number) => Math.round(ft * 30.48 * 10) / 10;

const FITNESS_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const FITNESS_GOALS = [
  { key: 'strength', label: 'Strength', icon: 'barbell-outline' },
  { key: 'endurance', label: 'Endurance', icon: 'pulse-outline' },
  { key: 'weight_loss', label: 'Weight Loss', icon: 'flame-outline' },
  { key: 'muscle_gain', label: 'Muscle Gain', icon: 'fitness-outline' },
  { key: 'flexibility', label: 'Flexibility', icon: 'leaf-outline' },
  { key: 'general_fitness', label: 'General', icon: 'heart-outline' },
];

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const { user, profile, updateProfile } = useAuthStore();
  const theme = colors[colorScheme];

  const [units, setUnits] = useState<'metric' | 'imperial'>(profile?.units === 'imperial' ? 'imperial' : 'metric');
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [bio, setBio] = useState((profile as any)?.bio ?? '');
  const [fitnessLevel, setFitnessLevel] = useState((profile as any)?.fitness_level ?? 'beginner');
  const [selectedGoals, setSelectedGoals] = useState<string[]>((profile as any)?.goals ?? []);

  const [weightKg, setWeightKg] = useState(profile?.current_weight_kg ?? 0);
  const [targetWeightKg, setTargetWeightKg] = useState(profile?.target_weight_kg ?? 0);
  const [heightCm, setHeightCm] = useState(profile?.height_cm ?? 0);

  const [weightDisplay, setWeightDisplay] = useState(
    profile?.current_weight_kg
      ? (units === 'imperial' ? kgToLbs(profile.current_weight_kg).toString() : profile.current_weight_kg.toString())
      : ''
  );
  const [targetWeightDisplay, setTargetWeightDisplay] = useState(
    profile?.target_weight_kg
      ? (units === 'imperial' ? kgToLbs(profile.target_weight_kg).toString() : profile.target_weight_kg.toString())
      : ''
  );
  const [heightDisplay, setHeightDisplay] = useState(
    profile?.height_cm
      ? (units === 'imperial' ? cmToFt(profile.height_cm).toString() : profile.height_cm.toString())
      : ''
  );

  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleUnitSwitch = (newUnit: 'metric' | 'imperial') => {
    if (newUnit === units) return;
    setUnits(newUnit);
    if (newUnit === 'imperial') {
      if (weightKg) setWeightDisplay(kgToLbs(weightKg).toString());
      if (targetWeightKg) setTargetWeightDisplay(kgToLbs(targetWeightKg).toString());
      if (heightCm) setHeightDisplay(cmToFt(heightCm).toString());
    } else {
      if (weightKg) setWeightDisplay(weightKg.toString());
      if (targetWeightKg) setTargetWeightDisplay(targetWeightKg.toString());
      if (heightCm) setHeightDisplay(heightCm.toString());
    }
  };

  const handleWeightChange = (val: string) => {
    setWeightDisplay(val);
    const num = parseFloat(val);
    if (!isNaN(num)) setWeightKg(units === 'imperial' ? lbsToKg(num) : num);
  };

  const handleTargetWeightChange = (val: string) => {
    setTargetWeightDisplay(val);
    const num = parseFloat(val);
    if (!isNaN(num)) setTargetWeightKg(units === 'imperial' ? lbsToKg(num) : num);
  };

  const handleHeightChange = (val: string) => {
    setHeightDisplay(val);
    const num = parseFloat(val);
    if (!isNaN(num)) setHeightCm(units === 'imperial' ? ftToCm(num) : num);
  };

  const toggleGoal = (key: string) => {
    setSelectedGoals((prev) => prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key]);
  };

  const handleChangePhoto = async () => {
    const uri = await pickImageFromGallery();
    if (!uri) return;
    setAvatarUri(uri);
    setIsUploadingPhoto(true);
    try {
      const { uploadAvatarToSupabase } = await import('../../services/imageService');
      const publicUrl = await uploadAvatarToSupabase(uri, user?.id ?? '');
      if (publicUrl) {
        setAvatarUri(publicUrl);
        const { supabase } = await import('../../services/supabase');
        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user?.id);
        updateProfile({ avatar_url: publicUrl });
      } else {
        Alert.alert('Upload Failed', 'Could not upload your photo.');
        setAvatarUri(profile?.avatar_url ?? null);
      }
    } catch {
      Alert.alert('Error', 'Photo upload failed.');
      setAvatarUri(profile?.avatar_url ?? null);
    } finally { setIsUploadingPhoto(false); }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!fullName.trim()) { Alert.alert('Missing Name', 'Please enter your full name.'); return; }
    setIsSaving(true);
    try {
      const { supabase } = await import('../../services/supabase');
      const updates: Record<string, any> = {
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        fitness_level: fitnessLevel,
        goals: selectedGoals,
        units,
        current_weight_kg: weightKg || null,
        target_weight_kg: targetWeightKg || null,
        height_cm: heightCm || null,
      };
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) throw error;
      updateProfile(updates);
      Alert.alert('Saved \u2713', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not save profile.');
    } finally { setIsSaving(false); }
  };

  const firstName = fullName || user?.email?.split('@')[0] || 'U';
  const weightSuffix = units === 'imperial' ? 'lbs' : 'kg';
  const heightSuffix = units === 'imperial' ? 'ft' : 'cm';

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving}>
            {isSaving ? <ActivityIndicator size="small" color={theme.accent} /> : <Text style={[styles.saveBtn, { color: theme.accent }]}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handleChangePhoto} disabled={isUploadingPhoto}>
              <View style={[styles.avatarWrap, { borderColor: theme.accent }]}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: theme.accentDim as string }]}>
                    <Text style={[styles.avatarInitial, { color: theme.accent }]}>{firstName[0]?.toUpperCase() ?? 'U'}</Text>
                  </View>
                )}
                <View style={[styles.avatarOverlay, { backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)' }]}>
                  {isUploadingPhoto ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={20} color="#fff" />}
                </View>
              </View>
            </TouchableOpacity>
            <Text style={[styles.changePhotoText, { color: theme.accent }]}>{isUploadingPhoto ? 'Uploading...' : 'Tap to change photo'}</Text>
          </View>

          {/* Name */}
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Full Name</Text>
          <View style={[styles.fieldWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="person-outline" size={18} color={theme.textMuted} />
            <TextInput value={fullName} onChangeText={setFullName} placeholder="Your full name" placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.textPrimary }]} autoCorrect={false} />
          </View>

          {/* Bio */}
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Bio</Text>
          <View style={[styles.fieldWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="chatbubble-outline" size={18} color={theme.textMuted} />
            <TextInput value={bio} onChangeText={setBio} placeholder="Tell us about yourself..." placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.textPrimary }]} multiline maxLength={200} />
          </View>

          {/* Fitness Level */}
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Fitness Level</Text>
          <View style={styles.chipRow}>
            {FITNESS_LEVELS.map((level) => {
              const isActive = fitnessLevel === level;
              return (
                <TouchableOpacity key={level} onPress={() => setFitnessLevel(level)}
                  style={[styles.chip, { backgroundColor: isActive ? theme.accent : theme.card, borderColor: isActive ? theme.accent : theme.border }]}>
                  <Text style={[styles.chipText, { color: isActive ? '#fff' : theme.textSecondary, fontWeight: isActive ? '700' : '500' }]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Fitness Goals */}
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Fitness Goals</Text>
          <View style={styles.goalRow}>
            {FITNESS_GOALS.map((goal) => {
              const isActive = selectedGoals.includes(goal.key);
              return (
                <TouchableOpacity key={goal.key} onPress={() => toggleGoal(goal.key)}
                  style={[styles.goalChip, { backgroundColor: isActive ? theme.accent + '18' : theme.card, borderColor: isActive ? theme.accent : theme.border }]}>
                  <Ionicons name={goal.icon as any} size={16} color={isActive ? theme.accent : theme.textMuted} />
                  <Text style={[styles.goalChipText, { color: isActive ? theme.accent : theme.textSecondary, fontWeight: isActive ? '700' : '500' }]}>{goal.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Units */}
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Units</Text>
          <View style={styles.unitsRow}>
            {(['metric', 'imperial'] as const).map((u) => (
              <TouchableOpacity key={u} onPress={() => handleUnitSwitch(u)}
                style={[styles.unitBtn, { backgroundColor: units === u ? theme.accent : theme.card, borderColor: units === u ? theme.accent : theme.border }]}>
                <Text style={[styles.unitBtnText, { color: units === u ? '#fff' : theme.textSecondary, fontWeight: units === u ? '700' : '400' }]}>
                  {u === 'metric' ? 'Metric' : 'Imperial'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Body Stats */}
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Body Stats</Text>
          <View style={styles.bodyStatsRow}>
            <View style={styles.bodyStatField}>
              <Text style={[styles.bodyStatLabel, { color: theme.textSecondary }]}>Weight ({weightSuffix})</Text>
              <View style={[styles.bodyStatInput, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <TextInput value={weightDisplay} onChangeText={handleWeightChange} placeholder={units === 'imperial' ? '154' : '70'}
                  placeholderTextColor={theme.textMuted} keyboardType="decimal-pad" style={[styles.bodyStatText, { color: theme.textPrimary }]} />
              </View>
            </View>
            <View style={styles.bodyStatField}>
              <Text style={[styles.bodyStatLabel, { color: theme.textSecondary }]}>Target ({weightSuffix})</Text>
              <View style={[styles.bodyStatInput, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <TextInput value={targetWeightDisplay} onChangeText={handleTargetWeightChange} placeholder={units === 'imperial' ? '143' : '65'}
                  placeholderTextColor={theme.textMuted} keyboardType="decimal-pad" style={[styles.bodyStatText, { color: theme.textPrimary }]} />
              </View>
            </View>
          </View>

          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Height ({heightSuffix})</Text>
          <View style={[styles.fieldWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="resize-outline" size={18} color={theme.textMuted} />
            <TextInput value={heightDisplay} onChangeText={handleHeightChange} placeholder={units === 'imperial' ? '5.9' : '175'}
              placeholderTextColor={theme.textMuted} keyboardType="decimal-pad" style={[styles.input, { color: theme.textPrimary }]} />
            <Text style={[styles.fieldSuffix, { color: theme.textMuted }]}>{heightSuffix}</Text>
          </View>

          {/* Save */}
          <TouchableOpacity onPress={handleSave} disabled={isSaving} activeOpacity={0.85} style={styles.saveBtnWrap}>
            <LinearGradient colors={[theme.accent, '#0DAE6C'] as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveFullBtn}>
              {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveFullBtnText}>Save Profile</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingBottom: 100, paddingTop: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pageTitle: { fontSize: fontSize.lg, fontWeight: '700' },
  saveBtn: { fontSize: fontSize.base, fontWeight: '700' },

  avatarSection: { alignItems: 'center', marginVertical: spacing.xl },
  avatarWrap: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, overflow: 'hidden', position: 'relative' },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 36, fontWeight: '800' },
  avatarOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, alignItems: 'center', justifyContent: 'center' },
  changePhotoText: { fontSize: fontSize.sm, fontWeight: '600', marginTop: spacing.sm },

  fieldLabel: { fontSize: fontSize.sm, fontWeight: '600', marginHorizontal: spacing.lg, marginBottom: spacing.xs, marginTop: spacing.md },
  fieldWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginHorizontal: spacing.lg, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  input: { flex: 1, fontSize: fontSize.base },
  fieldSuffix: { fontSize: fontSize.base, fontWeight: '600' },

  sectionLabel: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginHorizontal: spacing.lg, marginTop: spacing.xl, marginBottom: spacing.sm },

  chipRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg },
  chip: { flex: 1, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  chipText: { fontSize: fontSize.sm },

  goalRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginHorizontal: spacing.lg },
  goalChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1 },
  goalChipText: { fontSize: fontSize.sm },

  unitsRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg },
  unitBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  unitBtnText: { fontSize: fontSize.sm },

  bodyStatsRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg },
  bodyStatField: { flex: 1 },
  bodyStatLabel: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs },
  bodyStatInput: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  bodyStatText: { flex: 1, fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center' },

  saveBtnWrap: { marginHorizontal: spacing.lg, marginTop: spacing.xl, borderRadius: radius.lg, overflow: 'hidden' },
  saveFullBtn: { padding: spacing.lg, alignItems: 'center' },
  saveFullBtnText: { fontSize: fontSize.lg, fontWeight: '700', color: '#fff' },
});
