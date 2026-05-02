import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  color?: string;
  minOpacity?: number;
  maxOpacity?: number;
  duration?: number;
};

export function PulseGlow({
  children,
  style,
  color = Colors.accent,
  minOpacity = 0.3,
  maxOpacity = 1,
  duration = 2000,
}: Props) {
  const opacity = useRef(new Animated.Value(maxOpacity)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: minOpacity, duration, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: maxOpacity, duration, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[{ opacity }, style]}>
      {children}
    </Animated.View>
  );
}
