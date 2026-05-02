import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useFriends, useRecentPlayers } from '@/hooks/useFriends';
import { useUnreadCounts } from '@/hooks/useChat';
import { useTeamInvites } from '@/hooks/useTeamInvites';
import { useTeam } from '@/hooks/useTeam';
import { StatusDot, UserStatus, STATUS_CONFIG } from '@/components/ui/StatusDot';
import { MiniProfile, MiniProfileUser } from '@/components/ui/MiniProfile';
import { getStatusFromLastSeen } from '@/hooks/usePresence';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Dimensions, Easing, Image,
  RefreshControl, ScrollView, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PANEL_W = 265;

import { supabase } from '@/lib/supabase';

type Props = { userId: string | undefined };

export function FriendsPanel({ userId: userIdProp }: Props) {
  const insets = useSafeAreaInsets();
  const [resolvedUserId, setResolvedUserId] = useState<string | undefined>(userIdProp);

  // Resolve userId ourselves if not provided (dev bypass / web)
  useEffect(() => {
    if (userIdProp) { setResolvedUserId(userIdProp); return; }
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) setResolvedUserId(data.user.id);
    });
  }, [userIdProp]);

  const userId = resolvedUserId;
  const { friends, incoming, loading, accept, decline, remove, sendRequest } = useFriends(userId);
  const { recentPlayers } = useRecentPlayers(userId);
  const { unreadByUser, totalUnread } = useUnreadCounts(userId);
  const { incoming: teamInvites, sendInvite, accept: acceptInvite, decline: declineInvite } = useTeamInvites(userId);
  const { team, members } = useTeam(userId);
  const [open, setOpen] = useState(false);
  const [addingFriend, setAddingFriend] = useState(false);
  const [addRiotId, setAddRiotId] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [tab, setTab] = useState<'friends' | 'recent' | 'requests'>('friends');
  const isCaptain = team?.captain_id === userId;
  const hasTeamSpace = members.length < 5;
  const canInvite = isCaptain && hasTeamSpace;
  const totalNotifs = incoming.length + teamInvites.length;
  const [refreshing, setRefreshing] = useState(false);
  const [miniProfile, setMiniProfile] = useState<MiniProfileUser | null>(null);
  const [miniIsFriend, setMiniIsFriend] = useState(false);
  const slideX = useRef(new Animated.Value(PANEL_W)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;

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

  async function handleAddFriend() {
    if (!addRiotId.trim()) { setAddError('Enter a Riot ID'); return; }
    setAddLoading(true); setAddError(null); setAddSuccess(false);
    const { error } = await sendRequest(addRiotId.trim());
    setAddLoading(false);
    if (error) { setAddError(error); return; }
    setAddSuccess(true);
    setAddRiotId('');
    setTimeout(() => { setAddSuccess(false); setAddingFriend(false); }, 2000);
  }

  function openMiniProfile(user: MiniProfileUser, isFriend: boolean) {
    setMiniIsFriend(isFriend);
    setMiniProfile(user);
  }

  const pendingCount = incoming.length;

  // Sort friends: online first, then in_game, then away, then offline
  const ORDER: Record<string, number> = { in_game: 0, online: 1, away: 2, offline: 3 };
  const sortedFriends = [...friends].sort((a, b) =>
    (ORDER[a.profile?.status ?? 'offline'] ?? 3) - (ORDER[b.profile?.status ?? 'offline'] ?? 3)
  );

  function renderFriendRow(f: any, isFriend: boolean, showActions = false) {
    const profile = f.profile ?? f;
    // Compute status from last_seen for accuracy
    const status = getStatusFromLastSeen(profile.last_seen, profile.status ?? 'offline') as UserStatus;
    const statusCfg = STATUS_CONFIG[status];

    return (
      <TouchableOpacity
        key={f.id}
        style={styles.friendRow}
        onPress={() => openMiniProfile({
          id: profile.id, riot_id: profile.riot_id, username: profile.username,
          avatar_url: profile.avatar_url, status: profile.status, current_game: profile.current_game,
        }, isFriend)}
        activeOpacity={0.75}
      >
        {/* Avatar with status dot overlay */}
        <View>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarLetter}>{(profile.riot_id ?? profile.username ?? 'S')[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.statusOverlay}>
            <StatusDot status={status} size={9} />
          </View>
        </View>

        {/* Name + status */}
        <View style={styles.friendInfo}>
          <Text style={styles.friendName} numberOfLines={1}>{profile.riot_id ?? profile.username}</Text>
          <Text style={[styles.friendStatus, { color: statusCfg.color }]}>
            {status === 'in_game' && profile.current_game
              ? `⚔ ${profile.current_game}`
              : statusCfg.label}
          </Text>
        </View>

        {/* Actions */}
        {showActions ? (
          <View style={styles.reqActions}>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => accept(f.id)}>
              <Text style={{ color: Colors.success, fontWeight: '900', fontSize: 13 }}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineBtn} onPress={() => decline(f.id)}>
              <Text style={{ color: Colors.error, fontWeight: '900', fontSize: 12 }}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : !isFriend ? (
          <TouchableOpacity style={styles.addBtn} onPress={() => profile.riot_id && sendRequest(profile.riot_id)}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.rightBlock}>
            {(unreadByUser[profile.id] ?? 0) > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {unreadByUser[profile.id] > 9 ? '9+' : unreadByUser[profile.id]}
                </Text>
              </View>
            )}
            <View style={[styles.statusPip, { backgroundColor: statusCfg.color + '22', borderColor: statusCfg.color + '55' }]}>
              <Text style={{ fontSize: 9, color: statusCfg.color }}>{statusCfg.icon}</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[styles.backdrop, { opacity: backdropOp }]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={close} />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={[styles.panel, { top: insets.top, bottom: insets.bottom, transform: [{ translateX: slideX }] }]}
        pointerEvents={open ? 'auto' : 'none'}
      >
        {/* Header */}
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Friends</Text>
          <View style={styles.onlineCount}>
            <StatusDot status="online" size={7} />
            <Text style={styles.onlineText}>{friends.filter(f => (f.profile?.status ?? 'offline') !== 'offline').length} online</Text>
          </View>
          <TouchableOpacity onPress={() => { setAddingFriend(true); setAddError(null); setAddSuccess(false); }} style={styles.addFriendBtn}>
            <Text style={styles.addFriendBtnText}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={close} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Inline Add Friend form */}
        {addingFriend && (
          <View style={styles.addForm}>
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                value={addRiotId}
                onChangeText={setAddRiotId}
                placeholder="Riot ID e.g. Name#TAG"
                placeholderTextColor={Colors.textDim}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                onSubmitEditing={handleAddFriend}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.addSendBtn, addLoading && { opacity: 0.5 }]}
                onPress={handleAddFriend}
                disabled={addLoading}
              >
                {addLoading
                  ? <ActivityIndicator color={Colors.background} size="small" />
                  : <Text style={styles.addSendText}>→</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity style={styles.addCancelBtn} onPress={() => { setAddingFriend(false); setAddRiotId(''); setAddError(null); setAddSuccess(false); }}>
                <Text style={styles.addCancelText}>✕</Text>
              </TouchableOpacity>
            </View>
            {addError && <Text style={styles.addError}>{addError}</Text>}
            {addSuccess && <Text style={styles.addSuccess}>✓ Request sent!</Text>}
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          {([['friends', `All (${friends.length})`], ['recent', 'Recent'], ['requests', 'Requests']] as const).map(([t, label]) => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{label}</Text>
              {t === 'requests' && pendingCount > 0 && (
                <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{pendingCount}</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        <ScrollView contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); setRefreshing(false); }} tintColor={Colors.accent} />}>

          {tab === 'friends' && (
            sortedFriends.length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 28, marginBottom: 6 }}>🎮</Text>
                <Text style={[Typography.body, { textAlign: 'center', fontSize: 12 }]}>No friends yet</Text>
              </View>
            ) : sortedFriends.map(f => renderFriendRow(f, true))
          )}

          {tab === 'recent' && (
            recentPlayers.length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 28, marginBottom: 6 }}>⚔️</Text>
                <Text style={[Typography.body, { textAlign: 'center', fontSize: 12 }]}>No recent matches yet</Text>
                <Text style={[Typography.body, { textAlign: 'center', fontSize: 11, marginTop: 4, color: Colors.textDim }]}>Players you face in tournaments appear here</Text>
              </View>
            ) : recentPlayers.map(p => renderFriendRow(
              { id: p.id, profile: p },
              friends.some(f => f.profile?.id === p.id),
            ))
          )}

          {tab === 'requests' && (
            incoming.length === 0 && teamInvites.length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 28, marginBottom: 6 }}>📭</Text>
                <Text style={[Typography.body, { textAlign: 'center', fontSize: 12 }]}>No pending requests</Text>
              </View>
            ) : (
              <>
                {teamInvites.map(inv => (
                  <View key={inv.id} style={styles.inviteRow}>
                    <Text style={{ fontSize: 18 }}>⚔️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName} numberOfLines={1}>
                        {inv.inviter?.riot_id ?? 'Someone'} invited you
                      </Text>
                      <Text style={[styles.friendStatus, { color: Colors.gold }]}>
                        to join {inv.team?.name}
                      </Text>
                    </View>
                    <View style={styles.reqActions}>
                      <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptInvite(inv.id, inv.team_id)}>
                        <Text style={{ color: Colors.success, fontWeight: '900', fontSize: 13 }}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.declineBtn} onPress={() => declineInvite(inv.id)}>
                        <Text style={{ color: Colors.error, fontWeight: '900', fontSize: 12 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                {incoming.map(f => renderFriendRow(f, false, true))}
              </>
            )
          )}

        </ScrollView>
      </Animated.View>

      {/* Floating tab — only visible when panel is closed */}
      {!open && (
        <TouchableOpacity style={[styles.floatTab, { top: insets.top + 120 }]} onPress={toggle} activeOpacity={0.85}>
          <Text style={styles.floatIcon}>👥</Text>
          {(totalNotifs + totalUnread) > 0 && (
            <View style={styles.floatBadge}>
              <Text style={styles.floatBadgeText}>
                {totalNotifs + totalUnread > 99 ? '99+' : totalNotifs + totalUnread}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Mini profile popup */}
      <MiniProfile
        user={miniProfile}
        onClose={() => setMiniProfile(null)}
        isFriend={miniIsFriend}
        canInvite={canInvite}
        onAddFriend={() => miniProfile?.riot_id && sendRequest(miniProfile.riot_id)}
        onRemoveFriend={() => {
          const f = friends.find(f => f.profile?.id === miniProfile?.id);
          if (f) remove(f.id);
        }}
        onInviteToTeam={() => {
          if (team && miniProfile && userId) {
            sendInvite(team.id, miniProfile.id, userId);
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 99 },

  panel: {
    position: 'absolute', right: 0, width: PANEL_W, zIndex: 100,
    backgroundColor: 'rgba(8,14,24,0.98)',
    borderLeftWidth: 1, borderLeftColor: Colors.accentBorder,
  },

  panelHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 4,
    borderBottomWidth: 1, borderBottomColor: Colors.accentBorder,
  },
  panelTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, letterSpacing: 1, flex: 1 },
  onlineCount: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  onlineText: { fontSize: 10, color: Colors.textMuted },
  closeBtn: { padding: 4, marginLeft: 2 },
  closeBtnText: { color: Colors.textMuted, fontSize: 14 },
  addFriendBtn: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: Colors.accent + '66',
    backgroundColor: Colors.accentDim,
  },
  addFriendBtnText: { color: Colors.accent, fontSize: 11, fontWeight: '700' },
  addForm: {
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    borderBottomWidth: 1, borderBottomColor: Colors.accentBorder,
    backgroundColor: 'rgba(0,200,255,0.04)', gap: 4,
  },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addInput: {
    flex: 1, height: 34, backgroundColor: Colors.surfaceAlt,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.accentBorder,
    paddingHorizontal: Spacing.sm, color: Colors.text, fontSize: 12,
  },
  addSendBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  addSendText: { color: Colors.background, fontSize: 14, fontWeight: '900' },
  addCancelBtn: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  addCancelText: { color: Colors.textMuted, fontSize: 12 },
  addError: { color: Colors.error, fontSize: 10, paddingLeft: 2 },
  addSuccess: { color: Colors.success, fontSize: 10, paddingLeft: 2 },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.accentBorder },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', position: 'relative' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.accent },
  tabText: { fontSize: 10, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.accent },
  tabBadge: {
    position: 'absolute', top: 2, right: 2,
    backgroundColor: Colors.accent, borderRadius: 8,
    minWidth: 16, height: 16, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  tabBadgeText: { color: Colors.background, fontSize: 9, fontWeight: '900' },

  list: { padding: Spacing.xs, paddingBottom: 120 },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, paddingHorizontal: Spacing.md },

  friendRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 7, paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
  },

  avatar: { width: 38, height: 38, borderRadius: 7, borderWidth: 1, borderColor: Colors.accentBorder },
  avatarFallback: {
    width: 38, height: 38, borderRadius: 7,
    backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: Colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 15, fontWeight: '800', color: Colors.accent },
  statusOverlay: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: 'rgba(8,14,24,0.9)', borderRadius: 6, padding: 2,
  },

  friendInfo: { flex: 1 },
  friendName: { fontSize: 12, fontWeight: '700', color: Colors.text },
  friendStatus: { fontSize: 10, fontWeight: '600', marginTop: 1 },

  rightBlock: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unreadBadge: {
    backgroundColor: Colors.accent, borderRadius: 8,
    minWidth: 18, height: 18, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadText: { color: Colors.background, fontSize: 10, fontWeight: '900' },
  inviteRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: 7, paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm, backgroundColor: 'rgba(200,155,60,0.06)',
    borderWidth: 1, borderColor: Colors.gold + '33', marginBottom: 4,
  },
  statusPip: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
  },

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

  addBtn: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, borderWidth: 1, borderColor: Colors.accent + '66',
    backgroundColor: Colors.accentDim,
  },
  addBtnText: { color: Colors.accent, fontSize: 10, fontWeight: '700' },

  floatTab: {
    position: 'absolute', right: 0, zIndex: 101,
    backgroundColor: 'rgba(8,14,24,0.95)',
    borderTopLeftRadius: 10, borderBottomLeftRadius: 10,
    borderWidth: 1, borderRightWidth: 0, borderColor: Colors.accentBorder,
    paddingVertical: 10, paddingHorizontal: 8,
    alignItems: 'center', gap: 2,
  },
  floatIcon: { fontSize: 18 },
  floatBadge: {
    position: 'absolute', top: -5, left: -8,
    backgroundColor: Colors.accent, borderRadius: 10,
    minWidth: 18, height: 18, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  floatBadgeText: { color: Colors.background, fontSize: 10, fontWeight: '900' },
});
