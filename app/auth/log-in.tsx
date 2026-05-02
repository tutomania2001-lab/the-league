import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { VideoBackground } from '@/components/ui/VideoBackground';
import { PulseGlow } from '@/components/ui/PulseGlow';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { ChampionVideos, VideoFallbacks } from '@/constants/videos';
import { supabase } from '@/lib/supabase';
import { DEV_BYPASS } from '@/lib/dev';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LogInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogIn() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  function handleDevPreview() {
    DEV_BYPASS.enabled = true;
    router.replace('/(tabs)');
  }

  return (
    <VideoBackground videoUri={ChampionVideos.login} fallbackImageUri={VideoFallbacks.login} style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

            {/* Logo */}
            <View style={styles.logoBlock}>
              <Text style={styles.logoTop}>WILD RIFT</Text>
              <PulseGlow duration={2500} minOpacity={0.7}>
                <GlowText style={styles.logoMain} intensity="high">◈ THE LEAGUE</GlowText>
              </PulseGlow>
              <Text style={styles.logoSub}>Compete. Win. Dominate.</Text>
            </View>

            {/* Form card */}
            <View style={styles.card}>
              <Input
                label="Email"
                placeholder="you@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Input
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={{ marginTop: Spacing.md }}
              />
              {error && (
                <Text style={{ color: Colors.error, fontSize: 13, textAlign: 'center', marginTop: Spacing.sm }}>
                  {error}
                </Text>
              )}
              <Button label="Log In" onPress={handleLogIn} loading={loading} style={{ marginTop: Spacing.md }} />
              <Button
                label="New here? Create an account"
                variant="ghost"
                onPress={() => router.push('/auth/sign-up')}
                style={{ marginTop: Spacing.xs }}
              />
            </View>

            {/* Dev bypass */}
            <View style={styles.devRow}>
              <Button
                label="🎮 Dev Preview — Skip Login"
                variant="secondary"
                onPress={handleDevPreview}
                style={{ borderColor: Colors.gold }}
              />
              <Text style={styles.devLabel}>Preview only · no Supabase required</Text>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </VideoBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: Colors.background },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,11,20,0.72)',
  },
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  logoBlock: {
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.sm,
  },
  logoTop: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 4,
    color: Colors.gold,
    textTransform: 'uppercase',
  },
  logoMain: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 3,
  },
  logoSub: {
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: 'rgba(13,21,32,0.92)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    padding: Spacing.lg,
  },
  devRow: {
    gap: Spacing.xs,
    paddingBottom: Spacing.lg,
  },
  devLabel: {
    textAlign: 'center',
    fontSize: 10,
    color: Colors.textDim,
    letterSpacing: 0.5,
  },
});
