export const Colors = {
  background: '#070b14',
  surface: '#0d1520',
  surfaceAlt: '#111d2e',
  accent: '#00c8ff',
  accentDim: 'rgba(0,200,255,0.15)',
  accentBorder: 'rgba(0,200,255,0.25)',
  gold: '#c89b3c',
  text: '#e0eeff',
  textMuted: '#556677',
  textDim: '#334455',
  live: '#ff4444',
  success: '#00ff88',
  warning: '#ffaa00',
  error: '#ff4444',
  white: '#ffffff',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Typography = {
  title: { fontSize: 24, fontWeight: '800' as const, color: Colors.text },
  heading: { fontSize: 18, fontWeight: '700' as const, color: Colors.text },
  subheading: { fontSize: 15, fontWeight: '600' as const, color: Colors.text },
  body: { fontSize: 13, fontWeight: '400' as const, color: Colors.textMuted },
  label: { fontSize: 10, fontWeight: '700' as const, color: Colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  mono: { fontSize: 13, fontFamily: 'monospace' as const, color: Colors.accent },
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  full: 999,
};
