import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InviteScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>();
  const { team, joinTeam } = useTeam(userId);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  async function handleJoin() {
    if (!code.trim()) { setError('Enter an invite code'); return; }
    setLoading(true);
    setError(null);
    const { error } = await joinTeam(code.trim());
    if (error) { setError(error); setLoading(false); return; }
    router.replace('/(tabs)/team');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <GlowText style={Typography.title}>📨 Join a Team</GlowText>

        {team && (
          <Card glow style={{ gap: Spacing.xs }}>
            <Text style={Typography.label}>Your Current Invite Code</Text>
            <GlowText style={[Typography.title, { letterSpacing: 6 }]}>{team.invite_code}</GlowText>
            <Text style={Typography.body}>Share this with players you want to invite</Text>
          </Card>
        )}

        <Card style={{ gap: Spacing.md }}>
          <Text style={Typography.label}>Join Another Team</Text>
          <Input
            label="Invite Code"
            placeholder="ABCD1234"
            value={code}
            onChangeText={v => setCode(v.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {error && <Text style={{ color: Colors.error, fontSize: 12 }}>{error}</Text>}
          <Button label="Join Team" onPress={handleJoin} loading={loading} />
        </Card>

        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
});
