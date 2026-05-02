import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

// YouTube video ID from https://www.youtube.com/watch?v=SomgtSsA2EI
const VIDEO_ID = 'SomgtSsA2EI';

const VIDEO_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; background: #000; overflow: hidden; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    #player {
      position: fixed;
      top: 50%;
      left: 50%;
      /* Scale up to cover entire viewport at 16:9 */
      width: 177.78vh;
      min-width: 100vw;
      height: 100vh;
      min-height: 56.25vw;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }
    iframe { border: none; pointer-events: none; }
  </style>
</head>
<body>
  <div id="player"></div>
  <script>
    var tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);

    var player;
    function onYouTubeIframeAPIReady() {
      player = new YT.Player('player', {
        videoId: '${VIDEO_ID}',
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          controls: 0,
          mute: 1,
          playsinline: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          disablekb: 1,
          fs: 0,
          loop: 0,
        },
        events: {
          onReady: function(e) {
            e.target.setVolume(0);
            e.target.setPlaybackRate(2);
            e.target.playVideo();
          },
          onStateChange: function(e) {
            // Seamless restart when ended
            if (e.data === YT.PlayerState.ENDED) {
              player.seekTo(0, true);
              player.playVideo();
            }
            // Resume if paused unexpectedly
            if (e.data === YT.PlayerState.PAUSED) {
              setTimeout(function() { player.playVideo(); }, 200);
            }
          }
        }
      });
    }

    // Safety poll — keeps it looping even if events miss
    setInterval(function() {
      try {
        if (player && player.getPlayerState && player.getPlayerState() === 0) {
          player.seekTo(0, true);
          player.playVideo();
        }
      } catch(e) {}
    }, 500);
  </script>
</body>
</html>
`;

export default function LandingScreen() {
  const router = useRouter();
  const uiOp = useRef(new Animated.Value(0)).current;
  const uiY  = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(800),
      Animated.parallel([
        Animated.timing(uiOp, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(uiY,  { toValue: 0, duration: 900, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>

      {/* Full-screen YouTube background */}
      <WebView
        source={{ html: VIDEO_HTML }}
        style={styles.video}
        scrollEnabled={false}
        bounces={false}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        pointerEvents="none"
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
        onShouldStartLoadWithRequest={() => true}
      />

      {/* Dark overlay for legibility */}
      <View style={styles.overlay} />

      {/* UI on top */}
      <SafeAreaView style={styles.safe} pointerEvents="box-none">
        <Animated.View style={[styles.ui, { opacity: uiOp, transform: [{ translateY: uiY }] }]}>

          {/* Logo */}
          <View style={styles.logoBlock}>
            <Text style={styles.rift}>WILD RIFT</Text>
            <Text style={styles.title}>◈ THE LEAGUE</Text>
            <View style={styles.titleBar} />
          </View>

          {/* CTA */}
          <View style={styles.bottomSection}>
            <View style={styles.divRow}>
              <View style={styles.divLine} />
              <Text style={styles.divLabel}>ENTER THE ARENA</Text>
              <View style={styles.divLine} />
            </View>

            <TouchableOpacity style={styles.btnGold} onPress={() => router.push('/auth/sign-up')} activeOpacity={0.8}>
              <Text style={styles.btnGoldText}>CREATE ACCOUNT</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnGhost} onPress={() => router.push('/auth/log-in')} activeOpacity={0.8}>
              <Text style={styles.btnGhostText}>LOG IN</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => {
              const { DEV_BYPASS } = require('@/lib/dev');
              DEV_BYPASS.enabled = true;
              router.replace('/(tabs)');
            }}>
              <Text style={styles.devText}>dev preview</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </SafeAreaView>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  video: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
  },

  safe: {
    ...StyleSheet.absoluteFillObject,
  },

  ui: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 28,
  },

  // Logo
  logoBlock: { alignItems: 'center', gap: 5 },
  rift: { fontSize: 11, fontWeight: '800', letterSpacing: 6, color: Colors.gold },
  title: {
    fontSize: 36, fontWeight: '900', letterSpacing: 2, color: '#fff',
    textShadowColor: Colors.accent, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18,
  },
  titleBar: {
    width: 55, height: 2, backgroundColor: Colors.gold,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6,
  },

  // Bottom
  bottomSection: { width: '100%', gap: 12, alignItems: 'center' },
  divRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },
  divLine: { flex: 1, height: 1, backgroundColor: Colors.gold + '55' },
  divLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 3, color: Colors.gold + '99' },

  btnGold: {
    width: '100%', paddingVertical: 16, backgroundColor: Colors.gold,
    alignItems: 'center', borderRadius: 2,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 14,
  },
  btnGoldText: { fontSize: 14, fontWeight: '900', letterSpacing: 3, color: '#09070a' },

  btnGhost: {
    width: '100%', paddingVertical: 15, alignItems: 'center',
    borderRadius: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)',
  },
  btnGhostText: { fontSize: 14, fontWeight: '700', letterSpacing: 3, color: 'rgba(255,255,255,0.75)' },

  devText: { fontSize: 10, color: 'rgba(255,255,255,0.12)', letterSpacing: 1, marginTop: 2, marginBottom: 8 },
});
