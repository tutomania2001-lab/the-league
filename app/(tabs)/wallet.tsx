import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { PulseGlow } from '@/components/ui/PulseGlow';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text } from 'react-native';

export default function WalletScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
        <PulseGlow duration={3000} minOpacity={0.65}>
          <GlowText style={Typography.title}>💰 Wallet</GlowText>
        </PulseGlow>
        <Card glow>
          <Text style={Typography.label}>Balance</Text>
          <GlowText style={[Typography.title, { fontSize: 36, marginTop: Spacing.xs }]}>$0.00</GlowText>
        </Card>
        <Card>
          <Text style={[Typography.body, { color: Colors.text }]}>Top up and withdrawal coming in Phase 3.</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
