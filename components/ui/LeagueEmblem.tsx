import Svg, { Circle, Ellipse, Path, Polygon, Line, G } from 'react-native-svg';
import { View } from 'react-native';

type Props = { size?: number; color?: string; animate?: boolean };

// 4-pointed sparkle star
function Sparkle({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  const s = r;
  return (
    <Path
      d={`M${cx},${cy - s} L${cx + s * 0.28},${cy - s * 0.28} L${cx + s},${cy} L${cx + s * 0.28},${cy + s * 0.28} L${cx},${cy + s} L${cx - s * 0.28},${cy + s * 0.28} L${cx - s},${cy} L${cx - s * 0.28},${cy - s * 0.28} Z`}
      fill={color}
    />
  );
}

export function LeagueEmblem({ size = 120, color = '#ffffff', animate }: Props) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 110">

        {/* ── Diamond / Gem at top ── */}
        {/* Top facet */}
        <Path d="M50 14 L42 26 L50 22 L58 26 Z" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.15" strokeLinejoin="round" />
        {/* Left facet */}
        <Path d="M42 26 L50 40 L50 22 Z" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.08" strokeLinejoin="round" />
        {/* Right facet */}
        <Path d="M58 26 L50 40 L50 22 Z" stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.22" strokeLinejoin="round" />
        {/* Bottom facet */}
        <Path d="M42 26 L50 40 L58 26 Z" stroke={color} strokeWidth="1.2" fill="none" strokeLinejoin="round" />
        {/* Gem top line */}
        <Path d="M42 26 L58 26" stroke={color} strokeWidth="1" />

        {/* ── Crescent moon ── */}
        {/* Full circle */}
        <Circle cx="50" cy="50" r="18" stroke={color} strokeWidth="1.4" fill="none" />
        {/* Inner circle to create crescent — clip with white fill */}
        <Circle cx="56" cy="46" r="14" fill="#000" fillOpacity="0" stroke="none" />
        {/* Crescent arc: draw just the visible part */}
        <Path
          d="M38 44 Q36 50 38 56 Q44 66 50 68 Q56 66 62 56 Q64 50 62 44 Q56 34 50 32 Q44 34 38 44Z"
          fill="none" stroke={color} strokeWidth="1.4"
        />
        {/* Crescent inner cutout suggestion */}
        <Path
          d="M44 42 Q48 36 54 36 Q60 38 62 44"
          fill="none" stroke={color} strokeWidth="1" opacity="0.5"
        />

        {/* ── Left hand ── */}
        <Path
          d="M26 88 L22 72 Q20 62 24 55 Q27 48 32 44 Q35 41 36 45 Q34 50 33 54 Q35 50 38 47 Q41 44 42 48 Q40 52 39 56 Q41 52 44 50 Q47 48 47 52 Q45 57 44 62 Q46 58 48 57 Q51 56 50 60 Q48 66 46 72 L44 88 Z"
          stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.12" strokeLinejoin="round" strokeLinecap="round"
        />

        {/* ── Right hand (mirror) ── */}
        <Path
          d="M74 88 L78 72 Q80 62 76 55 Q73 48 68 44 Q65 41 64 45 Q66 50 67 54 Q65 50 62 47 Q59 44 58 48 Q60 52 61 56 Q59 52 56 50 Q53 48 53 52 Q55 57 56 62 Q54 58 52 57 Q49 56 50 60 Q52 66 54 72 L56 88 Z"
          stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.12" strokeLinejoin="round" strokeLinecap="round"
        />

        {/* ── Bottom hexagon connector ── */}
        <Path
          d="M44 88 L38 96 L50 102 L62 96 L56 88 Z"
          stroke={color} strokeWidth="1.2" fill={color} fillOpacity="0.1" strokeLinejoin="round"
        />

        {/* ── Sparkle stars ── */}
        {/* Left sparkle */}
        <Sparkle cx={30} cy={50} r={3} color={color} />
        {/* Right sparkle */}
        <Sparkle cx={70} cy={50} r={3} color={color} />
        {/* Small center sparkle */}
        <Sparkle cx={50} cy={57} r={2} color={color} />

        {/* ── Small dots ── */}
        <Circle cx={26} cy={44} r={1} fill={color} opacity="0.6" />
        <Circle cx={74} cy={44} r={1} fill={color} opacity="0.6" />

      </Svg>
    </View>
  );
}
