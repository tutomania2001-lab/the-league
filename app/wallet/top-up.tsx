import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PRESETS = [5, 10, 25, 50, 100];

export default function TopUpScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: u } = await supabase.from('users').select('wallet_balance').eq('id', data.user.id).single();
      if (u) setBalance(u.wallet_balance);
    });
  }, []);

  async function handleTopUp() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Not authenticated'); setLoading(false); return; }

      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ amount: amount * 100 }),
      });
      const json = await res.json();

      if (json.error) { setError(json.error); setLoading(false); return; }

      // TODO: Present Stripe PaymentSheet with json.clientSecret
      // For now show success (Stripe integration in Phase 4 polish)
      setError('Stripe not configured yet — add your Stripe keys to Supabase Edge Function secrets to enable card payments.');
    } catch {
      setError('Failed to connect to payment server');
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <GlowText style={Typography.title}>⬆️ Top Up Wallet</GlowText>
        <Text style={[Typography.body, { marginTop: 2 }]}>Current balance: <Text style={{ color: Colors.accent }}>£{balance.toFixed(2)}</Text></Text>

        <View style={styles.presets}>
          {PRESETS.map(p => (
            <TouchableOpacity key={p} onPress={() => setAmount(p)} style={[styles.preset, amount === p && styles.presetActive]}>
              <Text style={[styles.presetText, amount === p && { color: Colors.background }]}>£{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Card style={styles.summary}>
          <View style={styles.row}>
            <Text style={Typography.body}>Amount to add</Text>
            <GlowText style={Typography.heading}>£{amount}</GlowText>
          </View>
          <View style={styles.row}>
            <Text style={Typography.body}>New balance</Text>
            <Text style={[Typography.subheading, { color: Colors.success }]}>£{(balance + amount).toFixed(2)}</Text>
          </View>
        </Card>

        {error && (
          <Card style={{ borderColor: Colors.error + '55' }}>
            <Text style={{ color: Colors.error, fontSize: 12 }}>{error}</Text>
          </Card>
        )}

        <Button label={`Add £${amount} to Wallet`} onPress={handleTopUp} loading={loading} />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  preset: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderRadius: 10, borderWidth: 1, borderColor: Colors.accentBorder,
    backgroundColor: Colors.surface,
  },
  presetActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  presetText: { color: Colors.text, fontWeight: '800', fontSize: 16 },
  summary: { gap: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
