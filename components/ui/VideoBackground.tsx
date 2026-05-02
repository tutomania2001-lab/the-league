import { AnimatedSplash } from '@/components/ui/AnimatedSplash';
import { Colors } from '@/constants/theme';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

// Single looping background video for the whole app.
// Replace this URL with any direct .mp4 link — one change updates every screen.
export const APP_VIDEO_URI = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

type Props = {
  fallbackImageUri: string;
  children: React.ReactNode;
  style?: ViewStyle;
  overlayOpacity?: number;
};

export function VideoBackground({
  fallbackImageUri,
  children,
  style,
  overlayOpacity = 0.6,
}: Props) {
  const videoOpacity = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(APP_VIDEO_URI, p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  const { status } = useEvent(player, 'statusChange', { status: player.status });

  if (status === 'readyToPlay' && videoOpacity.__getValue() === 0) {
    Animated.timing(videoOpacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }

  const isReady = status === 'readyToPlay';
  const hasError = status === 'error';

  if (hasError) {
    return (
      <AnimatedSplash uri={fallbackImageUri} style={style} overlayOpacity={overlayOpacity}>
        {children}
      </AnimatedSplash>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Animated splash shows while video loads */}
      {!isReady && (
        <AnimatedSplash
          uri={fallbackImageUri}
          style={StyleSheet.absoluteFillObject}
          overlayOpacity={overlayOpacity}
        >
          <View />
        </AnimatedSplash>
      )}

      {/* Video */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: videoOpacity }]}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />
      </Animated.View>

      {/* Dark overlay */}
      <View style={[styles.overlay, { backgroundColor: `rgba(7,11,20,${overlayOpacity})` }]} />

      {/* Hextech corners */}
      <View style={[styles.corner, styles.tl]} />
      <View style={[styles.corner, styles.tr]} />
      <View style={[styles.corner, styles.bl]} />
      <View style={[styles.corner, styles.br]} />

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const C = 18; const CW = 2;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, overflow: 'hidden' },
  overlay: StyleSheet.absoluteFillObject,
  content: { flex: 1 },
  corner: { position: 'absolute', width: C, height: C, borderColor: Colors.accent, opacity: 0.6 },
  tl: { top: 14, left: 14, borderTopWidth: CW, borderLeftWidth: CW },
  tr: { top: 14, right: 14, borderTopWidth: CW, borderRightWidth: CW },
  bl: { bottom: 14, left: 14, borderBottomWidth: CW, borderLeftWidth: CW },
  br: { bottom: 14, right: 14, borderBottomWidth: CW, borderRightWidth: CW },
});
