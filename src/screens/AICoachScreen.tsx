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
import { spacing, radius, fontSize } from '../theme';
import { caloriePremiumTheme } from '../components/calorie/PremiumCalorieUI';
import { useAuthStore } from '../store/authStore';
import { useAiCoachStore } from '../store/aiCoachStore';
import { PremiumWorkoutWizard } from '../components/ai-coach/PremiumWorkoutWizard';
import { ExerciseCard } from '../components/ExerciseCard';
import { AILoadingSkeleton } from '../components/AILoadingSkeleton';
import { SavedWorkoutsList } from '../components/SavedWorkoutsList';
import { FitnessProfileModal } from '../components/FitnessProfileModal';
import { ChatBubble } from '../components/ChatBubble';
import { VoiceMicButton } from '../components/VoicemicButton';
import { PremiumAtmosphereBackground } from '../components/premium/PremiumAtmosphereBackground';
import {
  PREMIUM_BG,
  PREMIUM_TEXT,
  PREMIUM_MUTED,
  PREMIUM_ACCENT,
  PREMIUM_GLASS,
  PREMIUM_GLASS_BORDER,
  premiumGlassShadow,
} from '../components/premium/premiumEffects';
import type { FitnessLevel, FitnessGoal, Equipment, GeneratedWorkout } from '../types/ai-coach.types';

type Tab = 'generate' | 'saved' | 'chat';

const QUICK_TOPICS: {
  label: string;
  prompt: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  action?: 'generate' | 'mealPlan';
}[] = [
  { label: 'Workout Plan', prompt: 'Suggest a balanced workout for today based on my goals.', icon: 'barbell-outline', color: PREMIUM_ACCENT, action: 'generate' },
  { label: 'Meal Plan', prompt: 'Help me plan high-protein meals for the rest of today.', icon: 'restaurant-outline', color: '#FFB347', action: 'mealPlan' },
  { label: 'Fitness Tips', prompt: 'Give me 3 practical tips to stay consistent this week.', icon: 'bulb-outline', color: '#B280FF' },
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
  const theme = caloriePremiumTheme;
  const { user } = useAuthStore();
  const store = useAiCoachStore();
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [showProfile, setShowProfile] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('beginner');
  const [goals, setGoals] = useState<FitnessGoal[]>(['weight_loss']);
  const [duration, setDuration] = useState(30);
  const [equipment, setEquipment] = useState<Equipment[]>(['body-weight']);

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

  const setPrimaryGoal = (g: FitnessGoal) => setGoals([g]);

  const setEquipmentSingle = (e: Equipment) => setEquipment([e]);

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
    useAiCoachStore.setState({ currentWorkout: workout });
    setActiveTab('generate');
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

  const showBack = navigation.canGoBack();

  const onQuickTopic = (topic: (typeof QUICK_TOPICS)[number]) => {
    if (topic.action === 'generate') {
      setActiveTab('generate');
      return;
    }
    if (topic.action === 'mealPlan') {
      navigation.navigate('MealPlan');
      return;
    }
    handleSuggestionTap(topic.prompt);
  };

  const renderQuickTopics = (compact?: boolean) => (
    <View style={[styles.quickTopicRow, compact && styles.quickTopicRowCompact]}>
      {QUICK_TOPICS.map((topic) => (
        <TouchableOpacity
          key={topic.label}
          onPress={() => onQuickTopic(topic)}
          activeOpacity={0.85}
          style={[styles.quickTopicChip, premiumGlassShadow(), { backgroundColor: PREMIUM_GLASS, borderColor: PREMIUM_GLASS_BORDER }]}
        >
          <View style={[styles.quickTopicIcon, { backgroundColor: topic.color + '22' }]}>
            <Ionicons name={topic.icon} size={20} color={topic.color} />
          </View>
          <Text style={[styles.quickTopicText, { color: PREMIUM_TEXT }]}>{topic.label}</Text>
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
      <View style={styles.coachHero}>
        <Text style={styles.coachRobot}>🤖</Text>
        <Text style={styles.coachFloat1}>🏋️</Text>
        <Text style={styles.coachFloat2}>💬</Text>
        <Text style={styles.coachFloat3}>❤️</Text>
      </View>
      <Text style={[styles.chatEmptyTitle, { color: PREMIUM_TEXT }]}>Hi! I&apos;m your AI Coach</Text>
      <Text style={[styles.chatEmptySub, { color: PREMIUM_MUTED }]}>
        Workouts, meal plans, and habits — pick a shortcut or message me below.
      </Text>

      {renderQuickTopics()}

      <Text style={[styles.tryLabel, { color: theme.textMuted }]}>Try asking</Text>
      <View style={styles.followUpRow}>
        {FOLLOW_UP_PROMPTS.map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => handleSuggestionTap(s)}
            activeOpacity={0.85}
            style={[styles.followUpChip, { backgroundColor: PREMIUM_GLASS, borderColor: PREMIUM_GLASS_BORDER }]}
          >
            <Text style={[styles.followUpText, { color: PREMIUM_MUTED }]} numberOfLines={2}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  function ThinkingBubble({ startedAt }: { startedAt: number | null }) {
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
          <Text style={[styles.thinkingTimer, { color: PREMIUM_MUTED }]}>
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
                <ThinkingBubble startedAt={store.chatStartedAt} />
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
        <View style={[styles.chatInputWrap, { backgroundColor: PREMIUM_GLASS, borderColor: PREMIUM_GLASS_BORDER }]}>
          <VoiceMicButton theme={theme} onTranscribed={handleVoiceTranscribed} size={36} />
          <TextInput
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="Message your coach…"
            placeholderTextColor={PREMIUM_MUTED}
            style={[styles.chatInput, { color: PREMIUM_TEXT }]}
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
            style={[styles.sendBtn, { backgroundColor: chatInput.trim() ? PREMIUM_ACCENT : PREMIUM_GLASS_BORDER, opacity: chatInput.trim() ? 1 : 0.5 }]}
          >
            <Ionicons name="arrow-up" size={18} color={PREMIUM_BG} />
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
        <PremiumWorkoutWizard
          fitnessLevel={fitnessLevel}
          goals={goals}
          duration={duration}
          equipment={equipment}
          onChangeLevel={setFitnessLevel}
          onToggleGoal={toggleGoal}
          onSetPrimaryGoal={setPrimaryGoal}
          onChangeDuration={setDuration}
          onToggleEquipment={toggleEquipment}
          onSetEquipmentSingle={setEquipmentSingle}
          onGenerate={handleGenerate}
          isLoading={store.isLoading}
        />
      </ScrollView>
    );
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {(['generate', 'saved', 'chat'] as Tab[]).map(tab => {
        const active = activeTab === tab;
        const label = tab === 'generate' ? 'Generate' : tab === 'saved' ? 'Saved' : 'Chat';
        return (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.88}
            style={[styles.tabItem, active && styles.tabItemActive]}
          >
            <Ionicons name={TAB_ICONS[tab]} size={16} color={active ? PREMIUM_BG : PREMIUM_MUTED} style={{ marginRight: 4 }} />
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const subtitle =
    activeTab === 'chat'
      ? 'Chat · workouts & nutrition'
      : activeTab === 'saved'
        ? 'Saved workouts'
        : 'Let AI create a personalized plan';

  return (
    <View style={[styles.root, { backgroundColor: PREMIUM_BG, paddingTop: insets.top }]}>
      <PremiumAtmosphereBackground />
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {showBack ? (
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color={PREMIUM_TEXT} />
            </TouchableOpacity>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>AI Coach</Text>
            <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowProfile(true)} hitSlop={12} style={styles.profileBtn}>
          <Ionicons name="options-outline" size={20} color={PREMIUM_TEXT} />
        </TouchableOpacity>
      </View>

      {renderTabBar()}

      <View style={styles.content}>
        {activeTab === 'generate' && renderGenerateContent()}
        {activeTab === 'saved' && <SavedWorkoutsList variant="premium" onSelectWorkout={handleSelectSaved} />}
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
  backBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER, backgroundColor: PREMIUM_GLASS,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: PREMIUM_TEXT },
  subtitle: { fontSize: fontSize.sm, marginTop: 2, color: PREMIUM_MUTED },
  profileBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER, backgroundColor: PREMIUM_GLASS,
    alignItems: 'center', justifyContent: 'center',
  },

  tabBar: {
    flexDirection: 'row', flexGrow: 0, flexShrink: 0,
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
    borderRadius: radius.full, padding: 4, borderWidth: 1,
    borderColor: PREMIUM_GLASS_BORDER, backgroundColor: PREMIUM_GLASS,
  },
  tabItem: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: radius.full,
  },
  tabItemActive: { backgroundColor: PREMIUM_ACCENT },
  tabLabel: { fontSize: fontSize.sm, fontWeight: '700', color: PREMIUM_MUTED },
  tabLabelActive: { color: PREMIUM_BG },

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
  coachHero: { position: 'relative', width: 120, height: 100, marginBottom: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  coachRobot: { fontSize: 64 },
  coachFloat1: { position: 'absolute', top: 0, left: 0, fontSize: 22 },
  coachFloat2: { position: 'absolute', top: 8, right: -4, fontSize: 20 },
  coachFloat3: { position: 'absolute', bottom: 4, right: 8, fontSize: 18 },
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
    borderWidth: 1,
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
