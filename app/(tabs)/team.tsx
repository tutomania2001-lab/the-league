import { VideoBackground } from '@/components/ui/VideoBackground';
import { GlowText } from '@/components/ui/GlowText';
import { Card } from '@/components/ui/Card';
import { PulseGlow } from '@/components/ui/PulseGlow';
import { Typography, Spacing, Colors } from '@/constants/theme';
import { ChampionVideoIds, VideoFallbacks } from '@/constants/videos';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text } from 'react-native';

export default function TeamScreen() {
  return (
    <VideoBackground videoId={ChampionVideoIds.team} fallbackImageUri={VideoFallbacks.team} overlayOpacity={0.65}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md }}>
          <PulseGlow duration={2200} minOpacity={0.7}>
            <GlowText style={Typography.title}>⚔️ My Team</GlowText>
          </PulseGlow>
          <Card>
            <Text style={[Typography.body, { color: Colors.text }]}>Team dashboard coming in Phase 3.</Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </VideoBackground>
  );
}
