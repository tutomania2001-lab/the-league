import { getRank, getRankLabel, getProgressToNextRank } from '@/constants/ranks';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

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
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const sizes = {
    sm: { emoji: 14, text: 11, padding: 4 },
    md: { emoji: 18, text: 13, padding: 6 },
    lg: { emoji: 24, text: 16, padding: 8 },
  };
  const s = sizes[size];

  return (
    <View>
      <View style={[
        styles.badge,
        { backgroundColor: rank.bgColor, borderColor: rank.color + '55', padding: s.padding },
      ]}>
        <Text style={{ fontSize: s.emoji }}>{rank.emoji}</Text>
        <Text style={[styles.label, { color: rank.color, fontSize: s.text }]}>{label}</Text>
      </View>

      {showProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
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
          <Text style={[styles.progressText, { color: rank.color }]}>
            {wins} win{wins !== 1 ? 's' : ''} · {label}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: { fontWeight: '700', letterSpacing: 0.5 },
  progressContainer: { marginTop: Spacing.xs, gap: 4 },
  progressTrack: {
    height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 4,
  },
  progressText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
});
