import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, Keyboard, TouchableWithoutFeedback,
  KeyboardAvoidingView, Platform, Animated, Share,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../store/themeStore';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { supabase } from '../../services/supabase';
import { useAiCoachStore } from '../../store/aiCoachStore';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function NotesScreen() {
  const navigation = useNavigation<any>();
  const { colorScheme } = useThemeStore();
  const { user } = useAuthStore();
  const theme = colors[colorScheme];
  const coachStore = useAiCoachStore();

  const [notes, setNotes] = useState<Note[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sidebarAnim = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    Animated.timing(sidebarAnim, {
      toValue: sidebarOpen ? 0 : -300,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [sidebarOpen, sidebarAnim]);

  useFocusEffect(useCallback(() => { loadNotes(); }, [user?.id]));

  const loadNotes = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      const { data } = await supabase.from('notes')
        .select('id, title, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setNotes(data ?? []);
    } catch { setNotes([]); }
    setLoading(false);
  };

  const selectNote = (note: Note) => {
    setSelectedNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setIsEditing(false);
    setSidebarOpen(false);
  };

  const handleNewJournal = () => {
    setIsEditing(true);
    setSelectedNote(null);
    setEditTitle('');
    setEditContent('');
    setSidebarOpen(false);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!user?.id || !editContent.trim()) { Alert.alert('Content required', 'Please write something before saving.'); return; }
    setSaving(true);
    try {
      if (selectedNote?.id) {
        await supabase.from('notes').update({
          title: editTitle.trim() || 'Untitled',
          content: editContent.trim(),
          updated_at: new Date().toISOString(),
        }).eq('id', selectedNote.id);
      } else {
        await supabase.from('notes').insert({
          user_id: user.id,
          title: editTitle.trim() || 'Untitled',
          content: editContent.trim(),
        });
      }
      setIsEditing(false);
      await loadNotes();
      Alert.alert('Saved', 'Journal entry saved successfully');
    } catch {
      Alert.alert('Error', 'Could not save note.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!selectedNote) return;
    Alert.alert('Delete entry?', `Remove "${selectedNote.title || 'Untitled'}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await supabase.from('notes').delete().eq('id', selectedNote.id);
          setNotes((prev) => prev.filter((n) => n.id !== selectedNote.id));
          setSelectedNote(null);
        } catch {}
      }},
    ]);
  };

  const handleSendToCoach = () => {
    if (!editContent.trim() || !user) return;
    coachStore.sendMessage(user.id, `I'd like to discuss my journal entry:\n\n${editContent}`);
    navigation.navigate('Main', { screen: 'AICoach' });
  };

  const handleShare = async () => {
    if (!editContent.trim()) return;
    try {
      await Share.share({
        title: editTitle.trim() || 'Journal Entry',
        message: `${editTitle.trim() || 'Journal Entry'}\n\n${editContent}`,
      });
    } catch {}
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <AndroidSafeView backgroundColor={theme.bg} style={styles.safe}>
      {/* ── HEADER ── */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Journal</Text>
        <TouchableOpacity onPress={() => setSidebarOpen(true)} style={[styles.menuBtn, { borderColor: theme.border }]}>
          <Ionicons name="menu-outline" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── MAIN CONTENT ── */}
      {!selectedNote && !isEditing ? (
        <View style={styles.welcome}>
          <View style={[styles.welcomeIconWrap, { backgroundColor: theme.accent + '15' }]}>
            <Ionicons name="journal-outline" size={48} color={theme.accent} />
          </View>
          <Text style={[styles.welcomeTitle, { color: theme.textPrimary }]}>Your Journal</Text>
          <Text style={[styles.welcomeSub, { color: theme.textMuted }]}>
            Write your thoughts, track your journey, and discuss entries with your AI Coach
          </Text>
          <View style={styles.welcomeActions}>
            <TouchableOpacity onPress={handleNewJournal} activeOpacity={0.85} style={styles.welcomeBtnWrap}>
              <LinearGradient colors={[theme.accent, '#0DAE6C'] as [string, string]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.welcomeBtn}>
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={styles.welcomeBtnText}>New Journal Entry</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              coachStore.clearChat();
              navigation.navigate('Main', { screen: 'AICoach' });
            }} activeOpacity={0.85} style={[styles.welcomeBtnOutline, { borderColor: theme.accent }]}>
              <Ionicons name="chatbubbles-outline" size={20} color={theme.accent} />
              <Text style={[styles.welcomeBtnOutlineText, { color: theme.accent }]}>Chat with AI Coach</Text>
            </TouchableOpacity>
          </View>
          {notes.length > 0 && (
            <>
              <Text style={[styles.recentLabel, { color: theme.textSecondary }]}>Recent Entries</Text>
              <ScrollView style={styles.recentList} showsVerticalScrollIndicator={false}>
                {notes.slice(0, 5).map((note) => (
                  <TouchableOpacity key={note.id} onPress={() => selectNote(note)}
                    style={[styles.recentItem, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.recentItemTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                      {note.title || 'Untitled'}
                    </Text>
                    <Text style={[styles.recentItemDate, { color: theme.textMuted }]}>
                      {formatDate(note.created_at)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.editor} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TextInput value={editTitle} onChangeText={setEditTitle} placeholder="Title (optional)"
              placeholderTextColor={theme.textMuted}
              style={[styles.titleInput, { color: theme.textPrimary }]} />
            <View style={[styles.dateBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="time-outline" size={14} color={theme.textMuted} />
              <Text style={[styles.dateText, { color: theme.textMuted }]}>
                {selectedNote ? formatDate(selectedNote.created_at) : 'New entry'}
              </Text>
            </View>
            <TextInput value={editContent} onChangeText={setEditContent} placeholder="Write your journal entry..."
              placeholderTextColor={theme.textMuted} multiline
              style={[styles.contentInput, { color: theme.textPrimary }]} />
            {/* ── TOOLBAR ── */}
            <View style={styles.toolbar}>
              <TouchableOpacity onPress={handleSendToCoach} activeOpacity={0.8}
                style={[styles.toolBtn, { backgroundColor: theme.accent + '15', borderColor: theme.accent + '44' }]}>
                <Ionicons name="chatbubbles-outline" size={18} color={theme.accent} />
                <Text style={[styles.toolBtnText, { color: theme.accent }]}>AI Coach</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} activeOpacity={0.85} style={styles.toolBtnWrap}>
                <LinearGradient colors={[theme.accent, '#0DAE6C'] as [string, string]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.toolBtnGrad}>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.toolBtnGradText}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleShare} activeOpacity={0.8}
                style={[styles.toolBtn, { backgroundColor: '#4A90E2' + '15', borderColor: '#4A90E2' + '44' }]}>
                <Ionicons name="share-outline" size={18} color="#4A90E2" />
                <Text style={[styles.toolBtnText, { color: '#4A90E2' }]}>Share</Text>
              </TouchableOpacity>
              {selectedNote && (
                <TouchableOpacity onPress={handleDelete} activeOpacity={0.8}
                  style={[styles.toolBtn, { backgroundColor: '#FF5959' + '15', borderColor: '#FF5959' + '44' }]}>
                  <Ionicons name="trash-outline" size={18} color="#FF5959" />
                  <Text style={[styles.toolBtnText, { color: '#FF5959' }]}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── SIDEBAR DRAWER ── */}
      {sidebarOpen && (
        <TouchableOpacity activeOpacity={1} onPress={() => setSidebarOpen(false)} style={styles.sidebarOverlay}>
          <Animated.View style={[styles.sidebar, { backgroundColor: theme.card, transform: [{ translateX: sidebarAnim }] }]}>
            <View style={[styles.sidebarHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.sidebarTitle, { color: theme.textPrimary }]}>Menu</Text>
              <TouchableOpacity onPress={() => setSidebarOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => {
              coachStore.clearChat();
              setSidebarOpen(false);
              navigation.navigate('Main', { screen: 'AICoach' });
            }} activeOpacity={0.85} style={[styles.sidebarBtn, { backgroundColor: theme.accent + '12', borderColor: theme.accent + '44' }]}>
              <Ionicons name="chatbubbles-outline" size={22} color={theme.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.sidebarBtnTitle, { color: theme.textPrimary }]}>AI Coach Chat</Text>
                <Text style={[styles.sidebarBtnSub, { color: theme.textMuted }]}>Start a new conversation</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleNewJournal} activeOpacity={0.85} style={[styles.sidebarBtn, { backgroundColor: '#FFB830' + '12', borderColor: '#FFB830' + '44' }]}>
              <Ionicons name="create-outline" size={22} color="#FFB830" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.sidebarBtnTitle, { color: theme.textPrimary }]}>Write New Journal</Text>
                <Text style={[styles.sidebarBtnSub, { color: theme.textMuted }]}>Capture your thoughts</Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.sidebarDivider, { borderTopColor: theme.border }]} />

            <Text style={[styles.sidebarSectionLabel, { color: theme.textSecondary }]}>Recent Entries</Text>
            <ScrollView style={styles.sidebarList} showsVerticalScrollIndicator={false}>
              {notes.length === 0 && (
                <Text style={[styles.sidebarEmpty, { color: theme.textMuted }]}>No journal entries yet</Text>
              )}
              {notes.map((note) => (
                <TouchableOpacity key={note.id} onPress={() => selectNote(note)}
                  style={[styles.sidebarNote, { borderBottomColor: theme.border }]}>
                  <View style={[styles.sidebarNoteDot, { backgroundColor: note.id === selectedNote?.id ? theme.accent : theme.textMuted }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sidebarNoteTitle, { color: note.id === selectedNote?.id ? theme.accent : theme.textPrimary }]} numberOfLines={1}>
                      {note.title || 'Untitled'}
                    </Text>
                    <Text style={[styles.sidebarNoteDate, { color: theme.textMuted }]}>
                      {formatDate(note.created_at)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      )}
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700' },
  menuBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  // Welcome
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  welcomeIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  welcomeTitle: { fontSize: fontSize.xxl, fontWeight: '800', marginBottom: spacing.sm },
  welcomeSub: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
  welcomeActions: { gap: spacing.sm, width: '100%', marginBottom: spacing.xl },
  welcomeBtnWrap: { borderRadius: radius.lg, overflow: 'hidden' },
  welcomeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  welcomeBtnText: { color: '#fff', fontSize: fontSize.base, fontWeight: '700' },
  welcomeBtnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1.5 },
  welcomeBtnOutlineText: { fontSize: fontSize.base, fontWeight: '700' },
  recentLabel: { fontSize: fontSize.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, alignSelf: 'flex-start', marginBottom: spacing.sm },
  recentList: { width: '100%', maxHeight: 200 },
  recentItem: { paddingVertical: spacing.sm, borderBottomWidth: 0.5 },
  recentItemTitle: { fontSize: fontSize.base, fontWeight: '600' },
  recentItemDate: { fontSize: fontSize.xs, marginTop: 2 },

  // Editor
  editor: { padding: spacing.lg, paddingBottom: 120 },
  titleInput: { fontSize: fontSize.xxl, fontWeight: '800', paddingVertical: spacing.md, marginBottom: spacing.xs },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, alignSelf: 'flex-start', marginBottom: spacing.lg },
  dateText: { fontSize: fontSize.xs, fontWeight: '600' },
  contentInput: { minHeight: 300, fontSize: fontSize.base, lineHeight: 24, paddingVertical: spacing.md, textAlignVertical: 'top' },
  toolbar: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl, flexWrap: 'wrap' },
  toolBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  toolBtnText: { fontSize: fontSize.sm, fontWeight: '700' },
  toolBtnWrap: { borderRadius: radius.md, overflow: 'hidden' },
  toolBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  toolBtnGradText: { fontSize: fontSize.sm, fontWeight: '700', color: '#fff' },

  // Sidebar
  sidebarOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100 },
  sidebar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 290, paddingTop: 60, zIndex: 101, elevation: 20, shadowColor: '#000', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.3, shadowRadius: 16 },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, marginBottom: spacing.md },
  sidebarTitle: { fontSize: fontSize.xl, fontWeight: '800' },
  sidebarBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.sm },
  sidebarBtnTitle: { fontSize: fontSize.base, fontWeight: '700' },
  sidebarBtnSub: { fontSize: fontSize.xs, marginTop: 2 },
  sidebarDivider: { borderTopWidth: 1, marginVertical: spacing.md, marginHorizontal: spacing.lg },
  sidebarSectionLabel: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  sidebarList: { flex: 1, paddingHorizontal: spacing.lg },
  sidebarEmpty: { fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.lg },
  sidebarNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 0.5 },
  sidebarNoteDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  sidebarNoteTitle: { fontSize: fontSize.sm, fontWeight: '600' },
  sidebarNoteDate: { fontSize: fontSize.xs, marginTop: 1 },
});
