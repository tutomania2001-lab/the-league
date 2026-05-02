import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useTournament } from '@/hooks/useTournament';
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
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ''));
  }, []);

  const prizePool = fee * 5 * 8 * 0.9;

  async function handleCreate() {
    if (!name.trim()) { setError('Tournament name is required'); return; }
    setLoading(true);
    setError(null);
    const { data, error } = await createTournament(name.trim(), fee, userId);
    if (error) { setError(error); setLoading(false); return; }
    router.replace(`/tournament/${data.id}`);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <GlowText style={[Typography.title, { marginBottom: Spacing.lg }]}>🏆 Create Tournament</GlowText>

        <Input
          label="Tournament Name"
          placeholder="e.g. Season 1 — Wild Rift Open"
          value={name}
          onChangeText={setName}
        />

        <View style={{ marginTop: Spacing.lg }}>
          <Text style={Typography.label}>Entry Fee Per Player</Text>
          <View style={styles.feeRow}>
            {FEE_PRESETS.map(p => (
              <TouchableOpacity
                key={p}
                onPress={() => setFee(p)}
                style={[styles.feeBtn, fee === p && styles.feeBtnActive]}
              >
                <Text style={[styles.feeBtnText, fee === p && { color: Colors.background }]}>£{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Card style={{ marginTop: Spacing.md, gap: Spacing.xs }}>
          <View style={styles.row}>
            <Text style={Typography.body}>Entry per player</Text>
            <Text style={[Typography.subheading, { color: Colors.text }]}>£{fee}</Text>
          </View>
          <View style={styles.row}>
            <Text style={Typography.body}>Total entries (8×5)</Text>
            <Text style={[Typography.subheading, { color: Colors.text }]}>£{fee * 40}</Text>
          </View>
          <View style={styles.row}>
            <Text style={Typography.body}>Platform cut (10%)</Text>
            <Text style={[Typography.subheading, { color: Colors.error }]}>-£{(fee * 40 * 0.1).toFixed(0)}</Text>
          </View>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: Colors.accentBorder, paddingTop: Spacing.sm }]}>
            <Text style={[Typography.subheading, { color: Colors.text }]}>Prize Pool</Text>
            <GlowText style={[Typography.heading, { color: Colors.gold }]}>🏆 £{prizePool.toFixed(0)}</GlowText>
          </View>
        </Card>

        {error && <Text style={{ color: Colors.error, textAlign: 'center', marginTop: Spacing.sm }}>{error}</Text>}

        <Button label="Create Tournament" onPress={handleCreate} loading={loading} style={{ marginTop: Spacing.lg }} />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} style={{ marginTop: Spacing.xs }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  feeRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm, flexWrap: 'wrap' },
  feeBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.accentBorder,
    backgroundColor: Colors.surface,
  },
  feeBtnActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  feeBtnText: { color: Colors.text, fontWeight: '700', fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
