import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, fontSize } from '../../theme';
import { pickImageFromGallery } from '../../services/imageService';
import { getDisplayBio, mergeBioForSave } from '../../utils/profileBio';
import { PremiumAtmosphereBackground } from '../../components/premium/PremiumAtmosphereBackground';
import { PremiumSegmentedControl } from '../../components/premium/PremiumSegmentedControl';
import { CompactOptionGrid } from '../../components/onboarding/CompactOptionGrid';
import {
  PREMIUM_BG,
  PREMIUM_TEXT,
  PREMIUM_MUTED,
  PREMIUM_ACCENT,
  PREMIUM_GLASS,
  PREMIUM_GLASS_BORDER,
  premiumGlassShadow,
} from '../../components/premium/premiumEffects';
import { showSaveSuccess, showUserMessage } from '../../utils/userMessages';

const kgToLbs = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
const lbsToKg = (lbs: number) => Math.round(lbs / 2.20462 * 10) / 10;
const cmToFt = (cm: number) => Math.round(cm / 30.48 * 100) / 100;
const ftToCm = (ft: number) => Math.round(ft * 30.48 * 10) / 10;

const GOAL_GRID = [
  { value: 'strength', label: 'Strength', icon: 'barbell-outline', color: '#6699FF' },
  { value: 'endurance', label: 'Endurance', icon: 'pulse-outline', color: '#B280FF' },
  { value: 'weight_loss', label: 'Weight Loss', icon: 'flame-outline', color: '#FFB347' },
  { value: 'muscle_gain', label: 'Muscle Gain', icon: 'fitness-outline', color: PREMIUM_ACCENT },
  { value: 'flexibility', label: 'Flexibility', icon: 'leaf-outline', color: '#2BBCB0' },
  { value: 'general_fitness', label: 'General', icon: 'heart-outline', color: '#FF6B9D' },
];

const LEVEL_OPTIONS = [
  { id: 'beginner' as const, label: 'Beginner', icon: 'leaf-outline' as const },
  { id: 'intermediate' as const, label: 'Intermediate', icon: 'trending-up-outline' as const },
  { id: 'advanced' as const, label: 'Advanced', icon: 'flash-outline' as const },
];

const UNIT_OPTIONS = [
  { id: 'metric' as const, label: 'Metric', icon: 'speedometer-outline' as const },
  { id: 'imperial' as const, label: 'Imperial', icon: 'flag-outline' as const },
];

export default function EditProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, profile, updateProfile } = useAuthStore();

  const [units, setUnits] = useState<'metric' | 'imperial'>(profile?.units === 'imperial' ? 'imperial' : 'metric');
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState(profile?.calfit_id ?? '');
  const [bio, setBio] = useState(getDisplayBio((profile as { bio?: string | null })?.bio));
  const [fitnessLevel, setFitnessLevel] = useState((profile as { fitness_level?: string })?.fitness_level ?? 'beginner');
  const [selectedGoals, setSelectedGoals] = useState<string[]>((profile as { goals?: string[] })?.goals ?? []);

  const [weightKg, setWeightKg] = useState(profile?.current_weight_kg ?? 0);
  const [targetWeightKg, setTargetWeightKg] = useState(profile?.target_weight_kg ?? 0);
  const [heightCm, setHeightCm] = useState(profile?.height_cm ?? 0);

  const [weightDisplay, setWeightDisplay] = useState(
    profile?.current_weight_kg
      ? (profile.units === 'imperial' ? kgToLbs(profile.current_weight_kg).toString() : profile.current_weight_kg.toString())
      : '',
  );
  const [targetWeightDisplay, setTargetWeightDisplay] = useState(
    profile?.target_weight_kg
      ? (profile.units === 'imperial' ? kgToLbs(profile.target_weight_kg).toString() : profile.target_weight_kg.toString())
      : '',
  );
  const [heightDisplay, setHeightDisplay] = useState(
    profile?.height_cm
      ? (profile.units === 'imperial' ? cmToFt(profile.height_cm).toString() : profile.height_cm.toString())
      : '',
  );

  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const navigateBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Settings');
  };

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
    setSelectedGoals((prev) => (prev.includes(key) ? prev.filter((g) => g !== key) : [...prev, key]));
  };

  const handleChangePhoto = async () => {
    if (!user?.id) {
      showUserMessage('Sign in required', 'Sign in with Google, then set your profile photo.');
      return;
    }
    const picked = await pickImageFromGallery();
    if (!picked) return;
    setAvatarUri(picked.uri);
    setIsUploadingPhoto(true);
    try {
      const { uploadAvatarToSupabase } = await import('../../services/imageService');
      const { updateProfileAdaptive } = await import('../../services/profileService');
      const { url: publicUrl, error: uploadError } = await uploadAvatarToSupabase(user.id, picked);
      if (!publicUrl) {
        showUserMessage('Photo upload failed', uploadError ?? 'Could not upload your photo.');
        setAvatarUri(profile?.avatar_url ?? null);
        return;
      }
      setAvatarUri(publicUrl);
      const storedUrl = publicUrl.split('?')[0];
      const saved = await updateProfileAdaptive(user.id, { avatar_url: storedUrl });
      if (!saved.ok) {
        showUserMessage('Photo uploaded but not saved', saved.message ?? 'Could not save avatar_url on profile.');
        return;
      }
      updateProfile({ avatar_url: storedUrl });
      showSaveSuccess('Your profile photo was updated.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Photo upload failed.';
      showUserMessage('Error', msg);
      setAvatarUri(profile?.avatar_url ?? null);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!fullName.trim()) {
      showUserMessage('Missing name', 'Please enter your full name.');
      return;
    }
    const calfit_id = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (calfit_id.length < 3) {
      showUserMessage('Username', 'Use at least 3 characters (a–z, 0–9, underscore).');
      return;
    }
    setIsSaving(true);
    try {
      const { updateProfileAdaptive } = await import('../../services/profileService');
      const bioToSave = mergeBioForSave((profile as { bio?: string | null })?.bio, bio);
      const result = await updateProfileAdaptive(user.id, {
        full_name: fullName.trim(),
        calfit_id,
        bio: bioToSave,
        fitness_level: fitnessLevel,
        goals: selectedGoals,
        units,
        current_weight_kg: weightKg || null,
        target_weight_kg: targetWeightKg || null,
        height_cm: heightCm || null,
      });
      if (!result.ok) {
        showUserMessage('Could not save profile', result.message ?? 'Try again.');
        return;
      }
      updateProfile(result.applied ?? {});
      showSaveSuccess('Your profile has been updated.');
      navigateBack();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Could not save profile.';
      showUserMessage('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const firstName = fullName || user?.email?.split('@')[0] || 'U';
  const weightSuffix = units === 'imperial' ? 'lbs' : 'kg';
  const heightSuffix = units === 'imperial' ? 'ft' : 'cm';

  return (
    <AndroidSafeView backgroundColor={PREMIUM_BG} style={styles.safe}>
      <PremiumAtmosphereBackground />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm, borderBottomColor: PREMIUM_GLASS_BORDER }]}>
          <TouchableOpacity
            onPress={navigateBack}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={[styles.backBtn, { borderColor: PREMIUM_GLASS_BORDER, backgroundColor: PREMIUM_GLASS }]}
          >
            <Ionicons name="chevron-back" size={22} color={PREMIUM_TEXT} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={isSaving} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {isSaving ? (
              <ActivityIndicator size="small" color={PREMIUM_ACCENT} />
            ) : (
              <Text style={styles.saveHeaderBtn}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handleChangePhoto} disabled={isUploadingPhoto} activeOpacity={0.9}>
              <View style={[styles.avatarWrap, { borderColor: PREMIUM_ACCENT + '88' }]}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: PREMIUM_ACCENT + '22' }]}>
                    <Text style={[styles.avatarInitial, { color: PREMIUM_ACCENT }]}>{firstName[0]?.toUpperCase() ?? 'U'}</Text>
                  </View>
                )}
                <View style={styles.avatarOverlay}>
                  {isUploadingPhoto ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="camera" size={18} color="#fff" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>{isUploadingPhoto ? 'Uploading…' : 'Tap to change photo'}</Text>
          </View>

          <FieldLabel text="Full Name" />
          <FieldRow icon="person-outline">
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor={PREMIUM_MUTED}
              style={styles.input}
              autoCorrect={false}
            />
          </FieldRow>

          <FieldLabel text="Username" />
          <FieldRow icon="at-outline">
            <TextInput
              value={username}
              onChangeText={(t) => setUsername(t.replace(/[^a-z0-9_]/g, '').toLowerCase())}
              placeholder="yourname"
              placeholderTextColor={PREMIUM_MUTED}
              autoCapitalize="none"
              style={styles.input}
            />
          </FieldRow>

          <FieldLabel text="Bio" />
          <FieldRow icon="chatbubble-outline" multiline>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself…"
              placeholderTextColor={PREMIUM_MUTED}
              style={[styles.input, styles.bioInput]}
              multiline
              maxLength={200}
            />
          </FieldRow>

          <FieldLabel text="Fitness Level" />
          <PremiumSegmentedControl
            options={LEVEL_OPTIONS}
            value={fitnessLevel as typeof LEVEL_OPTIONS[number]['id']}
            onChange={(id) => setFitnessLevel(id)}
          />

          <FieldLabel text="Fitness Goals" />
          <Text style={styles.fieldHint}>Tap to select one or more</Text>
          <View style={styles.goalsGridWrap}>
            <CompactOptionGrid
              options={GOAL_GRID}
              selectedValues={selectedGoals}
              onPress={toggleGoal}
              accent={PREMIUM_ACCENT}
            />
          </View>

          <FieldLabel text="Units" />
          <PremiumSegmentedControl
            options={UNIT_OPTIONS}
            value={units}
            onChange={(id) => handleUnitSwitch(id)}
          />

          <Text style={styles.sectionLabel}>Body Stats</Text>
          <View style={styles.bodyStatsRow}>
            <View style={styles.bodyStatField}>
              <Text style={styles.bodyStatLabel}>Weight ({weightSuffix})</Text>
              <View style={[styles.bodyStatInput, premiumGlassShadow(), { borderColor: PREMIUM_GLASS_BORDER, backgroundColor: PREMIUM_GLASS }]}>
                <Ionicons name="barbell-outline" size={16} color={PREMIUM_MUTED} />
                <TextInput
                  value={weightDisplay}
                  onChangeText={handleWeightChange}
                  placeholder={units === 'imperial' ? '154' : '70'}
                  placeholderTextColor={PREMIUM_MUTED}
                  keyboardType="decimal-pad"
                  style={styles.bodyStatText}
                />
              </View>
            </View>
            <View style={styles.bodyStatField}>
              <Text style={styles.bodyStatLabel}>Target ({weightSuffix})</Text>
              <View style={[styles.bodyStatInput, premiumGlassShadow(), { borderColor: PREMIUM_GLASS_BORDER, backgroundColor: PREMIUM_GLASS }]}>
                <Ionicons name="flag-outline" size={16} color={PREMIUM_MUTED} />
                <TextInput
                  value={targetWeightDisplay}
                  onChangeText={handleTargetWeightChange}
                  placeholder={units === 'imperial' ? '143' : '65'}
                  placeholderTextColor={PREMIUM_MUTED}
                  keyboardType="decimal-pad"
                  style={styles.bodyStatText}
                />
              </View>
            </View>
          </View>

          <FieldLabel text={`Height (${heightSuffix})`} />
          <FieldRow icon="resize-outline">
            <TextInput
              value={heightDisplay}
              onChangeText={handleHeightChange}
              placeholder={units === 'imperial' ? '5.2' : '175'}
              placeholderTextColor={PREMIUM_MUTED}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <Text style={styles.fieldSuffix}>{heightSuffix}</Text>
          </FieldRow>

          <TouchableOpacity onPress={handleSave} disabled={isSaving} activeOpacity={0.9} style={styles.saveBtnWrap}>
            <LinearGradient colors={['#2DDC8C', '#0A9A5E'] as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveFullBtn}>
              {isSaving ? (
                <ActivityIndicator color="#050608" />
              ) : (
                <Text style={styles.saveFullBtnText}>Save Profile</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </AndroidSafeView>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Text style={styles.fieldLabel}>{text}</Text>;
}

function FieldRow({
  icon,
  children,
  multiline,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  children: ReactNode;
  multiline?: boolean;
}) {
  return (
    <View
      style={[
        styles.fieldWrap,
        premiumGlassShadow(),
        { borderColor: PREMIUM_GLASS_BORDER, backgroundColor: PREMIUM_GLASS },
        multiline && { alignItems: 'flex-start', paddingVertical: spacing.md },
      ]}
    >
      <Ionicons name={icon} size={18} color={PREMIUM_MUTED} style={multiline ? { marginTop: 2 } : undefined} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scrollContent: { paddingTop: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pageTitle: { fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_TEXT, letterSpacing: -0.3 },
  saveHeaderBtn: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_ACCENT },

  avatarSection: { alignItems: 'center', marginVertical: spacing.xl },
  avatarWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 40, fontWeight: '900' },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  changePhotoText: { fontSize: fontSize.sm, fontWeight: '600', marginTop: spacing.sm, color: PREMIUM_ACCENT },

  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
    color: PREMIUM_MUTED,
  },
  fieldHint: {
    fontSize: fontSize.xs,
    color: PREMIUM_MUTED,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    opacity: 0.85,
  },
  goalsGridWrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  fieldWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: fontSize.base, color: PREMIUM_TEXT },
  bioInput: { minHeight: 72, textAlignVertical: 'top' },
  fieldSuffix: { fontSize: fontSize.base, fontWeight: '700', color: PREMIUM_MUTED },

  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    color: PREMIUM_MUTED,
  },

  bodyStatsRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.lg },
  bodyStatField: { flex: 1 },
  bodyStatLabel: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: spacing.xs, color: PREMIUM_MUTED },
  bodyStatInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  bodyStatText: { flex: 1, fontSize: fontSize.xl, fontWeight: '800', textAlign: 'center', color: PREMIUM_TEXT },

  saveBtnWrap: { marginHorizontal: spacing.lg, marginTop: spacing.xl, borderRadius: radius.lg + 2, overflow: 'hidden' },
  saveFullBtn: { paddingVertical: spacing.lg, alignItems: 'center' },
  saveFullBtnText: { fontSize: fontSize.lg, fontWeight: '800', color: '#050608' },
});
