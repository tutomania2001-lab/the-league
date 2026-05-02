import Svg, { Circle, Defs, G, Line, Path, Polygon, RadialGradient, Stop } from 'react-native-svg';
import { Animated, Easing } from 'react-native';
import { useEffect, useRef } from 'react';

type Props = { size?: number; color?: string; animate?: boolean };

export function LeagueEmblem({ size = 120, color = '#ffffff', animate = false }: Props) {
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) return;
    Animated.loop(
      Animated.timing(rot, { toValue: 1, duration: 18000, useNativeDriver: true, easing: Easing.linear })
    ).start();
  }, [animate]);

  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const gold = color;
  const dim = color + '55';

  return (
    <Animated.View style={{ width: size, height: size, transform: animate ? [{ rotate }] : [] }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">

        {/* ── Outer ring with tick marks ── */}
        <Circle cx="50" cy="50" r="47" stroke={gold} strokeWidth="0.8" fill="none" opacity="0.6" />
        <Circle cx="50" cy="50" r="44" stroke={gold} strokeWidth="0.4" fill="none" opacity="0.3" />

        {/* Rune tick marks around outer ring */}
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 360 / 24) * Math.PI / 180;
          const isMajor = i % 6 === 0;
          const isMed = i % 3 === 0;
          const r1 = 44, r2 = isMajor ? 39 : isMed ? 41 : 42;
          return (
            <Line key={i}
              x1={50 + r1 * Math.cos(angle)} y1={50 + r1 * Math.sin(angle)}
              x2={50 + r2 * Math.cos(angle)} y2={50 + r2 * Math.sin(angle)}
              stroke={gold} strokeWidth={isMajor ? 1.2 : 0.6}
              opacity={isMajor ? 0.9 : isMed ? 0.5 : 0.25}
            />
          );
        })}

        {/* ── Diamond points at cardinal positions ── */}
        {[0, 90, 180, 270].map((deg, i) => {
          const r = deg * Math.PI / 180;
          const cx = 50 + 47 * Math.cos(r);
          const cy = 50 + 47 * Math.sin(r);
          const d = 2.2;
          return <Polygon key={i} points={`${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}`} fill={gold} opacity="0.9" />;
        })}

        {/* ── Inner decorative ring ── */}
        <Circle cx="50" cy="50" r="36" stroke={gold} strokeWidth="0.5" fill="none" opacity="0.25" strokeDasharray="2 3" />

        {/* ── Hexagon in the middle ── */}
        <Polygon
          points="50,20 71,32.5 71,57.5 50,70 29,57.5 29,32.5"
          stroke={gold} strokeWidth="1" fill="none" opacity="0.35"
        />

        {/* ── Inner hexagon rotated ── */}
        <Polygon
          points="50,27 65,35.75 65,53.25 50,62 35,53.25 35,35.75"
          stroke={gold} strokeWidth="0.6" fill="none" opacity="0.2"
        />

        {/* ── Central eye / iris shape ── */}
        <Path
          d="M50 30 C60 38 65 44 65 50 C65 56 60 62 50 70 C40 62 35 56 35 50 C35 44 40 38 50 30Z"
          stroke={gold} strokeWidth="1.2" fill="none" opacity="0.5"
        />

        {/* ── Inner eye detail ── */}
        <Circle cx="50" cy="50" r="8" stroke={gold} strokeWidth="1" fill="none" opacity="0.7" />
        <Circle cx="50" cy="50" r="4" stroke={gold} strokeWidth="0.6" fill={gold} opacity="0.4" />
        <Circle cx="50" cy="50" r="2" fill={gold} opacity="0.8" />

        {/* ── Rune lines from center to hexagon corners ── */}
        {[30, 90, 150, 210, 270, 330].map((deg, i) => {
          const r = deg * Math.PI / 180;
          const x = 50 + 22 * Math.cos(r), y = 50 + 22 * Math.sin(r);
          const x2 = 50 + 10 * Math.cos(r), y2 = 50 + 10 * Math.sin(r);
          return <Line key={i} x1={x2} y1={y2} x2={x} y2={y} stroke={gold} strokeWidth="0.7" opacity="0.45" />;
        })}

        {/* ── Corner accent marks ── */}
        {[45, 135, 225, 315].map((deg, i) => {
          const r = deg * Math.PI / 180;
          const cx = 50 + 31 * Math.cos(r), cy = 50 + 31 * Math.sin(r);
          return <Circle key={i} cx={cx} cy={cy} r="1.2" fill={gold} opacity="0.5" />;
        })}

        {/* ── Top crown spike ── */}
        <Path d="M50 18 L53 24 L50 22 L47 24 Z" fill={gold} opacity="0.7" />

        {/* ── Bottom anchor ── */}
        <Path d="M50 82 L47 76 L50 78 L53 76 Z" fill={gold} opacity="0.5" />

      </Svg>
    </Animated.View>
  );
}
