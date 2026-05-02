import { getRank, getRankLabel, getProgressToNextRank } from '@/constants/ranks';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';

type Props = {
  wins: number;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
};

export function RankBadge({ wins, showProgress = false, size = 'md' }: Props) {
  const rank = getRank(wins);
  const label = getRankLabel(wins);
  const progress = getProgressToNextRank(wins);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const iconSize = size === 'sm' ? 24 : size === 'md' ? 36 : 52;
  const fontSize = size === 'sm' ? 11 : size === 'md' ? 13 : 17;

  return (
    <View>
      <View style={[styles.badge, { backgroundColor: rank.bgColor, borderColor: rank.color + '66' }]}>
        <Image
          source={{ uri: rank.icon }}
          style={{ width: iconSize, height: iconSize }}
          resizeMode="contain"
        />
        <View>
          <Text style={[styles.label, { color: rank.color, fontSize }]}>{label}</Text>
          {showProgress && (
            <Text style={[styles.sub, { color: rank.color + 'aa' }]}>
              {wins} win{wins !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { borderColor: rank.color + '33' }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  backgroundColor: rank.color,
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  shadowColor: rank.color,
                },
              ]}
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={[styles.progressText, { color: rank.color }]}>{label}</Text>
            <Text style={[styles.progressText, { color: Colors.textMuted }]}>
              {rank.division ? `Next: ${rank.tier} ${rank.division === 'I' ? '→ ' + nextTierName(rank.tier) : romanPrev(rank.division)}` : `Next: ${nextTierName(rank.tier)}`}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

function nextTierName(tier: string): string {
  const order = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Challenger'];
  const i = order.indexOf(tier);
  return i < order.length - 1 ? order[i + 1] : 'Max';
}

function romanPrev(div: string): string {
  const map: Record<string, string> = { IV: 'III', III: 'II', II: 'I', I: 'I' };
  return map[div] ?? div;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  label: { fontWeight: '800', letterSpacing: 0.5 },
  sub: { fontSize: 10, fontWeight: '500', marginTop: 1 },
  progressContainer: { marginTop: Spacing.sm, gap: Spacing.xs },
  progressTrack: {
    height: 6, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7, shadowRadius: 4,
  },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 10, fontWeight: '600' },
});
