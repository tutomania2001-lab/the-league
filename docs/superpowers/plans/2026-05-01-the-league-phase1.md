# The League — Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wipe the Expo template, install core dependencies, set up Supabase, build the Hextech Blue theme system and shared UI components, and wire up the tab navigation shell — all screens empty but navigable.

**Architecture:** Expo Router file-based navigation with a root Supabase session provider. Theme constants drive all colour/spacing decisions. Shared UI components (Button, Card, Badge, Screen) are built once and reused everywhere. No business logic in Phase 1.

**Tech Stack:** Expo 54, Expo Router 6, Supabase JS v2, TypeScript, Jest + React Native Testing Library

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `app/_layout.tsx` | Root layout, Supabase session provider, auth redirect |
| Modify | `app/(tabs)/_layout.tsx` | Tab bar with 5 tabs, Hextech icons |
| Modify | `app/(tabs)/index.tsx` | Home tab shell |
| Modify | `app/index.tsx` | Splash / redirect logic |
| Create | `app/(tabs)/tournaments.tsx` | Tournaments tab shell |
| Create | `app/(tabs)/team.tsx` | My Team tab shell |
| Create | `app/(tabs)/wallet.tsx` | Wallet tab shell |
| Create | `app/(tabs)/profile.tsx` | Profile tab shell |
| Create | `app/auth/sign-up.tsx` | Sign up shell |
| Create | `app/auth/log-in.tsx` | Log in shell |
| Create | `constants/theme.ts` | All colours, spacing, typography |
| Create | `lib/supabase.ts` | Supabase client singleton |
| Create | `types/database.ts` | TypeScript types for all DB tables |
| Create | `components/ui/Screen.tsx` | Safe-area wrapper |
| Create | `components/ui/Button.tsx` | Primary/secondary button |
| Create | `components/ui/Card.tsx` | Dark card container |
| Create | `components/ui/Badge.tsx` | Status badge (LIVE, OPEN, etc.) |
| Create | `components/ui/GlowText.tsx` | Cyan glow text |
| Create | `jest.config.js` | Jest config for Expo |
| Create | `jest-setup.ts` | Testing Library setup |
| Delete | `components/hello-wave.tsx` | Remove template |
| Delete | `components/parallax-scroll-view.tsx` | Remove template |
| Delete | `components/themed-text.tsx` | Remove template |
| Delete | `components/themed-view.tsx` | Remove template |

---

### Task 1: Install dependencies and configure Jest

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`
- Create: `jest-setup.ts`

- [ ] **Step 1: Install packages**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League
npm install @supabase/supabase-js @react-native-async-storage/async-storage
npm install --save-dev jest jest-expo @testing-library/react-native @testing-library/jest-native
```

- [ ] **Step 2: Create jest.config.js**

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterFramework: ['./jest-setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
};
```

- [ ] **Step 3: Create jest-setup.ts**

```ts
import '@testing-library/jest-native/extend-expect';
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "jest --watchAll=false"
```

- [ ] **Step 5: Verify Jest runs**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx jest --passWithNoTests
```

Expected: `Test Suites: 0 skipped` with exit code 0.

- [ ] **Step 6: Commit**

```bash
git init && git add package.json package-lock.json jest.config.js jest-setup.ts
git commit -m "feat: install supabase, testing deps, configure jest"
```

---

### Task 2: Theme constants

**Files:**
- Create: `constants/theme.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/constants/theme.test.ts`:

```ts
import { Colors, Spacing, Typography } from '../../constants/theme';

test('primary accent is hextech cyan', () => {
  expect(Colors.accent).toBe('#00c8ff');
});

test('background is dark navy', () => {
  expect(Colors.background).toBe('#070b14');
});

test('spacing scale exists', () => {
  expect(Spacing.md).toBe(16);
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx jest theme --passWithNoTests
```

Expected: FAIL — cannot find module.

- [ ] **Step 3: Create constants/theme.ts**

```ts
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
```

- [ ] **Step 4: Run test — expect PASS**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx jest theme
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add constants/theme.ts __tests__/constants/theme.test.ts
git commit -m "feat: add hextech blue theme constants"
```

---

### Task 3: TypeScript database types

**Files:**
- Create: `types/database.ts`

- [ ] **Step 1: Create types/database.ts**

```ts
export type UserRow = {
  id: string;
  email: string;
  username: string;
  riot_id: string | null;
  avatar_url: string | null;
  wallet_balance: number;
  stripe_customer_id: string | null;
  kyc_verified: boolean;
  created_at: string;
};

export type TeamRow = {
  id: string;
  name: string;
  captain_id: string;
  invite_code: string;
  created_at: string;
};

export type TeamMemberRow = {
  team_id: string;
  user_id: string;
  joined_at: string;
};

export type TournamentStatus = 'open' | 'active' | 'completed';

export type TournamentRow = {
  id: string;
  name: string;
  status: TournamentStatus;
  entry_fee_per_player: number;
  prize_pool: number;
  platform_cut_percent: number;
  max_teams: number;
  start_time: string | null;
  created_by: string;
  created_at: string;
};

export type TournamentTeamRow = {
  tournament_id: string;
  team_id: string;
  entry_paid_at: string | null;
  seed: number | null;
};

export type MatchStatus = 'scheduled' | 'live' | 'completed';

export type MatchRow = {
  id: string;
  tournament_id: string;
  round: 1 | 2 | 3;
  team_a_id: string;
  team_b_id: string;
  score_a: number;
  score_b: number;
  winner_id: string | null;
  status: MatchStatus;
  riot_match_id: string | null;
  wildrift_lobby_code: string | null;
  wildrift_lobby_password: string | null;
  scheduled_at: string | null;
};

export type TransactionType = 'topup' | 'entry_fee' | 'prize' | 'withdrawal';
export type TransactionStatus = 'pending' | 'completed' | 'failed';

export type TransactionRow = {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  stripe_payment_id: string | null;
  status: TransactionStatus;
  created_at: string;
};
```

- [ ] **Step 2: Commit**

```bash
git add types/database.ts
git commit -m "feat: add typescript types for all database tables"
```

---

### Task 4: Supabase client

**Files:**
- Create: `lib/supabase.ts`

- [ ] **Step 1: Create lib/supabase.ts**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 2: Create .env.local**

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> You will replace these with real values from the Supabase dashboard when you create the project at supabase.com.

- [ ] **Step 3: Add .env.local to .gitignore**

Open `.gitignore` (create it if missing) and add:
```
.env.local
.env
```

- [ ] **Step 4: Commit**

```bash
git add lib/supabase.ts .gitignore
git commit -m "feat: add supabase client singleton"
```

---

### Task 5: Shared UI — Screen wrapper

**Files:**
- Create: `components/ui/Screen.tsx`
- Create: `__tests__/components/ui/Screen.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Screen } from '../../../components/ui/Screen';

test('renders children', () => {
  const { getByText } = render(<Screen><Text>Hello</Text></Screen>);
  expect(getByText('Hello')).toBeTruthy();
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx jest Screen
```

- [ ] **Step 3: Create components/ui/Screen.tsx**

```tsx
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants/theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
};

export function Screen({ children, style, padded = true }: Props) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.container, padded && styles.padded, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  padded: { paddingHorizontal: Spacing.md },
});
```

- [ ] **Step 4: Run — expect PASS**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx jest Screen
```

- [ ] **Step 5: Commit**

```bash
git add components/ui/Screen.tsx __tests__/components/ui/Screen.test.tsx
git commit -m "feat: add Screen safe-area wrapper component"
```

---

### Task 6: Shared UI — Button

**Files:**
- Create: `components/ui/Button.tsx`
- Create: `__tests__/components/ui/Button.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../../../components/ui/Button';

test('calls onPress when tapped', () => {
  const onPress = jest.fn();
  const { getByText } = render(<Button label="Join" onPress={onPress} />);
  fireEvent.press(getByText('Join'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('does not call onPress when disabled', () => {
  const onPress = jest.fn();
  const { getByText } = render(<Button label="Join" onPress={onPress} disabled />);
  fireEvent.press(getByText('Join'));
  expect(onPress).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx jest Button
```

- [ ] **Step 3: Create components/ui/Button.tsx**

```tsx
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

export function Button({ label, onPress, variant = 'primary', disabled, loading, style }: Props) {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], (disabled || loading) && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={Colors.accent} size="small" />
      ) : (
        <Text style={[styles.label, variant === 'primary' && styles.labelPrimary]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primary: {
    backgroundColor: Colors.accent,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    ...Typography.subheading,
    color: Colors.textMuted,
  },
  labelPrimary: {
    color: Colors.background,
    fontWeight: '700',
  },
});
```

- [ ] **Step 4: Run — expect PASS**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx jest Button
```

- [ ] **Step 5: Commit**

```bash
git add components/ui/Button.tsx __tests__/components/ui/Button.test.tsx
git commit -m "feat: add Button component (primary/secondary/ghost variants)"
```

---

### Task 7: Shared UI — Card and Badge

**Files:**
- Create: `components/ui/Card.tsx`
- Create: `components/ui/Badge.tsx`

- [ ] **Step 1: Create components/ui/Card.tsx**

```tsx
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from '../../constants/theme';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
  glow?: boolean;
};

export function Card({ children, style, glow }: Props) {
  return (
    <View style={[styles.card, glow && styles.glow, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    padding: Spacing.md,
  },
  glow: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
```

- [ ] **Step 2: Create components/ui/Badge.tsx**

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing } from '../../constants/theme';

type Variant = 'live' | 'open' | 'active' | 'completed';

const config: Record<Variant, { label: string; color: string; bg: string }> = {
  live:      { label: '● LIVE',      color: Colors.live,    bg: 'rgba(255,68,68,0.15)' },
  open:      { label: 'OPEN',        color: Colors.accent,  bg: Colors.accentDim },
  active:    { label: 'ACTIVE',      color: Colors.warning, bg: 'rgba(255,170,0,0.15)' },
  completed: { label: 'COMPLETED',   color: Colors.textMuted, bg: Colors.surfaceAlt },
};

type Props = { variant: Variant };

export function Badge({ variant }: Props) {
  const { label, color, bg } = config[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: color + '55' }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  text: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/Card.tsx components/ui/Badge.tsx
git commit -m "feat: add Card and Badge UI components"
```

---

### Task 8: GlowText component

**Files:**
- Create: `components/ui/GlowText.tsx`

- [ ] **Step 1: Create components/ui/GlowText.tsx**

```tsx
import React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { Colors } from '../../constants/theme';

type Props = {
  children: React.ReactNode;
  style?: TextStyle;
  intensity?: 'low' | 'medium' | 'high';
};

const intensityMap = {
  low:    { shadowOpacity: 0.3, shadowRadius: 4 },
  medium: { shadowOpacity: 0.5, shadowRadius: 8 },
  high:   { shadowOpacity: 0.8, shadowRadius: 16 },
};

export function GlowText({ children, style, intensity = 'medium' }: Props) {
  const glow = intensityMap[intensity];
  return (
    <Text style={[
      styles.base,
      { textShadowColor: Colors.accent, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: glow.shadowRadius },
      style,
    ]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { color: Colors.accent },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/GlowText.tsx
git commit -m "feat: add GlowText component with cyan glow effect"
```

---

### Task 9: Root layout and tab navigation shell

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Replace app/_layout.tsx**

```tsx
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === 'auth';
    if (!session && !inAuthGroup) {
      router.replace('/auth/log-in');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.accent} />
      </View>
    );
  }

  return <Slot />;
}
```

- [ ] **Step 2: Replace app/(tabs)/_layout.tsx**

```tsx
import { Tabs } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Text } from 'react-native';

function Icon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.accentBorder,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ focused }) => <Icon emoji="🏠" focused={focused} /> }} />
      <Tabs.Screen name="tournaments" options={{ title: 'Tournaments', tabBarIcon: ({ focused }) => <Icon emoji="🏆" focused={focused} /> }} />
      <Tabs.Screen name="team" options={{ title: 'My Team', tabBarIcon: ({ focused }) => <Icon emoji="⚔️" focused={focused} /> }} />
      <Tabs.Screen name="wallet" options={{ title: 'Wallet', tabBarIcon: ({ focused }) => <Icon emoji="💰" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ focused }) => <Icon emoji="👤" focused={focused} /> }} />
    </Tabs>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx app/(tabs)/_layout.tsx
git commit -m "feat: root layout with supabase auth redirect, hextech tab bar"
```

---

### Task 10: Tab screen shells and auth screens

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Create: `app/(tabs)/tournaments.tsx`
- Create: `app/(tabs)/team.tsx`
- Create: `app/(tabs)/wallet.tsx`
- Create: `app/(tabs)/profile.tsx`
- Create: `app/auth/sign-up.tsx`
- Create: `app/auth/log-in.tsx`

- [ ] **Step 1: Replace app/(tabs)/index.tsx**

```tsx
import { Screen } from '@/components/ui/Screen';
import { GlowText } from '@/components/ui/GlowText';
import { Typography } from '@/constants/theme';
import { Text } from 'react-native';

export default function HomeScreen() {
  return (
    <Screen>
      <GlowText style={Typography.title}>The League</GlowText>
      <Text style={Typography.body}>Home feed — coming in Phase 4</Text>
    </Screen>
  );
}
```

- [ ] **Step 2: Create app/(tabs)/tournaments.tsx**

```tsx
import { Screen } from '@/components/ui/Screen';
import { GlowText } from '@/components/ui/GlowText';
import { Typography } from '@/constants/theme';
import { Text } from 'react-native';

export default function TournamentsScreen() {
  return (
    <Screen>
      <GlowText style={Typography.title}>🏆 Tournaments</GlowText>
      <Text style={Typography.body}>Tournament list — coming in Phase 3</Text>
    </Screen>
  );
}
```

- [ ] **Step 3: Create app/(tabs)/team.tsx**

```tsx
import { Screen } from '@/components/ui/Screen';
import { GlowText } from '@/components/ui/GlowText';
import { Typography } from '@/constants/theme';
import { Text } from 'react-native';

export default function TeamScreen() {
  return (
    <Screen>
      <GlowText style={Typography.title}>⚔️ My Team</GlowText>
      <Text style={Typography.body}>Team dashboard — coming in Phase 3</Text>
    </Screen>
  );
}
```

- [ ] **Step 4: Create app/(tabs)/wallet.tsx**

```tsx
import { Screen } from '@/components/ui/Screen';
import { GlowText } from '@/components/ui/GlowText';
import { Typography } from '@/constants/theme';
import { Text } from 'react-native';

export default function WalletScreen() {
  return (
    <Screen>
      <GlowText style={Typography.title}>💰 Wallet</GlowText>
      <Text style={Typography.body}>Wallet — coming in Phase 3</Text>
    </Screen>
  );
}
```

- [ ] **Step 5: Create app/(tabs)/profile.tsx**

```tsx
import { Screen } from '@/components/ui/Screen';
import { GlowText } from '@/components/ui/GlowText';
import { Typography } from '@/constants/theme';
import { Text } from 'react-native';

export default function ProfileScreen() {
  return (
    <Screen>
      <GlowText style={Typography.title}>👤 Profile</GlowText>
      <Text style={Typography.body}>Profile — coming in Phase 2</Text>
    </Screen>
  );
}
```

- [ ] **Step 6: Create app/auth/log-in.tsx**

```tsx
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

export default function LogInScreen() {
  const router = useRouter();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: Spacing.lg }}>
        <GlowText style={[Typography.title, { textAlign: 'center' }]}>◈ THE LEAGUE</GlowText>
        <Text style={[Typography.body, { textAlign: 'center' }]}>Log in — coming in Phase 2</Text>
        <Button label="Go to Sign Up" variant="secondary" onPress={() => router.push('/auth/sign-up')} />
      </View>
    </Screen>
  );
}
```

- [ ] **Step 7: Create app/auth/sign-up.tsx**

```tsx
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

export default function SignUpScreen() {
  const router = useRouter();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: Spacing.lg }}>
        <GlowText style={[Typography.title, { textAlign: 'center' }]}>Create Account</GlowText>
        <Text style={[Typography.body, { textAlign: 'center' }]}>Sign up — coming in Phase 2</Text>
        <Button label="Back to Log In" variant="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
```

- [ ] **Step 8: Delete old template components**

```bash
rm /Users/loz/The-League/components/hello-wave.tsx
rm /Users/loz/The-League/components/parallax-scroll-view.tsx
rm /Users/loz/The-League/components/themed-text.tsx
rm /Users/loz/The-League/components/themed-view.tsx
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: tab shells, auth screen shells, remove expo template components"
```

---

### Task 11: Verify on device

- [ ] **Step 1: Start Expo server**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx expo start
```

- [ ] **Step 2: Open on phone via Expo Go**

Scan QR code or enter `exp://192.168.0.97:8081`. Verify:
- App opens to Log In screen (dark navy, cyan glow text)
- Tapping "Go to Sign Up" navigates correctly
- Once `.env.local` has real Supabase keys and a user is logged in, tab bar appears with all 5 tabs
- Each tab shows its shell screen in Hextech Blue theme

- [ ] **Step 3: Run all tests**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx jest
```

Expected: All PASS.

- [ ] **Step 4: Final Phase 1 commit**

```bash
git add -A
git commit -m "feat: phase 1 complete — foundation, theme, supabase, nav shell"
```
