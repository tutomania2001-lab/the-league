import Svg, {
  Circle, Ellipse, G, Line, Path, Polygon, Rect,
} from 'react-native-svg';

type Props = {
  size?: number;
  color?: string;
};

export function LeagueEmblem({ size = 120, color = '#ffffff' }: Props) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.46;

  return (
    <Svg width={s} height={s} viewBox="0 0 100 100">
      {/* ── Outer double ring ───────────────────────────── */}
      <Circle cx="50" cy="50" r="46" stroke={color} strokeWidth="1.8" fill="none" opacity="0.9" />
      <Circle cx="50" cy="50" r="43" stroke={color} strokeWidth="0.7" fill="none" opacity="0.5" />

      {/* ── Tick marks around ring (like runic text) ──── */}
      {Array.from({ length: 32 }).map((_, i) => {
        const angle = (i * 360) / 32;
        const rad = (angle * Math.PI) / 180;
        const r1 = 43.5;
        const r2 = i % 4 === 0 ? 40 : 41.5;
        const x1 = 50 + r1 * Math.cos(rad);
        const y1 = 50 + r1 * Math.sin(rad);
        const x2 = 50 + r2 * Math.cos(rad);
        const y2 = 50 + r2 * Math.sin(rad);
        return (
          <Line
            key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={color} strokeWidth={i % 4 === 0 ? 1.2 : 0.6}
            opacity={i % 4 === 0 ? 0.8 : 0.4}
          />
        );
      })}

      {/* ── Small diamond accents at cardinal points ──── */}
      {[0, 90, 180, 270].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const cx = 50 + 46 * Math.cos(rad);
        const cy = 50 + 46 * Math.sin(rad);
        const d = 1.8;
        return (
          <Polygon
            key={i}
            points={`${cx},${cy - d} ${cx + d},${cy} ${cx},${cy + d} ${cx - d},${cy}`}
            fill={color} opacity="0.9"
          />
        );
      })}

      {/* ── Central phoenix / crown emblem ──────────────
           Built from paths to match LoL tournament style  */}

      {/* Crown — top teardrop/flame shape */}
      <Path
        d="M50 14 C50 14 46 20 44 26 C42 32 45 36 50 37 C55 36 58 32 56 26 C54 20 50 14 50 14Z"
        stroke={color} strokeWidth="1.4" fill="none" strokeLinejoin="round"
      />
      {/* Inner crown notch */}
      <Path
        d="M50 19 L48 27 L50 30 L52 27 Z"
        stroke={color} strokeWidth="0.8" fill="none"
      />

      {/* Left wing */}
      <Path
        d="M44 34 C40 32 34 30 28 34 C24 37 26 42 30 43 C34 44 38 40 42 38"
        stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M44 34 C41 36 36 38 32 37 C30 36 30 34 32 33"
        stroke={color} strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.6"
      />

      {/* Right wing */}
      <Path
        d="M56 34 C60 32 66 30 72 34 C76 37 74 42 70 43 C66 44 62 40 58 38"
        stroke={color} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
      <Path
        d="M56 34 C59 36 64 38 68 37 C70 36 70 34 68 33"
        stroke={color} strokeWidth="0.7" fill="none" strokeLinecap="round" opacity="0.6"
      />

      {/* Body — central vertical pillar */}
      <Path
        d="M47 37 L44 48 L46 52 L50 54 L54 52 L56 48 L53 37"
        stroke={color} strokeWidth="1.3" fill="none" strokeLinejoin="round"
      />
      {/* Body inner detail */}
      <Path
        d="M50 39 L48.5 46 L50 49 L51.5 46 Z"
        stroke={color} strokeWidth="0.7" fill="none"
      />

      {/* Lower spread — v-shape feathers below body */}
      <Path
        d="M46 52 L38 60 L42 62 L50 56 L58 62 L62 60 L54 52"
        stroke={color} strokeWidth="1.3" fill="none" strokeLinejoin="round"
      />
      <Path
        d="M46 54 L40 60 M54 54 L60 60"
        stroke={color} strokeWidth="0.6" fill="none" strokeLinecap="round" opacity="0.6"
      />

      {/* Base diamond / crest bottom */}
      <Path
        d="M50 56 L46 64 L50 68 L54 64 Z"
        stroke={color} strokeWidth="1.3" fill="none" strokeLinejoin="round"
      />
      {/* Inner base diamond */}
      <Path
        d="M50 59 L48 64 L50 66 L52 64 Z"
        stroke={color} strokeWidth="0.6" fill="none" opacity="0.6"
      />

      {/* Wing tip accents */}
      <Path d="M28 34 L25 31 M72 34 L75 31" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <Path d="M26 38 L22 37 M74 38 L78 37" stroke={color} strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />

      {/* Side decorative lines flanking body */}
      <Path d="M43 44 L40 46 M57 44 L60 46" stroke={color} strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
    </Svg>
  );
}
