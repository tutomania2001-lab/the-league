import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { PulseGlow } from '@/components/ui/PulseGlow';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text } from 'react-native';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
        <PulseGlow duration={2800} minOpacity={0.7}>
          <GlowText style={Typography.title}>👤 Profile</GlowText>
        </PulseGlow>
        <Card>
          <Text style={[Typography.body, { color: Colors.text }]}>Full profile coming in Phase 2.</Text>
        </Card>
        <Button label="Log Out" variant="ghost" onPress={() => supabase.auth.signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
}
