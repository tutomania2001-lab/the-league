import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { PulseGlow } from '@/components/ui/PulseGlow';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpScreen() {
  const router = useRouter();
  const [riotId, setRiotId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  async function handleSignUp() {
    if (!riotId.trim()) { setError('Riot ID is required'); return; }
    if (!email.trim()) { setError('Email is required'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    setError(null);
    const redirectTo = Linking.createURL('/auth/callback');
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: redirectTo, data: { username: riotId.trim(), riot_id: riotId.trim() } },
    });
    if (signUpError) { setError(signUpError.message); setLoading(false); return; }
    if (data.user) {
      await supabase.from('users').update({ riot_id: riotId.trim(), username: riotId.trim() }).eq('id', data.user.id);
    }
    setLoading(false);
    setConfirmed(true);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoBlock}>
            <PulseGlow duration={2000} minOpacity={0.6}>
              <GlowText style={styles.logoMain} intensity="high">◈ Join The League</GlowText>
            </PulseGlow>
            <Text style={styles.logoSub}>Your Riot ID is your identity here</Text>
          </View>

          {confirmed ? (
            <View style={styles.card}>
              <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: Spacing.sm }}>📧</Text>
              <GlowText style={[Typography.subheading, { textAlign: 'center', marginBottom: Spacing.sm }]}>Check your email</GlowText>
              <Text style={[Typography.body, { textAlign: 'center', color: Colors.text, marginBottom: Spacing.md }]}>
                We sent a confirmation link to{'\n'}
                <Text style={{ color: Colors.accent }}>{email}</Text>
                {'\n\n'}Tap the link to activate your account and log in.
              </Text>
              <Button label="Back to Log In" variant="secondary" onPress={() => router.replace('/auth/log-in')} />
            </View>
          ) : (
            <View style={styles.card}>
              <Input label="Riot ID" placeholder="Name#TAG" value={riotId} onChangeText={setRiotId} autoCapitalize="none" autoCorrect={false} />
              <Input label="Email" placeholder="you@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={{ marginTop: Spacing.md }} />
              <Input label="Password" placeholder="Min. 8 characters" value={password} onChangeText={setPassword} secureTextEntry style={{ marginTop: Spacing.md }} />
              {error && <Text style={{ color: Colors.error, fontSize: 13, textAlign: 'center', marginTop: Spacing.sm }}>{error}</Text>}
              <Button label="Create Account" onPress={handleSignUp} loading={loading} style={{ marginTop: Spacing.lg }} />
              <Button label="Already have an account? Log in" variant="ghost" onPress={() => router.replace('/auth/log-in')} style={{ marginTop: Spacing.xs }} />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flexGrow: 1, justifyContent: 'flex-end', padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },
  logoBlock: { alignItems: 'center', gap: 4 },
  logoMain: { fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  logoSub: { fontSize: 12, color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  card: { backgroundColor: 'rgba(7,11,20,0.85)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,200,255,0.25)', padding: Spacing.lg, marginBottom: Spacing.lg },
});
