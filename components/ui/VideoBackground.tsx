import { AnimatedSplash } from '@/components/ui/AnimatedSplash';
import { Colors } from '@/constants/theme';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, View, ViewStyle } from 'react-native';

const { width, height } = Dimensions.get('window');

type Props = {
  videoId: string;
  fallbackImageUri: string;
  children: React.ReactNode;
  style?: ViewStyle;
  overlayOpacity?: number;
};

export function VideoBackground({
  videoId,
  fallbackImageUri,
  children,
  style,
  overlayOpacity = 0.55,
}: Props) {
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoOpacity = useRef(new Animated.Value(0)).current;

  function onReady() {
    setVideoReady(true);
    Animated.timing(videoOpacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }

  function onError() {
    setVideoError(true);
  }

  // If video fails just show animated splash
  if (videoError) {
    return (
      <AnimatedSplash uri={fallbackImageUri} style={style} overlayOpacity={overlayOpacity}>
        {children}
      </AnimatedSplash>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Animated splash always visible underneath */}
      <AnimatedSplash
        uri={fallbackImageUri}
        style={StyleSheet.absoluteFillObject}
        overlayOpacity={videoReady ? 0 : overlayOpacity}
      >
        <View />
      </AnimatedSplash>

      {/* YouTube video fades in once ready */}
      <Animated.View style={[styles.videoWrap, { opacity: videoOpacity }]}>
        <YoutubePlayer
          height={height * 1.2}
          width={width * 1.8}
          videoId={videoId}
          play
          mute
          loop
          webViewStyle={{ opacity: 0.99, backgroundColor: 'transparent' }}
          webViewProps={{
            allowsInlineMediaPlayback: true,
            mediaPlaybackRequiresUserAction: false,
            userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          }}
          initialPlayerParams={{
            controls: false,
            showClosedCaptions: false,
            modestbranding: true,
            rel: false,
            fs: false,
            iv_load_policy: 3,
          }}
          onReady={onReady}
          onError={onError}
        />
      </Animated.View>

      {/* Dark overlay for text legibility */}
      <View style={[styles.overlay, { backgroundColor: `rgba(7,11,20,${overlayOpacity})` }]} />

      {/* Hextech corner brackets */}
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />

      {/* Content on top */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const cornerSize = 18;
const cornerWidth = 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, overflow: 'hidden' },
  videoWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    top: -height * 0.1,
    left: -width * 0.4,
  },
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
