import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      if (!url) return;
      const { data, error } = await supabase.auth.exchangeCodeForSession(url);
      if (data.session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/auth/log-in');
      }
    };

    // Handle the URL that opened the app
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink(url);
      else router.replace('/auth/log-in');
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={Colors.accent} size="large" />
    </View>
  );
}
