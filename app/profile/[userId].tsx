import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { RankBadge } from '@/components/ui/RankBadge';
import { StatusDot } from '@/components/ui/StatusDot';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { withClanTag } from '@/lib/clanTag';
import { useProfile } from '@/hooks/useProfile';
import { useFriends } from '@/hooks/useFriends';
import { usePlayerStats } from '@/hooks/usePlayerStats';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PlayerProfileScreen() {
  const { userId: targetId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const [myId, setMyId] = useState<string>();
  const { profile, loading } = useProfile(targetId);
  const { friends, incoming, outgoing, sendRequest, remove } = useFriends(myId);
  const { stats } = usePlayerStats(targetId);
  const [team, setTeam] = useState<{ name: string; clan_tag: string | null } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id));
  }, []);

  useEffect(() => {
    if (!targetId) return;
    supabase
      .from('team_members')
      .select('team:teams(name, clan_tag)')
      .eq('user_id', targetId)
      .eq('status', 'active')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.team) setTeam(data.team as any);
      });
  }, [targetId]);

  const isMe = myId === targetId;
  const friendEntry = friends.find(f => f.profile.id === targetId);
  const isFriend = !!friendEntry;
  const isPending = outgoing.some(f => f.profile.id === targetId) || incoming.some(f => f.profile.id === targetId);

  const displayName = withClanTag(profile?.riot_id ?? profile?.username ?? 'Player', (profile as any)?.clan_tag ?? team?.clan_tag);

  async function handleFriendAction() {
    setActionLoading(true);
    if (isFriend && friendEntry) {
      await remove(friendEntry.id);
    } else if (!isPending && profile?.riot_id) {
      await sendRequest(profile.riot_id);
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.accent} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Avatar + name */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            {profile?.avatar_url
              ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
              : <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarLetter}>{displayName[0].toUpperCase()}</Text>
                </View>
            }
            <View style={styles.statusDot}>
              <StatusDot status={profile?.status ?? 'offline'} size={10} />
            </View>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <GlowText style={styles.displayName}>{displayName}</GlowText>
            {team && (
              <Text style={styles.teamLabel}>
                ⚔️ {team.clan_tag ? `[${team.clan_tag.toUpperCase()}] ` : ''}{team.name}
              </Text>
            )}
            <RankBadge lp={profile?.lp ?? 0} peakLP={profile?.peak_lp ?? 0} size="sm" />
          </View>
        </View>

        {/* Actions — only show if viewing someone else */}
        {!isMe && (
          <View style={styles.actions}>
            <Button
              label={actionLoading ? '...' : isFriend ? '✓ Friends' : isPending ? 'Pending...' : '+ Add Friend'}
              variant={isFriend ? 'ghost' : 'primary'}
              onPress={handleFriendAction}
              loading={actionLoading}
              style={{ flex: 1 }}
            />
            <Button
              label="💬 Message"
              variant="secondary"
              onPress={() => router.push(`/chat/${targetId}`)}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {/* Riot ID */}
        <Card>
          <Text style={Typography.label}>Riot ID</Text>
          <Text style={[Typography.subheading, { marginTop: Spacing.xs, color: Colors.text }]}>
            {profile?.riot_id ?? 'Not set'}
          </Text>
        </Card>

        {/* Rank */}
        <Card>
          <Text style={Typography.label}>Ranked Standing</Text>
          <View style={{ marginTop: Spacing.sm }}>
            <RankBadge lp={profile?.lp ?? 0} peakLP={profile?.peak_lp ?? 0} size="lg" showProgress />
          </View>
        </Card>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Entered', value: String(stats.tournamentsEntered) },
            { label: 'Wins', value: String(stats.wins) },
            { label: 'Earnings', value: `£${stats.earnings.toFixed(0)}` },
          ].map(s => (
            <Card key={s.label} style={styles.statCard}>
              <GlowText style={styles.statValue}>{s.value}</GlowText>
              <Text style={Typography.label}>{s.label}</Text>
            </Card>
          ))}
        </View>

        {/* KYC */}
        <Card>
          <Text style={Typography.label}>Identity Verification</Text>
          <View style={{ marginTop: Spacing.sm }}>
            <Badge variant={profile?.kyc_verified ? 'active' : 'open'} />
          </View>
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.accentBorder,
  },
  backText: { color: Colors.accent, fontSize: 15, fontWeight: '600' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: 60 },

  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatarWrap: { position: 'relative' },
  avatar: { width: 72, height: 72, borderRadius: 12, borderWidth: 2, borderColor: Colors.accent },
  avatarFallback: { backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 28, fontWeight: '900', color: Colors.accent },
  statusDot: { position: 'absolute', bottom: -3, right: -3, backgroundColor: Colors.surface, borderRadius: 8, padding: 2 },
  displayName: { fontSize: 20, fontWeight: '900' },
  teamLabel: { fontSize: 12, color: Colors.gold, fontWeight: '700' },

  actions: { flexDirection: 'row', gap: Spacing.sm },

  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, alignItems: 'center', gap: 4, padding: Spacing.sm },
  statValue: { fontSize: 20, fontWeight: '800' },
});
