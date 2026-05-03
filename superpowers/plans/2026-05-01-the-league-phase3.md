# The League — Phase 3: Teams, Tournaments & Wallet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full teams system (create, invite, join), full tournament flow (browse, create, join, auto-bracket), wallet top-up via Stripe, and entry fee deduction. By end of this phase a real 8-team tournament can be organised and entry fees collected.

**Architecture:** Supabase handles teams/tournaments/matches data with RLS. Bracket generation and entry fee collection run in Supabase Edge Functions triggered by database webhooks. Stripe PaymentSheet handles card top-up in-app. All wallet mutations go through Edge Functions to prevent client-side balance tampering.

**Tech Stack:** Supabase Edge Functions (Deno), Stripe React Native SDK, Expo Router, Phase 1+2 components

**Prerequisite:** Phase 2 complete. Supabase project live. Stripe account created at dashboard.stripe.com.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `supabase/migrations/002_teams_tournaments.sql` | All remaining table DDL |
| Create | `supabase/functions/charge-entry-fee/index.ts` | Deduct entry fees from 5 wallets |
| Create | `supabase/functions/generate-bracket/index.ts` | Create 7 match rows when 8th team joins |
| Create | `supabase/functions/create-payment-intent/index.ts` | Stripe PaymentIntent for wallet top-up |
| Create | `supabase/functions/complete-topup/index.ts` | Webhook: credit wallet on payment success |
| Create | `hooks/useTeam.ts` | create/fetch/join team |
| Create | `hooks/useTournament.ts` | list/create/join tournament, subscribe to updates |
| Create | `hooks/useWallet.ts` | balance, top-up, transaction history |
| Create | `components/tournament/BracketView.tsx` | 8-team single-elim bracket tree |
| Create | `components/tournament/MatchCard.tsx` | Match row: teams, score, status |
| Create | `components/tournament/TournamentCard.tsx` | Tournament list item |
| Modify | `app/(tabs)/tournaments.tsx` | Full tournament list |
| Create | `app/tournament/[id].tsx` | Tournament detail + bracket |
| Create | `app/tournament/create.tsx` | Create tournament form |
| Modify | `app/(tabs)/team.tsx` | Team dashboard |
| Create | `app/team/invite.tsx` | Invite link + join by code |
| Modify | `app/(tabs)/wallet.tsx` | Balance + transactions list |
| Create | `app/wallet/top-up.tsx` | Stripe PaymentSheet top-up |
| Create | `app/wallet/withdraw.tsx` | Withdraw placeholder (Stripe payout Phase 4) |

---

### Task 1: Database migrations

**Files:**
- Create: `supabase/migrations/002_teams_tournaments.sql`

- [ ] **Step 1: Create migration**

```sql
-- supabase/migrations/002_teams_tournaments.sql

-- TEAMS
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  captain_id uuid not null references public.users(id) on delete cascade,
  invite_code text unique not null default upper(substring(gen_random_uuid()::text, 1, 8)),
  created_at timestamptz not null default now()
);
alter table public.teams enable row level security;
create policy "Anyone can read teams" on public.teams for select using (true);
create policy "Captain can update team" on public.teams for update using (auth.uid() = captain_id);
create policy "Authenticated can create team" on public.teams for insert with check (auth.uid() = captain_id);

-- TEAM MEMBERS
create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
alter table public.team_members enable row level security;
create policy "Anyone can read team members" on public.team_members for select using (true);
create policy "Authenticated can join team" on public.team_members for insert with check (auth.uid() = user_id);
create policy "Member can leave team" on public.team_members for delete using (auth.uid() = user_id);

-- TOURNAMENTS
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'open' check (status in ('open','active','completed')),
  entry_fee_per_player numeric(10,2) not null,
  prize_pool numeric(10,2) not null default 0,
  platform_cut_percent numeric(4,2) not null default 10,
  max_teams int not null default 8,
  start_time timestamptz,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);
alter table public.tournaments enable row level security;
create policy "Anyone can read tournaments" on public.tournaments for select using (true);
create policy "Authenticated can create tournament" on public.tournaments for insert with check (auth.uid() = created_by);

-- TOURNAMENT TEAMS
create table if not exists public.tournament_teams (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  entry_paid_at timestamptz,
  seed int,
  primary key (tournament_id, team_id)
);
alter table public.tournament_teams enable row level security;
create policy "Anyone can read tournament teams" on public.tournament_teams for select using (true);
create policy "Service role manages tournament teams" on public.tournament_teams for all using (true);

-- MATCHES
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round int not null check (round in (1,2,3)),
  team_a_id uuid references public.teams(id),
  team_b_id uuid references public.teams(id),
  score_a int not null default 0,
  score_b int not null default 0,
  winner_id uuid references public.teams(id),
  status text not null default 'scheduled' check (status in ('scheduled','live','completed')),
  riot_match_id text,
  wildrift_lobby_code text,
  wildrift_lobby_password text,
  scheduled_at timestamptz
);
alter table public.matches enable row level security;
create policy "Anyone can read matches" on public.matches for select using (true);
create policy "Service role manages matches" on public.matches for all using (true);

-- TRANSACTIONS
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  type text not null check (type in ('topup','entry_fee','prize','withdrawal')),
  amount numeric(10,2) not null,
  stripe_payment_id text,
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  created_at timestamptz not null default now()
);
alter table public.transactions enable row level security;
create policy "Users can read own transactions" on public.transactions for select using (auth.uid() = user_id);
create policy "Service role manages transactions" on public.transactions for all using (true);
```

- [ ] **Step 2: Apply in Supabase SQL Editor**

Paste and run the full SQL above in your Supabase project → SQL Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_teams_tournaments.sql
git commit -m "feat: teams, tournaments, matches, transactions migrations"
```

---

### Task 2: Install Stripe SDK

- [ ] **Step 1: Install**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League
npm install @stripe/stripe-react-native
npx expo install @stripe/stripe-react-native
```

- [ ] **Step 2: Wrap root layout with StripeProvider**

In `app/_layout.tsx`, add StripeProvider around `<Slot />`:

```tsx
import { StripeProvider } from '@stripe/stripe-react-native';

// Inside the return, replace <Slot /> with:
<StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
  <Slot />
</StripeProvider>
```

Add to the top of the file:
```tsx
import { StripeProvider } from '@stripe/stripe-react-native';
```

- [ ] **Step 3: Add Stripe key to .env.local**

```
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

Get this from: Stripe Dashboard → Developers → API keys → Publishable key.

- [ ] **Step 4: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: wrap app with StripeProvider"
```

---

### Task 3: Supabase Edge Functions — wallet top-up

**Files:**
- Create: `supabase/functions/create-payment-intent/index.ts`
- Create: `supabase/functions/complete-topup/index.ts`

- [ ] **Step 1: Create create-payment-intent function**

```ts
// supabase/functions/create-payment-intent/index.ts
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });

Deno.serve(async (req) => {
  const { amount } = await req.json(); // amount in cents
  const authHeader = req.headers.get('Authorization')!;
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    metadata: { user_id: user.id },
    automatic_payment_methods: { enabled: true },
  });

  return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Create complete-topup webhook function**

```ts
// supabase/functions/complete-topup/index.ts
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature')!;
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, Deno.env.get('STRIPE_WEBHOOK_SECRET')!);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent;
    const userId = pi.metadata.user_id;
    const dollars = pi.amount / 100;

    await supabase.rpc('increment_wallet', { user_id: userId, amount: dollars });
    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'topup',
      amount: dollars,
      stripe_payment_id: pi.id,
      status: 'completed',
    });
  }

  return new Response('ok');
});
```

- [ ] **Step 3: Create increment_wallet SQL function**

Run in Supabase SQL Editor:
```sql
create or replace function increment_wallet(user_id uuid, amount numeric)
returns void as $$
  update public.users
  set wallet_balance = wallet_balance + amount
  where id = user_id;
$$ language sql security definer;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/
git commit -m "feat: stripe payment intent and top-up webhook edge functions"
```

---

### Task 4: Supabase Edge Function — entry fee and bracket

**Files:**
- Create: `supabase/functions/charge-entry-fee/index.ts`
- Create: `supabase/functions/generate-bracket/index.ts`

- [ ] **Step 1: Create charge-entry-fee function**

```ts
// supabase/functions/charge-entry-fee/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  const { tournament_id, team_id } = await req.json();

  const { data: tournament } = await supabase.from('tournaments').select('entry_fee_per_player, prize_pool, platform_cut_percent').eq('id', tournament_id).single();
  const { data: members } = await supabase.from('team_members').select('user_id').eq('team_id', team_id);

  if (!tournament || !members || members.length !== 5) {
    return new Response(JSON.stringify({ error: 'Team must have exactly 5 members' }), { status: 400 });
  }

  const fee = tournament.entry_fee_per_player;

  for (const member of members) {
    const { data: user } = await supabase.from('users').select('wallet_balance').eq('id', member.user_id).single();
    if (!user || user.wallet_balance < fee) {
      return new Response(JSON.stringify({ error: 'Insufficient funds for one or more players' }), { status: 400 });
    }
  }

  for (const member of members) {
    await supabase.rpc('decrement_wallet', { user_id: member.user_id, amount: fee });
    await supabase.from('transactions').insert({ user_id: member.user_id, type: 'entry_fee', amount: fee, status: 'completed' });
  }

  const totalFee = fee * 5;
  const cut = totalFee * (tournament.platform_cut_percent / 100);
  await supabase.from('tournaments').update({ prize_pool: tournament.prize_pool + totalFee - cut }).eq('id', tournament_id);
  await supabase.from('tournament_teams').update({ entry_paid_at: new Date().toISOString() }).eq('tournament_id', tournament_id).eq('team_id', team_id);

  const { data: registeredTeams } = await supabase.from('tournament_teams').select('team_id').eq('tournament_id', tournament_id).not('entry_paid_at', 'is', null);

  if (registeredTeams && registeredTeams.length === 8) {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-bracket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({ tournament_id }),
    });
  }

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
});
```

- [ ] **Step 2: Create decrement_wallet SQL function**

Run in Supabase SQL Editor:
```sql
create or replace function decrement_wallet(user_id uuid, amount numeric)
returns void as $$
  update public.users
  set wallet_balance = wallet_balance - amount
  where id = user_id and wallet_balance >= amount;
$$ language sql security definer;
```

- [ ] **Step 3: Create generate-bracket function**

```ts
// supabase/functions/generate-bracket/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

Deno.serve(async (req) => {
  const { tournament_id } = await req.json();
  const { data: teams } = await supabase.from('tournament_teams').select('team_id').eq('tournament_id', tournament_id);
  if (!teams || teams.length !== 8) return new Response('Need 8 teams', { status: 400 });

  const seeded = shuffle(teams.map(t => t.team_id));

  // Update seeds
  for (let i = 0; i < 8; i++) {
    await supabase.from('tournament_teams').update({ seed: i + 1 }).eq('tournament_id', tournament_id).eq('team_id', seeded[i]);
  }

  // QF matches (round 1): 1v8, 2v7, 3v6, 4v5
  const qfPairs = [[0,7],[1,6],[2,5],[3,4]];
  for (const [a, b] of qfPairs) {
    await supabase.from('matches').insert({
      tournament_id,
      round: 1,
      team_a_id: seeded[a],
      team_b_id: seeded[b],
      status: 'scheduled',
    });
  }

  // SF and Final placeholders (team_ids filled in when QF/SF winners determined)
  await supabase.from('matches').insert([
    { tournament_id, round: 2, status: 'scheduled' },
    { tournament_id, round: 2, status: 'scheduled' },
    { tournament_id, round: 3, status: 'scheduled' },
  ]);

  await supabase.from('tournaments').update({ status: 'active' }).eq('id', tournament_id);

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
});
```

- [ ] **Step 4: Deploy Edge Functions**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npx supabase functions deploy create-payment-intent --project-ref YOUR_PROJECT_REF
npx supabase functions deploy complete-topup --project-ref YOUR_PROJECT_REF
npx supabase functions deploy charge-entry-fee --project-ref YOUR_PROJECT_REF
npx supabase functions deploy generate-bracket --project-ref YOUR_PROJECT_REF
```

Set secrets in Supabase Dashboard → Edge Functions → Secrets:
- `STRIPE_SECRET_KEY` = sk_test_... (from Stripe Dashboard)
- `STRIPE_WEBHOOK_SECRET` = whsec_... (from Stripe Dashboard → Webhooks)

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/
git commit -m "feat: charge-entry-fee and generate-bracket edge functions"
```

---

### Task 5: useTeam, useTournament, useWallet hooks

**Files:**
- Create: `hooks/useTeam.ts`
- Create: `hooks/useTournament.ts`
- Create: `hooks/useWallet.ts`

- [ ] **Step 1: Create hooks/useTeam.ts**

```ts
import { supabase } from '@/lib/supabase';
import { TeamMemberRow, TeamRow } from '@/types/database';
import { useEffect, useState } from 'react';

export function useTeam(userId: string | undefined) {
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) { setLoading(false); return; }
        const [teamRes, membersRes] = await Promise.all([
          supabase.from('teams').select('*').eq('id', data.team_id).single(),
          supabase.from('team_members').select('*').eq('team_id', data.team_id),
        ]);
        if (teamRes.data) setTeam(teamRes.data);
        if (membersRes.data) setMembers(membersRes.data);
        setLoading(false);
      });
  }, [userId]);

  async function createTeam(name: string) {
    if (!userId) return { error: 'Not authenticated' };
    const { data, error } = await supabase.from('teams').insert({ name, captain_id: userId }).select().single();
    if (error) return { error: error.message };
    await supabase.from('team_members').insert({ team_id: data.id, user_id: userId });
    setTeam(data);
    return { error: null };
  }

  async function joinTeam(inviteCode: string) {
    if (!userId) return { error: 'Not authenticated' };
    const { data: found, error } = await supabase.from('teams').select('*').eq('invite_code', inviteCode.toUpperCase()).single();
    if (error || !found) return { error: 'Team not found' };
    const { error: joinError } = await supabase.from('team_members').insert({ team_id: found.id, user_id: userId });
    if (joinError) return { error: joinError.message };
    setTeam(found);
    return { error: null };
  }

  return { team, members, loading, createTeam, joinTeam };
}
```

- [ ] **Step 2: Create hooks/useTournament.ts**

```ts
import { supabase } from '@/lib/supabase';
import { MatchRow, TournamentRow } from '@/types/database';
import { useEffect, useState } from 'react';

export function useTournamentList() {
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('tournaments').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setTournaments(data); setLoading(false); });
  }, []);

  return { tournaments, loading };
}

export function useTournament(id: string | undefined) {
  const [tournament, setTournament] = useState<TournamentRow | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('matches').select('*').eq('tournament_id', id).order('round'),
    ]).then(([t, m]) => {
      if (t.data) setTournament(t.data);
      if (m.data) setMatches(m.data);
      setLoading(false);
    });

    const sub = supabase.channel(`tournament:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${id}` },
        (payload) => setMatches(prev => prev.map(m => m.id === (payload.new as MatchRow).id ? payload.new as MatchRow : m))
      ).subscribe();

    return () => { sub.unsubscribe(); };
  }, [id]);

  async function createTournament(name: string, entryFee: number, userId: string) {
    const { data, error } = await supabase.from('tournaments').insert({
      name, entry_fee_per_player: entryFee, created_by: userId,
    }).select().single();
    return { data, error: error?.message ?? null };
  }

  return { tournament, matches, loading, createTournament };
}
```

- [ ] **Step 3: Create hooks/useWallet.ts**

```ts
import { supabase } from '@/lib/supabase';
import { TransactionRow } from '@/types/database';
import { useEffect, useState } from 'react';

export function useWallet(userId: string | undefined) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    Promise.all([
      supabase.from('users').select('wallet_balance').eq('id', userId).single(),
      supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
    ]).then(([u, t]) => {
      if (u.data) setBalance(u.data.wallet_balance);
      if (t.data) setTransactions(t.data);
      setLoading(false);
    });
  }, [userId]);

  async function topUp(amountCents: number): Promise<{ clientSecret: string | null; error: string | null }> {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ amount: amountCents }),
    });
    const json = await res.json();
    return { clientSecret: json.clientSecret ?? null, error: json.error ?? null };
  }

  return { balance, transactions, loading, topUp };
}
```

- [ ] **Step 4: Commit**

```bash
git add hooks/useTeam.ts hooks/useTournament.ts hooks/useWallet.ts
git commit -m "feat: useTeam, useTournament, useWallet hooks"
```

---

### Task 6: Tournament components

**Files:**
- Create: `components/tournament/MatchCard.tsx`
- Create: `components/tournament/TournamentCard.tsx`
- Create: `components/tournament/BracketView.tsx`

- [ ] **Step 1: Create components/tournament/MatchCard.tsx**

```tsx
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { MatchRow, MatchStatus, TeamRow } from '@/types/database';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  match: MatchRow;
  teamA: TeamRow | null;
  teamB: TeamRow | null;
};

const statusVariant: Record<MatchStatus, 'live' | 'open' | 'active' | 'completed'> = {
  scheduled: 'open',
  live: 'live',
  completed: 'completed',
};

export function MatchCard({ match, teamA, teamB }: Props) {
  return (
    <Card style={styles.card} glow={match.status === 'live'}>
      <Badge variant={statusVariant[match.status]} />
      <View style={styles.row}>
        <Text style={[Typography.subheading, styles.teamName]}>{teamA?.name ?? 'TBD'}</Text>
        <GlowText style={styles.score}>{match.score_a} – {match.score_b}</GlowText>
        <Text style={[Typography.subheading, styles.teamName, { textAlign: 'right' }]}>{teamB?.name ?? 'TBD'}</Text>
      </View>
      <Text style={[Typography.label, { marginTop: Spacing.xs }]}>Round {match.round === 1 ? 'QF' : match.round === 2 ? 'SF' : 'Final'}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm },
  teamName: { flex: 1 },
  score: { fontSize: 20, fontWeight: '900', marginHorizontal: Spacing.sm },
});
```

- [ ] **Step 2: Create components/tournament/TournamentCard.tsx**

```tsx
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { TournamentRow, TournamentStatus } from '@/types/database';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';

type Props = { tournament: TournamentRow; onPress: () => void };

const badgeVariant: Record<TournamentStatus, 'open' | 'active' | 'completed'> = {
  open: 'open', active: 'active', completed: 'completed',
};

export function TournamentCard({ tournament, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <GlowText style={Typography.subheading}>{tournament.name}</GlowText>
          <Badge variant={badgeVariant[tournament.status]} />
        </View>
        <View style={styles.row}>
          <Text style={Typography.body}>💰 ${tournament.entry_fee_per_player}/player</Text>
          <Text style={[Typography.body, { color: Colors.gold }]}>🏆 ${tournament.prize_pool.toFixed(2)} pool</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
```

- [ ] **Step 3: Create components/tournament/BracketView.tsx**

```tsx
import { Colors, Spacing, Typography } from '@/constants/theme';
import { MatchRow, TeamRow } from '@/types/database';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  matches: MatchRow[];
  teams: Record<string, TeamRow>;
};

function MatchBox({ match, teams }: { match: MatchRow; teams: Record<string, TeamRow> }) {
  const teamA = match.team_a_id ? teams[match.team_a_id]?.name ?? 'TBD' : 'TBD';
  const teamB = match.team_b_id ? teams[match.team_b_id]?.name ?? 'TBD' : 'TBD';
  const isLive = match.status === 'live';

  return (
    <View style={[styles.matchBox, isLive && styles.matchBoxLive]}>
      <Text style={[styles.teamText, match.winner_id === match.team_a_id && styles.winner]}>{teamA}</Text>
      <View style={styles.divider} />
      <Text style={[styles.teamText, match.winner_id === match.team_b_id && styles.winner]}>{teamB}</Text>
    </View>
  );
}

export function BracketView({ matches, teams }: Props) {
  const qf = matches.filter(m => m.round === 1);
  const sf = matches.filter(m => m.round === 2);
  const final = matches.filter(m => m.round === 3);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      <View style={styles.round}>
        <Text style={styles.roundLabel}>QUARTER-FINALS</Text>
        {qf.map(m => <MatchBox key={m.id} match={m} teams={teams} />)}
      </View>
      <View style={styles.connector} />
      <View style={styles.round}>
        <Text style={styles.roundLabel}>SEMI-FINALS</Text>
        {sf.map(m => <MatchBox key={m.id} match={m} teams={teams} />)}
      </View>
      <View style={styles.connector} />
      <View style={styles.round}>
        <Text style={styles.roundLabel}>FINAL</Text>
        {final.map(m => <MatchBox key={m.id} match={m} teams={teams} />)}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: Spacing.md, alignItems: 'center' },
  round: { gap: Spacing.sm, minWidth: 130 },
  roundLabel: { ...Typography.label, textAlign: 'center', marginBottom: Spacing.xs, color: Colors.accent },
  matchBox: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    borderRadius: 8,
    overflow: 'hidden',
  },
  matchBoxLive: { borderColor: Colors.live },
  teamText: { color: Colors.text, fontSize: 11, padding: Spacing.sm },
  winner: { color: Colors.accent, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Colors.accentBorder },
  connector: { width: 24, height: 1, backgroundColor: Colors.accentBorder, marginHorizontal: 4 },
});
```

- [ ] **Step 4: Commit**

```bash
git add components/tournament/
git commit -m "feat: MatchCard, TournamentCard, BracketView components"
```

---

### Task 7: Tournament screens

**Files:**
- Modify: `app/(tabs)/tournaments.tsx`
- Create: `app/tournament/[id].tsx`
- Create: `app/tournament/create.tsx`

- [ ] **Step 1: Replace app/(tabs)/tournaments.tsx**

```tsx
import { Screen } from '@/components/ui/Screen';
import { TournamentCard } from '@/components/tournament/TournamentCard';
import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useTournamentList } from '@/hooks/useTournament';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, View } from 'react-native';

export default function TournamentsScreen() {
  const router = useRouter();
  const { tournaments, loading } = useTournamentList();

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md }}>
        <GlowText style={Typography.title}>🏆 Tournaments</GlowText>
        <Button label="+ Create" variant="secondary" onPress={() => router.push('/tournament/create')} style={{ paddingVertical: 6, paddingHorizontal: 12, minHeight: 36 }} />
      </View>
      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={tournaments}
          keyExtractor={t => t.id}
          renderItem={({ item }) => (
            <View style={{ paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
              <TournamentCard tournament={item} onPress={() => router.push(`/tournament/${item.id}`)} />
            </View>
          )}
          contentContainerStyle={{ paddingBottom: Spacing.xl }}
        />
      )}
    </Screen>
  );
}
```

- [ ] **Step 2: Create app/tournament/[id].tsx**

```tsx
import { Screen } from '@/components/ui/Screen';
import { BracketView } from '@/components/tournament/BracketView';
import { MatchCard } from '@/components/tournament/MatchCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useTournament } from '@/hooks/useTournament';
import { TeamRow, TournamentStatus } from '@/types/database';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { supabase } from '@/lib/supabase';

const badgeVariant: Record<TournamentStatus, 'open' | 'active' | 'completed'> = {
  open: 'open', active: 'active', completed: 'completed',
};

export default function TournamentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tournament, matches, loading } = useTournament(id);
  const [teams, setTeams] = useState<Record<string, TeamRow>>({});

  useEffect(() => {
    if (!matches.length) return;
    const ids = [...new Set(matches.flatMap(m => [m.team_a_id, m.team_b_id]).filter(Boolean) as string[])];
    if (!ids.length) return;
    supabase.from('teams').select('*').in('id', ids).then(({ data }) => {
      if (data) setTeams(Object.fromEntries(data.map(t => [t.id, t])));
    });
  }, [matches]);

  if (loading) return <Screen><ActivityIndicator color={Colors.accent} style={{ flex: 1 }} /></Screen>;
  if (!tournament) return <Screen><Text style={Typography.body}>Tournament not found</Text></Screen>;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ gap: Spacing.md, padding: Spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <GlowText style={Typography.title}>{tournament.name}</GlowText>
          <Badge variant={badgeVariant[tournament.status]} />
        </View>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={Typography.label}>Entry Fee</Text>
              <Text style={[Typography.subheading, { color: Colors.text }]}>${tournament.entry_fee_per_player}/player</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={Typography.label}>Prize Pool</Text>
              <GlowText style={[Typography.subheading, { color: Colors.gold }]}>🏆 ${tournament.prize_pool.toFixed(2)}</GlowText>
            </View>
          </View>
        </Card>
        {matches.length > 0 && <BracketView matches={matches} teams={teams} />}
        {matches.map(m => (
          <MatchCard key={m.id} match={m} teamA={m.team_a_id ? teams[m.team_a_id] ?? null : null} teamB={m.team_b_id ? teams[m.team_b_id] ?? null : null} />
        ))}
      </ScrollView>
    </Screen>
  );
}
```

- [ ] **Step 3: Create app/tournament/create.tsx**

```tsx
import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useTournament } from '@/hooks/useTournament';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

export default function CreateTournamentScreen() {
  const router = useRouter();
  const { createTournament } = useTournament(undefined);
  const [name, setName] = useState('');
  const [fee, setFee] = useState('5');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? ''));
  }, []);

  async function handleCreate() {
    if (!name.trim()) { setError('Name is required'); return; }
    const feeNum = parseFloat(fee);
    if (isNaN(feeNum) || feeNum < 1) { setError('Entry fee must be at least $1'); return; }
    setLoading(true);
    const { data, error } = await createTournament(name.trim(), feeNum, userId);
    if (error) { setError(error); setLoading(false); return; }
    router.replace(`/tournament/${data.id}`);
  }

  return (
    <Screen>
      <GlowText style={[Typography.title, { marginBottom: Spacing.lg }]}>🏆 Create Tournament</GlowText>
      <View style={{ gap: Spacing.md }}>
        <Input label="Tournament Name" placeholder="Season 1 — Wild Rift Open" value={name} onChangeText={setName} />
        <Input label="Entry Fee per Player ($)" placeholder="5" value={fee} onChangeText={setFee} keyboardType="decimal-pad" />
        <Text style={[Typography.body, { textAlign: 'center' }]}>
          Prize pool: ${(parseFloat(fee || '0') * 5 * 8 * 0.9).toFixed(2)} (10% platform cut)
        </Text>
        {error && <Text style={{ color: Colors.error, fontSize: 13 }}>{error}</Text>}
        <Button label="Create Tournament" onPress={handleCreate} loading={loading} />
      </View>
    </Screen>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/tournaments.tsx app/tournament/
git commit -m "feat: tournament list, detail/bracket, and create screens"
```

---

### Task 8: Team screens

**Files:**
- Modify: `app/(tabs)/team.tsx`
- Create: `app/team/invite.tsx`

- [ ] **Step 1: Replace app/(tabs)/team.tsx**

```tsx
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

export default function TeamScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>();
  const { team, members, loading, createTeam } = useTeam(userId);
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  async function handleCreate() {
    if (!teamName.trim()) { setError('Team name required'); return; }
    setCreating(true);
    const { error } = await createTeam(teamName.trim());
    if (error) setError(error);
    setCreating(false);
  }

  if (loading) return <Screen><Text style={Typography.body}>Loading...</Text></Screen>;

  if (!team) return (
    <Screen>
      <GlowText style={[Typography.title, { marginBottom: Spacing.lg }]}>⚔️ My Team</GlowText>
      <Text style={[Typography.body, { marginBottom: Spacing.lg }]}>You're not on a team yet.</Text>
      <Input label="Create a Team" placeholder="Team Name" value={teamName} onChangeText={setTeamName} />
      {error && <Text style={{ color: Colors.error, fontSize: 13, marginTop: Spacing.xs }}>{error}</Text>}
      <Button label="Create Team" onPress={handleCreate} loading={creating} style={{ marginTop: Spacing.md }} />
      <Button label="Join with Invite Code" variant="secondary" onPress={() => router.push('/team/invite')} style={{ marginTop: Spacing.sm }} />
    </Screen>
  );

  return (
    <Screen>
      <GlowText style={[Typography.title, { marginBottom: Spacing.sm }]}>{team.name}</GlowText>
      <Text style={[Typography.body, { marginBottom: Spacing.lg }]}>{members.length}/5 players</Text>
      <Card style={{ marginBottom: Spacing.md }}>
        <Text style={Typography.label}>Invite Code</Text>
        <GlowText style={[Typography.heading, { marginTop: Spacing.xs, letterSpacing: 4 }]}>{team.invite_code}</GlowText>
        <Text style={[Typography.body, { marginTop: Spacing.xs }]}>Share this code with your teammates</Text>
      </Card>
      <Button label="📨 Invite / Join" variant="secondary" onPress={() => router.push('/team/invite')} />
    </Screen>
  );
}
```

- [ ] **Step 2: Create app/team/invite.tsx**

```tsx
import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

export default function InviteScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>();
  const { joinTeam } = useTeam(userId);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  async function handleJoin() {
    if (!code.trim()) { setError('Enter an invite code'); return; }
    setLoading(true);
    const { error } = await joinTeam(code.trim());
    if (error) { setError(error); setLoading(false); return; }
    router.replace('/(tabs)/team');
  }

  return (
    <Screen>
      <GlowText style={[Typography.title, { marginBottom: Spacing.lg }]}>📨 Join a Team</GlowText>
      <Input label="Invite Code" placeholder="ABCD1234" value={code} onChangeText={v => setCode(v.toUpperCase())} autoCapitalize="characters" />
      {error && <Text style={{ color: Colors.error, fontSize: 13, marginTop: Spacing.xs }}>{error}</Text>}
      <Button label="Join Team" onPress={handleJoin} loading={loading} style={{ marginTop: Spacing.md }} />
    </Screen>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/team.tsx app/team/invite.tsx
git commit -m "feat: team dashboard with create/join, invite code screen"
```

---

### Task 9: Wallet screens

**Files:**
- Modify: `app/(tabs)/wallet.tsx`
- Create: `app/wallet/top-up.tsx`
- Create: `app/wallet/withdraw.tsx`

- [ ] **Step 1: Replace app/(tabs)/wallet.tsx**

```tsx
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';

export default function WalletScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>();
  const { balance, transactions, loading } = useWallet(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  const typeEmoji: Record<string, string> = { topup: '⬆️', entry_fee: '⚔️', prize: '🏆', withdrawal: '🏦' };

  return (
    <Screen padded={false}>
      <View style={{ padding: Spacing.md, gap: Spacing.md }}>
        <GlowText style={Typography.title}>💰 Wallet</GlowText>
        <Card glow>
          <Text style={Typography.label}>Available Balance</Text>
          <GlowText style={[Typography.title, { fontSize: 36, marginTop: Spacing.xs }]}>${balance.toFixed(2)}</GlowText>
        </Card>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Button label="Top Up" onPress={() => router.push('/wallet/top-up')} style={{ flex: 1 }} />
          <Button label="Withdraw" variant="secondary" onPress={() => router.push('/wallet/withdraw')} style={{ flex: 1 }} />
        </View>
      </View>
      {loading ? <ActivityIndicator color={Colors.accent} /> : (
        <FlatList
          data={transactions}
          keyExtractor={t => t.id}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.surfaceAlt }}>
              <Text style={Typography.body}>{typeEmoji[item.type]} {item.type}</Text>
              <Text style={[Typography.body, { color: item.type === 'topup' || item.type === 'prize' ? Colors.success : Colors.error }]}>
                {item.type === 'topup' || item.type === 'prize' ? '+' : '-'}${item.amount.toFixed(2)}
              </Text>
            </View>
          )}
          ListEmptyComponent={<Text style={[Typography.body, { textAlign: 'center', padding: Spacing.xl }]}>No transactions yet</Text>}
        />
      )}
    </Screen>
  );
}
```

- [ ] **Step 2: Create app/wallet/top-up.tsx**

```tsx
import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/lib/supabase';
import { useInitPaymentSheet, useStripe } from '@stripe/stripe-react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

const PRESETS = [5, 10, 25];

export default function TopUpScreen() {
  const router = useRouter();
  const { presentPaymentSheet } = useStripe();
  const { initPaymentSheet } = useInitPaymentSheet();
  const [userId, setUserId] = useState<string>();
  const { topUp } = useWallet(userId);
  const [amount, setAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  async function handleTopUp() {
    setLoading(true);
    setError(null);
    const { clientSecret, error } = await topUp(amount * 100);
    if (error || !clientSecret) { setError(error ?? 'Failed'); setLoading(false); return; }

    const { error: initError } = await initPaymentSheet({ paymentIntentClientSecret: clientSecret, merchantDisplayName: 'The League' });
    if (initError) { setError(initError.message); setLoading(false); return; }

    const { error: presentError } = await presentPaymentSheet();
    if (presentError) { setError(presentError.message); } else { router.replace('/(tabs)/wallet'); }
    setLoading(false);
  }

  return (
    <Screen>
      <GlowText style={[Typography.title, { marginBottom: Spacing.lg }]}>⬆️ Top Up Wallet</GlowText>
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg }}>
        {PRESETS.map(p => (
          <TouchableOpacity key={p} onPress={() => setAmount(p)} style={{ flex: 1, padding: Spacing.md, borderRadius: 10, borderWidth: 1, borderColor: amount === p ? Colors.accent : Colors.accentBorder, backgroundColor: amount === p ? Colors.accentDim : Colors.surface, alignItems: 'center' }}>
            <Text style={{ color: amount === p ? Colors.accent : Colors.textMuted, fontWeight: '700' }}>${p}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {error && <Text style={{ color: Colors.error, fontSize: 13, marginBottom: Spacing.sm }}>{error}</Text>}
      <Button label={`Add $${amount} to Wallet`} onPress={handleTopUp} loading={loading} />
    </Screen>
  );
}
```

- [ ] **Step 3: Create app/wallet/withdraw.tsx**

```tsx
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { Text } from 'react-native';

export default function WithdrawScreen() {
  return (
    <Screen>
      <GlowText style={[Typography.title, { marginBottom: Spacing.lg }]}>🏦 Withdraw</GlowText>
      <Card>
        <Text style={Typography.body}>Bank withdrawal via Stripe payout is coming in Phase 4.</Text>
        <Text style={[Typography.body, { marginTop: Spacing.sm, color: Colors.accent }]}>Prize winnings are automatically added to your wallet balance.</Text>
      </Card>
    </Screen>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/wallet.tsx app/wallet/
git commit -m "feat: wallet screen, stripe top-up, transaction history"
```

---

### Task 10: Verify Phase 3 on device

- [ ] **Step 1: Restart Expo**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx expo start
```

- [ ] **Step 2: Test flow on device**

1. Log in → Wallet tab → Top Up → select $10 → Stripe sheet appears → use test card `4242 4242 4242 4242` → confirm → balance updates to $10.00
2. Tournaments tab → Create → name "Season 1", fee $1 → creates tournament
3. My Team → Create Team "Alpha" (5 members must join before entering tournament)
4. Tournaments → tap tournament → see detail + empty bracket
5. Run all tests: `npx jest`

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: phase 3 complete — teams, tournaments, wallet, stripe"
```
