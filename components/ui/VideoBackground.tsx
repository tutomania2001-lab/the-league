import { AnimatedSplash } from '@/components/ui/AnimatedSplash';
import { PulseGlow } from '@/components/ui/PulseGlow';
import { Colors } from '@/constants/theme';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  videoUri: string;
  fallbackImageUri: string;
  children: React.ReactNode;
  style?: ViewStyle;
  overlayOpacity?: number;
};

export function VideoBackground({
  videoUri,
  fallbackImageUri,
  children,
  style,
  overlayOpacity = 0.55,
}: Props) {
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoOpacity = useRef(new Animated.Value(0)).current;

  const player = useVideoPlayer(videoUri, p => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }) => {
      if (status === 'readyToPlay') {
        setVideoReady(true);
        Animated.timing(videoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      }
    });
    return () => sub.remove();
  }, [player]);

  // Fallback to animated splash if video errors or takes too long
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!videoReady) setVideoError(true);
    }, 6000);
    return () => clearTimeout(timeout);
  }, [videoReady]);

  if (videoError) {
    return (
      <AnimatedSplash uri={fallbackImageUri} style={style} overlayOpacity={overlayOpacity}>
        {children}
      </AnimatedSplash>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Animated splash shows while video loads */}
      {!videoReady && (
        <AnimatedSplash
          uri={fallbackImageUri}
          style={StyleSheet.absoluteFillObject}
          overlayOpacity={overlayOpacity}
        >
          <View />
        </AnimatedSplash>
      )}

      {/* Video fades in once ready */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: videoOpacity }]}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          nativeControls={false}
        />
      </Animated.View>

      {/* Dark overlay for legibility */}
      <View style={[styles.overlay, { backgroundColor: `rgba(7,11,20,${overlayOpacity})` }]} />

      {/* Hextech corner brackets */}
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const cornerSize = 18;
const cornerWidth = 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, overflow: 'hidden' },
  overlay: { ...StyleSheet.absoluteFillObject },
  content: { flex: 1 },
  corner: {
    position: 'absolute',
    width: cornerSize,
    height: cornerSize,
    borderColor: Colors.accent,
    opacity: 0.6,
  },
  topLeft:     { top: 14, left: 14, borderTopWidth: cornerWidth, borderLeftWidth: cornerWidth },
  topRight:    { top: 14, right: 14, borderTopWidth: cornerWidth, borderRightWidth: cornerWidth },
  bottomLeft:  { bottom: 14, left: 14, borderBottomWidth: cornerWidth, borderLeftWidth: cornerWidth },
  bottomRight: { bottom: 14, right: 14, borderBottomWidth: cornerWidth, borderRightWidth: cornerWidth },
});
