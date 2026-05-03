import { Colors, Spacing } from '@/constants/theme';
import { useChat } from '@/hooks/useChat';
import { useRecentChats } from '@/hooks/useRecentChats';
import { closeMiniChat, onMiniChatChange } from '@/lib/miniChat';
import { supabase } from '@/lib/supabase';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, FlatList, Image, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DefaultAvatar } from './DefaultAvatar';

type Friend = { id: string; name: string; avatarUrl: string | null };

export function FloatingMiniChat({ myId }: { myId: string | undefined }) {
  const [friend, setFriend] = useState<Friend | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState('');
  const slideY = useRef(new Animated.Value(300)).current;
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const [resolvedMyId, setResolvedMyId] = useState(myId);
  useEffect(() => {
    if (myId) { setResolvedMyId(myId); return; }
    supabase.auth.getUser().then(({ data }) => { if (data.user?.id) setResolvedMyId(data.user.id); });
  }, [myId]);

  const { messages, send } = useChat(resolvedMyId, friend?.id);
  const { chats } = useRecentChats(resolvedMyId);
  const recentSwitcher = chats.slice(0, 5);

  useEffect(() => onMiniChatChange(f => {
    if (f) { setFriend(f); setExpanded(true); }
    else { setFriend(null); setExpanded(false); }
  }), []);

  useEffect(() => {
    Animated.spring(slideY, {
      toValue: expanded ? 0 : 300,
      useNativeDriver: true, tension: 65, friction: 11,
    }).start();
  }, [expanded]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  async function handleSend() {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    await send(text);
  }

  if (!friend) return null;

  const bottomOffset = 68 + (insets.bottom || 0);

  return (
    <>
      {/* Minimised bubble */}
      {!expanded && (
        <TouchableOpacity
          style={[styles.bubble, { bottom: bottomOffset + 12, right: 16 }]}
          onPress={() => setExpanded(true)}
          activeOpacity={0.85}
        >
          {friend.avatarUrl
            ? <Image source={{ uri: friend.avatarUrl }} style={styles.bubbleAvatar} />
            : <DefaultAvatar size={48} />
          }
          <View style={styles.bubbleDot} />
        </TouchableOpacity>
      )}

      {/* Chat panel */}
      <Animated.View style={[styles.panel, { bottom: bottomOffset, transform: [{ translateY: slideY }] }]}>

        {/* Conversation switcher bar */}
        {recentSwitcher.length > 1 && (
          <View style={styles.switcher}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherScroll}>
              {recentSwitcher.map(c => {
                const isActive = c.userId === friend.id;
                return (
                  <TouchableOpacity
                    key={c.userId}
                    style={[styles.switcherAvatar, isActive && styles.switcherAvatarActive]}
                    onPress={() => {
                      setFriend({ id: c.userId, name: c.name, avatarUrl: c.avatarUrl });
                      setInput('');
                    }}
                    activeOpacity={0.75}
                  >
                    {c.avatarUrl
                      ? <Image source={{ uri: c.avatarUrl }} style={styles.switcherImg} />
                      : <DefaultAvatar size={30} />
                    }
                    {c.unread > 0 && <View style={styles.switcherUnread} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {friend.avatarUrl
              ? <Image source={{ uri: friend.avatarUrl }} style={styles.headerAvatar} />
              : <DefaultAvatar size={28} />
            }
            <Text style={styles.headerName} numberOfLines={1}>{friend.name}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => setExpanded(false)}>
              <Text style={styles.headerBtnText}>—</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={closeMiniChat}>
              <Text style={styles.headerBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          style={styles.messageList}
          contentContainerStyle={{ padding: Spacing.sm, gap: 4 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isMe = item.sender_id === resolvedMyId;
            return (
              <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                <View style={[styles.bubble2, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                  <Text style={[styles.msgText, isMe && { color: '#0a0a0a' }]}>{item.content}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>Say hi to {friend.name}!</Text>}
        />

        {/* Input */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Message..."
              placeholderTextColor={Colors.textDim}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !input.trim() && { opacity: 0.3 }]}
              onPress={handleSend}
              disabled={!input.trim()}
            >
              <Text style={styles.sendText}>›</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute', right: 16,
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderColor: Colors.accent,
    overflow: 'hidden', zIndex: 999,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 10,
  },
  bubbleAvatar: { width: 48, height: 48 },
  bubbleDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: Colors.success, borderWidth: 2, borderColor: Colors.background,
  },

  panel: {
    position: 'absolute', left: 12, right: 12,
    height: 320, borderRadius: 16, overflow: 'hidden',
    backgroundColor: 'rgba(8,14,26,0.97)',
    borderWidth: 1, borderColor: Colors.accentBorder,
    zIndex: 999,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 12,
  },

  switcher: {
    borderBottomWidth: 1, borderBottomColor: Colors.accentBorder,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  switcherScroll: { paddingHorizontal: 8, paddingVertical: 6, gap: 8 },
  switcherAvatar: {
    width: 34, height: 34, borderRadius: 10, overflow: 'hidden',
    borderWidth: 2, borderColor: 'transparent', opacity: 0.5,
  },
  switcherAvatarActive: {
    borderColor: Colors.accent, opacity: 1,
  },
  switcherImg: { width: 30, height: 30 },
  switcherUnread: {
    position: 'absolute', top: 0, right: 0,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: Colors.accent, borderWidth: 1.5, borderColor: 'rgba(8,14,26,1)',
  },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.accentBorder,
    backgroundColor: 'rgba(0,200,255,0.05)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  headerAvatar: { width: 28, height: 28, borderRadius: 8 },
  headerName: { color: Colors.text, fontSize: 13, fontWeight: '800', flex: 1 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: {
    width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerBtnText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },

  messageList: { flex: 1 },
  msgRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  msgRowMe: { justifyContent: 'flex-end' },
  bubble2: { maxWidth: '78%', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  bubbleMe: { backgroundColor: Colors.accent, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: Colors.surfaceAlt, borderBottomLeftRadius: 4 },
  msgText: { fontSize: 13, color: Colors.text },
  emptyText: { textAlign: 'center', color: Colors.textMuted, fontSize: 12, marginTop: 20 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    padding: 8, borderTopWidth: 1, borderTopColor: Colors.accentBorder,
  },
  input: {
    flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: Colors.text,
    borderWidth: 1, borderColor: Colors.accentBorder,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  sendText: { color: Colors.background, fontSize: 22, fontWeight: '900', lineHeight: 28 },
});
