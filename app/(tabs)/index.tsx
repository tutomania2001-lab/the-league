import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { GlowText } from '@/components/ui/GlowText';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { FEATURED_CHAMPIONS, Splashes } from '@/constants/champions';
import { useState } from 'react';
import {
  Dimensions, FlatList, Image, ImageBackground,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [activeChamp, setActiveChamp] = useState(FEATURED_CHAMPIONS[0]);

  return (
    <View style={styles.container}>
      {/* Hero champion splash */}
      <ImageBackground source={{ uri: activeChamp.splash }} style={styles.hero} resizeMode="cover">
        <View style={styles.heroOverlay} />
        <SafeAreaView>
          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>WILD RIFT TOURNAMENT</Text>
            <GlowText style={styles.heroTitle} intensity="high">◈ THE LEAGUE</GlowText>
            <Badge variant="open" />
          </View>
        </SafeAreaView>
      </ImageBackground>

      {/* Champion selector strip */}
      <View style={styles.champStrip}>
        <FlatList
          data={FEATURED_CHAMPIONS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={c => c.name}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.sm }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => setActiveChamp(item)} activeOpacity={0.8}>
              <View style={[styles.champIcon, activeChamp.name === item.name && styles.champIconActive]}>
                <Image source={{ uri: item.icon }} style={styles.champImg} />
              </View>
              {activeChamp.name === item.name && (
                <Text style={styles.champName}>{item.name}</Text>
              )}
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Feed */}
      <ScrollView contentContainerStyle={styles.feed}>
        <Card glow style={styles.featuredCard}>
          <View style={styles.featuredRow}>
            <View style={{ flex: 1 }}>
              <Text style={Typography.label}>Season 1 · Open</Text>
              <GlowText style={[Typography.heading, { marginTop: 4 }]}>🏆 First Tournament</GlowText>
              <Text style={[Typography.body, { marginTop: 4 }]}>
                8 teams · $5/player entry · Winner takes all
              </Text>
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

        <Card style={styles.infoCard}>
          <Text style={Typography.label}>How it works</Text>
          <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
            {[
              '1️⃣  Top up your wallet',
              '2️⃣  Create or join a team of 5',
              '3️⃣  Enter a tournament',
              '4️⃣  Play in Wild Rift — results tracked live',
              '5️⃣  Win and get paid 🏆',
            ].map(step => (
              <Text key={step} style={[Typography.body, { fontSize: 13 }]}>{step}</Text>
            ))}
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { width, height: 280 },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    background: 'transparent',
    backgroundColor: 'rgba(7,11,20,0.45)',
  },
  heroContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  heroLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 3,
    color: Colors.gold, textTransform: 'uppercase',
  },
  heroTitle: { fontSize: 32, fontWeight: '900', letterSpacing: 2 },
  champStrip: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accentBorder,
    paddingVertical: Spacing.sm,
  },
  champIcon: {
    width: 44, height: 44, borderRadius: 8,
    overflow: 'hidden', borderWidth: 1, borderColor: Colors.accentBorder,
  },
  champIconActive: {
    borderColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  champImg: { width: 44, height: 44 },
  champName: {
    fontSize: 8, color: Colors.accent, textAlign: 'center',
    marginTop: 2, fontWeight: '700',
  },
  feed: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  featuredCard: { gap: Spacing.sm },
  featuredRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  featuredIcon: { width: 56, height: 56, borderRadius: 10, borderWidth: 1, borderColor: Colors.accentBorder },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, alignItems: 'center', gap: 4, padding: Spacing.sm },
  infoCard: { gap: Spacing.xs },
});
