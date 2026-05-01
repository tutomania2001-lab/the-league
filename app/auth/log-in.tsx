import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

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

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: Spacing.lg }}>
        <GlowText style={[Typography.title, { textAlign: 'center', fontSize: 32 }]}>◈ THE LEAGUE</GlowText>
        <Text style={[Typography.body, { textAlign: 'center' }]}>Sign in to compete</Text>
        <Input label="Email" placeholder="you@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Password" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry />
        {error && <Text style={{ color: Colors.error, fontSize: 13, textAlign: 'center' }}>{error}</Text>}
        <Button label="Log In" onPress={handleLogIn} loading={loading} />
        <Button label="New here? Create an account" variant="ghost" onPress={() => router.push('/auth/sign-up')} />
      </View>
    </Screen>
  );
}
