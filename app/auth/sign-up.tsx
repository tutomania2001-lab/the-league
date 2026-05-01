import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text } from 'react-native';

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
      email,
      password,
      options: { data: { username } },
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: Spacing.lg, paddingVertical: Spacing.xl }}>
        <GlowText style={[Typography.title, { textAlign: 'center' }]}>◈ Join The League</GlowText>
        <Text style={[Typography.body, { textAlign: 'center' }]}>Create your account to enter tournaments</Text>
        <Input label="Username" placeholder="SummonerName" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Input label="Email" placeholder="you@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Password" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry />
        <Input label="Riot ID (optional)" placeholder="Name#TAG" value={riotId} onChangeText={setRiotId} autoCapitalize="none" />
        {error && <Text style={{ color: Colors.error, fontSize: 13, textAlign: 'center' }}>{error}</Text>}
        <Button label="Create Account" onPress={handleSignUp} loading={loading} />
        <Button label="Already have an account? Log in" variant="ghost" onPress={() => router.replace('/auth/log-in')} />
      </ScrollView>
    </Screen>
  );
}
