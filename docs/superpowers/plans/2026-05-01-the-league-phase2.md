# The League — Phase 2: Auth + Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build working sign-up, log-in, and profile screens backed by Supabase Auth. Users can create accounts with email + password + Riot ID, log in, view and edit their profile, and log out.

**Architecture:** Supabase Auth handles sessions (already wired in Phase 1 `_layout.tsx`). A `useAuth` hook wraps sign-up/sign-in/sign-out calls. A `useProfile` hook fetches and updates the `users` table row. All auth screens use the shared UI components from Phase 1.

**Tech Stack:** Supabase Auth, Supabase JS v2, Expo Router, React Native, Phase 1 UI components

**Prerequisite:** Phase 1 complete. Real Supabase project created at supabase.com with `.env.local` populated.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `supabase/migrations/001_users.sql` | Users table DDL |
| Create | `hooks/useAuth.ts` | sign-up, sign-in, sign-out wrappers |
| Create | `hooks/useProfile.ts` | fetch + update users row |
| Modify | `app/auth/sign-up.tsx` | Full sign-up form |
| Modify | `app/auth/log-in.tsx` | Full log-in form |
| Modify | `app/(tabs)/profile.tsx` | Profile screen with stats + settings |
| Create | `app/profile/settings.tsx` | Edit Riot ID, log out, KYC status |
| Create | `components/ui/Input.tsx` | Styled text input |

---

### Task 1: Supabase migration — users table

**Files:**
- Create: `supabase/migrations/001_users.sql`

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migrations/001_users.sql
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  username text unique not null,
  riot_id text,
  avatar_url text,
  wallet_balance numeric(10,2) not null default 0,
  stripe_customer_id text,
  kyc_verified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own row"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own row"
  on public.users for update
  using (auth.uid() = id);

-- Auto-create users row on auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

- [ ] **Step 2: Apply migration**

Go to your Supabase project dashboard → SQL Editor → paste and run the contents of `001_users.sql`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/001_users.sql
git commit -m "feat: users table migration with RLS and auth trigger"
```

---

### Task 2: Input component

**Files:**
- Create: `components/ui/Input.tsx`
- Create: `__tests__/components/ui/Input.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../../../components/ui/Input';

test('calls onChangeText when text changes', () => {
  const onChange = jest.fn();
  const { getByPlaceholderText } = render(
    <Input placeholder="Email" value="" onChangeText={onChange} />
  );
  fireEvent.changeText(getByPlaceholderText('Email'), 'test@test.com');
  expect(onChange).toHaveBeenCalledWith('test@test.com');
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx jest Input
```

- [ ] **Step 3: Create components/ui/Input.tsx**

```tsx
import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants/theme';

type Props = TextInputProps & {
  label?: string;
  error?: string;
};

export function Input({ label, error, style, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={Colors.textDim}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.xs },
  label: { ...Typography.label, color: Colors.textMuted },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    color: Colors.text,
    fontSize: 14,
    minHeight: 48,
  },
  inputError: { borderColor: Colors.error },
  error: { ...Typography.body, color: Colors.error, fontSize: 11 },
});
```

- [ ] **Step 4: Run — expect PASS**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx jest Input
```

- [ ] **Step 5: Commit**

```bash
git add components/ui/Input.tsx __tests__/components/ui/Input.test.tsx
git commit -m "feat: add Input component with label and error state"
```

---

### Task 3: useAuth hook

**Files:**
- Create: `hooks/useAuth.ts`
- Create: `__tests__/hooks/useAuth.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { renderHook, act } from '@testing-library/react-native';

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn().mockResolvedValue({ error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({ error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

import { useAuth } from '../hooks/useAuth';

test('signUp calls supabase.auth.signUp', async () => {
  const { supabase } = require('../lib/supabase');
  const { result } = renderHook(() => useAuth());
  await act(async () => {
    await result.current.signUp('test@test.com', 'pass123', 'player1');
  });
  expect(supabase.auth.signUp).toHaveBeenCalledWith({
    email: 'test@test.com',
    password: 'pass123',
    options: { data: { username: 'player1' } },
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx jest useAuth
```

- [ ] **Step 3: Create hooks/useAuth.ts**

```ts
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signUp(email: string, password: string, username: string) {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) setError(error.message);
    setLoading(false);
    return { error };
  }

  async function signIn(email: string, password: string) {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
    return { error };
  }

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  }

  return { signUp, signIn, signOut, loading, error };
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx jest useAuth
```

- [ ] **Step 5: Commit**

```bash
git add hooks/useAuth.ts __tests__/hooks/useAuth.test.ts
git commit -m "feat: useAuth hook with signUp/signIn/signOut"
```

---

### Task 4: useProfile hook

**Files:**
- Create: `hooks/useProfile.ts`

- [ ] **Step 1: Create hooks/useProfile.ts**

```ts
import { supabase } from '@/lib/supabase';
import { UserRow } from '@/types/database';
import { useEffect, useState } from 'react';

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setProfile(data);
        setLoading(false);
      });
  }, [userId]);

  async function updateProfile(updates: Partial<Pick<UserRow, 'username' | 'riot_id' | 'avatar_url'>>) {
    if (!userId) return { error: 'Not authenticated' };
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (!error && data) setProfile(data);
    return { error: error?.message ?? null };
  }

  return { profile, loading, error, updateProfile };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useProfile.ts
git commit -m "feat: useProfile hook for fetching and updating user row"
```

---

### Task 5: Sign Up screen

**Files:**
- Modify: `app/auth/sign-up.tsx`

- [ ] **Step 1: Replace app/auth/sign-up.tsx**

```tsx
import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [riotId, setRiotId] = useState('');

  async function handleSignUp() {
    const { error } = await signUp(email, password, username);
    if (!error) router.replace('/(tabs)');
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: Spacing.lg, paddingVertical: Spacing.xl }}>
        <GlowText style={[Typography.title, { textAlign: 'center' }]}>◈ Join The League</GlowText>
        <Text style={[Typography.body, { textAlign: 'center' }]}>Create your account to enter tournaments</Text>

        <Input label="Username" placeholder="SummonerName" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Input label="Email" placeholder="you@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Password" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry />
        <Input label="Riot ID (optional)" placeholder="Name#TAG" value={riotId} onChangeText={setRiotId} autoCapitalize="none" />

        {error && <Text style={{ color: Colors.error, fontSize: 13, textAlign: 'center' }}>{error}</Text>}

        <Button label="Create Account" onPress={handleSignUp} loading={loading} />
        <Button label="Already have an account? Log in" variant="ghost" onPress={() => router.replace('/auth/log-in')} />
      </ScrollView>
    </Screen>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/auth/sign-up.tsx
git commit -m "feat: sign up screen with email/password/username/riot id"
```

---

### Task 6: Log In screen

**Files:**
- Modify: `app/auth/log-in.tsx`

- [ ] **Step 1: Replace app/auth/log-in.tsx**

```tsx
import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

export default function LogInScreen() {
  const router = useRouter();
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogIn() {
    const { error } = await signIn(email, password);
    if (!error) router.replace('/(tabs)');
  }

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: Spacing.lg }}>
        <GlowText style={[Typography.title, { textAlign: 'center' }]}>◈ THE LEAGUE</GlowText>
        <Text style={[Typography.body, { textAlign: 'center' }]}>Sign in to your account</Text>

        <Input label="Email" placeholder="you@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Password" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry />

        {error && <Text style={{ color: Colors.error, fontSize: 13, textAlign: 'center' }}>{error}</Text>}

        <Button label="Log In" onPress={handleLogIn} loading={loading} />
        <Button label="New here? Create an account" variant="ghost" onPress={() => router.push('/auth/sign-up')} />
      </View>
    </Screen>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/auth/log-in.tsx
git commit -m "feat: log in screen with email and password"
```

---

### Task 7: Profile screen

**Files:**
- Modify: `app/(tabs)/profile.tsx`
- Create: `app/profile/settings.tsx`

- [ ] **Step 1: Replace app/(tabs)/profile.tsx**

```tsx
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [userId, setUserId] = useState<string | undefined>();
  const { profile, loading } = useProfile(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  if (loading) return (
    <Screen><ActivityIndicator color={Colors.accent} style={{ flex: 1 }} /></Screen>
  );

  return (
    <Screen>
      <View style={{ gap: Spacing.lg, paddingTop: Spacing.md }}>
        <GlowText style={Typography.title}>👤 {profile?.username ?? 'Summoner'}</GlowText>
        {profile?.riot_id && (
          <Text style={Typography.body}>Riot ID: {profile.riot_id}</Text>
        )}

        <Card>
          <Text style={Typography.label}>Wallet Balance</Text>
          <GlowText style={[Typography.heading, { marginTop: Spacing.xs }]}>
            ${profile?.wallet_balance?.toFixed(2) ?? '0.00'}
          </GlowText>
        </Card>

        <Card>
          <Text style={Typography.label}>KYC Status</Text>
          <View style={{ marginTop: Spacing.xs }}>
            <Badge variant={profile?.kyc_verified ? 'active' : 'open'} />
          </View>
        </Card>

        <Button label="⚙️ Settings" variant="secondary" onPress={() => router.push('/profile/settings')} />
        <Button label="Log Out" variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}
```

- [ ] **Step 2: Create app/profile/settings.tsx**

```tsx
import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();
  const { signOut } = useAuth();
  const [userId, setUserId] = useState<string | undefined>();
  const { profile, updateProfile } = useProfile(userId);
  const [riotId, setRiotId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  useEffect(() => {
    if (profile?.riot_id) setRiotId(profile.riot_id);
  }, [profile]);

  async function save() {
    setSaving(true);
    await updateProfile({ riot_id: riotId });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Screen>
      <GlowText style={[Typography.title, { marginBottom: Spacing.lg }]}>⚙️ Settings</GlowText>
      <Input label="Riot ID" placeholder="Name#TAG" value={riotId} onChangeText={setRiotId} autoCapitalize="none" />
      {saved && <Text style={{ color: Colors.success, fontSize: 12 }}>Saved!</Text>}
      <Button label={saving ? 'Saving...' : 'Save Changes'} onPress={save} loading={saving} style={{ marginTop: Spacing.md }} />
      <Button label="Log Out" variant="ghost" onPress={signOut} style={{ marginTop: Spacing.sm }} />
    </Screen>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/profile.tsx app/profile/settings.tsx
git commit -m "feat: profile screen with wallet balance, KYC badge, and settings"
```

---

### Task 8: Verify Phase 2 on device

- [ ] **Step 1: Confirm Supabase project exists and .env.local is populated**

In `.env.local`:
```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Both values from: Supabase Dashboard → Project Settings → API.

- [ ] **Step 2: Restart Expo server**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx expo start
```

- [ ] **Step 3: Test on device**

- App opens to Log In screen
- Tap "Create an account" → Sign Up screen
- Fill in username, email, password → tap Create Account
- Redirected to Home tab with Hextech Blue nav bar
- Tap Profile tab → see username and $0.00 balance
- Tap Settings → update Riot ID → save
- Tap Log Out → back to Log In

- [ ] **Step 4: Run all tests**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx jest
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: phase 2 complete — auth, profiles, settings"
```
