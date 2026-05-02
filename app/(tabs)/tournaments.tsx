import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { PulseGlow } from '@/components/ui/PulseGlow';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text } from 'react-native';

export default function TournamentsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
        <PulseGlow duration={2500} minOpacity={0.7}>
          <GlowText style={Typography.title}>🏆 Tournaments</GlowText>
        </PulseGlow>
        <Card>
          <Text style={[Typography.body, { color: Colors.text }]}>Tournament list coming in Phase 3.</Text>
          <Text style={[Typography.body, { marginTop: Spacing.sm }]}>Create your team first to enter.</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
