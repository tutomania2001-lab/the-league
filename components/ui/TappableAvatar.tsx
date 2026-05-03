import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  userId: string;
  avatarUrl?: string | null;
  name: string;
  size?: number;
  borderColor?: string;
  borderRadius?: number;
};

export function TappableAvatar({ userId, avatarUrl, name, size = 38, borderColor = Colors.accentBorder, borderRadius }: Props) {
  const router = useRouter();
  const br = borderRadius ?? Math.round(size * 0.22);
  const style = { width: size, height: size, borderRadius: br, borderWidth: 1, borderColor };

  return (
    <TouchableOpacity onPress={() => router.push(`/profile/${userId}`)} activeOpacity={0.75}>
      {avatarUrl
        ? <Image source={{ uri: avatarUrl }} style={style} />
        : <View style={[style, styles.fallback]}>
            <Text style={[styles.letter, { fontSize: size * 0.38, color: Colors.accent }]}>
              {(name ?? '?')[0].toUpperCase()}
            </Text>
          </View>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center' },
  letter: { fontWeight: '800' },
});
