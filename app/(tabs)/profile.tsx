import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { PulseGlow } from '@/components/ui/PulseGlow';
import { DefaultAvatar } from '@/components/ui/DefaultAvatar';
import { RankBadge } from '@/components/ui/RankBadge';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { useFriends } from '@/hooks/useFriends';
import { useTeam } from '@/hooks/useTeam';
import { usePlayerStats } from '@/hooks/usePlayerStats';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { ActivityIndicator, Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>();
  const [userEmail, setUserEmail] = useState<string>();
  const [emailVerified, setEmailVerified] = useState(false);
  const { profile, loading, updateProfile, refreshProfile } = useProfile(userId);
  const { friends, incoming } = useFriends(userId);
  const { team, members } = useTeam(userId);
  const { stats } = usePlayerStats(userId);
  const [editingRiotId, setEditingRiotId] = useState(false);
  const [riotId, setRiotId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshProfile();
    // Re-check email verification status
    const { data } = await supabase.auth.getUser();
    if (data.user) setEmailVerified(!!data.user.email_confirmed_at);
    setRefreshing(false);
  }, [refreshProfile]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id);
      setUserEmail(data.user?.email);
      setEmailVerified(!!data.user?.email_confirmed_at);
    });
  }, []);

  async function handleResendVerification() {
    if (!userEmail) return;
    setResendingEmail(true);
    await supabase.auth.resend({ type: 'signup', email: userEmail });
    setResendingEmail(false);
    setResendDone(true);
    setTimeout(() => setResendDone(false), 5000);
  }

  useEffect(() => {
    if (profile?.riot_id) setRiotId(profile.riot_id);
  }, [profile]);

  async function handleSaveRiotId() {
    setSaving(true);
    await updateProfile({ riot_id: riotId.trim() });
    setSaving(false);
    setSaved(true);
    setEditingRiotId(false);
    setTimeout(() => setSaved(false), 2000);
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
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
      >

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/profile/icon-picker')} activeOpacity={0.8}>
            <View style={styles.avatar}>
              {profile?.avatar_url
                ? <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
                : <DefaultAvatar size={60} />
              }
              <View style={styles.editBadge}>
                <Text style={{ fontSize: 10 }}>✏️</Text>
              </View>
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <PulseGlow duration={3000} minOpacity={0.8}>
              <GlowText style={Typography.heading}>
                {profile?.riot_id ?? profile?.username ?? 'Summoner'}
              </GlowText>
            </PulseGlow>
            <Text style={{ fontSize: 12, fontWeight: '700', color: team ? Colors.gold : Colors.textMuted, marginTop: 2 }}>
              ⚔️ {team
                ? `${team.clan_tag ? `[${team.clan_tag.toUpperCase()}] ` : ''}${team.name}`
                : '#TEAM'}
            </Text>
            <View style={{ marginTop: Spacing.xs }}>
              <RankBadge lp={profile?.lp ?? 0} peakLP={profile?.peak_lp ?? 0} size="sm" />
            </View>
          </View>
        </View>

        {/* Wallet */}
        <Card glow>
          <Text style={Typography.label}>Wallet Balance</Text>
          <GlowText style={styles.balance}>${profile?.wallet_balance?.toFixed(2) ?? '0.00'}</GlowText>
          <Button
            label="💰 Top Up Wallet"
            variant="secondary"
            onPress={() => router.push('/wallet/top-up')}
            style={{ marginTop: Spacing.md }}
          />
        </Card>

        {/* Rank card */}
        <Card>
          <Text style={Typography.label}>Ranked Standing</Text>
          <View style={{ marginTop: Spacing.sm }}>
            <RankBadge lp={2465} peakLP={3600} size="lg" showProgress />
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

        {/* Friends */}
        <TouchableOpacity onPress={() => router.push('/profile/friends')} activeOpacity={0.8}>
          <Card style={styles.friendsRow}>
            <Text style={{ fontSize: 20 }}>👥</Text>
            <View style={{ flex: 1 }}>
              <Text style={[Typography.subheading, { fontSize: 14 }]}>Friends</Text>
              <Text style={[Typography.body, { fontSize: 11, marginTop: 2 }]}>
                {friends.length} friend{friends.length !== 1 ? 's' : ''}
              </Text>
            </View>
            {incoming.length > 0 && (
              <View style={styles.requestBadge}>
                <Text style={styles.requestBadgeText}>{incoming.length}</Text>
              </View>
            )}
            <Text style={{ color: Colors.textMuted, fontSize: 18 }}>›</Text>
          </Card>
        </TouchableOpacity>

        {/* Riot ID */}
        <Card>
          <View style={styles.row}>
            <Text style={Typography.label}>Riot ID</Text>
            {!editingRiotId && (
              <TouchableOpacity onPress={() => setEditingRiotId(true)}>
                <Text style={[Typography.body, { color: Colors.accent }]}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          {editingRiotId ? (

            <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
              <Input
                value={riotId}
                onChangeText={setRiotId}
                placeholder="Name#TAG"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.row}>
                <Button label="Save" onPress={handleSaveRiotId} loading={saving} style={{ flex: 1 }} />
                <Button label="Cancel" variant="ghost" onPress={() => setEditingRiotId(false)} style={{ flex: 1 }} />
              </View>
            </View>
          ) : (
            <Text style={[Typography.subheading, { marginTop: Spacing.xs, color: Colors.text }]}>
              {profile?.riot_id ?? 'Not set'}
            </Text>
          )}
          {saved && <Text style={{ color: Colors.success, fontSize: 12, marginTop: Spacing.xs }}>✓ Saved</Text>}
        </Card>

        {/* Email verification */}
        <Card style={!emailVerified ? { borderColor: Colors.warning + '66' } : {}}>
          <View style={styles.row}>
            <Text style={Typography.label}>Email Verification</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {emailVerified
                ? <Text style={{ color: Colors.success, fontSize: 12, fontWeight: '700' }}>✓ Verified</Text>
                : <Text style={{ color: Colors.warning, fontSize: 12, fontWeight: '700' }}>⚠ Unverified</Text>
              }
            </View>
          </View>
          <Text style={[Typography.body, { marginTop: Spacing.xs, fontSize: 12, color: Colors.textMuted }]}>
            {userEmail}
          </Text>
          {!emailVerified && (
            <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
              <Text style={[Typography.body, { fontSize: 12 }]}>
                Your email is not verified. Check your inbox or resend the verification link.
              </Text>
              {resendDone ? (
                <Text style={{ color: Colors.success, fontSize: 12, fontWeight: '600' }}>
                  ✓ Verification email sent — check your inbox
                </Text>
              ) : (
                <Button
                  label="Resend Verification Email"
                  variant="secondary"
                  onPress={handleResendVerification}
                  loading={resendingEmail}
                  style={{ borderColor: Colors.warning + '88' }}
                />
              )}
            </View>
          )}
        </Card>

        {/* KYC */}
        <Card>
          <Text style={Typography.label}>Identity Verification</Text>
          <View style={{ marginTop: Spacing.sm }}>
            <Badge variant={profile?.kyc_verified ? 'active' : 'open'} />
          </View>
          {!profile?.kyc_verified && (
            <Text style={[Typography.body, { marginTop: Spacing.sm, fontSize: 12 }]}>
              Required before withdrawing winnings. Powered by Stripe Identity.
            </Text>
          )}
        </Card>

        {/* Clan */}
        {team ? (
          <TouchableOpacity onPress={() => router.push('/(tabs)/team')} activeOpacity={0.85}>
            <Card style={styles.clanCard}>
              <View style={styles.clanRow}>
                <View style={styles.clanIcon}>
                  <Text style={{ fontSize: 22 }}>⚔️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.clanName}>{team.name}</Text>
                  <Text style={styles.clanMeta}>
                    {team.captain_id === userId ? '👑 Captain' : '🎮 Member'} · {members.length}/10 players
                  </Text>
                </View>
                <View style={styles.clanStats}>
                  <Text style={styles.clanWins}>{(team as any).wins ?? 0}</Text>
                  <Text style={styles.clanWinsLabel}>WINS</Text>
                </View>
                <Text style={{ color: Colors.gold, fontSize: 18, marginLeft: 4 }}>›</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.push('/(tabs)/team')} activeOpacity={0.85}>
            <Card style={[styles.clanCard, { borderStyle: 'dashed', opacity: 0.6 }]}>
              <View style={styles.clanRow}>
                <Text style={{ fontSize: 22 }}>⚔️</Text>
                <Text style={[Typography.body, { flex: 1 }]}>No clan — create or join one</Text>
                <Text style={{ color: Colors.gold, fontSize: 18 }}>›</Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Settings */}
        <Button
          label="⚙️ Settings"
          variant="secondary"
          onPress={() => router.push('/profile/settings')}
        />
        <Button
          label="Log Out"
          variant="ghost"
          onPress={() => supabase.auth.signOut()}
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  clanCard: { borderColor: Colors.gold + '55' },
  clanRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  clanIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(200,155,60,0.15)', borderWidth: 1, borderColor: Colors.gold + '44', alignItems: 'center', justifyContent: 'center' },
  clanName: { fontSize: 15, fontWeight: '800', color: Colors.gold },
  clanMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  clanStats: { alignItems: 'center' },
  clanWins: { fontSize: 20, fontWeight: '900', color: Colors.gold, textShadowColor: Colors.gold, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 6 },
  clanWinsLabel: { fontSize: 7, fontWeight: '700', color: Colors.gold + '88', letterSpacing: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 64, height: 64, borderRadius: 10,
    backgroundColor: Colors.accentDim,
    borderWidth: 2, borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 64, height: 64, borderRadius: 8 },
  avatarText: { fontSize: 26, fontWeight: '800', color: Colors.accent },
  editBadge: {
    position: 'absolute', bottom: -4, right: -4,
    backgroundColor: Colors.surface, borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.accentBorder,
  },
  balance: { fontSize: 36, fontWeight: '900', marginTop: Spacing.xs },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, alignItems: 'center', gap: 4, padding: Spacing.sm },
  statValue: { fontSize: 20, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  friendsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  requestBadge: {
    backgroundColor: Colors.accent, borderRadius: 10,
    minWidth: 20, height: 20, paddingHorizontal: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  requestBadgeText: { color: Colors.background, fontSize: 11, fontWeight: '800' },
});
