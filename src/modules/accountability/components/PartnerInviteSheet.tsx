import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform, type ViewStyle,
} from 'react-native';
import { useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../../../theme';
import {
  searchCalfitUsers,
  CalfitUserSuggestion,
} from '../services/PartnerService';

const GLASS = 'rgba(255,255,255,0.06)';
const GLASS_BORDER = 'rgba(255,255,255,0.12)';
const PREMIUM_BG = '#0A0C12';

interface Props {
  theme: typeof colors.dark;
  visible: boolean;
  isAdding: boolean;
  currentUserId: string;
  onClose: () => void;
  onAdd: (calfitId: string) => void;
  premium?: boolean;
}

export function PartnerInviteSheet({
  theme,
  visible,
  isAdding,
  currentUserId,
  onClose,
  onAdd,
  premium = false,
}: Props) {
  const [calfitId, setCalfitId] = useState('');
  const [suggestions, setSuggestions] = useState<CalfitUserSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sheetBg = premium ? PREMIUM_BG : theme.card;
  const sheetBorder = premium ? 'rgba(178,128,255,0.35)' : theme.border;
  const inputBg = premium ? GLASS : theme.bg;
  const inputBorder = calfitId.length > 0
    ? (premium ? '#B280FF' : theme.accent)
    : (premium ? 'rgba(178,128,255,0.45)' : theme.border);
  const titleColor = premium ? '#FFFFFF' : theme.textPrimary;
  const muted = premium ? 'rgba(255,255,255,0.55)' : theme.textMuted;
  const textColor = premium ? '#FFFFFF' : theme.textPrimary;
  const addBtnBg = premium
    ? (calfitId.trim() ? 'rgba(123,92,255,0.75)' : 'rgba(255,255,255,0.08)')
    : (calfitId.trim() ? theme.accent : theme.border);
  const addBtnBorder = premium && calfitId.trim()
    ? { borderWidth: 1, borderColor: 'rgba(178,128,255,0.55)' }
    : {};

  const handleChange = (text: string) => {
    const cleaned = text.toLowerCase().replace(/\s/g, '').replace('@', '');
    setCalfitId(cleaned);

    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (cleaned.length < 2) {
      setSuggestions([]);
      return;
    }

    searchTimer.current = setTimeout(async () => {
      setIsSearching(true);
      const results = await searchCalfitUsers(cleaned, currentUserId);
      setSuggestions(results);
      setIsSearching(false);
    }, 300);
  };

  const handleSelect = (user: CalfitUserSuggestion) => {
    setCalfitId(user.calfit_id);
    setSuggestions([]);
  };

  const handleAdd = () => {
    if (!calfitId.trim()) return;
    setSuggestions([]);
    onAdd(calfitId.trim());
    setCalfitId('');
  };

  const handleClose = () => {
    setCalfitId('');
    setSuggestions([]);
    onClose();
  };

  const sheetShadow = Platform.select({
    web: { boxShadow: '0 -8px 40px rgba(0,0,0,0.5)' } as ViewStyle,
    default: { elevation: 12 },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.dismiss} onPress={handleClose} />
        <View style={[styles.sheet, sheetShadow, {
          backgroundColor: sheetBg,
          borderColor: sheetBorder,
        }]}>
          {premium && <View style={styles.sheetHandle} />}
          <View style={[styles.header, { borderBottomColor: premium ? GLASS_BORDER : theme.border }]}>
            <Text style={[styles.title, { color: titleColor }]}>Add Partner</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={premium ? styles.closeBtnPremium : undefined}
            >
              <Ionicons name="close" size={22} color={muted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.bodyScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.body}>
              <Text style={[styles.label, { color: premium ? 'rgba(255,255,255,0.75)' : theme.textSecondary }]}>
                Enter their Fitness ID
              </Text>

              <View style={[styles.inputRow, {
                backgroundColor: inputBg,
                borderColor: inputBorder,
              }]}>
                <Text style={[styles.atSign, { color: '#2DDC8C' }]}>@</Text>
                <TextInput
                  value={calfitId}
                  onChangeText={handleChange}
                  placeholder="start typing their id..."
                  placeholderTextColor={muted}
                  style={[styles.input, { color: textColor }]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                />
                {isSearching && (
                  <ActivityIndicator size="small" color="#2DDC8C" />
                )}
                {calfitId.length > 0 && !isSearching && (
                  <TouchableOpacity onPress={() => { setCalfitId(''); setSuggestions([]); }}>
                    <Ionicons name="close-circle" size={18} color={muted} />
                  </TouchableOpacity>
                )}
              </View>

              {suggestions.length > 0 && (
                <View style={[styles.suggestions, {
                  backgroundColor: premium ? GLASS : theme.bg,
                  borderColor: premium ? GLASS_BORDER : theme.border,
                }]}>
                  {suggestions.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      onPress={() => handleSelect(user)}
                      style={[styles.suggestionRow, { borderBottomColor: premium ? GLASS_BORDER : theme.border }]}
                    >
                      <View style={[styles.suggestionAvatar, {
                        backgroundColor: premium ? 'rgba(45,220,140,0.2)' : (theme.accentDim as string),
                      }]}>
                        <Text style={[styles.suggestionAvatarText, { color: '#2DDC8C' }]}>
                          {(user.full_name || 'C').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.suggestionInfo}>
                        <Text style={[styles.suggestionName, { color: textColor }]}>
                          {user.full_name}
                        </Text>
                        <Text style={[styles.suggestionId, { color: muted }]}>
                          @{user.calfit_id}
                        </Text>
                      </View>
                      <Text style={[styles.suggestionGoal, { color: muted }]}>
                        {user.goal}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.hint, { color: muted }]}>
                Ask your partner to share their Fitness ID from their profile or Settings.
              </Text>

              <View style={[styles.privacyNote, {
                backgroundColor: premium ? 'rgba(45,220,140,0.12)' : (theme.accentDim as string),
                borderColor: premium ? 'rgba(45,220,140,0.45)' : theme.accent + '55',
              }]}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#2DDC8C" />
                <Text style={[styles.privacyText, { color: premium ? 'rgba(255,255,255,0.8)' : theme.textSecondary }]}>
                  Privacy: only streaks and fitness progress are shared — never personal details.
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleAdd}
                disabled={isAdding || !calfitId.trim()}
                activeOpacity={calfitId.trim() ? 0.85 : 1}
                style={[styles.addBtn, addBtnBorder, {
                  backgroundColor: addBtnBg,
                  opacity: calfitId.trim() ? 1 : 0.55,
                }]}
              >
                {isAdding
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={[styles.addBtnText, { color: '#fff' }]}>Add Partner</Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  dismiss: { flex: 1 },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: '85%',
    paddingTop: spacing.xs,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginBottom: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  closeBtnPremium: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GLASS,
    borderWidth: 1,
    borderColor: GLASS_BORDER,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700' },
  bodyScroll: { maxHeight: 520 },
  body: { padding: spacing.lg, gap: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '600' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  atSign: { fontSize: fontSize.lg, fontWeight: '700' },
  input: { flex: 1, fontSize: fontSize.base },

  suggestions: {
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: -spacing.xs,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  suggestionAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  suggestionAvatarText: { fontSize: fontSize.base, fontWeight: '700' },
  suggestionInfo: { flex: 1 },
  suggestionName: { fontSize: fontSize.base, fontWeight: '600' },
  suggestionId: { fontSize: fontSize.xs, marginTop: 2 },
  suggestionGoal: { fontSize: fontSize.xs, maxWidth: 80, textAlign: 'right' },

  hint: { fontSize: fontSize.xs, lineHeight: 18 },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  privacyText: { fontSize: fontSize.xs, flex: 1, lineHeight: 18 },
  addBtn: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  addBtnText: { fontSize: fontSize.base, fontWeight: '700' },
});
