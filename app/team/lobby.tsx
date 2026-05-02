import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { PulseGlow } from '@/components/ui/PulseGlow';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useMatch } from '@/hooks/useMatch';
import { generateLobbyCode, generateLobbyPassword, launchWildRiftLobby } from '@/lib/wildrift';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MatchLobbyScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const { match, loading, markLive, setLobbyDetails } = useMatch(matchId);
  const [launching, setLaunching] = useState(false);
  const [riotMatchId, setRiotMatchId] = useState('');
  const [markingLive, setMarkingLive] = useState(false);

  // Auto-generate lobby code if not set
  useEffect(() => {
    if (!matchId || !match || match.wildrift_lobby_code) return;
    const code = generateLobbyCode(matchId);
    const password = generateLobbyPassword();
    setLobbyDetails(code, password);
  }, [match, matchId]);

  const lobbyCode = match?.wildrift_lobby_code ?? (matchId ? generateLobbyCode(matchId) : '------');
  const lobbyPassword = match?.wildrift_lobby_password ?? '--------';

  async function handleLaunch() {
    setLaunching(true);
    const opened = await launchWildRiftLobby(lobbyCode, lobbyPassword);
    if (!opened) {
      Alert.alert('Wild Rift Not Found', 'Install Wild Rift from the App Store or Play Store to launch the lobby directly.');
    }
    setLaunching(false);
  }

  async function handleMarkLive() {
    if (!riotMatchId.trim()) {
      Alert.alert('Riot Match ID Required', 'Enter the match ID from Wild Rift to start live tracking.');
      return;
    }
    setMarkingLive(true);
    await markLive(riotMatchId.trim());
    setMarkingLive(false);
  }

  if (loading) return (
    <SafeAreaView style={styles.safe}>
      <ActivityIndicator color={Colors.accent} style={{ flex: 1 }} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PulseGlow duration={2000} minOpacity={0.7}>
          <GlowText style={Typography.title}>🎮 Match Lobby</GlowText>
        </PulseGlow>

        {/* Lobby credentials */}
        <Card glow style={styles.lobbyCard}>
          <Text style={Typography.label}>Lobby Code</Text>
          <GlowText style={styles.lobbyCode}>{lobbyCode}</GlowText>
          <Text style={[Typography.label, { marginTop: Spacing.md }]}>Password</Text>
          <GlowText style={styles.lobbyPassword}>{lobbyPassword}</GlowText>
          <Text style={[Typography.body, { marginTop: Spacing.sm, textAlign: 'center' }]}>
            Share with all 10 players · Custom game in Wild Rift
          </Text>
        </Card>

        {/* Launch button */}
        <Button
          label="🎮 Launch Wild Rift"
          onPress={handleLaunch}
          loading={launching}
          style={styles.launchBtn}
        />

        {/* Match status cards */}
        {match?.status === 'scheduled' && (
          <Card style={styles.statusCard}>
            <Text style={Typography.label}>After the match starts in Wild Rift</Text>
            <Text style={[Typography.body, { marginTop: Spacing.xs, marginBottom: Spacing.md }]}>
              Paste the Riot Match ID here to enable live score tracking and automatic result detection.
            </Text>
            <Input
              placeholder="Riot Match ID (e.g. EUW1_7412345678)"
              value={riotMatchId}
              onChangeText={setRiotMatchId}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Button
              label="✓ Mark Match as Live"
              variant="secondary"
              onPress={handleMarkLive}
              loading={markingLive}
              style={{ marginTop: Spacing.sm }}
            />
          </Card>
        )}

        {match?.status === 'live' && (
          <Card style={[styles.statusCard, { borderColor: Colors.live + '88' }]}>
            <View style={styles.liveRow}>
              <PulseGlow duration={800} minOpacity={0.4}>
                <Text style={[styles.liveDot]}>●</Text>
              </PulseGlow>
              <Text style={[Typography.subheading, { color: Colors.live }]}>Match is LIVE</Text>
            </View>
            <Text style={[Typography.body, { marginTop: Spacing.xs }]}>
              Results are being tracked. The bracket updates automatically when the game ends.
            </Text>
            <Button
              label="Watch Live →"
              variant="secondary"
              onPress={() => router.push(`/match/${matchId}`)}
              style={{ marginTop: Spacing.md }}
            />
          </Card>
        )}

        {match?.status === 'completed' && (
          <Card style={[styles.statusCard, { borderColor: Colors.success + '88' }]}>
            <Text style={[Typography.subheading, { color: Colors.success }]}>✓ Match Complete</Text>
            <Text style={[Typography.body, { marginTop: Spacing.xs }]}>
              Results recorded. Check the tournament bracket for the outcome.
            </Text>
          </Card>
        )}

        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  lobbyCard: { alignItems: 'center', gap: 4 },
  lobbyCode: { fontSize: 32, fontWeight: '900', letterSpacing: 6, marginTop: 4 },
  lobbyPassword: { fontSize: 22, fontWeight: '800', letterSpacing: 4, marginTop: 4 },
  launchBtn: { backgroundColor: Colors.accent },
  statusCard: { gap: Spacing.sm },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  liveDot: { color: Colors.live, fontSize: 18 },
});
