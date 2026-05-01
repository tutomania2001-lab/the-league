import React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { Colors } from '../../constants/theme';

type Props = {
  children: React.ReactNode;
  style?: TextStyle;
  intensity?: 'low' | 'medium' | 'high';
};

const intensityMap = {
  low:    { shadowOpacity: 0.3, shadowRadius: 4 },
  medium: { shadowOpacity: 0.5, shadowRadius: 8 },
  high:   { shadowOpacity: 0.8, shadowRadius: 16 },
};

export function GlowText({ children, style, intensity = 'medium' }: Props) {
  const glow = intensityMap[intensity];
  return (
    <Text style={[
      styles.base,
      {
        textShadowColor: Colors.accent,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: glow.shadowRadius,
      },
      style,
    ]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { color: Colors.accent },
});
