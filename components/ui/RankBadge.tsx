import { getRankFromLP, getRankLabel, getLPProgress } from '@/constants/ranks';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

type Props = {
  lp: number;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export function RankBadge({ lp, showProgress = false, size = 'md' }: Props) {
  const rank = getRankFromLP(lp);
  const label = getRankLabel(lp);
  const progress = getLPProgress(lp);

  // Pixel-based width animation — reliable across all RN versions
  const [trackWidth, setTrackWidth] = useState(0);
  const fillWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trackWidth === 0) return;
    fillWidth.setValue(0);
    const timer = setTimeout(() => {
      Animated.timing(fillWidth, {
        toValue: progress * trackWidth,
        duration: 1100,
        useNativeDriver: false,
      }).start();
    }, 400);
    return () => clearTimeout(timer);
  }, [trackWidth, progress]);

  const iconSize = size === 'sm' ? 28 : size === 'md' ? 40 : 56;
  const labelSize = size === 'sm' ? 12 : size === 'md' ? 14 : 18;

  const nextLabel = rank.division
    ? rank.division === 'I'
      ? `${nextTierName(rank.tier)} IV`
      : `${rank.tier} ${prevDiv(rank.division)}`
    : nextTierName(rank.tier);

  const lpNeeded = rank.division
    ? 100 - rank.divisionLP
    : rank.nextThreshold - rank.totalLP;

  return (
    <View>
      {/* Badge */}
      <View style={[styles.badge, { backgroundColor: rank.bgColor, borderColor: rank.color + '66' }]}>
        <Image source={{ uri: rank.icon }} style={{ width: iconSize, height: iconSize }} resizeMode="contain" />
        <View style={{ gap: 2 }}>
          <Text style={[styles.label, { color: rank.color, fontSize: labelSize }]}>{label}</Text>
          {showProgress && (
            <Text style={[styles.divLP, { color: rank.color + 'cc' }]}>{rank.divisionLP} LP</Text>
          )}
        </View>
      </View>

      {showProgress && (
        <View style={styles.section}>

          {/* Progress bar — pixel-width animated */}
          <View style={styles.trackWrap}>
            <View
              style={[styles.track, { borderColor: rank.color + '44' }]}
              onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
            >
              <Animated.View
                style={[
                  styles.fill,
                  {
                    width: fillWidth,
                    backgroundColor: rank.color,
                    shadowColor: rank.color,
                  },
                ]}
              />
            </View>
            <View style={styles.lpEnds}>
              <Text style={[styles.lpEnd, { color: Colors.textMuted }]}>0</Text>
              <Text style={[styles.lpEnd, { color: rank.color }]}>{rank.divisionLP} / 100 LP</Text>
              <Text style={[styles.lpEnd, { color: Colors.textMuted }]}>100</Text>
            </View>
          </View>

          {/* Next rank */}
          <View style={styles.nextRow}>
            <Text style={[styles.nextText, { color: Colors.textMuted }]}>
              Next rank: <Text style={{ color: rank.color }}>{nextLabel}</Text>
            </Text>
            <Text style={[styles.nextText, { color: Colors.textMuted }]}>
              {lpNeeded} LP to go
            </Text>
          </View>

          {/* Total LP — stylish panel */}
          <View style={[styles.totalPanel, { borderColor: rank.color + '55' }]}>
            <View style={styles.totalLeft}>
              <Image source={{ uri: rank.icon }} style={styles.totalIcon} resizeMode="contain" />
              <View>
                <Text style={[styles.totalTier, { color: rank.color }]}>{rank.tier.toUpperCase()}</Text>
                <Text style={[styles.totalSub, { color: Colors.textMuted }]}>SEASON STANDING</Text>
              </View>
            </View>
            <View style={styles.totalRight}>
              <Text style={[styles.totalLP, { color: rank.color, textShadowColor: rank.color }]}>
                {rank.totalLP.toLocaleString()}
              </Text>
              <Text style={[styles.totalLPLabel, { color: rank.color + '99' }]}>TOTAL LP</Text>
            </View>
          </View>

        </View>
      )}
    </View>
  );
}

function nextTierName(tier: string): string {
  const order = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger'];
  const i = order.indexOf(tier);
  return i < order.length - 1 ? order[i + 1] : 'Challenger';
}

function prevDiv(div: string): string {
  const map: Record<string, string> = { IV: 'III', III: 'II', II: 'I', I: 'I' };
  return map[div] ?? div;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing.sm, borderRadius: Radius.md,
    borderWidth: 1, alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
  },
  label: { fontWeight: '800', letterSpacing: 0.5 },
  divLP: { fontSize: 11, fontWeight: '700' },

  section: { marginTop: Spacing.sm, gap: Spacing.sm },

  trackWrap: { gap: 4 },
  track: {
    height: 10, borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, overflow: 'hidden',
  },
  fill: {
    height: '100%', borderRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 8,
  },
  lpEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  lpEnd: { fontSize: 10, fontWeight: '600' },

  nextRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  nextText: { fontSize: 11, fontWeight: '600' },

  // Total LP panel
  totalPanel: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderRadius: Radius.lg, borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
  },
  totalLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  totalIcon: { width: 36, height: 36 },
  totalTier: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  totalSub: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginTop: 1 },
  totalRight: { alignItems: 'flex-end' },
  totalLP: {
    fontSize: 28, fontWeight: '900', letterSpacing: 1,
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10,
  },
  totalLPLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 2, marginTop: 1 },
});
