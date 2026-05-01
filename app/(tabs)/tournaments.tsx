import { Screen } from '@/components/ui/Screen';
import { GlowText } from '@/components/ui/GlowText';
import { Card } from '@/components/ui/Card';
import { Typography, Spacing } from '@/constants/theme';
import { Text } from 'react-native';

export default function TournamentsScreen() {
  return (
    <Screen>
      <GlowText style={[Typography.title, { marginBottom: Spacing.lg }]}>🏆 Tournaments</GlowText>
      <Card>
        <Text style={Typography.body}>Tournament list coming soon. Create your team first!</Text>
      </Card>
    </Screen>
  );
}
