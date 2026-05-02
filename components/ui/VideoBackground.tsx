import { AnimatedSplash } from '@/components/ui/AnimatedSplash';
import { Colors } from '@/constants/theme';
import { ResizeMode, Video } from 'expo-av';
import { useRef, useState } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

// Single looping background video for the whole app.
// Swap this URL for any direct .mp4 link — one change updates every screen.
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
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoOpacity = useRef(new Animated.Value(0)).current;

  function onReadyForDisplay() {
    setVideoReady(true);
    Animated.timing(videoOpacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }

  if (videoError) {
    return (
      <AnimatedSplash uri={fallbackImageUri} style={style} overlayOpacity={overlayOpacity}>
        {children}
      </AnimatedSplash>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Animated splash shows instantly while video loads */}
      {!videoReady && (
        <AnimatedSplash
          uri={fallbackImageUri}
          style={StyleSheet.absoluteFillObject}
          overlayOpacity={overlayOpacity}
        >
          <View />
        </AnimatedSplash>
      )}

      {/* expo-av Video — works natively in Expo Go */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: videoOpacity }]}>
        <Video
          source={{ uri: APP_VIDEO_URI }}
          style={StyleSheet.absoluteFillObject}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
          onReadyForDisplay={onReadyForDisplay}
          onError={() => setVideoError(true)}
          useNativeControls={false}
        />
      </Animated.View>

      {/* Dark overlay for text legibility */}
      <View style={[styles.overlay, { backgroundColor: `rgba(7,11,20,${overlayOpacity})` }]} />

      {/* Hextech corner brackets */}
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
