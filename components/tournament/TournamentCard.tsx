import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { TournamentRow, TournamentStatus } from '@/types/database';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const badgeVariant: Record<TournamentStatus, 'open' | 'active' | 'completed'> = {
  open: 'open', active: 'active', completed: 'completed',
};

type Props = { tournament: TournamentRow; onPress: () => void; teamsRegistered?: number };

export function TournamentCard({ tournament, onPress, teamsRegistered = 0 }: Props) {
  const prizePool = tournament.entry_fee_per_player * 5 * tournament.max_teams * (1 - tournament.platform_cut_percent / 100);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.card}>
        <View style={styles.top}>
          <GlowText style={[Typography.subheading, { flex: 1 }]}>{tournament.name}</GlowText>
          <Badge variant={badgeVariant[tournament.status]} />
        </View>
        <View style={styles.row}>
          <View style={styles.stat}>
            <Text style={styles.statVal}>💰 £{tournament.entry_fee_per_player}</Text>
            <Text style={Typography.label}>Per Player</Text>
          </View>
          <View style={styles.stat}>
            <GlowText style={styles.prizeVal}>🏆 £{prizePool.toFixed(0)}</GlowText>
            <Text style={Typography.label}>Prize Pool</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statVal}>{teamsRegistered}/{tournament.max_teams}</Text>
            <Text style={Typography.label}>Teams</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', gap: 2 },
  statVal: { fontSize: 14, fontWeight: '700', color: Colors.text },
  prizeVal: { fontSize: 14, fontWeight: '800', color: Colors.gold },
});
