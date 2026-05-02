import { supabase } from '@/lib/supabase';
import { DEV_BYPASS } from '@/lib/dev';
import { RootBackground } from '@/components/ui/RootBackground';
import { FriendsPanel } from '@/components/ui/FriendsPanel';
import { Colors } from '@/constants/theme';
import { Session } from '@supabase/supabase-js';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

const AppTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.accentBorder,
  },
};

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.id) setUserId(session.user.id);
      setLoading(false);
    });
    // Also try to get userId for dev bypass mode
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) setUserId(data.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUserId(session?.user?.id);
    });
    const linkSub = Linking.addEventListener('url', async ({ url }) => {
      if (url.includes('auth/callback') || url.includes('access_token') || url.includes('code=')) {
        const { data } = await supabase.auth.exchangeCodeForSession(url);
        if (data.session) router.replace('/(tabs)');
      }
    });
    return () => { subscription.unsubscribe(); linkSub.remove(); };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (DEV_BYPASS.enabled) return;
    const inAuthGroup = segments[0] === 'auth';
    const onSplash = segments.length === 0 || segments[0] === 'index';
    if (!session && !inAuthGroup && !onSplash) router.replace('/');
    else if (session && inAuthGroup) router.replace('/(tabs)');
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.accent} size="large" />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <ThemeProvider value={AppTheme}>
      <View style={styles.root}>
        <RootBackground />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
            cardStyle: { backgroundColor: 'transparent' },
            animation: 'fade',
          }}
        />
        {/* Persistent friends panel — shown when authenticated or dev bypass */}
        {(session || DEV_BYPASS.enabled) && <FriendsPanel userId={userId} />}
        <StatusBar style="light" />
      </View>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
});
