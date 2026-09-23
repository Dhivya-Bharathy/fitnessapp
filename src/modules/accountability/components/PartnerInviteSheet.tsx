import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Modal, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useState, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../../../theme';
import {
  searchCalfitUsers,
  CalfitUserSuggestion,
} from '../services/PartnerService';

interface Props {
  theme: typeof colors.dark;
  visible: boolean;
  isAdding: boolean;
  currentUserId: string;
  onClose: () => void;
  onAdd: (calfitId: string) => void;
}

export function PartnerInviteSheet({
  theme,
  visible,
  isAdding,
  currentUserId,
  onClose,
  onAdd,
}: Props) {
  const [calfitId, setCalfitId] = useState('');
  const [suggestions, setSuggestions] = useState<CalfitUserSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableOpacity style={styles.dismiss} onPress={handleClose} />
        <View style={[styles.sheet, {
          backgroundColor: theme.card,
          borderColor: theme.border,
        }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Add Partner</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.bodyScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <View style={styles.body}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Enter their Fitness ID
            </Text>

            {/* Input row */}
            <View style={[styles.inputRow, {
              backgroundColor: theme.bg,
              borderColor: calfitId.length > 0 ? theme.accent : theme.border,
            }]}>
              <Text style={[styles.atSign, { color: theme.accent }]}>@</Text>
              <TextInput
                value={calfitId}
                onChangeText={handleChange}
                placeholder="start typing their id..."
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { color: theme.textPrimary }]}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
              {isSearching && (
                <ActivityIndicator size="small" color={theme.accent} />
              )}
              {calfitId.length > 0 && !isSearching && (
                <TouchableOpacity onPress={() => { setCalfitId(''); setSuggestions([]); }}>
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Autocomplete suggestions */}
            {suggestions.length > 0 && (
              <View style={[styles.suggestions, {
                backgroundColor: theme.bg,
                borderColor: theme.border,
              }]}>
                {suggestions.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    onPress={() => handleSelect(user)}
                    style={[styles.suggestionRow, { borderBottomColor: theme.border }]}
                  >
                    <View style={[styles.suggestionAvatar, {
                      backgroundColor: theme.accentDim as string,
                    }]}>
                      <Text style={[styles.suggestionAvatarText, { color: theme.accent }]}>
                        {(user.full_name || 'C').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.suggestionInfo}>
                      <Text style={[styles.suggestionName, { color: theme.textPrimary }]}>
                        {user.full_name}
                      </Text>
                      <Text style={[styles.suggestionId, { color: theme.textMuted }]}>
                        @{user.calfit_id}
                      </Text>
                    </View>
                    <Text style={[styles.suggestionGoal, { color: theme.textMuted }]}>
                      {user.goal}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.hint, { color: theme.textMuted }]}>
              Ask your partner to share their Fitness ID from their profile or Settings.
            </Text>

            <View style={[styles.privacyNote, {
              backgroundColor: theme.accentDim as string,
              borderColor: theme.accent,
            }]}>
              <Ionicons name="shield-checkmark-outline" size={14} color={theme.accent} />
              <Text style={[styles.privacyText, { color: theme.accent }]}>
                Only fitness progress and streaks are shared. No personal info.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleAdd}
              disabled={isAdding || !calfitId.trim()}
              style={[styles.addBtn, {
                backgroundColor: calfitId.trim() ? theme.accent : theme.border,
              }]}
            >
              {isAdding
                ? <ActivityIndicator color={theme.bg} />
                : <Text style={[styles.addBtnText, { color: theme.bg }]}>Add Partner</Text>
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
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  dismiss: { flex: 1 },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700' },
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

  // Suggestions dropdown
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