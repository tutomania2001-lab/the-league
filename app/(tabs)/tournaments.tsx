import { TournamentCard } from '@/components/tournament/TournamentCard';
import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useTournamentList } from '@/hooks/useTournament';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TournamentsScreen() {
  const router = useRouter();
  const { tournaments, loading, refresh } = useTournamentList();
  const [refreshing, setRefreshing] = useState(false);
  const [teamCounts, setTeamCounts] = useState<Record<string, number>>({});
  const [userId, setUserId] = useState<string>();
  const { profile } = useProfile(userId);
  const isAdmin = profile?.is_admin ?? false;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  useEffect(() => {
    if (!tournaments.length) return;
    Promise.all(
      tournaments.map(t =>
        supabase.from('tournament_teams').select('team_id', { count: 'exact' }).eq('tournament_id', t.id)
          .then(({ count }) => ({ id: t.id, count: count ?? 0 }))
      )
    ).then(results => {
      setTeamCounts(Object.fromEntries(results.map(r => [r.id, r.count])));
    });
  }, [tournaments]);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <GlowText style={Typography.title}>🏆 Tournaments</GlowText>
        {isAdmin && (
          <Button
            label="+ Create"
            variant="secondary"
            onPress={() => router.push('/tournament/create')}
            style={styles.createBtn}
          />
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={t => t.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          renderItem={({ item }) => (
            <TournamentCard
              tournament={item}
              teamsRegistered={teamCounts[item.id] ?? 0}
              onPress={() => router.push(`/tournament/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 40, marginBottom: Spacing.sm }}>🏆</Text>
              <Text style={[Typography.subheading, { textAlign: 'center' }]}>No tournaments yet</Text>
              <Text style={[Typography.body, { textAlign: 'center', marginTop: 4 }]}>
                {isAdmin ? 'Create the first tournament' : 'Check back soon for upcoming tournaments'}
              </Text>
              {isAdmin && <Button label="Create Tournament" onPress={() => router.push('/tournament/create')} style={{ marginTop: Spacing.lg }} />}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  createBtn: { paddingVertical: 6, paddingHorizontal: 14, minHeight: 36 },
  list: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
});
