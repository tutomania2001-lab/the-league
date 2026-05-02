import HomeScreen from '@/app/(tabs)/index';
import TournamentsScreen from '@/app/(tabs)/tournaments';
import TeamScreen from '@/app/(tabs)/team';
import WalletScreen from '@/app/(tabs)/wallet';
import ProfileScreen from '@/app/(tabs)/profile';
import { Colors } from '@/constants/theme';
import { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = [
  { name: 'index',       emoji: '🏠', label: 'Home' },
  { name: 'tournaments', emoji: '🏆', label: 'Tournaments' },
  { name: 'team',        emoji: '⚔️', label: 'My Team' },
  { name: 'wallet',      emoji: '💰', label: 'Wallet' },
  { name: 'profile',     emoji: '👤', label: 'Profile' },
];

const SCREENS = [
  <HomeScreen key="home" />,
  <TournamentsScreen key="tournaments" />,
  <TeamScreen key="team" />,
  <WalletScreen key="wallet" />,
  <ProfileScreen key="profile" />,
];

export default function TabLayout() {
  const [activeIndex, setActiveIndex] = useState(0);
  const pagerRef = useRef<PagerView>(null);
  const insets = useSafeAreaInsets();

  function goTo(index: number) {
    pagerRef.current?.setPage(index);
    setActiveIndex(index);
  }

  return (
    <View style={styles.container}>
      {/* Pager — handles swipe natively */}
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={e => setActiveIndex(e.nativeEvent.position)}
        overdrag
        overScrollMode="never"
      >
        {SCREENS.map((screen, i) => (
          <View key={i} style={styles.page} collapsable={false}>
            {screen}
          </View>
        ))}
      </PagerView>

      {/* Bottom tab bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom || 8 }]}>
        {TABS.map((tab, i) => {
          const focused = activeIndex === i;
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => goTo(i)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.45 }]}>
                {tab.emoji}
              </Text>
              <Text style={[styles.tabLabel, { color: focused ? Colors.accent : Colors.textMuted }]}>
                {tab.label}
              </Text>
              {focused && <View style={[styles.tabIndicator, { backgroundColor: Colors.accent }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  pager: { flex: 1 },
  page: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(13,21,32,0.95)',
    borderTopWidth: 1,
    borderTopColor: Colors.accentBorder,
    height: 60,
    paddingTop: 4,
  },
  tab: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2,
    position: 'relative',
  },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  tabIndicator: {
    position: 'absolute', top: 0, left: '25%', right: '25%',
    height: 2, borderRadius: 1,
  },
});
