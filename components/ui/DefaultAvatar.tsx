import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { View } from 'react-native';
import { Colors } from '@/constants/theme';

type Props = { size?: number; bg?: string; iconColor?: string };

export function DefaultAvatar({ size = 40, bg = Colors.accentDim, iconColor = Colors.accent }: Props) {
  const s = size;
  return (
    <View style={{ width: s, height: s, borderRadius: Math.round(s * 0.22), backgroundColor: bg, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={s} height={s} viewBox="0 0 40 40">
        {/* Head */}
        <Circle cx="20" cy="14" r="7" fill={iconColor} opacity="0.85" />
        {/* Body / shoulders */}
        <Path
          d="M6 36 Q6 26 20 26 Q34 26 34 36"
          fill={iconColor} opacity="0.85"
        />
      </Svg>
    </View>
  );
}
