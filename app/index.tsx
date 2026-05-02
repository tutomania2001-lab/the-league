import { Colors } from '@/constants/theme';
import { Splashes } from '@/constants/champions';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated, Dimensions, Easing, Image,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Floating ember / spark particle
function Ember({ x, size, delay, color }: { x: number; size: number; delay: number; color: string }) {
  const y = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = () => {
      y.setValue(0); op.setValue(0); drift.setValue(0);
      const dur = 3500 + Math.random() * 3000;
      Animated.sequence([
        Animated.delay(delay + Math.random() * 2000),
        Animated.parallel([
          Animated.timing(y, { toValue: -(height * 0.55), duration: dur, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
          Animated.sequence([
            Animated.timing(op, { toValue: 0.9, duration: 400, useNativeDriver: true }),
            Animated.timing(op, { toValue: 0, duration: dur - 400, useNativeDriver: true }),
          ]),
          Animated.timing(drift, { toValue: (Math.random() - 0.5) * 60, duration: dur, useNativeDriver: true }),
        ]),
      ]).start(run);
    };
    run();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', bottom: height * 0.28,
      left: x, width: size, height: size, borderRadius: size,
      backgroundColor: color, opacity: op,
      transform: [{ translateY: y }, { translateX: drift }],
      shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: size * 2,
    }} />
  );
}

// Pulsing glow circle behind trophy
function GlowOrb() {
  const scale = useRef(new Animated.Value(0.8)).current;
  const op = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    Animated.loop(Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.2, duration: 2500, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(scale, { toValue: 0.8, duration: 2500, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ]),
      Animated.sequence([
        Animated.timing(op, { toValue: 0.5, duration: 2500, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.2, duration: 2500, useNativeDriver: true }),
      ]),
    ])).start();
  }, []);

  return (
    <Animated.View style={[styles.glowOrb, { opacity: op, transform: [{ scale }] }]} />
  );
}

// Slow rotating hexagon ring
function HexRing({ size, duration, color, width: bw = 1, reverse }: any) {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(rot, { toValue: 1, duration, useNativeDriver: true, easing: Easing.linear })
    ).start();
  }, []);
  const rotate = rot.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'] });
  return (
    <Animated.View style={{
      position: 'absolute', width: size, height: size, borderRadius: 8,
      borderWidth: bw, borderColor: color, transform: [{ rotate }],
    }} />
  );
}

// Trophy rises into frame
function Trophy() {
  const translateY = useRef(new Animated.Value(60)).current;
  const op = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 40, friction: 8 }),
        Animated.timing(op, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    ]).start(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(pulse, { toValue: 1, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])).start();
    });
  }, []);

  return (
    <Animated.View style={{ opacity: op, transform: [{ translateY }, { scale: pulse }] }}>
      <Text style={styles.trophyEmoji}>🏆</Text>
    </Animated.View>
  );
}

export default function LandingScreen() {
  const router = useRouter();

  const logoOp = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(-30)).current;
  const btnsOp = useRef(new Animated.Value(0)).current;
  const btnsY = useRef(new Animated.Value(40)).current;
  const divOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(logoOp, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(logoY, { toValue: 0, duration: 900, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]),
      Animated.timing(divOp, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(btnsOp, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(btnsY, { toValue: 0, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]),
    ]).start();
  }, []);

  const embers = [
    { x: width * 0.25, size: 3, delay: 0,    color: Colors.gold },
    { x: width * 0.35, size: 2, delay: 600,  color: Colors.accent },
    { x: width * 0.45, size: 4, delay: 200,  color: Colors.gold },
    { x: width * 0.55, size: 2, delay: 1000, color: Colors.accent },
    { x: width * 0.65, size: 3, delay: 400,  color: Colors.gold },
    { x: width * 0.30, size: 2, delay: 800,  color: Colors.gold },
    { x: width * 0.60, size: 3, delay: 1400, color: Colors.accent },
    { x: width * 0.50, size: 2, delay: 1800, color: Colors.gold },
    { x: width * 0.40, size: 4, delay: 300,  color: Colors.gold },
    { x: width * 0.70, size: 2, delay: 900,  color: Colors.accent },
  ];

  return (
    <View style={styles.root}>
      {/* Champion splash — full bleed background */}
      <Image
        source={{ uri: Splashes.KaiSa }}
        style={styles.bgImage}
        resizeMode="cover"
      />
      {/* Heavy vignette overlay */}
      <View style={styles.vignette} />
      {/* Bottom gradient fade */}
      <View style={styles.bottomFade} />

      <SafeAreaView style={styles.safe}>
        {/* Logo block — top */}
        <Animated.View style={[styles.logoBlock, { opacity: logoOp, transform: [{ translateY: logoY }] }]}>
          <Text style={styles.rift}>WILD RIFT</Text>
          <Text style={styles.title}>◈ THE LEAGUE</Text>
          <View style={styles.titleUnderline} />
        </Animated.View>

        {/* Trophy centrepiece */}
        <View style={styles.trophyWrap}>
          <GlowOrb />
          <HexRing size={220} duration={12000} color={Colors.gold + '55'} width={1} />
          <HexRing size={170} duration={7000} color={Colors.accent + '66'} width={1.5} reverse />
          <HexRing size={140} duration={4500} color={Colors.gold + '88'} width={0.5} />
          <View style={styles.trophyInner}>
            <Trophy />
          </View>
          {embers.map((e, i) => <Ember key={i} {...e} />)}
        </View>

        {/* Bottom CTA section */}
        <Animated.View style={[styles.bottomSection, { opacity: btnsOp, transform: [{ translateY: btnsY }] }]}>

          <Animated.View style={[styles.dividerRow, { opacity: divOp }]}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ENTER THE ARENA</Text>
            <View style={styles.dividerLine} />
          </Animated.View>

          <TouchableOpacity style={styles.btnPrimary} onPress={() => router.push('/auth/sign-up')} activeOpacity={0.8}>
            <Text style={styles.btnPrimaryText}>CREATE ACCOUNT</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={() => router.push('/auth/log-in')} activeOpacity={0.8}>
            <Text style={styles.btnSecondaryText}>LOG IN</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {
            const { DEV_BYPASS } = require('@/lib/dev');
            DEV_BYPASS.enabled = true;
            router.replace('/(tabs)');
          }}>
            <Text style={styles.devText}>dev preview</Text>
          </TouchableOpacity>

        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width, height,
    opacity: 0.55,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // Radial-style dark edges via layered views
  },
  bottomFade: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: height * 0.55,
    backgroundColor: '#000',
    opacity: 0.82,
  },
  safe: { flex: 1, justifyContent: 'space-between', alignItems: 'center' },

  // Logo
  logoBlock: { alignItems: 'center', gap: 6, paddingTop: 12 },
  rift: {
    fontSize: 11, fontWeight: '800', letterSpacing: 6,
    color: Colors.gold, textTransform: 'uppercase',
  },
  title: {
    fontSize: 38, fontWeight: '900', letterSpacing: 2,
    color: '#fff',
    textShadowColor: Colors.accent, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20,
  },
  titleUnderline: {
    width: 60, height: 2, backgroundColor: Colors.gold,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6,
  },

  // Trophy
  trophyWrap: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  glowOrb: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    backgroundColor: Colors.gold,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 60,
  },
  trophyInner: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  trophyEmoji: {
    fontSize: 100,
    textShadowColor: Colors.gold, textShadowOffset: { width: 0, height: 8 }, textShadowRadius: 24,
  },

  // Bottom
  bottomSection: { width: '100%', paddingHorizontal: 28, paddingBottom: 12, gap: 12, alignItems: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.gold + '44' },
  dividerText: { fontSize: 10, fontWeight: '800', letterSpacing: 3, color: Colors.gold + 'aa' },

  btnPrimary: {
    width: '100%', paddingVertical: 17,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    borderRadius: 2,
    shadowColor: Colors.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 16,
  },
  btnPrimaryText: {
    fontSize: 14, fontWeight: '900', letterSpacing: 3,
    color: '#0a0800',
  },

  btnSecondary: {
    width: '100%', paddingVertical: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
    borderRadius: 2,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  btnSecondaryText: {
    fontSize: 14, fontWeight: '700', letterSpacing: 3,
    color: 'rgba(255,255,255,0.8)',
  },

  devText: { fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 1, marginTop: 4 },
});
