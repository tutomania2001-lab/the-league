import { Colors } from '@/constants/theme';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');
const PARTICLE_COUNT = 22;

function Particles() {
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      size: Math.random() * 2.5 + 1,
      speed: Math.random() * 7000 + 5000,
      delay: Math.random() * 5000,
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    particles.forEach(p => {
      const run = () => {
        p.opacity.setValue(0);
        p.translateY.setValue(0);
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(p.opacity, { toValue: 0.65, duration: p.speed * 0.2, useNativeDriver: true }),
              Animated.timing(p.opacity, { toValue: 0, duration: p.speed * 0.8, useNativeDriver: true }),
            ]),
            Animated.timing(p.translateY, { toValue: -height * 0.7, duration: p.speed, useNativeDriver: true }),
          ]),
        ]).start(run);
      };
      run();
    });
  }, []);

  return (
    <>
      {particles.map((p, i) => (
        <Animated.View key={i} style={{
          position: 'absolute',
          left: p.x,
          bottom: height * 0.05,
          width: p.size,
          height: p.size,
          borderRadius: p.size,
          backgroundColor: Colors.accent,
          opacity: p.opacity,
          transform: [{ translateY: p.translateY }],
          shadowColor: Colors.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 1,
          shadowRadius: 4,
        }} />
      ))}
    </>
  );
}

function ScanLine() {
  const y = useRef(new Animated.Value(height)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = () => {
      y.setValue(height);
      op.setValue(0);
      Animated.sequence([
        Animated.delay(3000),
        Animated.parallel([
          Animated.timing(op, { toValue: 0.5, duration: 400, useNativeDriver: true }),
          Animated.timing(y, { toValue: -10, duration: 3500, useNativeDriver: true }),
        ]),
        Animated.timing(op, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(6000),
      ]).start(run);
    };
    run();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute', left: 0, right: 0, height: 1.5,
      backgroundColor: Colors.accent,
      opacity: op, transform: [{ translateY: y }],
      shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 1, shadowRadius: 6,
    }} />
  );
}

function HexGrid() {
  const op = useRef(new Animated.Value(0.03)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(op, { toValue: 0.07, duration: 4000, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0.03, duration: 4000, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: op }]}>
      {Array.from({ length: 8 }).map((_, row) =>
        Array.from({ length: 6 }).map((_, col) => (
          <View key={`${row}-${col}`} style={{
            position: 'absolute',
            left: col * 70 - 10,
            top: row * 70 - 10 + (col % 2 === 0 ? 35 : 0),
            width: 50, height: 58,
            borderWidth: 1, borderColor: Colors.accent,
            opacity: 0.4,
            transform: [{ rotate: '30deg' }],
          }} />
        ))
      )}
    </Animated.View>
  );
}

export function RootBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      {/* Dark base */}
      <View style={styles.base} />
      {/* Radial glow */}
      <View style={styles.glow} />
      {/* Subtle hex grid */}
      <HexGrid />
      {/* Floating particles */}
      <Particles />
      {/* Scan line */}
      <ScanLine />
      {/* Hextech corner brackets */}
      <View style={[styles.corner, styles.tl]} />
      <View style={[styles.corner, styles.tr]} />
      <View style={[styles.corner, styles.bl]} />
      <View style={[styles.corner, styles.br]} />
    </View>
  );
}

const C = 20; const CW = 2;
const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  base: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.background },
  glow: {
    position: 'absolute',
    top: '30%', left: '10%',
    width: '80%', height: '50%',
    borderRadius: 999,
    backgroundColor: Colors.accent,
    opacity: 0.04,
    transform: [{ scaleX: 2 }],
  },
  corner: { position: 'absolute', width: C, height: C, borderColor: Colors.accent, opacity: 0.5 },
  tl: { top: 16, left: 16, borderTopWidth: CW, borderLeftWidth: CW },
  tr: { top: 16, right: 16, borderTopWidth: CW, borderRightWidth: CW },
  bl: { bottom: 16, left: 16, borderBottomWidth: CW, borderLeftWidth: CW },
  br: { bottom: 16, right: 16, borderBottomWidth: CW, borderRightWidth: CW },
});
