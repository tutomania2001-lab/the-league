import { BracketView } from '@/components/tournament/BracketView';
import { MatchCard } from '@/components/tournament/MatchCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useTournament, refreshTournamentList } from '@/hooks/useTournament';
import { useTeam } from '@/hooks/useTeam';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { TeamRow, TournamentStatus } from '@/types/database';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const badgeVariant: Record<TournamentStatus, 'open' | 'active' | 'completed'> = {
  open: 'open', active: 'active', completed: 'completed', cancelled: 'completed',
};

const HOLDING_PERCENT = 0.10; // 10% non-refundable holding deposit
const REFUND_PERCENT  = 0.90; // 90% refunded to players

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tournament, matches, registeredTeamIds, loading } = useTournament(id);
  const [userId, setUserId] = useState<string>();
  const { team } = useTeam(userId);
  const { profile } = useProfile(userId);
  const [teams, setTeams] = useState<Record<string, TeamRow>>({});
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  const isCreator = tournament?.created_by === userId;
  const canCancel = (profile?.is_admin || isCreator) && tournament?.status !== 'completed' && tournament?.status !== 'cancelled';

  async function handleCancel() {
    if (!id || !tournament) return;

    const refundAmount = Number((tournament.prize_pool * REFUND_PERCENT).toFixed(2));

    Alert.alert(
      'Cancel Tournament',
      `Players will be refunded 90% of entry fees.\n\nRefund: £${refundAmount}\nHeld (10%): £${(tournament.prize_pool * HOLDING_PERCENT).toFixed(2)}\n\nContinue?`,
      [
        { text: 'Keep Tournament', style: 'cancel' },
        {
          text: 'Cancel & Refund',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              // Try to find transactions with tournament_id first
              let entryTxns: any[] = [];
              const { data: byTournament } = await supabase
                .from('transactions')
                .select('user_id, amount')
                .eq('tournament_id', id)
                .eq('type', 'entry_fee')
                .eq('status', 'completed');

              if (byTournament?.length) {
                entryTxns = byTournament;
              } else {
                // Fallback: get players from tournament_lineups and calculate per-team fee
                const { data: lineups } = await supabase
                  .from('tournament_lineups')
                  .select('user_id')
                  .eq('tournament_id', id);
                if (lineups?.length) {
                  const feePerPlayer = tournament.entry_fee_per_player;
                  entryTxns = lineups.map(l => ({ user_id: l.user_id, amount: feePerPlayer }));
                }
              }

              // Refund 90% to each payer
              for (const txn of entryTxns) {
                const refund = Number((txn.amount * REFUND_PERCENT).toFixed(2));
                await supabase.rpc('increment_wallet', { user_id: txn.user_id, amount: refund });
                await supabase.from('transactions').insert({
                  user_id: txn.user_id, type: 'prize',
                  amount: refund, status: 'completed',
                });
              }

              // Delete the tournament (cascade removes teams, matches, lineups)
              const { error: cancelError } = await supabase
                .from('tournaments')
                .delete()
                .eq('id', id);

              if (cancelError) throw cancelError;

              setCancelling(false);
              refreshTournamentList(); // instantly removes from list
              Alert.alert(
                'Tournament Cancelled',
                `${entryTxns.length} player${entryTxns.length !== 1 ? 's' : ''} refunded 90% of their entry fee.`,
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (e: any) {
              setCancelling(false);
              Alert.alert('Error', e?.message ?? 'Failed to cancel tournament. Try again.');
            }
          },
        },
      ]
    );
  }

  useEffect(() => {
    if (!matches.length && !registeredTeamIds.length) return;
    const ids = [...new Set([
      ...matches.flatMap(m => [m.team_a_id, m.team_b_id]).filter(Boolean) as string[],
      ...registeredTeamIds,
    ])];
    if (!ids.length) return;
    supabase.from('teams').select('*').in('id', ids).then(({ data }) => {
      if (data) setTeams(Object.fromEntries(data.map(t => [t.id, t])));
    });
  }, [matches, registeredTeamIds]);

  const isRegistered = team ? registeredTeamIds.includes(team.id) : false;
  const isFull = registeredTeamIds.length >= (tournament?.max_teams ?? 8);
  const prizePool = tournament
    ? tournament.entry_fee_per_player * 5 * tournament.max_teams * (1 - tournament.platform_cut_percent / 100)
    : 0;

  async function handleJoin() {
    if (!team || !id) return;
    setJoining(true);
    setJoinError(null);
    const { error } = await supabase.from('tournament_teams')
      .insert({ tournament_id: id, team_id: team.id });
    if (error) setJoinError(error.message);
    setJoining(false);
  }

  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator color={Colors.accent} style={{ flex: 1 }} /></SafeAreaView>;
  if (!tournament) return <SafeAreaView style={styles.safe}><Text style={[Typography.body, { padding: Spacing.lg }]}>Tournament not found</Text></SafeAreaView>;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); setRefreshing(false); }} tintColor={Colors.accent} />}
      >
        {/* Header */}
        <View style={styles.titleRow}>
          <GlowText style={[Typography.title, { flex: 1 }]}>{tournament.name}</GlowText>
          <Badge variant={badgeVariant[tournament.status]} />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Text style={Typography.label}>Entry Fee</Text>
            <Text style={[Typography.heading, { color: Colors.text }]}>£{tournament.entry_fee_per_player}<Text style={Typography.body}>/player</Text></Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={Typography.label}>Prize Pool</Text>
            <GlowText style={[Typography.heading, { color: Colors.gold }]}>£{prizePool.toFixed(0)}</GlowText>
          </Card>
          <Card style={styles.statCard}>
            <Text style={Typography.label}>Teams</Text>
            <Text style={[Typography.heading, { color: Colors.text }]}>{registeredTeamIds.length}<Text style={Typography.body}>/{tournament.max_teams}</Text></Text>
          </Card>
        </View>

        {/* Join button */}
        {tournament.status === 'open' && (
          <View style={{ gap: Spacing.xs }}>
            {!team ? (
              <Button label="Create a team first to enter" variant="secondary" onPress={() => router.push('/(tabs)/team')} />
            ) : isRegistered ? (
              <Card style={{ alignItems: 'center' }}>
                <Text style={{ color: Colors.success, fontWeight: '700' }}>✓ Your team is registered</Text>
              </Card>
            ) : isFull ? (
              <Card style={{ alignItems: 'center' }}>
                <Text style={Typography.body}>Tournament is full</Text>
              </Card>
            ) : !(team as any).room_code ? (
              <Card style={{ gap: Spacing.sm, borderColor: Colors.error + '55' }}>
                <Text style={{ color: Colors.error, fontWeight: '700', fontSize: 13 }}>
                  🎮 Wild Rift Room Code Required
                </Text>
                <Text style={[Typography.body, { fontSize: 12 }]}>
                  Your team must have a Wild Rift room code set before entering a tournament. Set one in your team settings.
                </Text>
                <Button
                  label="Set Room Code →"
                  variant="secondary"
                  onPress={() => router.push('/(tabs)/team')}
                  style={{ borderColor: Colors.accent }}
                />
              </Card>
            ) : (
              <>
                <Button
                  label={`Enter with ${team.name} — £${tournament.entry_fee_per_player * 5} total`}
                  onPress={handleJoin}
                  loading={joining}
                />
                <Text style={[Typography.body, { textAlign: 'center', fontSize: 11 }]}>
                  £{tournament.entry_fee_per_player} deducted from each of your 5 players' wallets
                </Text>
              </>
            )}
            {joinError && <Text style={{ color: Colors.error, textAlign: 'center' }}>{joinError}</Text>}
          </View>
        )}

        {/* Registered teams */}
        {registeredTeamIds.length > 0 && (
          <View>
            <Text style={[Typography.label, { marginBottom: Spacing.sm }]}>Registered Teams ({registeredTeamIds.length}/{tournament.max_teams})</Text>
            <View style={styles.teamList}>
              {registeredTeamIds.map(tid => (
                <Card key={tid} style={styles.teamRow}>
                  <Text style={{ fontSize: 16 }}>⚔️</Text>
                  <Text style={[Typography.subheading, { flex: 1 }]}>{teams[tid]?.name ?? 'Loading...'}</Text>
                  {team?.id === tid && <Text style={[Typography.label, { color: Colors.accent }]}>YOU</Text>}
                </Card>
              ))}
            </View>
          </View>
        )}

        {/* Bracket */}
        {matches.length > 0 && (
          <View>
            <Text style={[Typography.label, { marginBottom: Spacing.sm }]}>Bracket</Text>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <BracketView matches={matches} teams={teams} />
            </Card>
          </View>
        )}

        {/* Match list */}
        {matches.length > 0 && (
          <View style={{ gap: Spacing.sm }}>
            <Text style={Typography.label}>Matches</Text>
            {matches.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                teamA={m.team_a_id ? teams[m.team_a_id] ?? null : null}
                teamB={m.team_b_id ? teams[m.team_b_id] ?? null : null}
              />
            ))}
          </View>
        )}

        {/* Cancel tournament — creator/admin only */}
        {canCancel && (
          <Card style={{ borderColor: Colors.error + '55', gap: Spacing.sm }}>
            <Text style={[Typography.label, { color: Colors.error }]}>⚠️ Cancel Tournament</Text>
            <Text style={[Typography.body, { fontSize: 12 }]}>
              Players will be refunded <Text style={{ color: Colors.success, fontWeight: '700' }}>90%</Text> of their entry fees.
              The <Text style={{ color: Colors.error, fontWeight: '700' }}>10%</Text> holding deposit is non-refundable.
            </Text>
            {tournament.prize_pool > 0 && (
              <View style={styles.refundRow}>
                <View style={styles.refundBox}>
                  <Text style={[Typography.label, { color: Colors.success }]}>Refunded</Text>
                  <Text style={[Typography.subheading, { color: Colors.success }]}>
                    £{(tournament.prize_pool * REFUND_PERCENT).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.refundBox}>
                  <Text style={[Typography.label, { color: Colors.error }]}>Held (10%)</Text>
                  <Text style={[Typography.subheading, { color: Colors.error }]}>
                    £{(tournament.prize_pool * HOLDING_PERCENT).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}
            <Button
              label={cancelling ? 'Cancelling...' : '🗑 Cancel Tournament'}
              onPress={handleCancel}
              loading={cancelling}
              style={{ backgroundColor: 'rgba(255,68,68,0.15)', borderWidth: 1, borderColor: Colors.error + '66' }}
            />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, gap: 4, padding: Spacing.sm },
  teamList: { gap: Spacing.xs },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm },
  refundRow: { flexDirection: 'row', gap: Spacing.sm },
  refundBox: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 8, padding: Spacing.sm, alignItems: 'center', gap: 2 },
});
