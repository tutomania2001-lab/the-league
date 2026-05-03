import { GlowText } from '@/components/ui/GlowText';
import { DefaultAvatar } from '@/components/ui/DefaultAvatar';
import { StatusDot, STATUS_CONFIG, UserStatus } from '@/components/ui/StatusDot';
import { openMiniChat } from '@/lib/miniChat';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { getRankFromLP, getRankLabel } from '@/constants/ranks';
import { useRouter } from 'expo-router';
import { Animated, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useEffect, useRef } from 'react';

export type MiniProfileUser = {
  id: string;
  riot_id: string | null;
  username: string;
  avatar_url: string | null;
  wallet_balance?: number;
  status?: UserStatus;
  current_game?: string | null;
  kyc_verified?: boolean;
};

type Props = {
  user: MiniProfileUser | null;
  onClose: () => void;
  onAddFriend?: () => void;
  isFriend?: boolean;
  onRemoveFriend?: () => void;
  onInviteToTeam?: () => void;
  canInvite?: boolean;
};

export function MiniProfile({ user, onClose, onAddFriend, isFriend, onRemoveFriend, onInviteToTeam, canInvite }: Props) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 70, friction: 8 }),
        Animated.timing(opAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opAnim.setValue(0);
    }
  }, [user]);

  if (!user) return null;

  const status = (user.status ?? 'offline') as UserStatus;
  const statusCfg = STATUS_CONFIG[status];
  const rank = getRankFromLP(0);
  const rankLabel = getRankLabel(0);

  return (
    <Modal transparent visible={!!user} animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      <Animated.View style={[styles.card, { opacity: opAnim, transform: [{ scale: scaleAnim }] }]}>
        {/* Header — avatar + name + status */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { onClose(); router.push(`/profile/${user!.id}`); }} activeOpacity={0.75}>
            {user.avatar_url
              ? <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
              : <DefaultAvatar size={48} />
            }
          </TouchableOpacity>

          {/* Status dot overlay on avatar */}
          <View style={styles.statusDotWrap}>
            <StatusDot status={status} size={12} />
          </View>

          <TouchableOpacity style={styles.nameBlock} onPress={() => { onClose(); router.push(`/profile/${user!.id}`); }} activeOpacity={0.75}>
            <GlowText style={styles.name} intensity="low">{user.riot_id ?? user.username}</GlowText>
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, { color: statusCfg.color }]}>
                {statusCfg.label}
                {status === 'in_game' && user.current_game ? ` · ${user.current_game}` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Rank */}
        <View style={[styles.rankRow, { borderColor: rank.color + '44' }]}>
          <Image source={{ uri: rank.icon }} style={styles.rankIcon} resizeMode="contain" />
          <View>
            <Text style={[styles.rankLabel, { color: rank.color }]}>{rankLabel}</Text>
            <Text style={styles.rankSub}>Current Season</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Action buttons */}
        <View style={styles.actions}>
          {/* Message — only for friends */}
          {isFriend && (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={[styles.btnPrimary, { flex: 1 }]}
                onPress={() => {
                  onClose();
                  router.push({
                    pathname: `/chat/${user!.id}`,
                    params: {
                      name: user!.riot_id ?? user!.username,
                      avatar: user!.avatar_url ?? '',
                      status: user!.status ?? 'offline',
                    },
                  });
                }}
              >
                <Text style={styles.btnPrimaryText}>💬 Message</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnPopOut}
                onPress={() => {
                  openMiniChat({ id: user!.id, name: user!.riot_id ?? user!.username ?? 'Player', avatarUrl: user!.avatar_url });
                  onClose();
                }}
              >
                <Text style={styles.btnPopOutText}>⧉</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Invite to team */}
          {isFriend && canInvite && onInviteToTeam && (
            <TouchableOpacity style={styles.btnInvite} onPress={() => { onInviteToTeam(); onClose(); }}>
              <Text style={styles.btnInviteText}>⚔️ Invite to Team</Text>
            </TouchableOpacity>
          )}

          {/* Add friend */}
          {!isFriend && onAddFriend && (
            <TouchableOpacity style={styles.btnPrimary} onPress={() => { onAddFriend(); onClose(); }}>
              <Text style={styles.btnPrimaryText}>+ Add Friend</Text>
            </TouchableOpacity>
          )}

          {/* Remove friend */}
          {isFriend && (
            <TouchableOpacity style={styles.btnDanger} onPress={() => { onRemoveFriend?.(); onClose(); }}>
              <Text style={styles.btnDangerText}>Remove Friend</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.btnClose} onPress={onClose}>
            <Text style={styles.btnCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  card: {
    position: 'absolute',
    alignSelf: 'center',
    left: '10%',
    right: '10%',
    top: '25%',
    width: undefined,
    backgroundColor: 'rgba(10,16,28,0.98)',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    overflow: 'hidden',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, padding: Spacing.md,
    backgroundColor: 'rgba(0,200,255,0.04)',
  },
  avatar: { width: 48, height: 48, borderRadius: 8, borderWidth: 1, borderColor: Colors.accentBorder },
  avatarFallback: {
    width: 48, height: 48, borderRadius: 8,
    backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: Colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 20, fontWeight: '900', color: Colors.accent },
  statusDotWrap: {
    position: 'absolute', left: Spacing.md + 36, top: Spacing.md + 34,
    backgroundColor: 'rgba(10,16,28,0.9)', borderRadius: 8, padding: 2,
  },
  nameBlock: { flex: 1 },
  name: { fontSize: 14, fontWeight: '800', color: Colors.text },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusLabel: { fontSize: 11, fontWeight: '600' },

  rankRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.md, marginBottom: Spacing.sm,
    padding: Spacing.sm, borderRadius: Radius.md, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  rankIcon: { width: 32, height: 32 },
  rankLabel: { fontSize: 13, fontWeight: '800' },
  rankSub: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },

  divider: { height: 1, backgroundColor: Colors.accentBorder, marginBottom: Spacing.sm },

  actions: { gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  btnPrimary: {
    backgroundColor: Colors.accent, borderRadius: 6,
    paddingVertical: 9, alignItems: 'center',
  },
  btnPrimaryText: { color: Colors.background, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  btnInvite: {
    borderRadius: 6, paddingVertical: 9, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.gold + '88', backgroundColor: 'rgba(200,155,60,0.1)',
  },
  btnInviteText: { color: Colors.gold, fontWeight: '700', fontSize: 12 },
  btnDanger: {
    borderRadius: 6, paddingVertical: 9, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.error + '44', backgroundColor: 'rgba(255,68,68,0.06)',
  },
  btnDangerText: { color: Colors.error, fontWeight: '600', fontSize: 11 },
  btnClose: {
    borderRadius: 6, paddingVertical: 8, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.accentBorder,
  },
  btnCloseText: { color: Colors.textMuted, fontSize: 12 },
  btnPopOut: {
    width: 38, borderRadius: 6, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,200,255,0.1)', borderWidth: 1, borderColor: Colors.accent + '55',
  },
  btnPopOutText: { color: Colors.accent, fontSize: 16, fontWeight: '700' },
});
