import { supabase } from '@/lib/supabase';
import { DEV_BYPASS } from '@/lib/dev';
import { Session } from '@supabase/supabase-js';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Handle email confirmation deep links
    const linkSub = Linking.addEventListener('url', async ({ url }) => {
      if (url.includes('auth/callback') || url.includes('access_token') || url.includes('code=')) {
        const { data } = await supabase.auth.exchangeCodeForSession(url);
        if (data.session) router.replace('/(tabs)');
      }
    });

    return () => {
      subscription.unsubscribe();
      linkSub.remove();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (DEV_BYPASS.enabled) return;
    const inAuthGroup = segments[0] === 'auth';
    if (!session && !inAuthGroup) {
      router.replace('/auth/log-in');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
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
    <>
      <Slot />
      <StatusBar style="light" />
    </>
  );
}
