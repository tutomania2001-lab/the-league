import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { PulseGlow } from '@/components/ui/PulseGlow';
import { RankBadge } from '@/components/ui/RankBadge';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>();
  const { profile, loading, updateProfile } = useProfile(userId);
  const [editingRiotId, setEditingRiotId] = useState(false);
  const [riotId, setRiotId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

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
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/profile/icon-picker')} activeOpacity={0.8}>
            <View style={styles.avatar}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarText}>
                  {(profile?.username ?? 'S')[0].toUpperCase()}
                </Text>
              )}
              <View style={styles.editBadge}>
                <Text style={{ fontSize: 10 }}>✏️</Text>
              </View>
            </View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <PulseGlow duration={3000} minOpacity={0.8}>
              <GlowText style={Typography.heading}>{profile?.riot_id ?? profile?.username ?? 'Summoner'}</GlowText>
            </PulseGlow>
            <View style={{ marginTop: Spacing.xs }}>
              <RankBadge wins={0} size="sm" />
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
            <RankBadge wins={0} size="lg" showProgress />
          </View>
        </Card>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Entered', value: '0' },
            { label: 'Wins', value: '0' },
            { label: 'Earnings', value: '$0' },
          ].map(s => (
            <Card key={s.label} style={styles.statCard}>
              <GlowText style={styles.statValue}>{s.value}</GlowText>
              <Text style={Typography.label}>{s.label}</Text>
            </Card>
          ))}
        </View>

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

        {/* KYC */}
        <Card>
          <Text style={Typography.label}>Verification Status</Text>
          <View style={{ marginTop: Spacing.sm }}>
            <Badge variant={profile?.kyc_verified ? 'active' : 'open'} />
          </View>
          {!profile?.kyc_verified && (
            <Text style={[Typography.body, { marginTop: Spacing.sm }]}>
              Identity verification required before withdrawing winnings.
            </Text>
          )}
        </Card>

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
});
