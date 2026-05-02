import { GlowText } from '@/components/ui/GlowText';
import { StatusDot, UserStatus } from '@/components/ui/StatusDot';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useChat } from '@/hooks/useChat';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, KeyboardAvoidingView,
  Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const { userId: friendId, name, avatar, status } = useLocalSearchParams<{
    userId: string; name: string; avatar: string; status: string;
  }>();
  const router = useRouter();
  const [myId, setMyId] = useState<string>();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id));
  }, []);

  const { messages, loading, send } = useChat(myId, friendId);

  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    await send(text);
    setText('');
    setSending(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.headerAvatar} />
        ) : (
          <View style={styles.headerAvatarFallback}>
            <Text style={{ color: Colors.accent, fontWeight: '800' }}>{name?.[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <StatusDot status={(status as UserStatus) ?? 'offline'} size={8} showLabel />
          </View>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <ActivityIndicator color={Colors.accent} style={{ flex: 1 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={styles.messageList}
            onLayout={() => listRef.current?.scrollToEnd()}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={{ fontSize: 36 }}>💬</Text>
                <Text style={[Typography.subheading, { textAlign: 'center', marginTop: Spacing.sm }]}>Start the conversation</Text>
                <Text style={[Typography.body, { textAlign: 'center', marginTop: 4 }]}>Say hi to {name}!</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isMe = item.sender_id === myId;
              return (
                <View style={[styles.bubbleWrap, isMe && styles.bubbleWrapMe]}>
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                    <Text style={[styles.bubbleText, isMe && { color: Colors.background }]}>
                      {item.content}
                    </Text>
                  </View>
                  <Text style={styles.bubbleTime}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            }}
          />
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Message..."
            placeholderTextColor={Colors.textDim}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color={Colors.background} size="small" />
            ) : (
              <Text style={styles.sendIcon}>➤</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.accentBorder,
    backgroundColor: 'rgba(8,14,24,0.9)',
  },
  backBtn: { padding: 4, marginRight: 4 },
  backText: { color: Colors.accent, fontSize: 28, lineHeight: 28 },
  headerAvatar: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: Colors.accentBorder },
  headerAvatarFallback: {
    width: 40, height: 40, borderRadius: 8,
    backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: Colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: '800', color: Colors.text },

  messageList: { padding: Spacing.md, gap: Spacing.sm, flexGrow: 1 },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, marginTop: 60 },

  bubbleWrap: { alignItems: 'flex-start', gap: 2 },
  bubbleWrapMe: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '78%', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: 14,
  },
  bubbleMe: {
    backgroundColor: Colors.accent,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1, borderColor: Colors.accentBorder,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  bubbleTime: { fontSize: 9, color: Colors.textDim, marginHorizontal: 4 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    padding: Spacing.sm, paddingHorizontal: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.accentBorder,
    backgroundColor: 'rgba(8,14,24,0.95)',
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.accentBorder,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    color: Colors.text, fontSize: 14,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  sendIcon: { color: Colors.background, fontSize: 16, fontWeight: '900' },
});
