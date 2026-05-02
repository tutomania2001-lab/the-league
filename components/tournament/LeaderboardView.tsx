import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useLeaderboard, LeaderboardEntry } from '@/hooks/useLeaderboard';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';

const MEDAL: Record<number, { icon: string; color: string; bg: string }> = {
  1: { icon: '🥇', color: '#FFD700', bg: 'rgba(255,215,0,0.12)' },
  2: { icon: '🥈', color: '#C0C0C0', bg: 'rgba(192,192,192,0.1)' },
  3: { icon: '🥉', color: '#CD7F32', bg: 'rgba(205,127,50,0.1)' },
};

type Props = { compact?: boolean; teamId?: string };

export function LeaderboardView({ compact = false, teamId }: Props) {
  const router = useRouter();
  const { entries, loading, refresh } = useLeaderboard();
  const [refreshing, setRefreshing] = useState(false);

  const displayed = compact ? entries.slice(0, 5) : entries;
  const myTeamRank = teamId ? entries.find(e => e.team_id === teamId) : null;

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ marginTop: Spacing.lg }} />;

  if (entries.length === 0) return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 32, marginBottom: 8 }}>🏆</Text>
      <Text style={[Typography.subheading, { textAlign: 'center', color: Colors.gold }]}>No rankings yet</Text>
      <Text style={[Typography.body, { textAlign: 'center', marginTop: 4 }]}>
        Win tournaments to appear on the leaderboard
      </Text>
    </View>
  );

  return (
    <ScrollView
      contentContainerStyle={[styles.container, compact && { padding: 0 }]}
      refreshControl={!compact ? <RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }} tintColor={Colors.gold} /> : undefined}
      scrollEnabled={!compact}
    >
      {/* My team highlight */}
      {myTeamRank && !compact && (
        <View style={styles.myTeamBanner}>
          <Text style={styles.myTeamLabel}>YOUR CLAN</Text>
          <Text style={styles.myTeamRank}>#{myTeamRank.rank}</Text>
          <Text style={styles.myTeamName}>{myTeamRank.team_name}</Text>
          <Text style={styles.myTeamWins}>{myTeamRank.wins} wins</Text>
        </View>
      )}

      {/* Top 3 podium */}
      {!compact && entries.length >= 3 && (
        <View style={styles.podium}>
          {/* 2nd */}
          <View style={[styles.podiumSlot, { marginTop: 20 }]}>
            <Text style={styles.podiumMedal}>🥈</Text>
            <Text style={[styles.podiumName, { color: '#C0C0C0' }]} numberOfLines={1}>{entries[1]?.team_name}</Text>
            <View style={[styles.podiumBar, { height: 60, backgroundColor: 'rgba(192,192,192,0.2)', borderColor: '#C0C0C0' + '55' }]}>
              <Text style={[styles.podiumWins, { color: '#C0C0C0' }]}>{entries[1]?.wins}</Text>
              <Text style={styles.podiumWinsLabel}>wins</Text>
            </View>
          </View>
          {/* 1st */}
          <View style={styles.podiumSlot}>
            <Text style={[styles.podiumMedal, { fontSize: 30 }]}>🥇</Text>
            <Text style={[styles.podiumName, { color: Colors.gold }]} numberOfLines={1}>{entries[0]?.team_name}</Text>
            <View style={[styles.podiumBar, { height: 80, backgroundColor: 'rgba(255,215,0,0.15)', borderColor: Colors.gold + '66' }]}>
              <Text style={[styles.podiumWins, { color: Colors.gold, fontSize: 22 }]}>{entries[0]?.wins}</Text>
              <Text style={styles.podiumWinsLabel}>wins</Text>
            </View>
          </View>
          {/* 3rd */}
          <View style={[styles.podiumSlot, { marginTop: 36 }]}>
            <Text style={styles.podiumMedal}>🥉</Text>
            <Text style={[styles.podiumName, { color: '#CD7F32' }]} numberOfLines={1}>{entries[2]?.team_name}</Text>
            <View style={[styles.podiumBar, { height: 44, backgroundColor: 'rgba(205,127,50,0.15)', borderColor: '#CD7F32' + '55' }]}>
              <Text style={[styles.podiumWins, { color: '#CD7F32' }]}>{entries[2]?.wins}</Text>
              <Text style={styles.podiumWinsLabel}>wins</Text>
            </View>
          </View>
        </View>
      )}

      {/* Full list */}
      <View style={styles.list}>
        {!compact && <Text style={styles.listHeader}>ALL CLANS</Text>}
        {displayed.map(entry => {
          const medal = MEDAL[entry.rank];
          const isMyTeam = entry.team_id === teamId;
          return (
            <View key={entry.team_id} style={[styles.row, isMyTeam && styles.rowHighlight, medal && { backgroundColor: medal.bg }]}>
              {/* Rank */}
              <View style={styles.rankWrap}>
                {medal
                  ? <Text style={styles.rankMedal}>{medal.icon}</Text>
                  : <Text style={[styles.rankNum, entry.rank <= 10 && { color: Colors.gold }]}>#{entry.rank}</Text>
                }
              </View>
              {/* Info */}
              <View style={styles.info}>
                <Text style={[styles.teamName, medal && { color: medal.color }, isMyTeam && { color: Colors.accent }]} numberOfLines={1}>
                  {entry.team_name}{isMyTeam ? ' 👈' : ''}
                </Text>
                <Text style={styles.meta}>{entry.member_count} members · {entry.tournaments_played} played · {entry.win_rate}% win rate</Text>
              </View>
              {/* Stats */}
              <View style={styles.stats}>
                <Text style={[styles.winsNum, medal && { color: medal.color }]}>{entry.wins}</Text>
                <Text style={styles.winsLabel}>WINS</Text>
              </View>
              {entry.total_earnings > 0 && (
                <View style={styles.earnings}>
                  <Text style={styles.earningsNum}>£{entry.total_earnings.toFixed(0)}</Text>
                  <Text style={styles.earningsLabel}>EARNED</Text>
                </View>
              )}
            </View>
          );
        })}
        {compact && entries.length > 5 && (
          <Text style={styles.seeAll}>Top 5 shown · See full leaderboard in Events tab</Text>
        )}
      </View>
    </ScrollView>
  );
}

import { useState } from 'react';

const styles = StyleSheet.create({
  container: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl, paddingHorizontal: Spacing.lg },

  // My team banner
  myTeamBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(0,200,255,0.08)', borderRadius: 12,
    borderWidth: 1, borderColor: Colors.accent + '44',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  myTeamLabel: { fontSize: 8, fontWeight: '800', color: Colors.accent, letterSpacing: 1.5 },
  myTeamRank: { fontSize: 20, fontWeight: '900', color: Colors.accent },
  myTeamName: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.text },
  myTeamWins: { fontSize: 12, color: Colors.accent, fontWeight: '700' },

  // Podium
  podium: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center',
    gap: Spacing.sm, paddingBottom: Spacing.sm,
  },
  podiumSlot: { alignItems: 'center', width: 100 },
  podiumMedal: { fontSize: 24, marginBottom: 4 },
  podiumName: { fontSize: 11, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  podiumBar: { width: '100%', borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  podiumWins: { fontSize: 18, fontWeight: '900' },
  podiumWinsLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: '600' },

  // List
  listHeader: { fontSize: 10, fontWeight: '800', color: Colors.gold + '88', letterSpacing: 2, marginBottom: 4 },
  list: { gap: Spacing.xs },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: 'rgba(10,8,3,0.7)', borderRadius: 10,
    borderWidth: 1, borderColor: Colors.gold + '22',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  rowHighlight: { borderColor: Colors.accent + '55', backgroundColor: 'rgba(0,200,255,0.06)' },
  rankWrap: { width: 36, alignItems: 'center' },
  rankMedal: { fontSize: 20 },
  rankNum: { fontSize: 13, fontWeight: '800', color: Colors.textMuted },
  info: { flex: 1, gap: 2 },
  teamName: { fontSize: 13, fontWeight: '800', color: Colors.text },
  meta: { fontSize: 9, color: Colors.textDim },
  stats: { alignItems: 'center' },
  winsNum: { fontSize: 18, fontWeight: '900', color: Colors.gold },
  winsLabel: { fontSize: 7, fontWeight: '700', color: Colors.gold + '88', letterSpacing: 1 },
  earnings: { alignItems: 'center', marginLeft: 4 },
  earningsNum: { fontSize: 11, fontWeight: '700', color: Colors.success },
  earningsLabel: { fontSize: 7, color: Colors.success + '88', letterSpacing: 0.5 },
  seeAll: { textAlign: 'center', fontSize: 10, color: Colors.textDim, marginTop: 4 },
});
