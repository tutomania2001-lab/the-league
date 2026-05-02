import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { MatchRow, MatchStatus, TeamRow } from '@/types/database';
import { StyleSheet, Text, View } from 'react-native';

const statusVariant: Record<MatchStatus, 'live' | 'open' | 'active' | 'completed'> = {
  scheduled: 'open', live: 'live', completed: 'completed',
};

const roundLabel: Record<number, string> = { 1: 'Quarter-Final', 2: 'Semi-Final', 3: '⚔️ Grand Final' };

type Props = { match: MatchRow; teamA: TeamRow | null; teamB: TeamRow | null };

export function MatchCard({ match, teamA, teamB }: Props) {
  return (
    <Card style={styles.card} glow={match.status === 'live'}>
      <View style={styles.header}>
        <Text style={[Typography.label, { color: Colors.accent }]}>{roundLabel[match.round] ?? `Round ${match.round}`}</Text>
        <Badge variant={statusVariant[match.status]} />
      </View>
      <View style={styles.row}>
        <View style={styles.team}>
          <Text style={styles.teamName}>{teamA?.name ?? 'TBD'}</Text>
          {match.winner_id === match.team_a_id && match.winner_id && (
            <Text style={styles.winTag}>WINNER 🏆</Text>
          )}
        </View>
        <GlowText style={styles.score}>{match.score_a} – {match.score_b}</GlowText>
        <View style={[styles.team, { alignItems: 'flex-end' }]}>
          <Text style={styles.teamName}>{teamB?.name ?? 'TBD'}</Text>
          {match.winner_id === match.team_b_id && match.winner_id && (
            <Text style={styles.winTag}>WINNER 🏆</Text>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  team: { flex: 1, gap: 2 },
  teamName: { ...Typography.subheading, color: Colors.text, fontSize: 13 },
  winTag: { fontSize: 9, color: Colors.gold, fontWeight: '700' },
  score: { fontSize: 22, fontWeight: '900', marginHorizontal: Spacing.sm },
});
