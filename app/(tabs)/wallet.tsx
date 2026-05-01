import { Screen } from '@/components/ui/Screen';
import { GlowText } from '@/components/ui/GlowText';
import { Card } from '@/components/ui/Card';
import { Typography, Spacing } from '@/constants/theme';
import { Text } from 'react-native';

export default function WalletScreen() {
  return (
    <Screen>
      <GlowText style={[Typography.title, { marginBottom: Spacing.lg }]}>💰 Wallet</GlowText>
      <Card glow>
        <Text style={Typography.label}>Balance</Text>
        <GlowText style={[Typography.title, { fontSize: 36, marginTop: Spacing.xs }]}>$0.00</GlowText>
      </Card>
      <Card style={{ marginTop: Spacing.md }}>
        <Text style={Typography.body}>Top up and withdrawal coming in Phase 3.</Text>
      </Card>
    </Screen>
  );
}
