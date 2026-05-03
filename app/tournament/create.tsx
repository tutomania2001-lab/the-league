import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { LeagueEmblem } from '@/components/ui/LeagueEmblem';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useTournament } from '@/hooks/useTournament';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FEE_PRESETS = [1, 5, 10, 20, 50];

export default function CreateTournamentScreen() {
  const router = useRouter();
  const { createTournament } = useTournament(undefined);
  const [name, setName] = useState('');
  const [fee, setFee] = useState(5);
  const [prizeFormat, setPrizeFormat] = useState<'winner_takes_all' | 'top_two'>('winner_takes_all');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useProfile(userId || undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ''));
  }, []);

  useEffect(() => {
    if (profile && !profile.is_admin) router.replace('/(tabs)/tournaments');
  }, [profile]);

  const prizePool = fee * 5 * 8 * 0.9;
  const secondPrize = fee * 5; // 2nd place entry fee refund
  const firstPrize = prizePool - secondPrize;

  async function handleCreate() {
    if (!name.trim()) { setError('Tournament name is required'); return; }
    setLoading(true);
    setError(null);

    const { data, error: createError } = await supabase.from('tournaments').insert({
      name: name.trim(),
      entry_fee_per_player: fee,
      created_by: userId,
      tournament_type: 'tournament',
      prize_format: prizeFormat,
    }).select().single();

    if (createError) { setError(createError.message); setLoading(false); return; }
    router.replace(`/tournament/${data.id}`);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <LeagueEmblem size={48} color={Colors.gold} />
          <View>
            <GlowText style={[Typography.title, { color: Colors.gold }]}>New Tournament</GlowText>
            <Text style={[Typography.body, { fontSize: 11, color: Colors.textMuted }]}>Official event · 20 teams × 5 players</Text>
          </View>
        </View>

        {/* Name */}
        <Input
          label="Tournament Name"
          placeholder="e.g. The League Season 1"
          value={name}
          onChangeText={setName}
        />

        {/* Entry fee */}
        <View>
          <Text style={[Typography.label, { marginBottom: Spacing.sm }]}>Entry Fee Per Player</Text>
          <View style={styles.feeRow}>
            {FEE_PRESETS.map(p => (
              <TouchableOpacity key={p} onPress={() => setFee(p)} style={[styles.feeBtn, fee === p && styles.feeBtnActive]}>
                <Text style={[styles.feeBtnText, fee === p && { color: Colors.background }]}>£{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Prize format */}
        <View>
          <Text style={[Typography.label, { marginBottom: Spacing.sm }]}>Prize Format</Text>
          <View style={styles.formatRow}>
            <TouchableOpacity
              style={[styles.formatBtn, prizeFormat === 'winner_takes_all' && styles.formatBtnActive]}
              onPress={() => setPrizeFormat('winner_takes_all')}
            >
              <Text style={styles.formatIcon}>👑</Text>
              <Text style={[styles.formatTitle, prizeFormat === 'winner_takes_all' && { color: Colors.gold }]}>
                Winner Takes All
              </Text>
              <Text style={styles.formatSub}>1st place wins £{prizePool.toFixed(0)}</Text>
              {prizeFormat === 'winner_takes_all' && <View style={styles.formatCheck}><Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>✓</Text></View>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.formatBtn, prizeFormat === 'top_two' && styles.formatBtnActiveBlue]}
              onPress={() => setPrizeFormat('top_two')}
            >
              <Text style={styles.formatIcon}>🥈</Text>
              <Text style={[styles.formatTitle, prizeFormat === 'top_two' && { color: Colors.accent }]}>
                Top 2 Prize
              </Text>
              <Text style={styles.formatSub}>
                1st: £{firstPrize.toFixed(0)}{'\n'}2nd: entry refunded (£{secondPrize.toFixed(0)})
              </Text>
              {prizeFormat === 'top_two' && <View style={[styles.formatCheck, { backgroundColor: Colors.accent }]}><Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>✓</Text></View>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Prize breakdown */}
        <Card style={styles.breakdown}>
          <Text style={[Typography.label, { color: Colors.gold, marginBottom: Spacing.sm }]}>Prize Breakdown</Text>
          <View style={styles.breakdownRow}>
            <Text style={Typography.body}>Total entry fees (40 players)</Text>
            <Text style={[Typography.subheading, { color: Colors.text }]}>£{(fee * 40).toFixed(0)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={Typography.body}>Platform cut (10%)</Text>
            <Text style={[Typography.subheading, { color: Colors.error }]}>-£{(fee * 4).toFixed(0)}</Text>
          </View>
          {prizeFormat === 'top_two' ? (
            <>
              <View style={[styles.breakdownRow, styles.breakdownHighlight]}>
                <Text style={[Typography.subheading, { color: Colors.gold }]}>🥇 1st place prize</Text>
                <Text style={[Typography.heading, { color: Colors.gold }]}>£{firstPrize.toFixed(0)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={[Typography.subheading, { color: Colors.accent }]}>🥈 2nd place refund</Text>
                <Text style={[Typography.subheading, { color: Colors.accent }]}>£{secondPrize.toFixed(0)}</Text>
              </View>
            </>
          ) : (
            <View style={[styles.breakdownRow, styles.breakdownHighlight]}>
              <Text style={[Typography.subheading, { color: Colors.gold }]}>🏆 Winner prize</Text>
              <Text style={[Typography.heading, { color: Colors.gold }]}>£{prizePool.toFixed(0)}</Text>
            </View>
          )}
        </Card>

        {error && <Text style={{ color: Colors.error, textAlign: 'center' }}>{error}</Text>}

        <Button label="Create Tournament" onPress={handleCreate} loading={loading} style={{ backgroundColor: Colors.gold }} />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  feeRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  feeBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 8, borderWidth: 1, borderColor: Colors.accentBorder, backgroundColor: Colors.surface },
  feeBtnActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  feeBtnText: { color: Colors.text, fontWeight: '800', fontSize: 14 },
  formatRow: { flexDirection: 'row', gap: Spacing.sm },
  formatBtn: { flex: 1, padding: Spacing.md, borderRadius: 12, borderWidth: 1, borderColor: Colors.gold + '33', backgroundColor: 'rgba(10,8,3,0.6)', gap: 4, position: 'relative' },
  formatBtnActive: { borderColor: Colors.gold, backgroundColor: 'rgba(200,155,60,0.1)' },
  formatBtnActiveBlue: { borderColor: Colors.accent, backgroundColor: 'rgba(0,200,255,0.08)' },
  formatIcon: { fontSize: 24 },
  formatTitle: { fontSize: 13, fontWeight: '800', color: Colors.textMuted },
  formatSub: { fontSize: 10, color: Colors.textDim, lineHeight: 14, marginTop: 2 },
  formatCheck: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  breakdown: { gap: Spacing.xs, backgroundColor: 'rgba(10,8,3,0.8)', borderColor: Colors.gold + '44' },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownHighlight: { borderTopWidth: 1, borderTopColor: Colors.gold + '33', paddingTop: Spacing.sm, marginTop: Spacing.xs },
});
