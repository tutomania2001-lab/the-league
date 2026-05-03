import Svg, { Path, Line, G } from 'react-native-svg';
import { View } from 'react-native';

type Props = { size?: number; color?: string; animate?: boolean };

export function LeagueEmblem({ size = 120, color = '#ffffff' }: Props) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 120">

        {/* ── Star at top ── */}
        <Path
          d="M50 4 L52.4 11.2 L60 11.2 L54 15.6 L56.4 22.8 L50 18.4 L43.6 22.8 L46 15.6 L40 11.2 L47.6 11.2 Z"
          fill={color}
        />

        {/* ── Cup rim ── */}
        <Path d="M18 28 L82 28" stroke={color} strokeWidth="3" strokeLinecap="round" />

        {/* ── Cup body ── */}
        <Path
          d="M20 28 Q18 48 36 64 Q50 70 64 64 Q82 48 80 28 Z"
          stroke={color} strokeWidth="2" fill={color} fillOpacity="0.12"
          strokeLinejoin="round"
        />

        {/* ── Cup inner highlight line ── */}
        <Path
          d="M32 36 L68 36"
          stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.4"
        />

        {/* ── Left handle ── */}
        <Path
          d="M20 36 Q4 36 4 50 Q4 64 20 62"
          stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round"
        />

        {/* ── Right handle ── */}
        <Path
          d="M80 36 Q96 36 96 50 Q96 64 80 62"
          stroke={color} strokeWidth="2.2" fill="none" strokeLinecap="round"
        />

        {/* ── Stem ── */}
        <Path
          d="M42 66 L42 84 L58 84 L58 66"
          stroke={color} strokeWidth="2" fill={color} fillOpacity="0.1"
          strokeLinejoin="round"
        />

        {/* ── Upper base ── */}
        <Path
          d="M28 84 L72 84 L72 93 L28 93 Z"
          stroke={color} strokeWidth="2" fill={color} fillOpacity="0.1"
          strokeLinejoin="round"
        />

        {/* ── Lower base ── */}
        <Path
          d="M16 93 L84 93 L84 104 L16 104 Z"
          stroke={color} strokeWidth="2" fill={color} fillOpacity="0.1"
          strokeLinejoin="round"
        />

      </Svg>
    </View>
  );
}
