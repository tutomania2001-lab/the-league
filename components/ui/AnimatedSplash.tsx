import { Colors } from '@/constants/theme';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StyleSheet, View, ViewStyle } from 'react-native';

const { width, height } = Dimensions.get('window');
const PARTICLE_COUNT = 18;

function Particles() {
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      x: Math.random() * width,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 6000 + 5000,
      delay: Math.random() * 4000,
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    particles.forEach(p => {
      const animate = () => {
        p.opacity.setValue(0);
        p.translateY.setValue(0);
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(p.opacity, { toValue: 0.7, duration: p.speed * 0.2, useNativeDriver: true }),
              Animated.timing(p.opacity, { toValue: 0, duration: p.speed * 0.8, useNativeDriver: true }),
            ]),
            Animated.timing(p.translateY, { toValue: -height * 0.6, duration: p.speed, useNativeDriver: true }),
          ]),
        ]).start(animate);
      };
      animate();
    });
  }, []);

  return (
    <>
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            bottom: height * 0.1,
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
          }}
        />
      ))}
    </>
  );
}

function ScanLine() {
  const translateY = useRef(new Animated.Value(height)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      translateY.setValue(height);
      opacity.setValue(0);
      Animated.sequence([
        Animated.delay(2000),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.6, duration: 300, useNativeDriver: true }),
          Animated.timing(translateY, { toValue: -20, duration: 3000, useNativeDriver: true }),
        ]),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.delay(5000),
      ]).start(animate);
    };
    animate();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: Colors.accent,
        opacity,
        transform: [{ translateY }],
        shadowColor: Colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 8,
      }}
    />
  );
}

type Props = {
  uri: string;
  children: React.ReactNode;
  style?: ViewStyle;
  overlayOpacity?: number;
};

export function AnimatedSplash({ uri, children, style, overlayOpacity = 0.68 }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.12, duration: 10000, useNativeDriver: true }),
          Animated.timing(translateX, { toValue: -20, duration: 10000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.0, duration: 10000, useNativeDriver: true }),
          Animated.timing(translateX, { toValue: 0, duration: 10000, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={[styles.container, style]}>
      {/* Ken Burns background */}
      <Animated.Image
        source={{ uri }}
        style={[
          styles.image,
          { transform: [{ scale }, { translateX }] },
        ]}
        resizeMode="cover"
      />

      {/* Dark overlay */}
      <View style={[styles.overlay, { backgroundColor: `rgba(7,11,20,${overlayOpacity})` }]} />

      {/* Hextech corner accents */}
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />

      {/* Scan line */}
      <ScanLine />

      {/* Floating particles */}
      <Particles />

      {/* Content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const cornerSize = 16;
const cornerWidth = 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, overflow: 'hidden' },
  image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject },
  content: { flex: 1 },
  corner: {
    position: 'absolute',
    width: cornerSize,
    height: cornerSize,
    borderColor: Colors.accent,
    opacity: 0.7,
  },
  topLeft: { top: 12, left: 12, borderTopWidth: cornerWidth, borderLeftWidth: cornerWidth },
  topRight: { top: 12, right: 12, borderTopWidth: cornerWidth, borderRightWidth: cornerWidth },
  bottomLeft: { bottom: 12, left: 12, borderBottomWidth: cornerWidth, borderLeftWidth: cornerWidth },
  bottomRight: { bottom: 12, right: 12, borderBottomWidth: cornerWidth, borderRightWidth: cornerWidth },
});
