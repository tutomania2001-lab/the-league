import { Tabs, useRouter, usePathname } from 'expo-router';
import { Text, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useCallback } from 'react';

const TABS = ['/', '/tournaments', '/team', '/wallet', '/profile'];
const TAB_NAMES = ['index', 'tournaments', 'team', 'wallet', 'profile'];

function Icon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

function SwipeTabsWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const getCurrentIndex = useCallback(() => {
    // Match current path to tab index
    if (pathname === '/' || pathname === '/index' || pathname.endsWith('/(tabs)')) return 0;
    const found = TABS.findIndex(t => t !== '/' && pathname.includes(t.slice(1)));
    return found >= 0 ? found : 0;
  }, [pathname]);

  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-25, 25])   // must move 25px horizontally to activate
    .failOffsetY([-20, 20])     // cancel if moving more than 20px vertically (scrolling)
    .onEnd((e) => {
      const isSwipeLeft  = e.translationX < -60 || e.velocityX < -600;
      const isSwipeRight = e.translationX > 60  || e.velocityX > 600;
      const current = getCurrentIndex();

      if (isSwipeLeft && current < TABS.length - 1) {
        router.push(`/(tabs)/${TAB_NAMES[current + 1] === 'index' ? '' : TAB_NAMES[current + 1]}` as any);
      } else if (isSwipeRight && current > 0) {
        router.push(`/(tabs)/${TAB_NAMES[current - 1] === 'index' ? '' : TAB_NAMES[current - 1]}` as any);
      }
    });

  return (
    <GestureDetector gesture={swipe}>
      <View style={{ flex: 1 }}>
        {children}
      </View>
    </GestureDetector>
  );
}

export default function TabLayout() {
  return (
    <SwipeTabsWrapper>
      <Tabs
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          tabBarStyle: {
            backgroundColor: 'rgba(13,21,32,0.92)',
            borderTopColor: Colors.accentBorder,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: Colors.accent,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarLabelStyle: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused }) => <Icon emoji="🏠" focused={focused} /> }} />
        <Tabs.Screen name="tournaments" options={{ title: 'Tournaments', tabBarIcon: ({ focused }) => <Icon emoji="🏆" focused={focused} /> }} />
        <Tabs.Screen name="team" options={{ title: 'My Team', tabBarIcon: ({ focused }) => <Icon emoji="⚔️" focused={focused} /> }} />
        <Tabs.Screen name="wallet" options={{ title: 'Wallet', tabBarIcon: ({ focused }) => <Icon emoji="💰" focused={focused} /> }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ focused }) => <Icon emoji="👤" focused={focused} /> }} />
      </Tabs>
    </SwipeTabsWrapper>
  );
}
