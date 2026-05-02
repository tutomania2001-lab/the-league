import { Colors, Spacing, Typography } from '@/constants/theme';
import { MatchRow, TeamRow } from '@/types/database';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = { matches: MatchRow[]; teams: Record<string, TeamRow> };

function MatchBox({ match, teams }: { match: MatchRow; teams: Record<string, TeamRow> }) {
  const nameA = match.team_a_id ? teams[match.team_a_id]?.name ?? 'TBD' : 'TBD';
  const nameB = match.team_b_id ? teams[match.team_b_id]?.name ?? 'TBD' : 'TBD';
  const isLive = match.status === 'live';
  const winA = match.winner_id === match.team_a_id && !!match.winner_id;
  const winB = match.winner_id === match.team_b_id && !!match.winner_id;

  return (
    <View style={[styles.box, isLive && styles.boxLive]}>
      <View style={[styles.boxRow, winA && styles.winRow]}>
        <Text style={[styles.boxName, winA && { color: Colors.accent }]} numberOfLines={1}>{nameA}</Text>
        {match.status !== 'scheduled' && <Text style={[styles.boxScore, winA && { color: Colors.accent }]}>{match.score_a}</Text>}
      </View>
      <View style={styles.divider} />
      <View style={[styles.boxRow, winB && styles.winRow]}>
        <Text style={[styles.boxName, winB && { color: Colors.accent }]} numberOfLines={1}>{nameB}</Text>
        {match.status !== 'scheduled' && <Text style={[styles.boxScore, winB && { color: Colors.accent }]}>{match.score_b}</Text>}
      </View>
    </View>
  );
}

export function BracketView({ matches, teams }: Props) {
  const qf = matches.filter(m => m.round === 1);
  const sf = matches.filter(m => m.round === 2);
  const fin = matches.filter(m => m.round === 3);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      <View style={styles.round}>
        <Text style={styles.roundLabel}>QUARTER-FINALS</Text>
        <View style={styles.matches}>
          {qf.length > 0 ? qf.map(m => <MatchBox key={m.id} match={m} teams={teams} />) : (
            <View style={styles.emptyBox}><Text style={styles.emptyText}>Waiting for teams</Text></View>
          )}
        </View>
      </View>
      <View style={styles.connector} />
      <View style={styles.round}>
        <Text style={styles.roundLabel}>SEMI-FINALS</Text>
        <View style={[styles.matches, { justifyContent: 'space-around' }]}>
          {sf.length > 0 ? sf.map(m => <MatchBox key={m.id} match={m} teams={teams} />) : (
            <View style={styles.emptyBox}><Text style={styles.emptyText}>QF winners</Text></View>
          )}
        </View>
      </View>
      <View style={styles.connector} />
      <View style={styles.round}>
        <Text style={[styles.roundLabel, { color: Colors.gold }]}>⚔️ FINAL</Text>
        <View style={[styles.matches, { justifyContent: 'center' }]}>
          {fin.length > 0 ? fin.map(m => <MatchBox key={m.id} match={m} teams={teams} />) : (
            <View style={styles.emptyBox}><Text style={styles.emptyText}>SF winners</Text></View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, alignItems: 'center' },
  round: { width: 140 },
  roundLabel: { ...Typography.label, textAlign: 'center', color: Colors.accent, marginBottom: Spacing.sm },
  matches: { gap: Spacing.sm },
  connector: { width: 20, height: 1, backgroundColor: Colors.accentBorder, marginHorizontal: 4 },
  box: {
    backgroundColor: Colors.surfaceAlt, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.accentBorder, overflow: 'hidden',
  },
  boxLive: { borderColor: Colors.live },
  boxRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.sm },
  winRow: { backgroundColor: 'rgba(0,200,255,0.08)' },
  boxName: { color: Colors.text, fontSize: 11, fontWeight: '600', flex: 1 },
  boxScore: { color: Colors.textMuted, fontSize: 13, fontWeight: '800', marginLeft: 4 },
  divider: { height: 1, backgroundColor: Colors.accentBorder },
  emptyBox: { padding: Spacing.md, alignItems: 'center' },
  emptyText: { ...Typography.body, fontSize: 10 },
});
