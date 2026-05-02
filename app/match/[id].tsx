import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { PulseGlow } from '@/components/ui/PulseGlow';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useMatch } from '@/hooks/useMatch';
import { supabase } from '@/lib/supabase';
import { TeamRow } from '@/types/database';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const roundLabel: Record<number, string> = { 1: 'Quarter-Final', 2: 'Semi-Final', 3: '⚔️ GRAND FINAL' };

export default function LiveMatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { match, loading } = useMatch(id);
  const [teamA, setTeamA] = useState<TeamRow | null>(null);
  const [teamB, setTeamB] = useState<TeamRow | null>(null);

  useEffect(() => {
    if (!match) return;
    const ids = [match.team_a_id, match.team_b_id].filter(Boolean) as string[];
    if (!ids.length) return;
    supabase.from('teams').select('*').in('id', ids).then(({ data }) => {
      if (!data) return;
      setTeamA(data.find(t => t.id === match.team_a_id) ?? null);
      setTeamB(data.find(t => t.id === match.team_b_id) ?? null);
    });
  }, [match?.team_a_id, match?.team_b_id]);

  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator color={Colors.accent} style={{ flex: 1 }} /></SafeAreaView>;
  if (!match) return <SafeAreaView style={styles.safe}><Text style={[Typography.body, { padding: Spacing.lg }]}>Match not found</Text></SafeAreaView>;

  const isLive = match.status === 'live';
  const isCompleted = match.status === 'completed';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Round label */}
        <View style={styles.roundRow}>
          <Text style={[Typography.label, { color: Colors.gold }]}>{roundLabel[match.round] ?? `Round ${match.round}`}</Text>
          <Badge variant={isLive ? 'live' : isCompleted ? 'completed' : 'open'} />
        </View>

        {/* Scoreboard */}
        <Card glow={isLive} style={styles.scoreCard}>
          {/* Team A */}
          <View style={[styles.team, match.winner_id === match.team_a_id && styles.winnerTeam]}>
            <Text style={styles.teamEmoji}>🛡️</Text>
            <Text style={[styles.teamName, match.winner_id === match.team_a_id && { color: Colors.accent }]}>
              {teamA?.name ?? 'TBD'}
            </Text>
            {match.winner_id === match.team_a_id && (
              <Text style={styles.winnerTag}>WINNER 🏆</Text>
            )}
          </View>

          {/* Score */}
          <View style={styles.scoreBlock}>
            {isLive ? (
              <PulseGlow duration={1500} minOpacity={0.6}>
                <GlowText style={styles.score}>{match.score_a} – {match.score_b}</GlowText>
              </PulseGlow>
            ) : (
              <GlowText style={styles.score}>
                {match.status === 'scheduled' ? '– –' : `${match.score_a} – ${match.score_b}`}
              </GlowText>
            )}
            <Text style={[Typography.label, { marginTop: 4 }]}>Best of 1</Text>
          </View>

          {/* Team B */}
          <View style={[styles.team, styles.teamRight, match.winner_id === match.team_b_id && styles.winnerTeam]}>
            <Text style={styles.teamEmoji}>⚔️</Text>
            <Text style={[styles.teamName, match.winner_id === match.team_b_id && { color: Colors.accent }]}>
              {teamB?.name ?? 'TBD'}
            </Text>
            {match.winner_id === match.team_b_id && (
              <Text style={styles.winnerTag}>WINNER 🏆</Text>
            )}
          </View>
        </Card>

        {/* Status info */}
        {isLive && (
          <Card style={[styles.infoCard, { borderColor: Colors.live + '55' }]}>
            <PulseGlow duration={1000} minOpacity={0.5}>
              <Text style={[Typography.subheading, { color: Colors.live }]}>● LIVE</Text>
            </PulseGlow>
            <Text style={[Typography.body, { marginTop: Spacing.xs }]}>
              Scores update automatically every 60 seconds via the Riot API.
            </Text>
          </Card>
        )}

        {isCompleted && (
          <Card style={[styles.infoCard, { borderColor: Colors.success + '55' }]}>
            <Text style={[Typography.subheading, { color: Colors.success }]}>✓ Match Complete</Text>
            <Text style={[Typography.body, { marginTop: Spacing.xs }]}>
              Results recorded. Prize pool has been distributed to the winning team's wallets.
            </Text>
          </Card>
        )}

        {match.wildrift_lobby_code && match.status === 'scheduled' && (
          <Card>
            <Text style={Typography.label}>Lobby Details</Text>
            <Text style={[Typography.mono, { marginTop: 4, fontSize: 16, letterSpacing: 3 }]}>
              {match.wildrift_lobby_code}
            </Text>
            {match.wildrift_lobby_password && (
              <Text style={[Typography.body, { marginTop: 4 }]}>
                Password: <Text style={{ color: Colors.accent }}>{match.wildrift_lobby_password}</Text>
              </Text>
            )}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  roundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreCard: { gap: Spacing.md, alignItems: 'center' },
  team: { alignItems: 'center', gap: 4, width: '35%' },
  teamRight: { alignItems: 'center' },
  winnerTeam: {},
  teamEmoji: { fontSize: 36 },
  teamName: { ...Typography.subheading, color: Colors.text, textAlign: 'center', fontSize: 13 },
  winnerTag: { fontSize: 10, color: Colors.gold, fontWeight: '800' },
  scoreBlock: { alignItems: 'center' },
  score: { fontSize: 42, fontWeight: '900', letterSpacing: 2 },
  infoCard: { gap: Spacing.xs },
});
