import { Colors, Spacing, Typography } from '@/constants/theme';
import { useRecentChats } from '@/hooks/useRecentChats';
import { useUnreadCounts } from '@/hooks/useChat';
import { openMiniChat } from '@/lib/miniChat';
import { supabase } from '@/lib/supabase';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Image, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DefaultAvatar } from './DefaultAvatar';

const PANEL_W = 260;

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function FloatingChatPanel({ myId }: { myId: string | undefined }) {
  const insets = useSafeAreaInsets();
  const [resolvedMyId, setResolvedMyId] = useState(myId);
  const [open, setOpen] = useState(false);
  const slideX = useRef(new Animated.Value(PANEL_W)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (myId) { setResolvedMyId(myId); return; }
    supabase.auth.getUser().then(({ data }) => { if (data.user?.id) setResolvedMyId(data.user.id); });
  }, [myId]);

  const { chats } = useRecentChats(resolvedMyId);
  const { totalUnread } = useUnreadCounts(resolvedMyId);

  function toggle() {
    const opening = !open;
    setOpen(opening);
    Animated.parallel([
      Animated.timing(slideX, {
        toValue: opening ? 0 : PANEL_W,
        duration: 280, useNativeDriver: true,
        easing: opening ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      }),
      Animated.timing(backdropOp, { toValue: opening ? 1 : 0, duration: 280, useNativeDriver: true }),
    ]).start();
  }

  function close() {
    setOpen(false);
    Animated.parallel([
      Animated.timing(slideX, { toValue: PANEL_W, duration: 250, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
      Animated.timing(backdropOp, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  const tabTop = insets.top + 64;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <Animated.View style={[styles.backdrop, { opacity: backdropOp }]} pointerEvents={open ? 'auto' : 'none'}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={close} />
        </Animated.View>
      )}

      {/* Sliding panel — from right */}
      <Animated.View style={[styles.panel, { transform: [{ translateX: slideX }], top: 0, bottom: 0 }]}>
        <View style={[styles.panelHeader, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.panelTitle}>💬 Messages</Text>
          <TouchableOpacity onPress={close} style={styles.closeBtn}>
            <Text style={{ color: Colors.textMuted, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: Spacing.sm, gap: 2 }} showsVerticalScrollIndicator={false}>
          {chats.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 32 }}>💬</Text>
              <Text style={[Typography.body, { textAlign: 'center', marginTop: 8 }]}>No messages yet</Text>
            </View>
          ) : (
            chats.map(chat => (
              <TouchableOpacity
                key={chat.userId}
                style={[styles.chatRow, chat.unread > 0 && styles.chatRowUnread]}
                onPress={() => {
                  openMiniChat({ id: chat.userId, name: chat.name, avatarUrl: chat.avatarUrl });
                  close();
                }}
                activeOpacity={0.75}
              >
                <View style={styles.avatarWrap}>
                  {chat.avatarUrl
                    ? <Image source={{ uri: chat.avatarUrl }} style={styles.avatar} />
                    : <DefaultAvatar size={42} />
                  }
                  {chat.unread > 0 && (
                    <View style={styles.unreadDot}>
                      <Text style={styles.unreadDotText}>{chat.unread > 9 ? '9+' : chat.unread}</Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={styles.chatRowTop}>
                    <Text style={[styles.chatName, chat.unread > 0 && { color: Colors.text }]} numberOfLines={1}>
                      {chat.name}
                    </Text>
                    <Text style={styles.chatTime}>{timeAgo(chat.lastAt)}</Text>
                  </View>
                  <Text style={[styles.lastMsg, chat.unread > 0 && { color: Colors.text, fontWeight: '600' }]} numberOfLines={1}>
                    {chat.lastMessage}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </Animated.View>

      {/* Floating tab — hidden when panel is open */}
      {!open && (
        <TouchableOpacity
          style={[styles.tab, { top: tabTop }]}
          onPress={toggle}
          activeOpacity={0.85}
        >
          <Text style={styles.tabIcon}>💬</Text>
          {totalUnread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 90,
  },
  panel: {
    position: 'absolute', right: 0, width: PANEL_W,
    backgroundColor: 'rgba(8,14,26,0.98)',
    borderLeftWidth: 1, borderLeftColor: Colors.accentBorder,
    zIndex: 95,
  },
  panelHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.accentBorder,
    backgroundColor: 'rgba(0,200,255,0.04)',
  },
  panelTitle: { fontSize: 16, fontWeight: '900', color: Colors.text, letterSpacing: 0.5 },
  closeBtn: { padding: 6 },

  chatRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.sm, borderRadius: 10,
  },
  chatRowUnread: { backgroundColor: 'rgba(0,200,255,0.06)' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: Colors.accentBorder },
  unreadDot: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: Colors.accent, borderRadius: 8,
    minWidth: 16, height: 16, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.background,
  },
  unreadDotText: { color: Colors.background, fontSize: 9, fontWeight: '900' },
  chatRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, flex: 1 },
  chatTime: { fontSize: 10, color: Colors.textMuted },
  lastMsg: { fontSize: 11, color: Colors.textMuted },

  empty: { alignItems: 'center', paddingTop: 40 },

  tab: {
    position: 'absolute', right: 0, zIndex: 101,
    backgroundColor: 'rgba(8,14,24,0.95)',
    borderTopLeftRadius: 10, borderBottomLeftRadius: 10,
    borderWidth: 1, borderRightWidth: 0, borderColor: Colors.accentBorder,
    paddingVertical: 10, paddingHorizontal: 8,
    alignItems: 'center', gap: 2,
  },
  tabIcon: { fontSize: 18 },
  badge: {
    position: 'absolute', top: -5, left: -8,
    backgroundColor: Colors.accent, borderRadius: 10,
    minWidth: 18, height: 18, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: Colors.background, fontSize: 10, fontWeight: '900' },
});
