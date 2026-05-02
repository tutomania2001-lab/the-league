import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TeamScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>();
  const { team, members, loading, createTeam, leaveTeam } = useTeam(userId);
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  useEffect(() => {
    if (!members.length) return;
    supabase.from('users').select('id, riot_id, username').in('id', members.map(m => m.user_id))
      .then(({ data }) => {
        if (data) setMemberProfiles(Object.fromEntries(data.map(u => [u.id, u.riot_id ?? u.username ?? 'Unknown'])));
      });
  }, [members]);

  async function handleCreate() {
    if (!teamName.trim()) { setError('Team name is required'); return; }
    setCreating(true);
    const { error } = await createTeam(teamName.trim());
    if (error) setError(error);
    setCreating(false);
  }

  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator color={Colors.accent} style={{ flex: 1 }} /></SafeAreaView>;

  if (!team) return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <GlowText style={Typography.title}>⚔️ My Team</GlowText>
        <Text style={[Typography.body, { marginTop: Spacing.xs }]}>You're not on a team yet.</Text>

        <Card style={{ gap: Spacing.md, marginTop: Spacing.lg }}>
          <Text style={Typography.label}>Create a Team</Text>
          <Input placeholder="Team Name" value={teamName} onChangeText={setTeamName} />
          {error && <Text style={{ color: Colors.error, fontSize: 12 }}>{error}</Text>}
          <Button label="Create Team" onPress={handleCreate} loading={creating} />
        </Card>

        <Card style={{ gap: Spacing.sm, marginTop: Spacing.md }}>
          <Text style={Typography.label}>Already have an invite code?</Text>
          <Button label="Join with Invite Code" variant="secondary" onPress={() => router.push('/team/invite')} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );

  const isCaptain = team.captain_id === userId;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <GlowText style={Typography.title}>{team.name}</GlowText>
        <Text style={[Typography.body, { marginTop: 2 }]}>{members.length}/5 players{isCaptain ? ' · Captain' : ''}</Text>

        {/* Invite code */}
        <Card glow style={{ gap: Spacing.xs }}>
          <Text style={Typography.label}>Invite Code</Text>
          <GlowText style={[Typography.title, { letterSpacing: 6 }]}>{team.invite_code}</GlowText>
          <Text style={Typography.body}>Share with teammates to join your team</Text>
        </Card>

        {/* Members */}
        <View style={{ gap: Spacing.xs }}>
          <Text style={Typography.label}>Roster ({members.length}/5)</Text>
          {members.map(m => (
            <Card key={m.user_id} style={styles.memberRow}>
              <Text style={{ fontSize: 20 }}>🎮</Text>
              <Text style={[Typography.subheading, { flex: 1 }]}>{memberProfiles[m.user_id] ?? '...'}</Text>
              {m.user_id === team.captain_id && (
                <Text style={[Typography.label, { color: Colors.gold }]}>CAPTAIN</Text>
              )}
            </Card>
          ))}
          {members.length < 5 && (
            <Card style={[styles.memberRow, { borderStyle: 'dashed', opacity: 0.5 }]}>
              <Text style={{ fontSize: 20 }}>➕</Text>
              <Text style={Typography.body}>Waiting for player...</Text>
            </Card>
          )}
        </View>

        <Button label="📨 Invite / Join" variant="secondary" onPress={() => router.push('/team/invite')} />
        <Button label="Leave Team" variant="ghost" onPress={leaveTeam} style={{ borderColor: Colors.error + '44' }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm },
});
