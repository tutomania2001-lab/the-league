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

// ── Flame tongue ──────────────────────────────────────────────
function Flame({ offsetX = 0, scale = 1, delay = 0, color = '#ff6b00' }: {
  offsetX?: number; scale?: number; delay?: number; color?: string;
}) {
  const sway = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(scale)).current;

  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(sway, { toValue: 6, duration: 500, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(sway, { toValue: -6, duration: 500, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ]),
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: scale * 1.12, duration: 400, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: scale * 0.92, duration: 400, useNativeDriver: true }),
        ]),
      ]),
    ])).start();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      bottom: 0,
      left: offsetX - 10,
      width: 20 * scale,
      height: 36 * scale,
      backgroundColor: color,
      borderRadius: 999,
      borderBottomLeftRadius: 6,
      borderBottomRightRadius: 6,
      opacity: 0.92,
      transform: [{ translateX: sway }, { scaleY: scaleAnim }],
      shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 8,
    }} />
  );
}

// ── Fire cluster on top of trophy ───────────────────────────
function Fire() {
  return (
    <View style={styles.fireWrap}>
      {/* Back flames (orange) */}
      <Flame offsetX={0}  scale={1.4} delay={0}   color="#ff8c00" />
      <Flame offsetX={18} scale={1.1} delay={150} color="#ff6200" />
      <Flame offsetX={-18} scale={1.0} delay={80} color="#ff7700" />
      {/* Mid flames (red-orange) */}
      <Flame offsetX={8}  scale={0.85} delay={60}  color="#ff3d00" />
      <Flame offsetX={-8} scale={0.9}  delay={200} color="#ff5000" />
      {/* Core white-hot flame */}
      <Flame offsetX={0}  scale={0.6}  delay={100} color="#fff5e0" />
    </View>
  );
}

// ── White vector trophy (View-based) ────────────────────────
function TrophyVector() {
  const rise = useRef(new Animated.Value(50)).current;
  const op   = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.spring(rise, { toValue: 0, useNativeDriver: true, tension: 35, friction: 8 }),
        Animated.timing(op, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    ]).start(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(breathe, { toValue: 1.03, duration: 2400, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(breathe, { toValue: 1,    duration: 2400, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])).start();
    });
  }, []);

  return (
    <Animated.View style={{ opacity: op, transform: [{ translateY: rise }, { scale: breathe }], alignItems: 'center' }}>
      {/* Fire sits on top of the rim */}
      <View style={{ height: 52, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Fire />
      </View>

      {/* Rim */}
      <View style={styles.rim} />

      {/* Cup + handles */}
      <View style={styles.cupRow}>
        {/* Left handle */}
        <View style={styles.handleLeft} />
        {/* Cup body */}
        <View style={styles.cup} />
        {/* Right handle */}
        <View style={styles.handleRight} />
      </View>

      {/* Stem */}
      <View style={styles.stem} />

      {/* Foot plate */}
      <View style={styles.footTop} />
      <View style={styles.footBase} />
    </Animated.View>
  );
}

// ── Slow rotating ring ───────────────────────────────────────
function Ring({ size, dur, color, bw = 1, reverse }: any) {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(rot, { toValue: 1, duration: dur, useNativeDriver: true, easing: Easing.linear })).start();
  }, []);
  const rotate = rot.interpolate({ inputRange: [0,1], outputRange: reverse ? ['360deg','0deg'] : ['0deg','360deg'] });
  return <Animated.View style={{ position:'absolute', width: size, height: size, borderRadius: 999, borderWidth: bw, borderColor: color, transform: [{ rotate }], borderStyle: 'dashed' }} />;
}

// ── Ember particles ──────────────────────────────────────────
function Ember({ x, size, delay, color }: { x:number; size:number; delay:number; color:string }) {
  const y = useRef(new Animated.Value(0)).current;
  const op = useRef(new Animated.Value(0)).current;
  const dx = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const run = () => {
      y.setValue(0); op.setValue(0); dx.setValue(0);
      const dur = 3000 + Math.random() * 3000;
      Animated.sequence([
        Animated.delay(delay + Math.random() * 2000),
        Animated.parallel([
          Animated.timing(y,  { toValue: -(height * 0.5), duration: dur, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(op, { toValue: 0.85, duration: 400, useNativeDriver: true }),
            Animated.timing(op, { toValue: 0, duration: dur - 400, useNativeDriver: true }),
          ]),
          Animated.timing(dx, { toValue: (Math.random() - 0.5) * 50, duration: dur, useNativeDriver: true }),
        ]),
      ]).start(run);
    };
    run();
  }, []);

  return (
    <Animated.View style={{
      position:'absolute', bottom: height * 0.3, left: x,
      width: size, height: size, borderRadius: size,
      backgroundColor: color, opacity: op,
      transform: [{ translateY: y }, { translateX: dx }],
      shadowColor: color, shadowOpacity: 1, shadowRadius: size*2, shadowOffset:{width:0,height:0},
    }} />
  );
}

// ── Main screen ──────────────────────────────────────────────
export default function LandingScreen() {
  const router = useRouter();

  const logoOp = useRef(new Animated.Value(0)).current;
  const logoY  = useRef(new Animated.Value(-24)).current;
  const btnsOp = useRef(new Animated.Value(0)).current;
  const btnsY  = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(logoOp, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(logoY,  { toValue: 0, duration: 900, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]),
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(btnsOp, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(btnsY,  { toValue: 0, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]),
    ]).start();
  }, []);

  const embers = [
    {x:width*0.25,size:3,delay:0,   color:Colors.gold},
    {x:width*0.35,size:2,delay:600, color:'#ff6b00'},
    {x:width*0.45,size:4,delay:200, color:Colors.gold},
    {x:width*0.55,size:2,delay:1000,color:'#ff6b00'},
    {x:width*0.65,size:3,delay:400, color:Colors.gold},
    {x:width*0.30,size:2,delay:800, color:Colors.gold},
    {x:width*0.60,size:3,delay:1400,color:'#ff6b00'},
    {x:width*0.50,size:2,delay:1800,color:Colors.gold},
    {x:width*0.40,size:4,delay:300, color:Colors.gold},
    {x:width*0.70,size:2,delay:900, color:'#ff6b00'},
  ];

  return (
    <View style={styles.root}>
      {/* Kai'Sa background */}
      <Image source={{ uri: Splashes.KaiSa }} style={styles.bg} resizeMode="cover" />
      <View style={styles.bottomFade} />

      <SafeAreaView style={styles.safe}>

        {/* Logo */}
        <Animated.View style={[styles.logoBlock, { opacity: logoOp, transform: [{ translateY: logoY }] }]}>
          <Text style={styles.rift}>WILD RIFT</Text>
          <Text style={styles.title}>◈ THE LEAGUE</Text>
          <View style={styles.titleBar} />
        </Animated.View>

        {/* Trophy stage */}
        <View style={styles.stage}>
          <Ring size={210} dur={11000} color={Colors.gold+'44'} bw={1} />
          <Ring size={160} dur={7000}  color={Colors.accent+'55'} bw={1.5} reverse />
          {/* Gold ground glow */}
          <View style={styles.groundGlow} />
          <TrophyVector />
          {embers.map((e,i) => <Ember key={i} {...e} />)}
        </View>

        {/* CTA buttons */}
        <Animated.View style={[styles.bottomSection, { opacity: btnsOp, transform: [{ translateY: btnsY }] }]}>
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
        </Animated.View>

      </SafeAreaView>
    </View>
  );
}

const W = 90;
const styles = StyleSheet.create({
  root: { flex:1, backgroundColor:'#000' },
  bg: { ...StyleSheet.absoluteFillObject, width, height, opacity:0.5 },
  bottomFade: { position:'absolute', bottom:0, left:0, right:0, height:height*0.52, backgroundColor:'#000', opacity:0.85 },
  safe: { flex:1, alignItems:'center', justifyContent:'space-between' },

  logoBlock: { alignItems:'center', gap:5, paddingTop:14 },
  rift:  { fontSize:11, fontWeight:'800', letterSpacing:6, color:Colors.gold },
  title: { fontSize:36, fontWeight:'900', letterSpacing:2, color:'#fff',
    textShadowColor:Colors.accent, textShadowOffset:{width:0,height:0}, textShadowRadius:18 },
  titleBar: { width:55, height:2, backgroundColor:Colors.gold,
    shadowColor:Colors.gold, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:6 },

  // Trophy stage
  stage: { width:280, height:300, alignItems:'center', justifyContent:'center' },
  groundGlow: { position:'absolute', bottom:20, width:120, height:20, borderRadius:60,
    backgroundColor:Colors.gold, opacity:0.18,
    shadowColor:Colors.gold, shadowOffset:{width:0,height:0}, shadowOpacity:1, shadowRadius:20 },

  // Fire
  fireWrap: { position:'relative', width:60, height:52, alignItems:'center' },

  // Trophy parts — all white
  rim:      { width:W+10, height:7, backgroundColor:'#fff', borderRadius:3,
    shadowColor:'#fff', shadowOffset:{width:0,height:0}, shadowOpacity:0.4, shadowRadius:6 },
  cupRow:   { flexDirection:'row', alignItems:'flex-start' },
  handleLeft:  { width:14, height:36, borderLeftWidth:5, borderTopWidth:5, borderBottomWidth:5,
    borderColor:'#fff', borderTopLeftRadius:14, borderBottomLeftRadius:14,
    marginTop:6, marginRight:-2 },
  handleRight: { width:14, height:36, borderRightWidth:5, borderTopWidth:5, borderBottomWidth:5,
    borderColor:'#fff', borderTopRightRadius:14, borderBottomRightRadius:14,
    marginTop:6, marginLeft:-2 },
  cup: { width:W, height:68, backgroundColor:'#fff', borderBottomLeftRadius:W/2, borderBottomRightRadius:W/2,
    shadowColor:'#fff', shadowOffset:{width:0,height:0}, shadowOpacity:0.25, shadowRadius:10 },
  stem:     { width:10, height:22, backgroundColor:'#fff' },
  footTop:  { width:W*0.65, height:7, backgroundColor:'#fff', borderRadius:2 },
  footBase: { width:W*0.85, height:10, backgroundColor:'#fff', borderRadius:2, marginTop:2,
    shadowColor:'#fff', shadowOffset:{width:0,height:0}, shadowOpacity:0.3, shadowRadius:8 },

  // Bottom CTA
  bottomSection: { width:'100%', paddingHorizontal:28, paddingBottom:10, gap:12, alignItems:'center' },
  divRow: { flexDirection:'row', alignItems:'center', gap:10, width:'100%' },
  divLine: { flex:1, height:1, backgroundColor:Colors.gold+'55' },
  divLabel: { fontSize:9, fontWeight:'800', letterSpacing:3, color:Colors.gold+'99' },

  btnGold: { width:'100%', paddingVertical:16, backgroundColor:Colors.gold, alignItems:'center',
    borderRadius:2,
    shadowColor:Colors.gold, shadowOffset:{width:0,height:0}, shadowOpacity:0.55, shadowRadius:14 },
  btnGoldText: { fontSize:14, fontWeight:'900', letterSpacing:3, color:'#09070a' },

  btnGhost: { width:'100%', paddingVertical:15, alignItems:'center',
    borderRadius:2, borderWidth:1, borderColor:'rgba(255,255,255,0.22)' },
  btnGhostText: { fontSize:14, fontWeight:'700', letterSpacing:3, color:'rgba(255,255,255,0.75)' },

  devText: { fontSize:10, color:'rgba(255,255,255,0.12)', letterSpacing:1, marginTop:2 },
});
