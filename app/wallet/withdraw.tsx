import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Button } from '@/components/ui/Button';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WithdrawScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <GlowText style={Typography.title}>🏦 Withdraw</GlowText>
        <Card>
          <Text style={[Typography.body, { color: Colors.text, marginBottom: Spacing.sm }]}>
            Bank withdrawals via Stripe payout are coming in Phase 4.
          </Text>
          <Text style={[Typography.body, { color: Colors.accent }]}>
            Prize winnings are automatically credited to your wallet balance when you win a tournament.
          </Text>
        </Card>
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: Spacing.lg, gap: Spacing.md },
});
