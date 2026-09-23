import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, radius, fontSize } from '../theme';
import { stripMarkdown } from '../utils/strip-markdown';

interface ChatBubbleProps {
  message: string;
  role: 'user' | 'assistant';
  isStreaming?: boolean;
}

export function ChatBubble({ message, role, isStreaming }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <View style={[styles.row, isUser && styles.rowUser]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Ionicons name="fitness-outline" size={16} color="#2DDC8C" />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleCoach]}>
        <Text style={[styles.text, isUser && styles.textUser]}>
          {isUser ? message : stripMarkdown(message)}
          {isStreaming && <ActivityIndicator size="small" color="#2DDC8C" style={{ marginLeft: 4 }} />}
        </Text>
      </View>
      {isUser && (
        <View style={styles.avatarUser}>
          <Ionicons name="person-outline" size={16} color="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  rowUser: { justifyContent: 'flex-end' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#111318', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(45,220,140,0.3)' },
  avatarUser: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#2DDC8C', alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.lg },
  bubbleUser: { backgroundColor: '#2DDC8C', borderBottomRightRadius: 4 },
  bubbleCoach: { backgroundColor: '#1A1D26', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  text: { fontSize: fontSize.base, color: '#E8E8ED', lineHeight: 20 },
  textUser: { color: '#fff' },
});
