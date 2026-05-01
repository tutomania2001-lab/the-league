import { Screen } from '@/components/ui/Screen';
import { GlowText } from '@/components/ui/GlowText';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { ScrollView, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.lg }}>
        <GlowText style={[Typography.title, { marginBottom: Spacing.xs }]}>◈ THE LEAGUE</GlowText>
        <Card style={{ alignItems: 'center', gap: Spacing.sm }}>
          <Text style={{ fontSize: 40 }}>⚔️</Text>
          <GlowText style={Typography.heading}>Welcome to The League</GlowText>
          <Text style={[Typography.body, { textAlign: 'center' }]}>
            Wild Rift tournament platform. Create your account, form a team, and compete for prize pools.
          </Text>
          <Badge variant="open" />
        </Card>
        <Card glow>
          <Text style={Typography.label}>Season 1</Text>
          <GlowText style={[Typography.subheading, { marginTop: Spacing.xs }]}>🏆 First tournament coming soon</GlowText>
          <Text style={[Typography.body, { marginTop: Spacing.xs }]}>
            Sign up, top up your wallet and register your team to enter.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
