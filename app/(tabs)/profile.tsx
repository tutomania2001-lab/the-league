import { VideoBackground } from '@/components/ui/VideoBackground';
import { GlowText } from '@/components/ui/GlowText';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PulseGlow } from '@/components/ui/PulseGlow';
import { Typography, Spacing, Colors } from '@/constants/theme';
import { VideoFallbacks } from '@/constants/videos';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text } from 'react-native';

export default function ProfileScreen() {
  return (
    <VideoBackground fallbackImageUri={VideoFallbacks.profile} overlayOpacity={0.65}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
          <PulseGlow duration={2800} minOpacity={0.7}>
            <GlowText style={Typography.title}>👤 Profile</GlowText>
          </PulseGlow>
          <Card style={{ marginBottom: Spacing.xs }}>
            <Text style={[Typography.body, { color: Colors.text }]}>Full profile coming in Phase 2.</Text>
          </Card>
          <Button label="Log Out" variant="ghost" onPress={() => supabase.auth.signOut()} />
        </ScrollView>
      </SafeAreaView>
    </VideoBackground>
  );
}
