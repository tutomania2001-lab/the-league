import { Colors, Spacing } from '@/constants/theme';
import { useRecentChats } from '@/hooks/useRecentChats';
import { useUnreadCounts } from '@/hooks/useChat';
import { openMiniChat } from '@/lib/miniChat';
import { onFriendsPanelChange, setChatDropdownOpen } from '@/lib/panelState';
import { supabase } from '@/lib/supabase';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Image, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DefaultAvatar } from './DefaultAvatar';

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
  const [friendsPanelOpen, setFriendsPanelOpen] = useState(false);
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => onFriendsPanelChange(v => {
    setFriendsPanelOpen(v);
    if (v) close();
  }), []);

  useEffect(() => {
    if (myId) { setResolvedMyId(myId); return; }
    supabase.auth.getUser().then(({ data }) => { if (data.user?.id) setResolvedMyId(data.user.id); });
  }, [myId]);

  const { chats } = useRecentChats(resolvedMyId);
  const { totalUnread } = useUnreadCounts(resolvedMyId);
  const recent = chats.slice(0, 5);

  function toggle() {
    const opening = !open;
    setOpen(opening);
    setChatDropdownOpen(opening);
    Animated.timing(dropdownAnim, {
      toValue: opening ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
      easing: opening ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    }).start();
  }

  function close() {
    setOpen(false);
    setChatDropdownOpen(false);
    Animated.timing(dropdownAnim, {
      toValue: 0, duration: 180, useNativeDriver: true, easing: Easing.in(Easing.cubic),
    }).start();
  }

  const tabTop = insets.top + 64;
  const dropdownTop = tabTop;

  return (
    <>
      {/* Invisible backdrop to close on outside tap */}
      {open && (
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={close}
          activeOpacity={1}
        />
      )}

      {/* Compact dropdown */}
      {open && (
        <Animated.View style={[
          styles.dropdown,
          { top: dropdownTop, opacity: dropdownAnim, transform: [{ scaleY: dropdownAnim }, { translateX: 0 }] },
        ]}>
          {recent.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          ) : (
            recent.map(chat => (
              <TouchableOpacity
                key={chat.userId}
                style={[styles.row, chat.unread > 0 && styles.rowUnread]}
                onPress={() => { openMiniChat({ id: chat.userId, name: chat.name, avatarUrl: chat.avatarUrl }); close(); }}
                activeOpacity={0.75}
              >
                <View style={styles.avatarWrap}>
                  {chat.avatarUrl
                    ? <Image source={{ uri: chat.avatarUrl }} style={styles.avatar} />
                    : <DefaultAvatar size={36} />
                  }
                  {chat.unread > 0 && (
                    <View style={styles.unreadDot}>
                      <Text style={styles.unreadDotText}>{chat.unread > 9 ? '9+' : chat.unread}</Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Text style={[styles.name, chat.unread > 0 && { color: Colors.text, fontWeight: '800' }]} numberOfLines={1}>
                      {chat.name}
                    </Text>
                    <Text style={styles.time}>{timeAgo(chat.lastAt)}</Text>
                  </View>
                  <Text style={[styles.preview, chat.unread > 0 && { color: Colors.textMuted, fontWeight: '600' }]} numberOfLines={1}>
                    {chat.lastMessage}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </Animated.View>
      )}

      {/* Floating tab — hide when friends panel is open */}
      {!open && !friendsPanelOpen && (
        <TouchableOpacity style={[styles.tab, { top: tabTop }]} onPress={toggle} activeOpacity={0.85}>
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
  dropdown: {
    position: 'absolute', right: 0, zIndex: 102,
    width: 230,
    backgroundColor: 'rgba(8,14,26,0.98)',
    borderRadius: 12, borderWidth: 1, borderColor: Colors.accentBorder,
    overflow: 'hidden',
    transformOrigin: 'top right',
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.accentBorder + '55',
  },
  rowUnread: { backgroundColor: 'rgba(0,200,255,0.06)' },
  avatarWrap: { position: 'relative' },
  avatar: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: Colors.accentBorder },
  unreadDot: {
    position: 'absolute', top: -5, right: -5,
    backgroundColor: Colors.accent, borderRadius: 8,
    minWidth: 16, height: 16, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(8,14,26,1)',
  },
  unreadDotText: { color: Colors.background, fontSize: 8, fontWeight: '900' },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, flex: 1 },
  time: { fontSize: 9, color: Colors.textMuted },
  preview: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },

  emptyRow: { padding: 16, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 12 },

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
