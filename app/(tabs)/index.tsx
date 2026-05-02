import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { GlowText } from '@/components/ui/GlowText';
import { PulseGlow } from '@/components/ui/PulseGlow';
import { TournamentCard } from '@/components/tournament/TournamentCard';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { FEATURED_CHAMPIONS } from '@/constants/champions';
import { RIFT_IMAGES, getRiftImage } from '@/constants/rift';
import { useTournamentList } from '@/hooks/useTournament';
import { useLiveMatches } from '@/hooks/useMatch';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

function getTournamentSplash(index: number) {
  return FEATURED_CHAMPIONS[index % FEATURED_CHAMPIONS.length];
}

function TourneyThumb({ item, index, isActive, onSelect }: { item: any; index: number; isActive: boolean; onSelect: (t: any, champ: any) => void }) {
  const riftImg = getRiftImage(index);
  const champ = getTournamentSplash(index);
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.spring(scale, { toValue: isActive ? 1.08 : 1, useNativeDriver: true, friction: 6 }).start();
  }, [isActive]);
  return (
    <TouchableOpacity onPress={() => onSelect(item, champ)} activeOpacity={0.8}>
      <Animated.View style={[styles.tourneyThumb, { transform: [{ scale }], borderColor: isActive ? Colors.gold : Colors.accentBorder }]}>
        <Image source={{ uri: riftImg }} style={styles.tourneyThumbBg} resizeMode="cover" />
        <View style={styles.tourneyThumbOverlay} />
        <View style={{ flex: 1, justifyContent: 'flex-end', padding: 6 }}>
          <Text style={styles.tourneyThumbName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.tourneyThumbType}>
            {item.tournament_type === 'tournament' ? '🏟️ Official' : '⚔️ Battle'}
          </Text>
        </View>
        {item.status === 'active' && (
          <View style={styles.liveChip}><Text style={styles.liveChipText}>LIVE</Text></View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

function TournamentStrip({ tournaments, activeId, onSelect }: { tournaments: any[]; activeId: string | null; onSelect: (t: any, champ: any) => void }) {
  return (
    <FlatList
      data={tournaments}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={t => t.id}
      contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}
      renderItem={({ item, index }) => (
        <TourneyThumb item={item} index={index} isActive={activeId === item.id} onSelect={onSelect} />
      )}
    />
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { majorTournaments, teamBattles } = useTournamentList();
  const { matches: liveMatches } = useLiveMatches();
  const featuredTournaments = majorTournaments.filter(t => t.status !== 'completed');
  const activeBattles = teamBattles.filter(t => t.status !== 'completed').slice(0, 4);

  // All tournaments to show in strip
  const allActive = [...featuredTournaments, ...activeBattles];
  const defaultChamp = FEATURED_CHAMPIONS[0];
  const [activeTournament, setActiveTournament] = useState<any>(allActive[0] ?? null);
  const [activeSplash, setActiveSplash] = useState(allActive[0] ? getTournamentSplash(0) : defaultChamp);

  useEffect(() => {
    if (allActive.length > 0 && !activeTournament) {
      setActiveTournament(allActive[0]);
      setActiveSplash(getTournamentSplash(0));
    }
  }, [majorTournaments, teamBattles]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <PulseGlow duration={2200} minOpacity={0.75}>
            <GlowText style={styles.heroTitle} intensity="high">◈ THE LEAGUE</GlowText>
          </PulseGlow>
          <Text style={styles.heroLabel}>WILD RIFT TOURNAMENT PLATFORM</Text>
          <Badge variant="open" />
        </View>

        {/* Tournament splash strip — shows tournaments if any, otherwise champion splashes */}
        <View style={styles.champStrip}>
          {allActive.length > 0 ? (
            <TournamentStrip
              tournaments={allActive}
              activeId={activeTournament?.id ?? null}
              onSelect={(t, champ) => { setActiveTournament(t); setActiveSplash(champ); }}
            />
          ) : (
            // No tournaments — show rift image placeholders
            <FlatList
              data={RIFT_IMAGES.slice(0, 5)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}
              renderItem={({ item, index }) => {
                const isActive = index === 0;
                return (
                  <TouchableOpacity onPress={() => {
                    const champ = getTournamentSplash(index);
                    setActiveSplash(champ);
                  }} activeOpacity={0.8}>
                    <View style={[styles.tourneyThumb, { borderColor: isActive ? Colors.accent + '88' : Colors.accentBorder }]}>
                      <Image source={{ uri: item }} style={styles.tourneyThumbBg} resizeMode="cover" />
                      <View style={[styles.tourneyThumbOverlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]} />
                      <View style={{ flex: 1, justifyContent: 'flex-end', padding: 6 }}>
                        <Text style={styles.tourneyThumbName}>Coming Soon</Text>
                        <Text style={styles.tourneyThumbType}>🏟️ Stay tuned</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

        {/* Featured banner — tournament if active, else champion splash */}
        {activeTournament ? (
          <TouchableOpacity onPress={() => router.push(`/tournament/${activeTournament.id}`)} activeOpacity={0.88}>
            <View style={styles.featuredBanner}>
              <Image source={{ uri: activeSplash.splash }} style={StyleSheet.absoluteFillObject as any} resizeMode="cover" />
              <View style={styles.featuredBannerOverlay} />
              <View style={styles.featuredBannerContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Badge variant={activeTournament.status === 'active' ? 'active' : 'open'} />
                  <Text style={styles.featuredBannerType}>
                    {activeTournament.tournament_type === 'tournament' ? '🏟️ OFFICIAL' : '⚔️ TEAM BATTLE'}
                  </Text>
                </View>
                <GlowText style={styles.featuredBannerTitle}>{activeTournament.name}</GlowText>
                <View style={{ flexDirection: 'row', gap: Spacing.md, marginTop: 4 }}>
                  <Text style={styles.featuredBannerStat}>🏆 £{activeTournament.prize_pool > 0 ? activeTournament.prize_pool.toFixed(0) : (activeTournament.entry_fee_per_player * 36).toFixed(0)}</Text>
                  <Text style={styles.featuredBannerStat}>💰 £{activeTournament.entry_fee_per_player}/player</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          /* No tournament — show champion splash as hero */
          <View style={styles.featuredBanner}>
            <Image source={{ uri: activeSplash.splash }} style={StyleSheet.absoluteFillObject as any} resizeMode="cover" />
            <View style={styles.featuredBannerOverlay} />
            <View style={styles.featuredBannerContent}>
              <Text style={styles.featuredBannerType}>◈ THE LEAGUE</Text>
              <GlowText style={styles.featuredBannerTitle}>No tournaments live</GlowText>
              <Text style={styles.featuredBannerStat}>Check back soon for upcoming events</Text>
            </View>
          </View>
        )}

        {/* Live matches banner */}
        {liveMatches.length > 0 && (
          <View style={{ gap: Spacing.xs }}>
            <Text style={Typography.label}>🔴 Live Now</Text>
            {liveMatches.map(m => (
              <TouchableOpacity key={m.id} onPress={() => router.push(`/match/${m.id}`)}>
                <Card glow style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Badge variant="live" />
                    <Text style={[Typography.body, { marginTop: 4, color: Colors.text }]}>
                      Match in progress
                    </Text>
                  </View>
                  <GlowText style={{ fontSize: 28, fontWeight: '900' }}>{m.score_a} – {m.score_b}</GlowText>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Featured major tournaments */}
        {featuredTournaments.length > 0 && (
          <View style={{ gap: Spacing.sm }}>
            <Text style={[Typography.label, { color: Colors.gold }]}>🏟️ OFFICIAL TOURNAMENTS</Text>
            {featuredTournaments.map(t => (
              <TouchableOpacity key={t.id} onPress={() => router.push(`/tournament/${t.id}`)} activeOpacity={0.85}>
                <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.gold + '55' }}>
                  <View style={{ height: 2, backgroundColor: Colors.gold }} />
                  <View style={{ backgroundColor: 'rgba(20,14,0,0.85)', padding: Spacing.md, gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: '#fff' }}>{t.name}</Text>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: Colors.gold }}>🏆 £{t.prize_pool > 0 ? t.prize_pool.toFixed(0) : (t.entry_fee_per_player * 36).toFixed(0)}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: Colors.textMuted }}>
                      {t.prize_format === 'top_two' ? '🥈 Top 2 Prize' : '👑 Winner Takes All'} · £{t.entry_fee_per_player}/player · 8 teams
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Active team battles */}
        {activeBattles.length > 0 && (
          <View style={{ gap: Spacing.sm }}>
            <Text style={Typography.label}>⚔️ TEAM BATTLES</Text>
            {activeBattles.map(t => (
              <TournamentCard key={t.id} tournament={t} onPress={() => router.push(`/tournament/${t.id}`)} />
            ))}
          </View>
        )}

        <Card style={styles.infoCard}>
          <Text style={Typography.label}>How it works</Text>
          <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
            {['1️⃣  Top up your wallet', '2️⃣  Create or join a team of 5', '3️⃣  Enter a tournament', '4️⃣  Play in Wild Rift — results tracked live', '5️⃣  Win and get paid 🏆'].map(s => (
              <Text key={s} style={[Typography.body, { fontSize: 13 }]}>{s}</Text>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  header: { gap: Spacing.xs, paddingTop: Spacing.sm },
  heroTitle: { fontSize: 32, fontWeight: '900', letterSpacing: 2 },
  heroLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 3, color: Colors.gold, textTransform: 'uppercase' },
  champStrip: { backgroundColor: 'rgba(13,21,32,0.7)', borderRadius: 12, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.accentBorder },
  champIcon: { width: 44, height: 44, borderRadius: 8, overflow: 'hidden', borderWidth: 1 },
  champIconActive: { borderColor: Colors.accent },
  champImg: { width: 44, height: 44 },
  champName: { fontSize: 8, color: Colors.accent, textAlign: 'center', marginTop: 2, fontWeight: '700' },

  // Tournament thumbnail strip
  tourneyThumb: {
    width: 100, height: 80, borderRadius: 10, overflow: 'hidden',
    borderWidth: 1.5, justifyContent: 'flex-end',
  },
  tourneyThumbBg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  tourneyThumbOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  tourneyThumbName: { fontSize: 10, fontWeight: '800', color: '#fff', lineHeight: 13 },
  tourneyThumbType: { fontSize: 8, color: 'rgba(255,255,255,0.65)', fontWeight: '600', marginTop: 2 },
  liveChip: { position: 'absolute', top: 5, right: 5, backgroundColor: Colors.live, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  liveChipText: { fontSize: 8, fontWeight: '900', color: '#fff' },

  // Featured banner
  featuredBanner: { height: 160, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: Colors.gold + '55' },
  featuredBannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.52)' },
  featuredBannerContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md, gap: 4 },
  featuredBannerType: { fontSize: 9, fontWeight: '800', color: Colors.gold, letterSpacing: 1.5 },
  featuredBannerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  featuredBannerStat: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },

  featuredCard: { gap: Spacing.sm },
  featuredRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featuredIcon: { width: 56, height: 56, borderRadius: 10, borderWidth: 1, borderColor: Colors.accentBorder },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, alignItems: 'center', gap: 4, padding: Spacing.sm },
  infoCard: { gap: Spacing.xs },
});
