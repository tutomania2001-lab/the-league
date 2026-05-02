import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const typeIcon: Record<string, string> = { topup: '⬆️', entry_fee: '⚔️', prize: '🏆', withdrawal: '🏦' };
const typeLabel: Record<string, string> = { topup: 'Top Up', entry_fee: 'Entry Fee', prize: 'Prize Won', withdrawal: 'Withdrawal' };

export default function WalletScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>();
  const { balance, transactions, loading, refresh } = useWallet(userId);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <GlowText style={Typography.title}>💰 Wallet</GlowText>
      </View>

      <Card glow style={styles.balanceCard}>
        <Text style={Typography.label}>Available Balance</Text>
        <GlowText style={styles.balance}>£{balance.toFixed(2)}</GlowText>
        <View style={styles.btnRow}>
          <Button label="Top Up" onPress={() => router.push('/wallet/top-up')} style={{ flex: 1 }} />
          <Button label="Withdraw" variant="secondary" onPress={() => router.push('/wallet/withdraw')} style={{ flex: 1 }} />
        </View>
      </Card>

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={t => t.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
          ListHeaderComponent={<Text style={[Typography.label, { marginBottom: Spacing.sm }]}>Transaction History</Text>}
          renderItem={({ item }) => {
            const isCredit = item.type === 'topup' || item.type === 'prize';
            return (
              <View style={styles.txRow}>
                <Text style={styles.txIcon}>{typeIcon[item.type] ?? '💳'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[Typography.subheading, { fontSize: 13 }]}>{typeLabel[item.type] ?? item.type}</Text>
                  <Text style={[Typography.body, { fontSize: 10 }]}>
                    {new Date(item.created_at).toLocaleDateString()} · {item.status}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: isCredit ? Colors.success : Colors.error }]}>
                  {isCredit ? '+' : '-'}£{item.amount.toFixed(2)}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={Typography.body}>No transactions yet</Text>
              <Text style={[Typography.body, { fontSize: 11, marginTop: 4 }]}>Top up your wallet to get started</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.surfaceAlt }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: { padding: Spacing.md, paddingBottom: Spacing.sm },
  balanceCard: { marginHorizontal: Spacing.md, gap: Spacing.md, marginBottom: Spacing.md },
  balance: { fontSize: 42, fontWeight: '900' },
  btnRow: { flexDirection: 'row', gap: Spacing.sm },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs,
  },
  txIcon: { fontSize: 22 },
  txAmount: { fontSize: 15, fontWeight: '800' },
  empty: { alignItems: 'center', padding: Spacing.xl },
});
