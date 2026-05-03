import { Colors } from '@/constants/theme';
import { DefaultAvatar } from '@/components/ui/DefaultAvatar';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, TouchableOpacity } from 'react-native';

type Props = {
  userId: string;
  avatarUrl?: string | null;
  name?: string;
  size?: number;
  borderColor?: string;
  borderRadius?: number;
};

export function TappableAvatar({ userId, avatarUrl, size = 38, borderColor = Colors.accentBorder, borderRadius }: Props) {
  const router = useRouter();
  const br = borderRadius ?? Math.round(size * 0.22);

  return (
    <TouchableOpacity onPress={() => router.push(`/profile/${userId}`)} activeOpacity={0.75}
      style={{ width: size, height: size, borderRadius: br, borderWidth: 1, borderColor, overflow: 'hidden' }}
    >
      {avatarUrl
        ? <Image source={{ uri: avatarUrl }} style={{ width: size, height: size }} />
        : <DefaultAvatar size={size} />
      }
    </TouchableOpacity>
  );
}
