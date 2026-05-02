import { VideoBackground } from '@/components/ui/VideoBackground';
import { GlowText } from '@/components/ui/GlowText';
import { Card } from '@/components/ui/Card';
import { PulseGlow } from '@/components/ui/PulseGlow';
import { Typography, Spacing, Colors } from '@/constants/theme';
import { ChampionVideos, VideoFallbacks } from '@/constants/videos';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text, View } from 'react-native';

export default function TournamentsScreen() {
  return (
    <VideoBackground videoUri={ChampionVideos.tournaments} fallbackImageUri={VideoFallbacks.tournaments} overlayOpacity={0.65}>
      <SafeAreaView style={{ flex: 1 }}>
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
    </VideoBackground>
  );
}
