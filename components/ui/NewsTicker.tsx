import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');
const TICKER_HEIGHT = 26;

type NewsItem = { id: string; text: string; type: 'live' | 'new' | 'info'; route?: string };

function buildNews(tournaments: any[], matches: any[]): NewsItem[] {
  const items: NewsItem[] = [];

  // Live matches
  matches.forEach(m => {
    items.push({
      id: `match-${m.id}`,
      text: `🔴 LIVE MATCH IN PROGRESS · Round ${m.round === 1 ? 'QF' : m.round === 2 ? 'SF' : 'FINAL'} · Score ${m.score_a}–${m.score_b}`,
      type: 'live',
      route: `/match/${m.id}`,
    });
  });

  // Active tournaments
  tournaments.filter(t => t.status === 'active').forEach(t => {
    items.push({
      id: `active-${t.id}`,
      text: `⚔️ TOURNAMENT LIVE · ${t.name} · Prize Pool £${t.prize_pool > 0 ? t.prize_pool.toFixed(0) : (t.entry_fee_per_player * 36).toFixed(0)}`,
      type: 'live',
      route: `/tournament/${t.id}`,
    });
  });

  // Open tournaments
  tournaments.filter(t => t.status === 'open').forEach(t => {
    const type = t.tournament_type === 'tournament' ? '🏟️ OFFICIAL' : '⚔️ TEAM BATTLE';
    items.push({
      id: `open-${t.id}`,
      text: `${type} · ${t.name} · Open for registration · £${t.entry_fee_per_player}/player · Prize £${t.prize_pool > 0 ? t.prize_pool.toFixed(0) : (t.entry_fee_per_player * 36).toFixed(0)}`,
      type: 'new',
      route: `/tournament/${t.id}`,
    });
  });

  if (items.length === 0) {
    items.push({ id: 'default', text: '◈ THE LEAGUE · Wild Rift Tournaments · Compete for real prize pools · Register your team now', type: 'info' });
  }

  return items;
}

export function NewsTicker() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useRef(new Animated.Value(width)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  async function fetchNews() {
    const [{ data: tournaments }, { data: matches }] = await Promise.all([
      supabase.from('tournaments').select('*').neq('status', 'cancelled').neq('status', 'completed'),
      supabase.from('matches').select('*').eq('status', 'live'),
    ]);
    const items = buildNews(tournaments ?? [], matches ?? []);
    setNewsItems(items);
  }

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!newsItems.length) return;
    runTicker();
    return () => { animation.current?.stop(); };
  }, [newsItems, currentIndex]);

  function runTicker() {
    translateX.setValue(width);
    animation.current = Animated.timing(translateX, {
      toValue: -width * 1.5,
      duration: 14000,
      useNativeDriver: true,
      easing: Easing.linear,
    });
    animation.current.start(({ finished }) => {
      if (finished) {
        setCurrentIndex(prev => (prev + 1) % newsItems.length);
      }
    });
  }

  if (!newsItems.length) return null;

  const item = newsItems[currentIndex];
  const dotColor = item.type === 'live' ? Colors.live : item.type === 'new' ? Colors.accent : Colors.gold;

  return (
    <TouchableOpacity
      style={[styles.ticker, { marginTop: insets.top }]}
      activeOpacity={0.9}
      onPress={() => item.route && router.push(item.route as any)}
    >
      {/* Left dot indicator */}
      <View style={[styles.dot, { backgroundColor: dotColor }]} />

      {/* Sliding text */}
      <View style={styles.textWrap}>
        <Animated.Text
          style={[styles.text, { transform: [{ translateX }] }]}
          numberOfLines={1}
        >
          {item.text}
          {'     ·     '}
          {item.text}
        </Animated.Text>
      </View>

      {/* Right dot count */}
      <View style={styles.counter}>
        <Text style={styles.counterText}>{currentIndex + 1}/{newsItems.length}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  ticker: {
    height: TICKER_HEIGHT,
    backgroundColor: 'rgba(8,6,0,0.92)',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gold + '44',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  dot: {
    width: 6, height: 6, borderRadius: 3, marginRight: 6,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 4,
  },
  textWrap: { flex: 1, overflow: 'hidden' },
  text: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.gold,
    letterSpacing: 0.5,
    whiteSpace: 'nowrap',
  } as any,
  counter: {
    backgroundColor: 'rgba(200,155,60,0.15)',
    borderRadius: 4, borderWidth: 1, borderColor: Colors.gold + '33',
    paddingHorizontal: 5, paddingVertical: 1, marginLeft: 6,
  },
  counterText: { fontSize: 8, color: Colors.gold + 'aa', fontWeight: '700' },
});
