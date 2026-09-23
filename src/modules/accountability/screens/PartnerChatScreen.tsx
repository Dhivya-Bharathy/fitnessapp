import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { colors, spacing, radius, fontSize } from '../../../theme';
import { useThemeStore } from '../../../store/themeStore';
import { useAuthStore } from '../../../store/authStore';
import { notifyPartnerMessage } from '../../../services/notificationService';
import {
  sendMessage, loadMessages, subscribeToMessages,
  markAsRead, ChatMessage,
} from '../services/PartnerChatService';

type RouteParams = { PartnerChat: { partnerId: string; partnerName: string } };

export default function PartnerChatScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RouteParams, 'PartnerChat'>>();
  const navigation = useNavigation();
  const { partnerId, partnerName } = route.params;
  const { colorScheme } = useThemeStore();
  const { user } = useAuthStore();
  const theme = colors[colorScheme];
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      setIsLoading(true);
      const msgs = await loadMessages(user.id, partnerId);
      setMessages(msgs);
      await markAsRead(user.id, partnerId);
      setIsLoading(false);
    };
    init();
    const cleanup = subscribeToMessages(user.id, partnerId, (msg) => {
      setMessages(prev => [...prev, msg]);
      if (user) {
        markAsRead(user.id, partnerId);
        notifyPartnerMessage(user.id, partnerName, msg.message_type);
      }
    });
    return cleanup;
  }, [user, partnerId]);

  const handleSendText = async () => {
    if (!input.trim() || !user || isSending) return;
    setIsSending(true);
    const text = input.trim();
    setInput('');

    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`, sender_id: user.id, receiver_id: partnerId,
      message: text, message_type: 'text', created_at: new Date().toISOString(), read: false,
    };
    setMessages(prev => [...prev, tempMsg]);

    const result = await sendMessage(user.id, partnerId, text);
    if (!result.success) {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setInput(text);
    }
    setIsSending(false);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMine = item.sender_id === user?.id;
    return (
      <View style={[msg.row, isMine && msg.rowMine]}>
        <View style={[msg.bubble, isMine ? msg.bubbleMine : msg.bubbleTheir]}>
          {item.message && (
            <Text style={[msg.text, { color: isMine ? '#fff' : theme.textPrimary }]}>{item.message}</Text>
          )}
          <Text style={[msg.time, { color: isMine ? 'rgba(255,255,255,0.6)' : theme.textMuted }]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
    >
      <View style={[styles.header, { backgroundColor: theme.bg, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: theme.textPrimary }]}>{partnerName}</Text>
          <Text style={[styles.headerStatus, { color: theme.textMuted }]}>Accountability Partner</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator color={theme.accent} size="large" /></View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={48} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No messages yet</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Send a message to {partnerName} to get started</Text>
            </View>
          }
          ListHeaderComponent={
            messages.length > 0 ? (
              <View style={styles.dateHeader}>
                <Text style={[styles.dateText, { color: theme.textMuted }]}>{formatDate(messages[0].created_at)}</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, {
        backgroundColor: theme.card,
        borderTopColor: theme.border,
        paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.sm,
      }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder={`Message ${partnerName}...`}
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.textPrimary, backgroundColor: theme.bg }]}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSendText}
        />
        <TouchableOpacity
          onPress={handleSendText}
          disabled={!input.trim() || isSending}
          style={[styles.sendBtn, { backgroundColor: input.trim() ? theme.accent : theme.border }]}
        >
          <Ionicons name="send" size={18} color={input.trim() ? '#fff' : theme.textMuted} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const msg = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: spacing.sm, paddingHorizontal: spacing.lg },
  rowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.lg },
  bubbleMine: { backgroundColor: '#2DDC8C', borderBottomRightRadius: 4 },
  bubbleTheir: { backgroundColor: '#1A1D26', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  text: { fontSize: fontSize.base, lineHeight: 20 },
  time: { fontSize: 10, marginTop: 4, textAlign: 'right' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  headerName: { fontSize: fontSize.lg, fontWeight: '800' },
  headerStatus: { fontSize: fontSize.xs },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chatList: { paddingVertical: spacing.md, paddingBottom: spacing.md },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: spacing.sm },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '700' },
  emptySub: { fontSize: fontSize.base, textAlign: 'center', paddingHorizontal: spacing.xxl },
  dateHeader: { alignItems: 'center', marginBottom: spacing.md },
  dateText: { fontSize: fontSize.xs, fontWeight: '600' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, maxHeight: 100, fontSize: fontSize.base },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
