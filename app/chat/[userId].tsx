import { StatusDot, UserStatus } from '@/components/ui/StatusDot';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useChat } from '@/hooks/useChat';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, FlatList, Image,
  KeyboardAvoidingView, Platform, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Typing indicator — 3 bouncing dots ─────────────────────
function TypingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 140),
        Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
        Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
        Animated.delay(600 - i * 140),
      ]))
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.typingBubble}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[styles.typingDot, { transform: [{ translateY: dot }] }]} />
      ))}
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────
export default function ChatScreen() {
  const { userId: friendId, name, avatar, status } = useLocalSearchParams<{
    userId: string; name: string; avatar: string; status: string;
  }>();
  const router = useRouter();
  const [myId, setMyId] = useState<string>();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [friendTyping, setFriendTyping] = useState(false);
  const listRef = useRef<FlatList>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();
  const typingChannel = useRef<ReturnType<typeof supabase.channel>>();
  const justSent = useRef(false); // prevents Enter newline staying in input

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id));
  }, []);

  // ── Typing presence channel ───────────────────────────────
  useEffect(() => {
    if (!myId || !friendId) return;
    const channelName = `typing:${[myId, friendId].sort().join('-')}`;
    const ch = supabase.channel(channelName);
    typingChannel.current = ch;

    ch.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.userId !== myId) {
        setFriendTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setFriendTyping(false), 3000);
      }
    }).subscribe();

    return () => {
      ch.unsubscribe();
      clearTimeout(typingTimer.current);
    };
  }, [myId, friendId]);

  const { messages, loading, send } = useChat(myId, friendId);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length, friendTyping]);

  // Broadcast typing event (throttled)
  const lastTypingBroadcast = useRef(0);
  function handleChangeText(val: string) {
    // Block the newline that fires right after Enter sends
    if (justSent.current) {
      justSent.current = false;
      const cleaned = val.replace(/\n$/, '');
      setText(cleaned);
      return;
    }
    setText(val);

    if (!myId || !typingChannel.current) return;
    const now = Date.now();
    if (now - lastTypingBroadcast.current > 1500) {
      lastTypingBroadcast.current = now;
      typingChannel.current.send({ type: 'broadcast', event: 'typing', payload: { userId: myId } });
    }
  }

  async function handleSend() {
    if (!text.trim()) return;
    justSent.current = true; // flag to block the trailing newline
    setSending(true);
    setSendError(null);
    const content = text.trim();
    setText('');
    const { error } = await send(content);
    if (error) {
      setSendError('Message failed — make sure you\'re logged in');
      setText(content);
      justSent.current = false;
    }
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
          <StatusDot status={(status as UserStatus) ?? 'offline'} size={8} showLabel />
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
                <Text style={[Typography.subheading, { textAlign: 'center', marginTop: Spacing.sm }]}>
                  Start the conversation
                </Text>
                <Text style={[Typography.body, { textAlign: 'center', marginTop: 4 }]}>
                  Say hi to {name}!
                </Text>
              </View>
            }
            ListFooterComponent={
              friendTyping ? (
                <View style={styles.typingRow}>
                  <Text style={styles.typingName}>{name} is typing</Text>
                  <TypingDots />
                </View>
              ) : null
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

        {sendError && (
          <View style={styles.errorBar}>
            <Text style={{ color: Colors.error, fontSize: 11 }}>{sendError}</Text>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={handleChangeText}
            placeholder="Message..."
            placeholderTextColor={Colors.textDim}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
            returnKeyType="send"
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Enter' && !(nativeEvent as any).shiftKey) {
                handleSend();
              }
            }}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator color={Colors.background} size="small" />
              : <Text style={styles.sendIcon}>➤</Text>
            }
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

  // Typing indicator
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  typingName: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic' },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceAlt, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: Colors.accentBorder,
  },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },

  // Messages
  bubbleWrap: { alignItems: 'flex-start', gap: 2 },
  bubbleWrapMe: { alignItems: 'flex-end' },
  bubble: { maxWidth: '78%', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 14 },
  bubbleMe: { backgroundColor: Colors.accent, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.accentBorder, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  bubbleTime: { fontSize: 9, color: Colors.textDim, marginHorizontal: 4 },

  errorBar: { backgroundColor: 'rgba(255,68,68,0.12)', paddingHorizontal: Spacing.md, paddingVertical: 6 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm,
    padding: Spacing.sm, paddingHorizontal: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.accentBorder,
    backgroundColor: 'rgba(8,14,24,0.95)',
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 120,
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.accentBorder,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    color: Colors.text, fontSize: 14,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  sendIcon: { color: Colors.background, fontSize: 16, fontWeight: '900' },
});
