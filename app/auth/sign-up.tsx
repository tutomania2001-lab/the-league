import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Splashes } from '@/constants/champions';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [riotId, setRiotId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignUp() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email, password, options: { data: { username } },
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <ImageBackground source={{ uri: Splashes.Ahri }} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.logoBlock}>
              <GlowText style={styles.logoMain} intensity="high">◈ Join The League</GlowText>
              <Text style={styles.logoSub}>Create your account to compete</Text>
            </View>
            <View style={styles.card}>
              <Input label="Username" placeholder="SummonerName" value={username} onChangeText={setUsername} autoCapitalize="none" />
              <Input label="Email" placeholder="you@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={{ marginTop: Spacing.md }} />
              <Input label="Password" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry style={{ marginTop: Spacing.md }} />
              <Input label="Riot ID (optional)" placeholder="Name#TAG" value={riotId} onChangeText={setRiotId} autoCapitalize="none" style={{ marginTop: Spacing.md }} />
              {error && <Text style={{ color: Colors.error, fontSize: 13, textAlign: 'center', marginTop: Spacing.sm }}>{error}</Text>}
              <Button label="Create Account" onPress={handleSignUp} loading={loading} style={{ marginTop: Spacing.lg }} />
              <Button label="Already have an account? Log in" variant="ghost" onPress={() => router.replace('/auth/log-in')} style={{ marginTop: Spacing.xs }} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: Colors.background },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(7,11,20,0.70)' },
  scroll: { flexGrow: 1, justifyContent: 'flex-end', padding: Spacing.lg, gap: Spacing.lg },
  logoBlock: { alignItems: 'center', gap: 4 },
  logoMain: { fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  logoSub: { fontSize: 12, color: Colors.textMuted, letterSpacing: 1, textTransform: 'uppercase' },
  card: {
    backgroundColor: 'rgba(13,21,32,0.92)',
    borderRadius: 16, borderWidth: 1,
    borderColor: Colors.accentBorder,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
});
