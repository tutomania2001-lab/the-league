import { Colors, Spacing, Typography } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated, Dimensions, Easing, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Floating gold sparkle particle
function Sparkle({ x, delay }: { x: number; delay: number }) {
  const y = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  const sc = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const run = () => {
      y.setValue(0); op.setValue(0); sc.setValue(0.5);
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(y, { toValue: -180, duration: 3000, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
          Animated.sequence([
            Animated.timing(op, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(op, { toValue: 0, duration: 2400, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(sc, { toValue: 1.2, duration: 800, useNativeDriver: true }),
            Animated.timing(sc, { toValue: 0.3, duration: 2200, useNativeDriver: true }),
          ]),
        ]),
        Animated.delay(Math.random() * 2000),
      ]).start(run);
    };
    run();
  }, []);

  return (
    <Animated.Text style={{
      position: 'absolute', left: x, bottom: 20,
      fontSize: 14, opacity: op,
      transform: [{ translateY: y }, { scale: sc }],
    }}>✦</Animated.Text>
  );
}

// Rotating outer ring
function RotatingRing({ size, duration, color, reverse }: { size: number; duration: number; color: string; reverse?: boolean }) {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(rot, { toValue: 1, duration, useNativeDriver: true, easing: Easing.linear })
    ).start();
  }, []);

  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'] });

  return (
    <Animated.View style={[styles.ring, { width: size, height: size, borderColor: color, transform: [{ rotate }] }]} />
  );
}

// Pulsing glow behind trophy
function TrophyGlow() {
  const scale = useRef(new Animated.Value(1)).current;
  const op = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.3, duration: 2000, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(op, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.2, duration: 2000, useNativeDriver: true }),
      ]),
    ])).start();
  }, []);

  return (
    <Animated.View style={[styles.trophyGlow, { opacity: op, transform: [{ scale }] }]} />
  );
}

// Trophy bounce on mount
function TrophyIcon() {
  const scale = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 6 }),
    ]).start(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])).start();
    });
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: Animated.multiply(scale, pulse) }] }}>
      <Text style={styles.trophyEmoji}>🏆</Text>
    </Animated.View>
  );
}

export default function SplashScreen() {
  const router = useRouter();

  // Staggered fade-in for text + buttons
  const titleOp = useRef(new Animated.Value(0)).current;
  const subtitleOp = useRef(new Animated.Value(0)).current;
  const buttonsOp = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(600),
      Animated.parallel([
        Animated.timing(titleOp, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.timing(subtitleOp, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(buttonsOp, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const sparklePositions = [
    { x: width * 0.3, delay: 0 },
    { x: width * 0.4, delay: 500 },
    { x: width * 0.5, delay: 1000 },
    { x: width * 0.6, delay: 300 },
    { x: width * 0.55, delay: 800 },
    { x: width * 0.35, delay: 1500 },
    { x: width * 0.45, delay: 200 },
    { x: width * 0.62, delay: 700 },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Top brand */}
        <Animated.View style={[styles.brandRow, { opacity: titleOp, transform: [{ translateY: titleY }] }]}>
          <Text style={styles.wildRiftLabel}>WILD RIFT</Text>
          <Text style={styles.brandTitle}>◈ THE LEAGUE</Text>
          <Text style={styles.brandTagline}>COMPETE · WIN · DOMINATE</Text>
        </Animated.View>

        {/* Trophy centrepiece */}
        <View style={styles.trophySection}>
          <TrophyGlow />
          <RotatingRing size={200} duration={8000} color={Colors.gold + '66'} />
          <RotatingRing size={260} duration={14000} color={Colors.accent + '44'} reverse />
          <RotatingRing size={160} duration={5000} color={Colors.gold + '99'} />
          <View style={styles.trophyCenter}>
            <TrophyIcon />
          </View>
          {sparklePositions.map((s, i) => (
            <Sparkle key={i} x={s.x - width * 0.25} delay={s.delay} />
          ))}
        </View>

        {/* Prize tagline */}
        <Animated.View style={{ opacity: subtitleOp, alignItems: 'center', gap: 6 }}>
          <Text style={styles.prizeText}>Real Prize Pools</Text>
          <Text style={styles.prizeDesc}>5v5 Wild Rift tournaments with cash prizes</Text>
        </Animated.View>

        {/* CTA buttons */}
        <Animated.View style={[styles.buttons, { opacity: buttonsOp }]}>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => router.push('/auth/sign-up')}
            activeOpacity={0.85}
          >
            <Text style={styles.btnPrimaryText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => router.push('/auth/log-in')}
            activeOpacity={0.85}
          >
            <Text style={styles.btnSecondaryText}>Log In</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Dev bypass */}
        <TouchableOpacity onPress={() => {
          const { DEV_BYPASS } = require('@/lib/dev');
          DEV_BYPASS.enabled = true;
          router.replace('/(tabs)');
        }}>
          <Text style={styles.devText}>🎮 Dev Preview</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },

  // Brand
  brandRow: { alignItems: 'center', gap: 4, marginTop: Spacing.md },
  wildRiftLabel: {
    fontSize: 11, fontWeight: '800', letterSpacing: 5,
    color: Colors.gold, textTransform: 'uppercase',
  },
  brandTitle: {
    fontSize: 34, fontWeight: '900', letterSpacing: 3,
    color: Colors.accent,
    textShadowColor: Colors.accent, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16,
  },
  brandTagline: {
    fontSize: 10, fontWeight: '700', letterSpacing: 4,
    color: Colors.textMuted, textTransform: 'uppercase',
  },

  // Trophy
  trophySection: {
    width: 280, height: 280,
    alignItems: 'center', justifyContent: 'center',
  },
  trophyGlow: {
    position: 'absolute',
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 40,
  },
  ring: {
    position: 'absolute',
    borderRadius: 999, borderWidth: 1,
    borderStyle: 'dashed',
  },
  trophyCenter: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
  },
  trophyEmoji: {
    fontSize: 96,
    textShadowColor: Colors.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },

  // Prize text
  prizeText: {
    fontSize: 22, fontWeight: '900', color: Colors.gold,
    textShadowColor: Colors.gold, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8,
  },
  prizeDesc: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  // Buttons
  buttons: { width: '100%', gap: Spacing.sm },
  btnPrimary: {
    backgroundColor: Colors.accent,
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 12,
  },
  btnPrimaryText: {
    fontSize: 16, fontWeight: '900', color: Colors.background, letterSpacing: 0.5,
  },
  btnSecondary: {
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', borderWidth: 1.5,
    borderColor: Colors.accent + '88',
    backgroundColor: 'rgba(0,200,255,0.06)',
  },
  btnSecondaryText: {
    fontSize: 16, fontWeight: '700', color: Colors.accent,
  },

  devText: { fontSize: 11, color: Colors.textDim, marginBottom: Spacing.sm },
});
