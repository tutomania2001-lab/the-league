import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

export default function InviteScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>();
  const { team, joinTeam } = useTeam(userId);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  async function handleJoin() {
    if (!/^\d{5}$/.test(code)) { setError('Enter the 5-digit Wild Rift room code'); return; }
    setLoading(true);
    setError(null);
    const { error } = await joinTeam(code.trim());
    if (error) { setError(error); setLoading(false); return; }
    router.replace('/(tabs)/team');
  }

  async function copyCode() {
    if (!team?.room_code) return;
    await Clipboard.setStringAsync(team.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <GlowText style={Typography.title}>📨 Join a Team</GlowText>

        {/* Show current team's room code to share */}
        {team?.room_code && (
          <Card glow style={{ gap: Spacing.sm }}>
            <Text style={Typography.label}>🎮 Your Team's Room Code</Text>
            <Text style={[Typography.body, { fontSize: 11 }]}>
              Share this 5-digit code — teammates use it to join in Wild Rift AND in the app.
            </Text>
            <View style={styles.codeRow}>
              <GlowText style={styles.codeText}>{team.room_code}</GlowText>
              <Button
                label={copied ? '✓ Copied!' : '📋 Copy'}
                variant="secondary"
                onPress={copyCode}
                style={styles.copyBtn}
              />
            </View>
          </Card>
        )}

        {/* Join another team */}
        <Card style={{ gap: Spacing.md }}>
          <Text style={Typography.label}>Join a Team</Text>
          <Text style={[Typography.body, { fontSize: 12 }]}>
            Enter the 5-digit Wild Rift room code shared by your team captain.
          </Text>
          <Input
            label="Wild Rift Room Code (5 digits)"
            placeholder="e.g. 48271"
            value={code}
            onChangeText={v => setCode(v.replace(/[^0-9]/g, '').slice(0, 5))}
            keyboardType="numeric"
            maxLength={5}
            autoCorrect={false}
          />
          {code.length > 0 && code.length < 5 && (
            <Text style={{ color: Colors.warning, fontSize: 11 }}>
              {5 - code.length} more digit{5 - code.length !== 1 ? 's' : ''} needed
            </Text>
          )}
          {error && <Text style={{ color: Colors.error, fontSize: 12 }}>{error}</Text>}
          <Button
            label="Join Team"
            onPress={handleJoin}
            loading={loading}
            disabled={code.length !== 5}
          />
        </Card>

        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeText: { fontSize: 28, fontWeight: '900', letterSpacing: 6 },
  copyBtn: { paddingVertical: 8, paddingHorizontal: 14, minHeight: 36 },
});
