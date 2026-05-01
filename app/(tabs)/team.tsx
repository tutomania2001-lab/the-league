import { Screen } from '@/components/ui/Screen';
import { GlowText } from '@/components/ui/GlowText';
import { Card } from '@/components/ui/Card';
import { Typography, Spacing } from '@/constants/theme';
import { Text } from 'react-native';

export default function TeamScreen() {
  return (
    <Screen>
      <GlowText style={[Typography.title, { marginBottom: Spacing.lg }]}>⚔️ My Team</GlowText>
      <Card>
        <Text style={Typography.body}>Team dashboard coming in Phase 3.</Text>
      </Card>
    </Screen>
  );
}
