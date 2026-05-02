import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useFriends, useRecentPlayers } from '@/hooks/useFriends';
import { supabase } from '@/lib/supabase';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Easing, Image, RefreshControl,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const PANEL_W = 260;

type Props = { userId: string | undefined };

export function FriendsPanel({ userId }: Props) {
  const insets = useSafeAreaInsets();
  const { friends, incoming, loading, accept, decline, remove, sendRequest } = useFriends(userId);
  const { recentPlayers } = useRecentPlayers(userId);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'friends' | 'requests' | 'recent'>('friends');
  const [refreshing, setRefreshing] = useState(false);
  const slideX = useRef(new Animated.Value(PANEL_W)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;

  function toggle() {
    const opening = !open;
    setOpen(opening);
    Animated.parallel([
      Animated.timing(slideX, {
        toValue: opening ? 0 : PANEL_W,
        duration: 280,
        useNativeDriver: true,
        easing: opening ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      }),
      Animated.timing(backdropOp, {
        toValue: opening ? 1 : 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function close() {
    setOpen(false);
    Animated.parallel([
      Animated.timing(slideX, { toValue: PANEL_W, duration: 250, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
      Animated.timing(backdropOp, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }

  const pendingCount = incoming.length;
  const listData = tab === 'friends' ? friends : tab === 'requests' ? incoming : [];

  return (
    <>
      {/* Backdrop — tap to close */}
      <Animated.View
        pointerEvents={open ? 'auto' : 'none'}
        style={[styles.backdrop, { opacity: backdropOp }]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={close} />
      </Animated.View>

      {/* Sliding panel */}
      <Animated.View
        style={[
          styles.panel,
          { top: insets.top, bottom: insets.bottom, transform: [{ translateX: slideX }] },
        ]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        {/* Panel header */}
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Friends</Text>
          <TouchableOpacity onPress={close} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity style={[styles.tab, tab === 'friends' && styles.tabActive]} onPress={() => setTab('friends')}>
            <Text style={[styles.tabText, tab === 'friends' && styles.tabTextActive]}>All ({friends.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'recent' && styles.tabActive]} onPress={() => setTab('recent')}>
            <Text style={[styles.tabText, tab === 'recent' && styles.tabTextActive]}>Recent</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'requests' && styles.tabActive]} onPress={() => setTab('requests')}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>Req</Text>
              {pendingCount > 0 && (
                <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{pendingCount}</Text></View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* List */}
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => { setRefreshing(true); setRefreshing(false); }}
              tintColor={Colors.accent}
            />
          }
        >
          {/* Recent tab */}
          {tab === 'recent' ? (
            recentPlayers.length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 28, marginBottom: 6 }}>⚔️</Text>
                <Text style={[Typography.body, { textAlign: 'center', fontSize: 12 }]}>No recent matches yet</Text>
                <Text style={[Typography.body, { textAlign: 'center', fontSize: 11, marginTop: 4, color: Colors.textDim }]}>
                  Players you face in tournaments appear here
                </Text>
              </View>
            ) : (
              recentPlayers.map(p => (
                <View key={p.id} style={styles.friendRow}>
                  {p.avatar_url ? (
                    <Image source={{ uri: p.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarLetter}>{(p.riot_id ?? p.username ?? 'S')[0].toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName} numberOfLines={1}>{p.riot_id ?? p.username}</Text>
                    <Text style={styles.friendStatus}>⚔️ Recent opponent</Text>
                  </View>
                  {!friends.some(f => f.profile?.id === p.id) && (
                    <TouchableOpacity style={styles.addFriendBtn} onPress={() => p.riot_id && sendRequest(p.riot_id)}>
                      <Text style={styles.addFriendText}>+ Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )
          ) : listData.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ fontSize: 28, marginBottom: 6 }}>
                {tab === 'friends' ? '🎮' : '📭'}
              </Text>
              <Text style={[Typography.body, { textAlign: 'center', fontSize: 12 }]}>
                {tab === 'friends' ? 'No friends yet' : 'No pending requests'}
              </Text>
            </View>
          ) : (
            listData.map(f => (
              <View key={f.id} style={styles.friendRow}>
                {f.profile?.avatar_url ? (
                  <Image source={{ uri: f.profile.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarLetter}>
                      {(f.profile?.riot_id ?? f.profile?.username ?? 'S')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName} numberOfLines={1}>
                    {f.profile?.riot_id ?? f.profile?.username ?? 'Player'}
                  </Text>
                  <Text style={styles.friendStatus}>
                    {tab === 'requests' ? '⏳ Pending' : '● Friend'}
                  </Text>
                </View>
                {tab === 'requests' ? (
                  <View style={styles.reqActions}>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => accept(f.id)}>
                      <Text style={{ color: Colors.success, fontWeight: '900', fontSize: 13 }}>✓</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.declineBtn} onPress={() => decline(f.id)}>
                      <Text style={{ color: Colors.error, fontWeight: '900', fontSize: 12 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => remove(f.id)} style={styles.moreBtn}>
                    <Text style={{ color: Colors.textDim, fontSize: 16 }}>···</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </Animated.View>

      {/* Floating tab on the right edge */}
      <TouchableOpacity
        style={[styles.floatTab, { top: insets.top + 120 }]}
        onPress={toggle}
        activeOpacity={0.85}
      >
        <Text style={styles.floatIcon}>👥</Text>
        {pendingCount > 0 && (
          <View style={styles.floatBadge}>
            <Text style={styles.floatBadgeText}>{pendingCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 99,
  },

  panel: {
    position: 'absolute',
    right: 0,
    width: PANEL_W,
    zIndex: 100,
    backgroundColor: 'rgba(10,16,26,0.97)',
    borderLeftWidth: 1,
    borderLeftColor: Colors.accentBorder,
  },

  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accentBorder,
  },
  panelTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, letterSpacing: 1 },
  closeBtn: { padding: 4 },
  closeBtnText: { color: Colors.textMuted, fontSize: 14 },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.accentBorder,
  },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', position: 'relative' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.accent },
  tabText: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.accent },
  tabBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: Colors.accent, borderRadius: 8,
    minWidth: 14, height: 14, paddingHorizontal: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  tabBadgeText: { color: Colors.background, fontSize: 8, fontWeight: '900' },

  list: { padding: Spacing.sm, gap: Spacing.xs, paddingBottom: Spacing.xxl },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl },

  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.sm,
  },
  avatar: { width: 36, height: 36, borderRadius: 6, borderWidth: 1, borderColor: Colors.accentBorder },
  avatarFallback: {
    width: 36, height: 36, borderRadius: 6,
    backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: Colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 14, fontWeight: '800', color: Colors.accent },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 12, fontWeight: '700', color: Colors.text },
  friendStatus: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  reqActions: { flexDirection: 'row', gap: 4 },
  acceptBtn: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: 'rgba(0,255,136,0.12)', borderWidth: 1, borderColor: Colors.success + '55',
    alignItems: 'center', justifyContent: 'center',
  },
  declineBtn: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: 'rgba(255,68,68,0.1)', borderWidth: 1, borderColor: Colors.error + '44',
    alignItems: 'center', justifyContent: 'center',
  },
  moreBtn: { padding: 4 },
  addFriendBtn: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, borderColor: Colors.accent + '66',
    backgroundColor: Colors.accentDim,
  },
  addFriendText: { color: Colors.accent, fontSize: 10, fontWeight: '700' },

  // Floating tab
  floatTab: {
    position: 'absolute',
    right: 0,
    zIndex: 101,
    backgroundColor: 'rgba(10,16,26,0.95)',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: Colors.accentBorder,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 2,
  },
  floatIcon: { fontSize: 18 },
  floatBadge: {
    position: 'absolute',
    top: -4, right: -4,
    backgroundColor: Colors.accent,
    borderRadius: 8,
    minWidth: 16, height: 16,
    paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  floatBadgeText: { color: Colors.background, fontSize: 9, fontWeight: '900' },
});
