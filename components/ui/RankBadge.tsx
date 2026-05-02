import { getRankFromLP, getRankLabel, getLPProgress } from '@/constants/ranks';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useEffect, useRef } from 'react';
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

  const progressAnim = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    // Small delay ensures layout is complete before animating
    const t = setTimeout(() => {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 1200,
        useNativeDriver: false,
      }).start();
      hasAnimated.current = true;
    }, 300);
    return () => clearTimeout(t);
  }, [progress]);

  const iconSize = size === 'sm' ? 28 : size === 'md' ? 40 : 56;
  const labelSize = size === 'sm' ? 12 : size === 'md' ? 14 : 18;

  const nextLabel = rank.division
    ? rank.division === 'I'
      ? nextTierName(rank.tier)
      : `${rank.tier} ${prevDiv(rank.division)}`
    : nextTierName(rank.tier);

  return (
    <View>
      {/* Badge row */}
      <View style={[styles.badge, { backgroundColor: rank.bgColor, borderColor: rank.color + '66' }]}>
        <Image source={{ uri: rank.icon }} style={{ width: iconSize, height: iconSize }} resizeMode="contain" />
        <View style={{ gap: 2 }}>
          <Text style={[styles.label, { color: rank.color, fontSize: labelSize }]}>{label}</Text>
          {showProgress && (
            <Text style={[styles.lpText, { color: rank.color + 'bb' }]}>
              {rank.division ? `${rank.divisionLP} LP` : `${rank.divisionLP} LP`}
            </Text>
          )}
        </View>
      </View>

      {/* Progress bar + LP info */}
      {showProgress && (
        <View style={styles.progressSection}>
          {/* Track */}
          <View style={[styles.track, { borderColor: rank.color + '33' }]}>
            <Animated.View
              style={[
                styles.fill,
                {
                  backgroundColor: rank.color,
                  shadowColor: rank.color,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          {/* LP labels */}
          <View style={styles.lpRow}>
            <Text style={[styles.lpSmall, { color: Colors.textMuted }]}>0 LP</Text>
            <Text style={[styles.lpSmall, { color: Colors.textMuted }]}>100 LP</Text>
          </View>

          {/* Next rank */}
          <View style={styles.nextRow}>
            <Text style={[styles.nextLabel, { color: Colors.textMuted }]}>Next: </Text>
            <Text style={[styles.nextLabel, { color: rank.color }]}>{nextLabel}</Text>
            <Text style={[styles.nextLabel, { color: Colors.textMuted }]}>
              {' '}· {100 - rank.divisionLP} LP needed
            </Text>
          </View>

          {/* Total LP */}
          <View style={[styles.totalRow, { borderColor: rank.color + '33', backgroundColor: rank.bgColor }]}>
            <Text style={[styles.totalLabel, { color: Colors.textMuted }]}>Total LP</Text>
            <Text style={[styles.totalValue, { color: rank.color }]}>{rank.totalLP.toLocaleString()} LP</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function nextTierName(tier: string): string {
  const order = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger'];
  const i = order.indexOf(tier);
  return i < order.length - 1 ? `${order[i + 1]} IV` : 'Challenger';
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
  lpText: { fontSize: 11, fontWeight: '600' },
  progressSection: { marginTop: Spacing.sm, gap: Spacing.xs },
  track: {
    height: 8, borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, overflow: 'hidden',
  },
  fill: {
    height: '100%', borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 6,
  },
  lpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  lpSmall: { fontSize: 9, fontWeight: '600' },
  nextRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  nextLabel: { fontSize: 11, fontWeight: '600' },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: Spacing.xs,
    borderRadius: Radius.md, borderWidth: 1,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
  },
  totalLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  totalValue: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
});
