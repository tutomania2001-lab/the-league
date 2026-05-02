import { TournamentCard } from '@/components/tournament/TournamentCard';
import { LeaderboardView } from '@/components/tournament/LeaderboardView';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { LeagueEmblem } from '@/components/ui/LeagueEmblem';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useTournamentList } from '@/hooks/useTournament';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

// ── Major Tournament card ──────────────────────────────────
function MajorTournamentCard({ tournament, teamsIn, onPress }: { tournament: any; teamsIn: number; onPress: () => void }) {
  const prizePool = tournament.prize_pool > 0
    ? tournament.prize_pool
    : tournament.entry_fee_per_player * 5 * 8 * 0.9;
  const isTopTwo = tournament.prize_format === 'top_two';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.majorCard}>
      <View style={StyleSheet.absoluteFillObject}>
        <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
          <Defs>
            <LinearGradient id="mg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#1a1100" stopOpacity="1" />
              <Stop offset="1" stopColor="#0a0a1a" stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#mg)" />
        </Svg>
        <View style={styles.majorTopBorder} />
      </View>

      <View style={styles.majorContent}>
        <View style={styles.majorLeft}>
          <LeagueEmblem size={52} color={Colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.majorTitleRow}>
            <Text style={styles.majorTitle}>{tournament.name}</Text>
            <Badge variant={tournament.status === 'active' ? 'active' : tournament.status === 'completed' ? 'completed' : 'open'} />
          </View>
          <View style={styles.majorPrizeRow}>
            <Text style={styles.majorPrize}>🏆 £{prizePool.toFixed(0)}</Text>
            <View style={[styles.formatChip, isTopTwo && styles.formatChipTop2]}>
              <Text style={[styles.formatChipText, isTopTwo && { color: Colors.accent }]}>
                {isTopTwo ? '🥈 Top 2 Prize' : '👑 Winner Takes All'}
              </Text>
            </View>
          </View>
          <View style={styles.majorStats}>
            <Text style={styles.majorStat}>⚔️ {teamsIn}/8 teams</Text>
            <Text style={styles.majorStat}>· £{tournament.entry_fee_per_player}/player</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function TournamentsScreen() {
  const router = useRouter();
  const { teamBattles, majorTournaments, loading, refresh } = useTournamentList();
  const [refreshing, setRefreshing] = useState(false);
  const [teamCounts, setTeamCounts] = useState<Record<string, number>>({});
  const [userId, setUserId] = useState<string>();
  const { profile } = useProfile(userId);
  const isAdmin = profile?.is_admin ?? false;
  const [activeTab, setActiveTab] = useState<'tournaments' | 'battles' | 'leaderboard'>('tournaments');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  useEffect(() => {
    const all = [...majorTournaments, ...teamBattles];
    if (!all.length) return;
    Promise.all(all.map(t =>
      supabase.from('tournament_teams').select('team_id', { count: 'exact' }).eq('tournament_id', t.id)
        .then(({ count }) => ({ id: t.id, count: count ?? 0 }))
    )).then(results => {
      setTeamCounts(Object.fromEntries(results.map(r => [r.id, r.count])));
    });
  }, [majorTournaments, teamBattles]);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <GlowText style={Typography.title}>🏆 Events</GlowText>
        {isAdmin && (
          <Button
            label="+ Create"
            variant="secondary"
            onPress={() => router.push('/tournament/create')}
            style={styles.createBtn}
          />
        )}
      </View>

      {/* Sub tabs */}
      <View style={styles.subTabs}>
        <TouchableOpacity
          style={[styles.subTab, activeTab === 'tournaments' && styles.subTabActive]}
          onPress={() => setActiveTab('tournaments')}
        >
          <Text style={[styles.subTabText, activeTab === 'tournaments' && styles.subTabTextActive]}>
            🏟️ Tournaments {majorTournaments.length > 0 ? `(${majorTournaments.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, activeTab === 'battles' && styles.subTabActive]}
          onPress={() => setActiveTab('battles')}
        >
          <Text style={[styles.subTabText, activeTab === 'battles' && styles.subTabTextActive]}>
            ⚔️ Team Battles {teamBattles.length > 0 ? `(${teamBattles.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, activeTab === 'leaderboard' && styles.subTabActive]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Text style={[styles.subTabText, activeTab === 'leaderboard' && styles.subTabTextActive]}>
            🏆 Leaderboard
          </Text>
        </TouchableOpacity>
      </View>

      {/* Leaderboard tab */}
      {activeTab === 'leaderboard' && (
        <LeaderboardView />
      )}

      {activeTab !== 'leaderboard' && loading ? (
        <ActivityIndicator color={Colors.accent} style={{ flex: 1 }} />
      ) : activeTab !== 'leaderboard' ? (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        >
          {/* MAJOR TOURNAMENTS */}
          {activeTab === 'tournaments' && (
            majorTournaments.length === 0 ? (
              <View style={styles.empty}>
                <LeagueEmblem size={64} color={Colors.gold + '66'} />
                <Text style={[Typography.subheading, { textAlign: 'center', color: Colors.gold, marginTop: Spacing.md }]}>
                  No tournaments yet
                </Text>
                <Text style={[Typography.body, { textAlign: 'center', marginTop: 4 }]}>
                  Major tournaments organised by The League will appear here
                </Text>
                {isAdmin && (
                  <Button label="Create Tournament" onPress={() => router.push('/tournament/create')} style={{ marginTop: Spacing.lg }} />
                )}
              </View>
            ) : (
              majorTournaments.map(t => (
                <MajorTournamentCard
                  key={t.id}
                  tournament={t}
                  teamsIn={teamCounts[t.id] ?? 0}
                  onPress={() => router.push(`/tournament/${t.id}`)}
                />
              ))
            )
          )}

          {/* TEAM BATTLES */}
          {activeTab === 'battles' && (
            teamBattles.length === 0 ? (
              <View style={styles.empty}>
                <Text style={{ fontSize: 48, marginBottom: Spacing.sm }}>⚔️</Text>
                <Text style={[Typography.subheading, { textAlign: 'center' }]}>No team battles yet</Text>
                <Text style={[Typography.body, { textAlign: 'center', marginTop: 4 }]}>
                  Create a team and challenge others from the Team Hub
                </Text>
                <Button
                  label="Go to Team Hub"
                  variant="secondary"
                  onPress={() => router.push('/(tabs)/team')}
                  style={{ marginTop: Spacing.lg }}
                />
              </View>
            ) : (
              teamBattles.map(t => (
                <TournamentCard
                  key={t.id}
                  tournament={t}
                  teamsRegistered={teamCounts[t.id] ?? 0}
                  onPress={() => router.push(`/tournament/${t.id}`)}
                />
              ))
            )
          )}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  createBtn: { paddingVertical: 6, paddingHorizontal: 14, minHeight: 36 },
  subTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.accentBorder },
  subTab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center' },
  subTabActive: { borderBottomWidth: 2, borderBottomColor: Colors.accent },
  subTabText: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  subTabTextActive: { color: Colors.accent },
  list: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, paddingHorizontal: Spacing.lg },

  // Major tournament card
  majorCard: {
    borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.gold + '55',
    marginBottom: 0,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 12,
  },
  majorTopBorder: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: Colors.gold, opacity: 0.7 },
  majorContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  majorLeft: { alignItems: 'center', justifyContent: 'center' },
  majorTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4, flexWrap: 'wrap' },
  majorTitle: { fontSize: 16, fontWeight: '900', color: '#fff', flex: 1 },
  majorPrizeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 6, flexWrap: 'wrap' },
  majorPrize: { fontSize: 18, fontWeight: '900', color: Colors.gold, textShadowColor: Colors.gold, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  formatChip: { backgroundColor: 'rgba(200,155,60,0.15)', borderRadius: 6, borderWidth: 1, borderColor: Colors.gold + '55', paddingHorizontal: 8, paddingVertical: 3 },
  formatChipTop2: { backgroundColor: 'rgba(0,200,255,0.1)', borderColor: Colors.accent + '55' },
  formatChipText: { fontSize: 10, fontWeight: '700', color: Colors.gold },
  majorStats: { flexDirection: 'row', gap: 4 },
  majorStat: { fontSize: 11, color: Colors.textMuted },
});
