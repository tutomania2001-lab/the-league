import HomeScreen from '@/app/(tabs)/index';
import TournamentsScreen from '@/app/(tabs)/tournaments';
import TeamScreen from '@/app/(tabs)/team';
import WalletScreen from '@/app/(tabs)/wallet';
import ProfileScreen from '@/app/(tabs)/profile';
import SwipePager from '@/components/ui/SwipePager';
import { Colors } from '@/constants/theme';
import { useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const pagerRef = useRef<any>(null);
  const insets = useSafeAreaInsets();
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  function goTo(index: number) {
    pagerRef.current?.setPage(index);
    setActiveIndex(index);
  }

  function handlePageScroll(e: any) {
    const offset = e.nativeEvent?.offset ?? 0;
    // Peaks at 0.18 opacity mid-swipe then back to 0 when settled
    const v = Math.sin(offset * Math.PI) * 0.22;
    overlayOpacity.setValue(v);
  }

  return (
    <View style={styles.container}>
      <SwipePager
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e: any) => {
          setActiveIndex(e.nativeEvent?.position ?? activeIndex);
          overlayOpacity.setValue(0);
        }}
        onPageScroll={handlePageScroll}
        overdrag
        overScrollMode="never"
      >
        {SCREENS.map((screen, i) => (
          <View key={i} style={[styles.page, Platform.OS === 'web' && { display: activeIndex === i ? 'flex' : 'none' }]} collapsable={false}>
            {screen}
          </View>
        ))}
      </SwipePager>
      {/* Crossfade overlay — darkens mid-swipe to disguise the side-by-side seam */}
      <Animated.View pointerEvents="none" style={[styles.swipeOverlay, { opacity: overlayOpacity }]} />

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
  swipeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    pointerEvents: 'none',
    zIndex: 5,
    bottom: 68,
  },
});
