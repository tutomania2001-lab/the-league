import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InviteScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>();
  const { team, joinTeam } = useTeam(userId);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  async function handleJoin() {
    if (!code.trim()) { setError('Enter a clan invite code'); return; }
    setLoading(true);
    setError(null);
    const result = await joinTeam(code.trim());
    if (result.error) { setError(result.error); setLoading(false); return; }
    if ((result as any).pendingApproval) {
      setPendingApproval(true);
      setLoading(false);
    } else {
      router.replace('/(tabs)/team');
    }
  }

  async function copyInviteCode() {
    if (!team?.invite_code) return;
    await Clipboard.setStringAsync(team.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Text style={{ color: Colors.gold, fontSize: 15, fontWeight: '600' }}>‹ Back</Text>
          </TouchableOpacity>
          <GlowText style={[Typography.heading, { color: Colors.gold }]}>👥 Invite to Clan</GlowText>
        </View>

        {/* Show current clan invite code if in a team */}
        {team?.invite_code && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Your Clan Invite Code</Text>
            <Text style={[Typography.body, { fontSize: 12, marginBottom: Spacing.sm }]}>
              Share this with players you want to invite to your clan.
            </Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{team.invite_code}</Text>
              <TouchableOpacity style={[styles.copyBtn, copied && styles.copyBtnDone]} onPress={copyInviteCode}>
                <Text style={{ color: copied ? Colors.success : Colors.gold, fontSize: 12, fontWeight: '700' }}>
                  {copied ? '✓ Copied' : '📋 Copy'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Join section — only when not in a team */}
        {!team && pendingApproval && (
          <View style={[styles.card, { borderColor: Colors.warning + '66', alignItems: 'center', gap: Spacing.md }]}>
            <Text style={{ fontSize: 40 }}>⏳</Text>
            <Text style={[Typography.subheading, { textAlign: 'center', color: Colors.warning }]}>Request Sent!</Text>
            <Text style={[Typography.body, { textAlign: 'center', fontSize: 12 }]}>
              Your request has been sent to the clan leader. You'll join once they approve.
            </Text>
            <Button label="Back to Home" variant="secondary" onPress={() => router.replace('/(tabs)')} style={{ width: '100%' }} />
          </View>
        )}

        {!team && !pendingApproval && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Join a Clan</Text>
            <Text style={[Typography.body, { fontSize: 12, marginBottom: Spacing.sm }]}>
              Enter the clan invite code — any member can share it. The leader approves your request.
            </Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={v => setCode(v.toUpperCase())}
              placeholder="e.g. A3F9X2BK"
              placeholderTextColor={Colors.textDim}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
            />
            {error && <Text style={{ color: Colors.error, fontSize: 12, marginTop: 4 }}>{error}</Text>}
            <Button
              label={loading ? 'Sending request...' : 'Request to Join'}
              onPress={handleJoin}
              loading={loading}
              disabled={!code.trim()}
              style={styles.joinBtn}
            />
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xs },
  card: {
    backgroundColor: 'rgba(10,8,3,0.85)', borderRadius: 12,
    borderWidth: 1, borderColor: Colors.gold + '44', padding: Spacing.md, gap: Spacing.xs,
  },
  cardLabel: { fontSize: 11, fontWeight: '800', color: Colors.gold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 },
  codeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(200,155,60,0.08)', borderRadius: 8, borderWidth: 1, borderColor: Colors.gold + '44', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  codeText: { fontSize: 22, fontWeight: '900', color: Colors.gold, letterSpacing: 4, textShadowColor: Colors.gold, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  copyBtn: { backgroundColor: 'rgba(200,155,60,0.15)', borderRadius: 6, borderWidth: 1, borderColor: Colors.gold + '55', paddingHorizontal: 10, paddingVertical: 5 },
  copyBtnDone: { backgroundColor: 'rgba(0,255,136,0.12)', borderColor: Colors.success + '55' },
  input: {
    backgroundColor: 'rgba(20,16,4,0.9)', borderRadius: 8, borderWidth: 1,
    borderColor: Colors.gold + '44', paddingHorizontal: Spacing.md,
    paddingVertical: 12, color: Colors.text, fontSize: 16,
    letterSpacing: 3, fontWeight: '700',
  },
  joinBtn: { backgroundColor: Colors.gold, marginTop: Spacing.sm },
});
