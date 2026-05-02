import { VideoBackground } from '@/components/ui/VideoBackground';
import { GlowText } from '@/components/ui/GlowText';
import { Card } from '@/components/ui/Card';
import { PulseGlow } from '@/components/ui/PulseGlow';
import { Typography, Spacing, Colors } from '@/constants/theme';
import { ChampionVideoIds, VideoFallbacks } from '@/constants/videos';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, Text } from 'react-native';

export default function WalletScreen() {
  return (
    <VideoBackground videoId={ChampionVideoIds.wallet} fallbackImageUri={VideoFallbacks.wallet} overlayOpacity={0.6}>
      <SafeAreaView style={{ flex: 1 }}>
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
    </VideoBackground>
  );
}
