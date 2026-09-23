import { supabase } from '../../../services/supabase';

/** Supported media types for chat messages. */
export type MessageType = 'text' | 'image' | 'video' | 'audio';

/** A single chat message between accountability partners. */
export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  message_type: MessageType;
  media_url?: string | null;
  media_duration?: number | null;
  created_at: string;
  read: boolean;
}

/** Result returned after attempting to send a message. */
export interface SendMessageResult {
  success: boolean;
  message?: string;
}

/**
 * Upload a media file (image, video, or audio) to the "partner-media" storage bucket.
 *
 * @param userId - The user ID used to namespace the uploaded file.
 * @param fileUri - The local file URI to upload.
 * @param fileType - The category of media being uploaded.
 * @returns The public URL of the uploaded file, or null on failure.
 */

/**
 * Send a plain-text message to a partner.
 *
 * @param senderId - The message sender's user ID.
 * @param receiverId - The message recipient's user ID.
 * @param message - The text content to send (must not be empty).
 * @returns A result indicating success or failure with an error message.
 */
export const sendMessage = async (
  senderId: string,
  receiverId: string,
  message: string
): Promise<SendMessageResult> => {
  if (!message.trim()) return { success: false, message: 'Message cannot be empty' };

  const { error } = await supabase.from('partner_messages').insert({
    sender_id: senderId,
    receiver_id: receiverId,
    message: message.trim(),
    message_type: 'text',
    read: false,
  });

  if (error) {
    if (__DEV__) console.error('sendMessage error:', error.message);
    return { success: false, message: error.message };
  }
  return { success: true };
};

/**
 * Load the most recent chat messages between the user and a partner, ordered newest-first,
 * then reversed to chronological order.
 *
 * @param userId - The requesting user's ID.
 * @param partnerId - The partner's user ID.
 * @param limit - Maximum number of messages to fetch (default 50).
 * @returns An array of chat messages in chronological order (oldest first).
 */
export const loadMessages = async (
  userId: string,
  partnerId: string,
  limit = 50
): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from('partner_messages')
    .select('id, sender_id, receiver_id, message, message_type, media_url, media_duration, created_at, read')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .or(`sender_id.eq.${partnerId},receiver_id.eq.${partnerId}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (__DEV__) console.error('loadMessages error:', error.message);
    return [];
  }

  return (data as ChatMessage[]).reverse();
};

/**
 * Subscribe to real-time incoming messages from a specific partner.
 *
 * @param userId - The current user's ID (messages are received as the receiver).
 * @param partnerId - The partner's user ID (messages are expected from this sender).
 * @param onMessage - Callback invoked with each new ChatMessage received.
 * @returns An unsubscribe function to clean up the subscription.
 */
export const markAsRead = async (userId: string, senderId: string): Promise<void> => {
  await supabase
    .from('partner_messages')
    .update({ read: true })
    .eq('sender_id', senderId)
    .eq('receiver_id', userId)
    .eq('read', false);
};

export const subscribeToMessages = (
  userId: string,
  partnerId: string,
  onMessage: (message: ChatMessage) => void
) => {
  const channel = supabase
    .channel(`chat-${userId}-${partnerId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'partner_messages',
        filter: `sender_id=eq.${partnerId},receiver_id=eq.${userId}`,
      },
      (payload) => {
        onMessage(payload.new as ChatMessage);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};


