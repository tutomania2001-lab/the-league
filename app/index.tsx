import { Colors } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const VIDEO_URI = 'https://res.cloudinary.com/dfneopzdb/video/upload/q_100,e_sharpen:400,e_improve,w_1920,c_scale/v1777689772/All_ranked_promotion_animations_Iron_-_Challenger_with_sound_effects_-_LoL_Season_14_15_16_b89e5x.mp4';

export default function LandingScreen() {
  const router = useRouter();

  const player = useVideoPlayer(VIDEO_URI, p => {
    p.loop = true;
    p.muted = true;
    p.playbackRate = 2;
    p.play();
  });

  // Fade in UI after short delay
  const uiOp = useRef(new Animated.Value(0)).current;
  const uiY  = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(uiOp, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(uiY,  { toValue: 0, duration: 900, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.root}>

      {/* Full-screen Cloudinary video — 2x speed, looping */}
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
        allowsPictureInPicture={false}
      />

      {/* Subtle bottom gradient only — keeps buttons readable, no full overlay */}
      <View style={styles.bottomGradient} />

      {/* UI */}
      <SafeAreaView style={styles.safe} pointerEvents="box-none">
        <Animated.View style={[styles.ui, { opacity: uiOp, transform: [{ translateY: uiY }] }]}>

          {/* Logo */}
          <View style={styles.logoBlock}>
            <Text style={styles.rift}>WILD RIFT</Text>
            <Text style={styles.title}>◈ THE LEAGUE</Text>
            <View style={styles.titleBar} />
          </View>

          {/* CTAs */}
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

  video: { ...StyleSheet.absoluteFillObject },

  bottomGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },

  safe: { ...StyleSheet.absoluteFillObject },

  ui: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 28,
  },

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
