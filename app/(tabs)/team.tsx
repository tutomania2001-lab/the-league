import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { PulseGlow } from '@/components/ui/PulseGlow';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text } from 'react-native';

export default function TeamScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
        <PulseGlow duration={2200} minOpacity={0.7}>
          <GlowText style={Typography.title}>⚔️ My Team</GlowText>
        </PulseGlow>
        <Card>
          <Text style={[Typography.body, { color: Colors.text }]}>Team dashboard coming in Phase 3.</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
