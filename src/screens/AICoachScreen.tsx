import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StyleSheet, TextInput, Keyboard, Platform, FlatList, Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, fontSize } from '../theme';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { useAiCoachStore } from '../store/aiCoachStore';
import { WorkoutForm } from '../components/WorkoutForm';
import { ExerciseCard } from '../components/ExerciseCard';
import { AILoadingSkeleton } from '../components/AILoadingSkeleton';
import { SavedWorkoutsList } from '../components/SavedWorkoutsList';
import { FitnessProfileModal } from '../components/FitnessProfileModal';
import { ChatBubble } from '../components/ChatBubble';
import { VoiceMicButton } from '../components/VoicemicButton';
import type { FitnessLevel, FitnessGoal, Equipment, GeneratedWorkout } from '../types/ai-coach.types';
import {
  PastelScreenBackground,
  SegmentChips,
  isWellnessLight,
  glassSurface,
  WELLNESS_GREEN,
} from '../components/wellness';

type Tab = 'generate' | 'saved' | 'chat';

const QUICK_TOPICS: { label: string; prompt: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'Workout', prompt: 'Suggest a balanced workout for today based on my goals.', icon: 'barbell-outline' },
  { label: 'Meal', prompt: 'Help me plan high-protein meals for the rest of today.', icon: 'restaurant-outline' },
  { label: 'Tips', prompt: 'Give me 3 practical tips to stay consistent this week.', icon: 'bulb-outline' },
];

const FOLLOW_UP_PROMPTS = [
  '30-min full body workout',
  'High-protein dinner ideas',
];

const TAB_ICONS: Record<Tab, keyof typeof Ionicons.glyphMap> = {
  generate: 'sparkles',
  saved: 'bookmark',
  chat: 'chatbubbles',
};

export default function AICoachScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];
  const wellness = isWellnessLight(colorScheme);
  const { user } = useAuthStore();
  const store = useAiCoachStore();
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [showProfile, setShowProfile] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('beginner');
  const [goals, setGoals] = useState<FitnessGoal[]>([]);
  const [duration, setDuration] = useState(30);
  const [equipment, setEquipment] = useState<Equipment[]>([]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', e => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        store.loadSavedWorkouts(user.id);
        if (!store.chatMessagesLoaded) store.loadChatMessages(user.id);
      }
    }, [user])
  );

  const toggleGoal = (g: FitnessGoal) => {
    setGoals((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);
  };

  const toggleEquipment = (e: Equipment) => {
    setEquipment((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]);
  };

  const handleGenerate = async () => {
    if (!user) return;
    if (!fitnessLevel || goals.length === 0 || !duration || equipment.length === 0) {
      Alert.alert('Incomplete', 'Please fill in all fields'); return;
    }
    await store.generateWorkout(user.id, { fitnessLevel, goals, duration, equipment });
  };

  const handleSave = async () => {
    if (!user || !store.currentWorkout) return;
    await store.saveWorkout(user.id, store.currentWorkout);
    Alert.alert('Saved!', 'Workout saved to your collection');
  };

  const handleSelectSaved = (workout: GeneratedWorkout) => {
    setActiveTab('generate');
    store.updateUserProfile({
      fitness_level: fitnessLevel, goals,
      preferred_equipment: equipment, preferred_duration: duration,
    });
  };

  const handleSendChat = async (text?: string) => {
    const msg = (text ?? chatInput).trim();
    if (!msg || !user || store.isChatLoading) return;
    setChatInput('');
    Keyboard.dismiss();
    await store.sendMessage(user.id, msg);
  };

  const handleSuggestionTap = (suggestion: string) => {
    setChatInput(suggestion);
    setTimeout(() => handleSendChat(suggestion), 100);
  };

  const handleVoiceTranscribed = (text: string) => {
    setChatInput(text);
    setTimeout(() => handleSendChat(text), 100);
  };

  const accent = wellness ? WELLNESS_GREEN : theme.accent;
  const showBack = navigation.canGoBack();

  const renderQuickTopics = (compact?: boolean) => (
    <View style={[styles.quickTopicRow, compact && styles.quickTopicRowCompact]}>
      {QUICK_TOPICS.map((topic) => (
        <TouchableOpacity
          key={topic.label}
          onPress={() => handleSuggestionTap(topic.prompt)}
          activeOpacity={0.85}
          style={[
            styles.quickTopicChip,
            wellness
              ? [glassSurface('rgba(255,255,255,0.9)'), { borderColor: 'rgba(255,255,255,0.95)' }]
              : { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={[styles.quickTopicIcon, { backgroundColor: accent + '18' }]}>
            <Ionicons name={topic.icon} size={18} color={accent} />
          </View>
          <Text style={[styles.quickTopicText, { color: theme.textPrimary }]}>{topic.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderEmptyChat = () => (
    <ScrollView
      style={styles.chatEmptyFlex}
      contentContainerStyle={styles.chatEmptyScroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      <View style={[styles.chatEmptyIconWrap, { backgroundColor: accent + '15' }]}>
        <Ionicons name="sparkles" size={36} color={accent} />
      </View>
      <Text style={[styles.chatEmptyTitle, { color: theme.textPrimary }]}>Hi! I&apos;m your coach</Text>
      <Text style={[styles.chatEmptySub, { color: theme.textSecondary }]}>
        Pick a topic below or type a question — workouts, meals, and habits.
      </Text>

      {renderQuickTopics()}

      <Text style={[styles.tryLabel, { color: theme.textMuted }]}>Try asking</Text>
      <View style={styles.followUpRow}>
        {FOLLOW_UP_PROMPTS.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => handleSuggestionTap(s)}
            activeOpacity={0.85}
            style={[
              styles.followUpChip,
              wellness
                ? [glassSurface('rgba(255,255,255,0.85)'), { borderColor: 'rgba(255,255,255,0.9)' }]
                : { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.followUpText, { color: theme.textSecondary }]} numberOfLines={2}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  function ThinkingBubble({ theme, startedAt }: { theme: typeof colors.light; startedAt: number | null }) {
    const [elapsed, setElapsed] = useState(0);
    const dotOpacity = useRef([new Animated.Value(0.3), new Animated.Value(0.3), new Animated.Value(0.3)]).current;

    useEffect(() => {
      const timer = setInterval(() => {
        if (startedAt) setElapsed(Math.floor((Date.now() - startedAt) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }, [startedAt]);

    useEffect(() => {
      const pulse = (i: number) => {
        Animated.sequence([
          Animated.timing(dotOpacity[i], { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dotOpacity[i], { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]).start(() => pulse((i + 1) % 3));
      };
      pulse(0);
    }, []);

    return (
      <View style={[styles.thinkingRow, { paddingHorizontal: spacing.lg }]}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#111318', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(45,220,140,0.3)' }}>
          <Ionicons name="fitness-outline" size={16} color="#2DDC8C" />
        </View>
        <View style={[styles.thinkingBubble, { backgroundColor: '#1A1D26', borderColor: 'rgba(255,255,255,0.08)' }]}>
          <View style={styles.thinkingDots}>
            {[0, 1, 2].map((i) => (
              <Animated.View key={i} style={[styles.thinkingDot, { opacity: dotOpacity[i] }]} />
            ))}
          </View>
          <Text style={[styles.thinkingTimer, { color: theme.textMuted }]}>
            Thinking{'.'.repeat((elapsed % 3) + 1)} {elapsed}s
          </Text>
        </View>
      </View>
    );
  }

  const renderChat = () => (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 72 : 0}
    >
      {store.chatMessages.length === 0 && !store.isChatLoading ? (
        renderEmptyChat()
      ) : (
        <>
          {store.chatMessages.length > 0 && (
            <View style={[styles.chatActions, { borderBottomColor: theme.border }]}>
              <TouchableOpacity
                onPress={() => user && store.clearChat(user.id)}
                style={[styles.clearChatBtn, { backgroundColor: theme.red + '12' }]}
              >
                <Ionicons name="trash-outline" size={13} color={theme.red} />
                <Text style={[styles.clearChatText, { color: theme.red }]}>Clear chat</Text>
              </TouchableOpacity>
            </View>
          )}
          <FlatList
            ref={flatListRef}
            style={styles.chatListFlex}
            data={[
              ...store.chatMessages,
              ...(store.isChatLoading ? [{ id: '__thinking__', role: 'assistant' as const, content: '', timestamp: 0 }] : []),
            ]}
            keyExtractor={m => m.id}
            renderItem={({ item }) =>
              item.id === '__thinking__' ? (
                <ThinkingBubble theme={theme} startedAt={store.chatStartedAt} />
              ) : (
                <ChatBubble message={item.content} role={item.role} />
              )
            }
            contentContainerStyle={styles.chatList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
          {renderQuickTopics(true)}
        </>
      )}

      <View
        style={[
          styles.chatInputBar,
          {
            paddingBottom: Math.max(
              keyboardHeight > 0 ? spacing.sm : spacing.md,
              Platform.OS === 'ios' ? insets.bottom : spacing.sm,
            ),
          },
        ]}
      >
        <View
          style={[
            styles.chatInputWrap,
            wellness
              ? [glassSurface('rgba(255,255,255,0.94)'), { borderColor: 'rgba(255,255,255,0.95)' }]
              : { backgroundColor: theme.bg, borderColor: theme.border },
          ]}
        >
          <VoiceMicButton theme={theme} onTranscribed={handleVoiceTranscribed} size={36} />
          <TextInput
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="Message your coach…"
            placeholderTextColor={theme.textMuted}
            style={[styles.chatInput, { color: theme.textPrimary }]}
            multiline
            maxLength={500}
            onSubmitEditing={() => handleSendChat()}
            returnKeyType="send"
            blurOnSubmit
          />
          <TouchableOpacity
            onPress={() => handleSendChat()}
            disabled={!chatInput.trim() || store.isChatLoading}
            activeOpacity={0.85}
            style={[
              styles.sendBtn,
              {
                backgroundColor: chatInput.trim() ? accent : theme.border,
                opacity: chatInput.trim() ? 1 : 0.5,
              },
            ]}
          >
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  const renderGenerateContent = () => {
    if (store.isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <LinearGradient
              colors={['#2DDC8C', '#0A9A5E'] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.loadingIconWrap}
            >
              <Ionicons name="barbell-outline" size={32} color="#fff" />
            </LinearGradient>
            <Text style={[styles.loadingTitle, { color: theme.textPrimary }]}>
              Generating Your Workout
            </Text>
            <Text style={[styles.loadingSub, { color: theme.textMuted }]}>
              AI is crafting a personalized workout based on your preferences...
            </Text>
            <AILoadingSkeleton />
          </View>
        </View>
      );
    }
    if (store.currentWorkout) {
      return (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.workoutCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.workoutTitle, { color: theme.textPrimary }]}>{store.currentWorkout.title}</Text>
            <Text style={[styles.workoutDesc, { color: theme.textMuted }]}>{store.currentWorkout.description}</Text>
            <View style={styles.workoutMeta}>
              <View style={[styles.metaChip, { backgroundColor: theme.accent + '15' }]}>
                <Ionicons name="time-outline" size={14} color={theme.accent} />
                <Text style={[styles.metaChipText, { color: theme.accent }]}>{store.currentWorkout.duration} min</Text>
              </View>
              <View style={[styles.metaChip, { backgroundColor: theme.purple + '15' }]}>
                <Ionicons name="stats-chart-outline" size={14} color={theme.purple} />
                <Text style={[styles.metaChipText, { color: theme.purple }]}>Difficulty {store.currentWorkout.difficulty}/10</Text>
              </View>
            </View>
          </View>

          {store.currentWorkout.ai_notes ? (
            <View style={[styles.notesBox, { backgroundColor: theme.accent + '10', borderLeftColor: theme.accent }]}>
              <Ionicons name="bulb-outline" size={16} color={theme.accent} />
              <Text style={[styles.notesText, { color: theme.textSecondary }]}>{store.currentWorkout.ai_notes}</Text>
            </View>
          ) : null}

          <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>Warmup</Text>
          {store.currentWorkout.warmup.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: theme.accent }]} />
              <Text style={[styles.stepText, { color: theme.textSecondary }]}>{step}</Text>
            </View>
          ))}

          <Text style={[styles.sectionLabel, { color: theme.textPrimary, marginTop: spacing.lg }]}>Exercises</Text>
          {store.currentWorkout.exercises.map((ex, i) => (
            <ExerciseCard key={i} exercise={ex} index={i} />
          ))}

          <Text style={[styles.sectionLabel, { color: theme.textPrimary, marginTop: spacing.lg }]}>Cooldown</Text>
          {store.currentWorkout.cooldown.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: theme.purple }]} />
              <Text style={[styles.stepText, { color: theme.textSecondary }]}>{step}</Text>
            </View>
          ))}

          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => {
              const exs = store.currentWorkout?.exercises ?? [];
              navigation.navigate('QuickStart', { category: 'Full Body', exercises: exs, title: store.currentWorkout?.title });
            }} activeOpacity={0.8} style={[styles.useBtn, { backgroundColor: theme.purple }]}>
              <Ionicons name="play-outline" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Use in Activity</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} activeOpacity={0.8} style={[styles.saveBtn, { backgroundColor: theme.accent }]}>
              <Ionicons name="bookmark-outline" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save Workout</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => store.clearCurrentWorkout()} activeOpacity={0.8} style={[styles.newBtn, { borderColor: theme.border }]}>
              <Text style={[styles.newBtnText, { color: theme.textMuted }]}>Generate New</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      );
    }
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <WorkoutForm
          fitnessLevel={fitnessLevel} goals={goals} duration={duration} equipment={equipment}
          onChangeLevel={setFitnessLevel} onToggleGoal={toggleGoal}
          onChangeDuration={setDuration} onToggleEquipment={toggleEquipment}
          onGenerate={handleGenerate} isLoading={store.isLoading}
        />
      </ScrollView>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: wellness ? 'transparent' : theme.bg, paddingTop: insets.top }]}>
      {wellness ? <PastelScreenBackground /> : null}
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {showBack ? (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[
                styles.backBtn,
                wellness
                  ? [glassSurface('rgba(255,255,255,0.8)'), { borderColor: 'rgba(255,255,255,0.9)' }]
                  : { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Ionicons name="chevron-back" size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>AI Coach</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
              {activeTab === 'chat' ? 'Chat · workouts & nutrition' : activeTab === 'saved' ? 'Saved workouts' : 'Build a workout'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => setShowProfile(true)}
          hitSlop={12}
          style={[
            styles.profileBtn,
            wellness
              ? [glassSurface('rgba(255,255,255,0.8)'), { borderColor: 'rgba(255,255,255,0.9)' }]
              : { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Ionicons name="options-outline" size={20} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      <SegmentChips
        variant="segmented"
        tabs={[
          { id: 'generate' as Tab, label: 'Generate', icon: TAB_ICONS.generate, color: accent },
          { id: 'saved' as Tab, label: 'Saved', icon: TAB_ICONS.saved, color: accent },
          { id: 'chat' as Tab, label: 'Chat', icon: TAB_ICONS.chat, color: accent },
        ]}
        active={activeTab}
        onChange={setActiveTab}
        theme={theme}
      />

      <View style={styles.content}>
        {activeTab === 'generate' && renderGenerateContent()}
        {activeTab === 'saved' && <SavedWorkoutsList onSelectWorkout={handleSelectSaved} />}
        {activeTab === 'chat' && renderChat()}
      </View>

      {store.error && (
        <View style={[styles.errorBar, { backgroundColor: theme.red }]}>
          <Text style={styles.errorText}>{store.error}</Text>
          <TouchableOpacity onPress={store.clearError} hitSlop={12}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      <FitnessProfileModal visible={showProfile} onClose={() => setShowProfile(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  backBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: fontSize.sm, marginTop: 2 },
  profileBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  content: { flex: 1, minHeight: 0, paddingBottom: 88 },

  // Generate tab
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.huge + 40 },

  workoutCard: { borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, marginBottom: spacing.md },
  workoutTitle: { fontSize: fontSize.xl, fontWeight: '800' },
  workoutDesc: { fontSize: fontSize.sm, marginTop: spacing.xs, lineHeight: 18 },
  workoutMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.full },
  metaChipText: { fontSize: fontSize.xs, fontWeight: '700' },

  notesBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderLeftWidth: 3, marginBottom: spacing.md },
  notesText: { flex: 1, fontSize: fontSize.sm, lineHeight: 18 },

  sectionLabel: { fontSize: fontSize.base, fontWeight: '700', marginBottom: spacing.sm },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.xs, paddingLeft: spacing.xs },
  stepDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  stepText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20 },

  loadingContainer: { flex: 1, padding: spacing.lg },
  loadingCard: { borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, alignItems: 'center' },
  loadingIconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  loadingTitle: { fontSize: fontSize.lg, fontWeight: '800', marginBottom: spacing.xs },
  loadingSub: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 18, marginBottom: spacing.lg },

  actionRow: { marginTop: spacing.lg, gap: spacing.sm },
  useBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.lg },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.lg },
  saveBtnText: { color: '#fff', fontSize: fontSize.base, fontWeight: '700' },
  newBtn: { alignItems: 'center', paddingVertical: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  newBtnText: { fontSize: fontSize.base, fontWeight: '600' },

  errorBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, position: 'absolute', bottom: 0, left: 0, right: 0 },
  errorText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '600', flex: 1 },

  // Chat styles
  chatContainer: { flex: 1, minHeight: 0 },
  chatEmptyFlex: { flex: 1, minHeight: 0 },
  chatListFlex: { flex: 1 },
  chatList: { paddingTop: spacing.xs, paddingBottom: spacing.md, flexGrow: 1 },
  chatActions: { flexDirection: 'row', justifyContent: 'center', paddingVertical: spacing.xs, borderBottomWidth: 0.5 },
  clearChatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
  clearChatText: { fontSize: fontSize.xs, fontWeight: '600' },
  chatEmptyScroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  chatEmptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  chatEmptyTitle: { fontSize: fontSize.xl + 2, fontWeight: '800', textAlign: 'center', marginBottom: spacing.xs },
  chatEmptySub: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
    maxWidth: 300,
  },
  tryLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    alignSelf: 'stretch',
    textAlign: 'center',
  },
  followUpRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  followUpChip: {
    flex: 1,
    maxWidth: 168,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  followUpText: { fontSize: fontSize.sm, fontWeight: '500', textAlign: 'center', lineHeight: 18 },
  quickTopicRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    gap: spacing.sm,
    flexGrow: 0,
    flexShrink: 0,
  },
  quickTopicRowCompact: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    marginBottom: spacing.xs,
  },
  quickTopicChip: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.lg,
    minWidth: 96,
    maxWidth: 120,
    flexShrink: 0,
  },
  quickTopicIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTopicText: { fontSize: fontSize.sm, fontWeight: '700', textAlign: 'center' },
  chatInputBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, flexShrink: 0 },
  chatInputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    borderWidth: 1,
    paddingLeft: spacing.xs,
    paddingRight: spacing.xs,
    paddingVertical: 6,
    gap: 4,
    minHeight: 48,
  },
  chatInput: {
    flex: 1,
    paddingVertical: Platform.OS === 'web' ? 10 : spacing.sm,
    maxHeight: 100,
    fontSize: fontSize.base,
    paddingHorizontal: spacing.xs,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  thinkingRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.md },
  thinkingBubble: { maxWidth: '78%', paddingHorizontal: spacing.md, paddingVertical: 12, borderRadius: radius.lg, borderBottomLeftRadius: 4, borderWidth: 1, gap: 6 },
  thinkingDots: { flexDirection: 'row', gap: 5, marginBottom: 4 },
  thinkingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#6A6690' },
  thinkingTimer: { fontSize: fontSize.sm, fontWeight: '500', color: '#6A6690' },
});
