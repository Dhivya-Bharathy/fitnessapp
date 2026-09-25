import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Image,
} from 'react-native';
import { AndroidSafeView } from '../../modules/shared/AndroidSafeView';
import { useState, useCallback, useMemo } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { spacing, radius, fontSize } from '../../theme';
import { supabase } from '../../services/supabase';
import { useAiCoachStore } from '../../store/aiCoachStore';
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

type ScreenMode = 'home' | 'list' | 'compose' | 'detail';
type Mood = 'great' | 'good' | 'okay' | 'tired' | 'stressed';
type FilterTab = 'All' | 'Mood' | 'Progress' | 'Meals' | 'Workouts';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const MOODS: { key: Mood; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'great', label: 'Great', icon: 'happy-outline', color: PREMIUM_ACCENT },
  { key: 'good', label: 'Good', icon: 'happy', color: '#6699FF' },
  { key: 'okay', label: 'Okay', icon: 'remove-circle-outline', color: '#FFD133' },
  { key: 'tired', label: 'Tired', icon: 'moon-outline', color: '#FFB347' },
  { key: 'stressed', label: 'Stressed', icon: 'sad-outline', color: '#FF5959' },
];

const FILTER_TABS: FilterTab[] = ['All', 'Mood', 'Progress', 'Meals', 'Workouts'];
const MAX_CHARS = 500;

const META_SEP = '\n---\n';

function serializeContent(mood: Mood | null, photos: string[], body: string): string {
  const meta = `MOOD:${mood ?? 'okay'}\nPHOTOS:${photos.join('|')}`;
  return `${meta}${META_SEP}${body.trim()}`;
}

function parseContent(raw: string): { mood: Mood | null; photos: string[]; body: string } {
  if (!raw.includes(META_SEP)) {
    return { mood: null, photos: [], body: raw };
  }
  const [meta, body] = raw.split(META_SEP);
  const moodMatch = meta.match(/MOOD:(\w+)/);
  const photosMatch = meta.match(/PHOTOS:(.*)/);
  const mood = (moodMatch?.[1] as Mood) ?? null;
  const photos = photosMatch?.[1] ? photosMatch[1].split('|').filter(Boolean) : [];
  return { mood, photos, body: body ?? '' };
}

function moodMeta(mood: Mood | null) {
  return MOODS.find(m => m.key === mood) ?? MOODS[2];
}

function noteMatchesFilter(note: Note, tab: FilterTab): boolean {
  if (tab === 'All') return true;
  const { body, mood } = parseContent(note.content);
  const text = `${note.title} ${body}`.toLowerCase();
  if (tab === 'Mood') return mood !== null;
  if (tab === 'Progress') return /progress|goal|streak|improve|better/.test(text);
  if (tab === 'Meals') return /meal|food|ate|lunch|dinner|breakfast|calorie/.test(text);
  if (tab === 'Workouts') return /workout|gym|leg day|run|train|exercise/.test(text);
  return true;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function NotesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const coachStore = useAiCoachStore();

  const [notes, setNotes] = useState<Note[]>([]);
  const [mode, setMode] = useState<ScreenMode>('home');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editMood, setEditMood] = useState<Mood>('great');
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('All');
  const [coachInput, setCoachInput] = useState('');

  const showBack = navigation.canGoBack() || mode !== 'home';

  useFocusEffect(useCallback(() => { loadNotes(); }, [user?.id]));

  const loadNotes = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from('notes')
        .select('id, title, content, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setNotes(data ?? []);
    } catch {
      setNotes([]);
    }
  };

  const openCompose = (note?: Note) => {
    if (note) {
      const parsed = parseContent(note.content);
      setSelectedNote(note);
      setEditTitle(note.title);
      setEditBody(parsed.body);
      setEditMood(parsed.mood ?? 'okay');
      setEditPhotos(parsed.photos);
    } else {
      setSelectedNote(null);
      setEditTitle('');
      setEditBody('');
      setEditMood('great');
      setEditPhotos([]);
    }
    setMode('compose');
  };

  const openDetail = (note: Note) => {
    setSelectedNote(note);
    setMode('detail');
  };

  const handleBack = () => {
    if (mode === 'compose') {
      setMode(selectedNote ? 'detail' : 'home');
      return;
    }
    if (mode === 'detail') {
      setMode('list');
      return;
    }
    if (mode === 'list') {
      setMode('home');
      return;
    }
    if (navigation.canGoBack()) navigation.goBack();
  };

  const handleSave = async () => {
    if (saving || !user?.id) return;
    if (!editBody.trim()) {
      Alert.alert('Content required', 'Please write something before saving.');
      return;
    }
    setSaving(true);
    try {
      const content = serializeContent(editMood, editPhotos, editBody);
      const title = editTitle.trim() || 'Untitled';
      if (selectedNote?.id) {
        await supabase
          .from('notes')
          .update({ title, content, updated_at: new Date().toISOString() })
          .eq('id', selectedNote.id);
      } else {
        await supabase.from('notes').insert({ user_id: user.id, title, content });
      }
      await loadNotes();
      setMode('home');
      setSelectedNote(null);
    } catch {
      Alert.alert('Error', 'Could not save entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!selectedNote) return;
    Alert.alert('Delete entry?', `Remove "${selectedNote.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('notes').delete().eq('id', selectedNote.id);
            setNotes(prev => prev.filter(n => n.id !== selectedNote.id));
            setSelectedNote(null);
            setMode('list');
          } catch {}
        },
      },
    ]);
  };

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setEditPhotos(prev => [...prev, result.assets[0].uri].slice(0, 3));
    }
  };

  const askCoach = (prompt: string) => {
    if (!user) return;
    const note = selectedNote;
    const parsed = note ? parseContent(note.content) : { body: editBody, mood: editMood, photos: [] };
    const text = prompt.replace('{entry}', parsed.body).replace('{title}', note?.title ?? editTitle);
    coachStore.sendMessage(user.id, text);
    navigation.navigate('AICoach');
  };

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter(n => {
      if (!noteMatchesFilter(n, filterTab)) return false;
      if (!q) return true;
      const { body } = parseContent(n.content);
      return `${n.title} ${body}`.toLowerCase().includes(q);
    });
  }, [notes, filterTab, search]);

  const headerTitle =
    mode === 'home' ? 'Journal'
    : mode === 'list' ? 'Journal'
    : mode === 'compose' ? (selectedNote ? 'Edit Entry' : 'New Entry')
    : 'Journal Entry';

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      {showBack ? (
        <TouchableOpacity onPress={handleBack} style={styles.headerIconBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={PREMIUM_TEXT} />
        </TouchableOpacity>
      ) : (
        <View style={styles.headerIconBtn} />
      )}
      <Text style={styles.headerTitle}>{headerTitle}</Text>
      {mode === 'home' ? (
        <TouchableOpacity onPress={() => setMode('list')} style={styles.headerIconBtn}>
          <Ionicons name="menu-outline" size={22} color={PREMIUM_TEXT} />
        </TouchableOpacity>
      ) : mode === 'detail' ? (
        <TouchableOpacity onPress={handleDelete} style={styles.headerIconBtn}>
          <Ionicons name="ellipsis-vertical" size={20} color={PREMIUM_MUTED} />
        </TouchableOpacity>
      ) : (
        <View style={styles.headerIconBtn} />
      )}
    </View>
  );

  const renderHome = () => (
    <ScrollView contentContainerStyle={styles.homeScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.heroRing}>
        <LinearGradient
          colors={['rgba(45,220,140,0.35)', 'rgba(45,220,140,0.08)']}
          style={styles.heroCircle}
        >
          <Ionicons name="book-outline" size={40} color={PREMIUM_ACCENT} />
        </LinearGradient>
      </View>
      <Text style={styles.heroTitle}>Your Journal</Text>
      <Text style={styles.heroSub}>
        Capture how you feel, reflect on progress, and talk it through with your AI coach.
      </Text>

      <TouchableOpacity onPress={() => openCompose()} activeOpacity={0.9} style={styles.ctaWrap}>
        <LinearGradient colors={[PREMIUM_ACCENT, '#28C07A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaPrimary}>
          <Ionicons name="create-outline" size={20} color={PREMIUM_BG} />
          <Text style={styles.ctaPrimaryText}>New Entry</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => navigation.navigate('AICoach')}
        activeOpacity={0.88}
        style={styles.ctaOutline}
      >
        <Ionicons name="chatbubbles-outline" size={20} color={PREMIUM_ACCENT} />
        <Text style={styles.ctaOutlineText}>Chat with AI</Text>
      </TouchableOpacity>

      {notes.length > 0 && (
        <View style={styles.recentBlock}>
          <View style={styles.recentHead}>
            <Text style={styles.recentLabel}>RECENT ENTRIES</Text>
            <TouchableOpacity onPress={() => setMode('list')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {notes.slice(0, 3).map(note => {
            const parsed = parseContent(note.content);
            const m = moodMeta(parsed.mood);
            return (
              <TouchableOpacity
                key={note.id}
                onPress={() => openDetail(note)}
                style={[styles.recentCard, premiumGlassShadow()]}
                activeOpacity={0.88}
              >
                <View style={[styles.recentIcon, { backgroundColor: m.color + '22' }]}>
                  <Ionicons name={m.icon} size={18} color={m.color} />
                </View>
                <View style={styles.recentBody}>
                  <Text style={styles.recentTitle} numberOfLines={1}>{note.title}</Text>
                  <Text style={styles.recentSnippet} numberOfLines={1}>{parsed.body || 'No content'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={PREMIUM_MUTED} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );

  const renderList = () => (
    <View style={styles.listWrap}>
      <View style={[styles.searchBar, { borderColor: PREMIUM_GLASS_BORDER }]}>
        <Ionicons name="search-outline" size={18} color={PREMIUM_MUTED} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search entries…"
          placeholderTextColor={PREMIUM_MUTED}
          style={styles.searchInput}
        />
      </View>
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_TABS.map(tab => {
            const active = filterTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setFilterTab(tab)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      <FlatList
        style={styles.listFlex}
        data={filteredNotes}
        keyExtractor={n => n.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyList}>No entries match your search.</Text>
        }
        renderItem={({ item }) => {
          const parsed = parseContent(item.content);
          const m = moodMeta(parsed.mood);
          const snippet = parsed.body.trim();
          const showSnippet =
            snippet.length > 0 &&
            snippet.toLowerCase() !== item.title.trim().toLowerCase();
          return (
            <TouchableOpacity onPress={() => openDetail(item)} style={[styles.listCard, premiumGlassShadow()]}>
              <View style={[styles.listIcon, { backgroundColor: m.color + '20' }]}>
                <Ionicons name={m.icon} size={20} color={m.color} />
              </View>
              <View style={styles.listBody}>
                <Text style={styles.listTitle} numberOfLines={1}>{item.title}</Text>
                {showSnippet ? (
                  <Text style={styles.listSnippet} numberOfLines={2}>{snippet}</Text>
                ) : null}
                <Text style={styles.listDate}>{formatDateShort(item.created_at)}</Text>
              </View>
              {parsed.photos[0] ? (
                <Image source={{ uri: parsed.photos[0] }} style={styles.listThumb} />
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  const renderCompose = () => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.composeScroll} keyboardShouldPersistTaps="handled">
        <View style={[styles.titleField, { borderColor: PREMIUM_GLASS_BORDER }]}>
          <Ionicons name="document-text-outline" size={18} color={PREMIUM_MUTED} />
          <TextInput
            value={editTitle}
            onChangeText={setEditTitle}
            placeholder="Give your entry a title…"
            placeholderTextColor={PREMIUM_MUTED}
            style={styles.titleInput}
          />
        </View>

        <Text style={styles.fieldLabel}>How are you feeling?</Text>
        <View style={styles.moodBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodScroll} contentContainerStyle={styles.moodRow}>
            {MOODS.map(m => {
              const selected = editMood === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => setEditMood(m.key)}
                  style={[styles.moodChip, selected && { borderColor: m.color, backgroundColor: m.color + '15' }]}
                >
                  <Ionicons name={m.icon} size={22} color={selected ? m.color : PREMIUM_MUTED} />
                  <Text style={[styles.moodLabel, selected && { color: m.color }]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.bodyField, { borderColor: PREMIUM_GLASS_BORDER }]}>
          <TextInput
            value={editBody}
            onChangeText={t => setEditBody(t.slice(0, MAX_CHARS))}
            placeholder="What's on your mind today?"
            placeholderTextColor={PREMIUM_MUTED}
            multiline
            style={styles.bodyInput}
          />
          <Text style={styles.charCount}>{editBody.length}/{MAX_CHARS}</Text>
        </View>

        <Text style={styles.fieldLabel}>Add Photos</Text>
        <View style={styles.photoRow}>
          <TouchableOpacity onPress={pickPhoto} style={styles.addPhotoBtn}>
            <Ionicons name="camera-outline" size={24} color={PREMIUM_MUTED} />
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </TouchableOpacity>
          {editPhotos.map((uri, i) => (
            <View key={uri} style={styles.photoThumbWrap}>
              <Image source={{ uri }} style={styles.photoThumb} />
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() => setEditPhotos(p => p.filter((_, j) => j !== i))}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.composeActions}>
          <TouchableOpacity onPress={() => setMode('home')} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={{ flex: 1, opacity: saving ? 0.6 : 1 }}>
            <LinearGradient colors={[PREMIUM_ACCENT, '#28C07A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtn}>
              <Ionicons name="checkmark-circle-outline" size={20} color={PREMIUM_BG} />
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Entry'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderDetail = () => {
    if (!selectedNote) return null;
    const parsed = parseContent(selectedNote.content);
    const m = moodMeta(parsed.mood);
    const quickActions = [
      { label: 'Summarize this entry', prompt: 'Summarize this journal entry in 2-3 sentences:\n\n{entry}' },
      { label: 'Give feedback', prompt: 'Give thoughtful feedback on this journal entry:\n\n{entry}' },
      { label: 'Suggest improvements', prompt: 'Suggest practical improvements based on this entry:\n\n{entry}' },
      { label: 'Motivate me', prompt: 'Motivate me based on this journal entry:\n\n{entry}' },
    ];

    return (
      <ScrollView contentContainerStyle={styles.detailScroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.detailCard, premiumGlassShadow()]}>
          <View style={styles.detailTop}>
            <View style={[styles.detailMoodIcon, { backgroundColor: m.color + '22' }]}>
              <Ionicons name={m.icon} size={22} color={m.color} />
            </View>
            <Text style={styles.detailDate}>{formatDate(selectedNote.created_at)}</Text>
          </View>
          <Text style={styles.detailTitle}>{selectedNote.title}</Text>
          <Text style={styles.detailBody}>{parsed.body}</Text>
          {parsed.photos.length > 0 && (
            <View style={styles.detailPhotos}>
              {parsed.photos.map(uri => (
                <Image key={uri} source={{ uri }} style={styles.detailPhoto} />
              ))}
            </View>
          )}
          <View style={[styles.moodTag, { borderColor: m.color + '44', backgroundColor: m.color + '12' }]}>
            <Text style={[styles.moodTagText, { color: m.color }]}>Mood: {m.label}</Text>
          </View>
        </View>

        <View style={[styles.coachCard, premiumGlassShadow()]}>
          <View style={styles.coachHead}>
            <Text style={styles.coachEmoji}>🤖</Text>
            <Text style={styles.coachTitle}>Chat with AI Coach</Text>
          </View>
          <View style={styles.quickGrid}>
            {quickActions.map(a => (
              <TouchableOpacity key={a.label} onPress={() => askCoach(a.prompt)} style={styles.quickPill}>
                <Text style={styles.quickPillText}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.coachInputRow, { borderColor: PREMIUM_GLASS_BORDER }]}>
            <TouchableOpacity hitSlop={8}>
              <Ionicons name="attach-outline" size={20} color={PREMIUM_MUTED} />
            </TouchableOpacity>
            <TextInput
              value={coachInput}
              onChangeText={setCoachInput}
              placeholder="Ask about this entry…"
              placeholderTextColor={PREMIUM_MUTED}
              style={styles.coachInput}
              onSubmitEditing={() => {
                if (coachInput.trim()) askCoach(coachInput.trim());
                setCoachInput('');
              }}
            />
            <TouchableOpacity
              onPress={() => {
                if (coachInput.trim()) askCoach(coachInput.trim());
                setCoachInput('');
              }}
              style={styles.coachSend}
            >
              <Ionicons name="arrow-up" size={18} color={PREMIUM_BG} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={() => openCompose(selectedNote)} style={styles.editLink}>
          <Text style={styles.editLinkText}>Edit entry</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <AndroidSafeView backgroundColor={PREMIUM_BG} style={styles.safe}>
      <PremiumAtmosphereBackground />
      {renderHeader()}
      <View style={styles.body}>
        {mode === 'home' && renderHome()}
        {mode === 'list' && renderList()}
        {mode === 'compose' && renderCompose()}
        {mode === 'detail' && renderDetail()}
      </View>
    </AndroidSafeView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: PREMIUM_BG },
  body: { flex: 1, minHeight: 0 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: '800', color: PREMIUM_TEXT },

  homeScroll: { paddingHorizontal: spacing.lg, paddingBottom: 100, alignItems: 'center' },
  heroRing: { marginTop: spacing.xl, marginBottom: spacing.lg },
  heroCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(45,220,140,0.35)',
  },
  heroTitle: { fontSize: 28, fontWeight: '900', color: PREMIUM_TEXT, marginBottom: spacing.sm },
  heroSub: { fontSize: fontSize.sm, color: PREMIUM_MUTED, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl, maxWidth: 320 },
  ctaWrap: { width: '100%', borderRadius: radius.lg + 2, overflow: 'hidden', marginBottom: spacing.sm },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  ctaPrimaryText: { color: PREMIUM_BG, fontSize: fontSize.lg, fontWeight: '800' },
  ctaOutline: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg + 2,
    borderWidth: 1,
    borderColor: PREMIUM_ACCENT,
    marginBottom: spacing.xl,
  },
  ctaOutlineText: { color: PREMIUM_ACCENT, fontSize: fontSize.base, fontWeight: '800' },

  recentBlock: { width: '100%', alignSelf: 'stretch' },
  recentHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  recentLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: PREMIUM_MUTED },
  viewAll: { fontSize: fontSize.sm, fontWeight: '700', color: PREMIUM_ACCENT },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    marginBottom: spacing.sm,
  },
  recentIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recentBody: { flex: 1 },
  recentTitle: { fontSize: fontSize.sm, fontWeight: '800', color: PREMIUM_TEXT },
  recentSnippet: { fontSize: fontSize.xs, color: PREMIUM_MUTED, marginTop: 2 },

  listWrap: { flex: 1, minHeight: 0, paddingHorizontal: spacing.lg },
  listFlex: { flex: 1, minHeight: 0 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'web' ? spacing.sm : spacing.xs,
    borderRadius: radius.lg,
    borderWidth: 1,
    backgroundColor: PREMIUM_GLASS,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, color: PREMIUM_TEXT, fontSize: fontSize.sm, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as object : {}) },
  filterBar: { flexGrow: 0, flexShrink: 0, height: 44, marginBottom: spacing.md },
  filterScroll: { flexGrow: 0, flexShrink: 0, height: 44 },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    alignSelf: 'center',
  },
  filterChipActive: { borderColor: PREMIUM_ACCENT, backgroundColor: PREMIUM_ACCENT + '18' },
  filterChipText: { fontSize: fontSize.sm, fontWeight: '600', color: PREMIUM_MUTED },
  filterChipTextActive: { color: PREMIUM_ACCENT, fontWeight: '800' },
  listContent: { paddingBottom: 100 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    marginBottom: spacing.sm,
  },
  listIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  listBody: { flex: 1 },
  listTitle: { fontSize: fontSize.sm, fontWeight: '800', color: PREMIUM_TEXT },
  listSnippet: { fontSize: fontSize.xs, color: PREMIUM_MUTED, marginTop: 4, lineHeight: 16 },
  listDate: { fontSize: 10, color: PREMIUM_MUTED, marginTop: 6, fontWeight: '600' },
  listThumb: { width: 48, height: 48, borderRadius: 10 },
  emptyList: { textAlign: 'center', color: PREMIUM_MUTED, marginTop: spacing.xxxl },

  composeScroll: { padding: spacing.lg, paddingBottom: 120 },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '800', color: PREMIUM_TEXT, marginBottom: spacing.sm, marginTop: spacing.md },
  titleField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    backgroundColor: PREMIUM_GLASS,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  titleInput: { flex: 1, paddingVertical: spacing.md, fontSize: fontSize.base, fontWeight: '600', color: PREMIUM_TEXT },
  moodBar: { flexGrow: 0, flexShrink: 0, height: 88, marginBottom: spacing.xs },
  moodScroll: { flexGrow: 0, height: 88 },
  moodRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, paddingRight: spacing.sm },
  moodChip: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    minWidth: 72,
    alignSelf: 'flex-start',
  },
  moodLabel: { fontSize: 10, fontWeight: '700', color: PREMIUM_MUTED, marginTop: 4 },
  bodyField: {
    borderWidth: 1,
    backgroundColor: PREMIUM_GLASS,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 160,
  },
  bodyInput: { fontSize: fontSize.sm, color: PREMIUM_TEXT, lineHeight: 22, minHeight: 120, textAlignVertical: 'top' },
  charCount: { textAlign: 'right', fontSize: 10, color: PREMIUM_MUTED, marginTop: spacing.xs },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  addPhotoBtn: {
    width: 88,
    height: 88,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addPhotoText: { fontSize: 10, fontWeight: '600', color: PREMIUM_MUTED },
  photoThumbWrap: { position: 'relative' },
  photoThumb: { width: 88, height: 88, borderRadius: radius.lg },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  cancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    justifyContent: 'center',
  },
  cancelText: { color: PREMIUM_MUTED, fontWeight: '700' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
  },
  saveBtnText: { color: PREMIUM_BG, fontWeight: '800', fontSize: fontSize.base },

  detailScroll: { padding: spacing.lg, paddingBottom: 100 },
  detailCard: {
    borderRadius: radius.lg + 2,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  detailTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  detailMoodIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  detailDate: { fontSize: fontSize.xs, color: PREMIUM_MUTED, fontWeight: '600' },
  detailTitle: { fontSize: fontSize.xl, fontWeight: '900', color: PREMIUM_TEXT, marginBottom: spacing.sm },
  detailBody: { fontSize: fontSize.sm, color: PREMIUM_MUTED, lineHeight: 22 },
  detailPhotos: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  detailPhoto: { width: 72, height: 72, borderRadius: radius.md },
  moodTag: {
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  moodTagText: { fontSize: fontSize.xs, fontWeight: '700' },
  coachCard: {
    borderRadius: radius.lg + 2,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: PREMIUM_GLASS,
    padding: spacing.lg,
  },
  coachHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  coachEmoji: { fontSize: 28 },
  coachTitle: { fontSize: fontSize.base, fontWeight: '800', color: PREMIUM_TEXT },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  quickPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER,
    backgroundColor: 'rgba(45,220,140,0.08)',
  },
  quickPillText: { fontSize: fontSize.xs, fontWeight: '700', color: PREMIUM_ACCENT },
  coachInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    backgroundColor: PREMIUM_GLASS,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'web' ? 8 : 4,
  },
  coachInput: { flex: 1, color: PREMIUM_TEXT, fontSize: fontSize.sm, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as object : {}) },
  coachSend: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PREMIUM_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editLink: { alignItems: 'center', marginTop: spacing.lg },
  editLinkText: { color: PREMIUM_ACCENT, fontWeight: '700', fontSize: fontSize.sm },
});
