import { AnimatedSplash } from '@/components/ui/AnimatedSplash';
import { Colors } from '@/constants/theme';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

// Single looping background video used throughout the entire app.
// Falls back to AnimatedSplash if the video fails to load.
// Replace this URL with your preferred LoL/Wild Rift cinematic MP4.
export const APP_VIDEO_URI = 'https://assets.mixkit.co/videos/3696/3696-720.mp4';

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
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoOpacity = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(APP_VIDEO_URI, p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'readyToPlay') {
        setVideoReady(true);
        Animated.timing(videoOpacity, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }).start();
      }
      if (error) setVideoError(true);
    });
    // Fallback after 8s if video never loads
    const timeout = setTimeout(() => {
      if (!videoReady) setVideoError(true);
    }, 8000);
    return () => { sub.remove(); clearTimeout(timeout); };
  }, [player]);

  if (videoError) {
    return (
      <AnimatedSplash uri={fallbackImageUri} style={style} overlayOpacity={overlayOpacity}>
        {children}
      </AnimatedSplash>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Fallback splash visible while video loads */}
      {!videoReady && (
        <AnimatedSplash
          uri={fallbackImageUri}
          style={StyleSheet.absoluteFillObject}
          overlayOpacity={overlayOpacity}
        >
          <View />
        </AnimatedSplash>
      )}

      {/* Video fades in */}
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

      {/* Overlay */}
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
