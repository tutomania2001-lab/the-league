import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { GlowText } from '@/components/ui/GlowText';
import { PulseGlow } from '@/components/ui/PulseGlow';
import { TournamentCard } from '@/components/tournament/TournamentCard';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { FEATURED_CHAMPIONS } from '@/constants/champions';
import { useTournamentList } from '@/hooks/useTournament';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

function AnimatedChampIcon({ item, isActive, onPress }: { item: typeof FEATURED_CHAMPIONS[0]; isActive: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, { toValue: isActive ? 1.15 : 1, useNativeDriver: true, friction: 6 }).start();
  }, [isActive]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[styles.champIcon, { transform: [{ scale }], borderColor: isActive ? Colors.accent : Colors.accentBorder }]}>
        <Image source={{ uri: item.icon }} style={styles.champImg} />
      </Animated.View>
      {isActive && <Text style={styles.champName}>{item.name}</Text>}
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [activeChamp, setActiveChamp] = useState(FEATURED_CHAMPIONS[0]);
  const { tournaments } = useTournamentList();
  const activeTournaments = tournaments.filter(t => t.status !== 'completed').slice(0, 3);

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

        <View style={styles.champStrip}>
          <FlatList
            data={FEATURED_CHAMPIONS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={c => c.name}
            contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}
            renderItem={({ item }) => (
              <AnimatedChampIcon item={item} isActive={activeChamp.name === item.name} onPress={() => setActiveChamp(item)} />
            )}
          />
        </View>

        <Card glow style={styles.featuredCard}>
          <View style={styles.featuredRow}>
            <View style={{ flex: 1 }}>
              <Text style={Typography.label}>Season 1 · Open</Text>
              <GlowText style={[Typography.heading, { marginTop: 4 }]}>🏆 First Tournament</GlowText>
              <Text style={[Typography.body, { marginTop: 4 }]}>8 teams · $5/player entry · Winner takes all</Text>
            </View>
            <Image source={{ uri: activeChamp.icon }} style={styles.featuredIcon} />
          </View>
        </Card>

        <View style={styles.statsRow}>
          {[
            { label: 'Prize Pool', value: '$180', icon: '💰' },
            { label: 'Teams', value: '0 / 8', icon: '⚔️' },
            { label: 'Entry Fee', value: '$5', icon: '🎮' },
          ].map(s => (
            <Card key={s.label} style={styles.statCard}>
              <Text style={{ fontSize: 22 }}>{s.icon}</Text>
              <GlowText style={{ fontSize: 18, fontWeight: '800' }}>{s.value}</GlowText>
              <Text style={[Typography.label, { marginTop: 2 }]}>{s.label}</Text>
            </Card>
          ))}
        </View>

        {activeTournaments.length > 0 && (
          <View style={{ gap: Spacing.sm }}>
            <Text style={Typography.label}>Active Tournaments</Text>
            {activeTournaments.map(t => (
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
  featuredCard: { gap: Spacing.sm },
  featuredRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featuredIcon: { width: 56, height: 56, borderRadius: 10, borderWidth: 1, borderColor: Colors.accentBorder },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, alignItems: 'center', gap: 4, padding: Spacing.sm },
  infoCard: { gap: Spacing.xs },
});
