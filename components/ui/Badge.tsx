import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing } from '../../constants/theme';

type Variant = 'live' | 'open' | 'active' | 'completed';

const config: Record<Variant, { label: string; color: string; bg: string }> = {
  live:      { label: '● LIVE',    color: Colors.live,      bg: 'rgba(255,68,68,0.15)' },
  open:      { label: 'OPEN',      color: Colors.accent,    bg: Colors.accentDim },
  active:    { label: 'ACTIVE',    color: Colors.warning,   bg: 'rgba(255,170,0,0.15)' },
  completed: { label: 'COMPLETED', color: Colors.textMuted, bg: Colors.surfaceAlt },
};

type Props = { variant: Variant };

export function Badge({ variant }: Props) {
  const { label, color, bg } = config[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: color + '55' }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  text: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
});
