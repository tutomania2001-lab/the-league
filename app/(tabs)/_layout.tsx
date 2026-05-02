import HomeScreen from '@/app/(tabs)/index';
import TournamentsScreen from '@/app/(tabs)/tournaments';
import TeamScreen from '@/app/(tabs)/team';
import WalletScreen from '@/app/(tabs)/wallet';
import ProfileScreen from '@/app/(tabs)/profile';
import { Colors } from '@/constants/theme';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// PagerView is native-only — import conditionally
let PagerView: any = null;
if (Platform.OS !== 'web') {
  PagerView = require('react-native-pager-view').default;
}

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
  const pagerRef = useRef<any>(null);
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  function goTo(index: number) {
    if (!isWeb) pagerRef.current?.setPage(index);
    setActiveIndex(index);
  }

  return (
    <View style={styles.container}>
      {/* Native: PagerView with swipe. Web: simple view switcher */}
      {isWeb || !PagerView ? (
        <View style={styles.pager}>
          {SCREENS.map((screen, i) => (
            <View key={i} style={[styles.page, { display: activeIndex === i ? 'flex' : 'none' }]}>
              {screen}
            </View>
          ))}
        </View>
      ) : (
        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={0}
          onPageSelected={(e: any) => setActiveIndex(e.nativeEvent.position)}
          overdrag
          overScrollMode="never"
        >
          {SCREENS.map((screen, i) => (
            <View key={i} style={styles.page} collapsable={false}>
              {screen}
            </View>
          ))}
        </PagerView>
      )}

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
