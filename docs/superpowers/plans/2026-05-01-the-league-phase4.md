# The League — Phase 4: Wild Rift Integration & Live Features

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match lobby with Wild Rift deep-link launch, Riot API result polling via Edge Function, live score updates via Supabase Realtime, prize payouts on match completion, home feed with live banner, and Stripe bank withdrawal.

**Architecture:** A Supabase Edge Function polls the Riot API every 60s for active matches. On result detection it updates the match row, advances the bracket (fills SF/Final team slots), and if it's the Final triggers prize distribution. Supabase Realtime broadcasts all match row changes to subscribed clients instantly. The home screen subscribes to live matches globally.

**Tech Stack:** Riot Games API (match history v5 via RiotWatcher-compatible REST), Supabase Realtime, Expo Linking (deep-link), Stripe Payouts API, Phase 1–3 components.

**Prerequisite:** Phase 3 complete. Riot developer account at developer.riotgames.com with an API key.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `lib/wildrift.ts` | Build `wildrift://` deep-link URL |
| Create | `lib/riot.ts` | Riot API REST calls (match lookup by Riot ID) |
| Create | `supabase/functions/poll-riot-results/index.ts` | Poll Riot API, update match results, advance bracket |
| Create | `supabase/functions/distribute-prizes/index.ts` | Credit winner wallets after Final |
| Create | `supabase/functions/payout-withdrawal/index.ts` | Stripe payout to bank account |
| Create | `hooks/useMatch.ts` | Fetch single match + subscribe to realtime |
| Create | `hooks/useLiveMatches.ts` | Subscribe to all live matches globally |
| Create | `app/team/lobby.tsx` | Pre-match lobby: countdown, launch Wild Rift button |
| Create | `app/match/[id].tsx` | Live match view: score, teams, status |
| Modify | `app/(tabs)/index.tsx` | Home feed: live match banner, recent results |
| Modify | `app/wallet/withdraw.tsx` | Real Stripe payout UI |

---

### Task 1: Wild Rift deep-link utility

**Files:**
- Create: `lib/wildrift.ts`
- Create: `__tests__/lib/wildrift.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { buildLobbyDeepLink } from '../../lib/wildrift';

test('builds wildrift deep link with lobby code and password', () => {
  const url = buildLobbyDeepLink('LEAGUE-001', 'secret123');
  expect(url).toBe('wildrift://lobby?code=LEAGUE-001&password=secret123');
});

test('builds wildrift deep link without password', () => {
  const url = buildLobbyDeepLink('LEAGUE-002');
  expect(url).toBe('wildrift://lobby?code=LEAGUE-002');
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx jest wildrift
```

- [ ] **Step 3: Create lib/wildrift.ts**

```ts
import * as Linking from 'expo-linking';

export function buildLobbyDeepLink(lobbyCode: string, password?: string): string {
  const base = `wildrift://lobby?code=${encodeURIComponent(lobbyCode)}`;
  return password ? `${base}&password=${encodeURIComponent(password)}` : base;
}

export async function launchWildRiftLobby(lobbyCode: string, password?: string): Promise<boolean> {
  const url = buildLobbyDeepLink(lobbyCode, password);
  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) return false;
  await Linking.openURL(url);
  return true;
}

export function generateLobbyCode(matchId: string): string {
  return `TL-${matchId.slice(0, 6).toUpperCase()}`;
}

export function generateLobbyPassword(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx jest wildrift
```

- [ ] **Step 5: Commit**

```bash
git add lib/wildrift.ts __tests__/lib/wildrift.test.ts
git commit -m "feat: wild rift deep-link utility"
```

---

### Task 2: Riot API client

**Files:**
- Create: `lib/riot.ts`

- [ ] **Step 1: Create lib/riot.ts**

```ts
const RIOT_API_BASE = 'https://sea.api.riotgames.com';

type RiotAccount = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

type RiotMatch = {
  metadata: { matchId: string; participants: string[] };
  info: {
    gameMode: string;
    gameDuration: number;
    participants: Array<{
      puuid: string;
      teamId: number;
      win: boolean;
      summonerName: string;
    }>;
    teams: Array<{ teamId: number; win: boolean }>;
  };
};

export async function getRiotAccountByRiotId(gameName: string, tagLine: string, apiKey: string): Promise<RiotAccount | null> {
  const res = await fetch(
    `https://sea.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    { headers: { 'X-Riot-Token': apiKey } }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function getMatchById(matchId: string, apiKey: string): Promise<RiotMatch | null> {
  const res = await fetch(
    `${RIOT_API_BASE}/lol/match/v5/matches/${matchId}`,
    { headers: { 'X-Riot-Token': apiKey } }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function getRecentMatchIds(puuid: string, apiKey: string, count = 5): Promise<string[]> {
  const res = await fetch(
    `${RIOT_API_BASE}/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}&type=custom`,
    { headers: { 'X-Riot-Token': apiKey } }
  );
  if (!res.ok) return [];
  return res.json();
}
```

- [ ] **Step 2: Add Riot API key to Supabase secrets**

In Supabase Dashboard → Edge Functions → Secrets, add:
- `RIOT_API_KEY` = your key from developer.riotgames.com

- [ ] **Step 3: Commit**

```bash
git add lib/riot.ts
git commit -m "feat: riot api client for account and match lookups"
```

---

### Task 3: Edge Function — poll Riot results

**Files:**
- Create: `supabase/functions/poll-riot-results/index.ts`

- [ ] **Step 1: Create poll-riot-results function**

```ts
// supabase/functions/poll-riot-results/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const RIOT_API_KEY = Deno.env.get('RIOT_API_KEY')!;
const RIOT_BASE = 'https://sea.api.riotgames.com';

async function riotFetch(path: string) {
  const res = await fetch(`${RIOT_BASE}${path}`, { headers: { 'X-Riot-Token': RIOT_API_KEY } });
  if (!res.ok) return null;
  return res.json();
}

Deno.serve(async () => {
  const { data: liveMatches } = await supabase
    .from('matches')
    .select('*, tournaments(id)')
    .eq('status', 'live')
    .not('riot_match_id', 'is', null);

  if (!liveMatches?.length) return new Response('No live matches');

  for (const match of liveMatches) {
    const matchData = await riotFetch(`/lol/match/v5/matches/${match.riot_match_id}`);
    if (!matchData) continue;

    const winningTeamId = matchData.info.teams.find((t: any) => t.win)?.teamId;
    if (winningTeamId === undefined) continue;

    const teamAPlayers = matchData.info.participants.filter((p: any) => p.teamId === 100);
    const teamBPlayers = matchData.info.participants.filter((p: any) => p.teamId === 200);
    const teamAWon = winningTeamId === 100;

    const scoreA = teamAWon ? 1 : 0;
    const scoreB = teamAWon ? 0 : 1;
    const winnerId = teamAWon ? match.team_a_id : match.team_b_id;

    await supabase.from('matches').update({
      score_a: scoreA,
      score_b: scoreB,
      winner_id: winnerId,
      status: 'completed',
    }).eq('id', match.id);

    await advanceBracket(match, winnerId);
  }

  return new Response('Polled');
});

async function advanceBracket(match: any, winnerId: string) {
  const { data: tournament } = await supabase.from('tournaments').select('id').eq('id', match.tournament_id).single();
  if (!tournament) return;

  if (match.round === 3) {
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/distribute-prizes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
      body: JSON.stringify({ tournament_id: match.tournament_id, winner_team_id: winnerId }),
    });
    await supabase.from('tournaments').update({ status: 'completed' }).eq('id', match.tournament_id);
    return;
  }

  const { data: completedMatches } = await supabase
    .from('matches')
    .select('round, winner_id')
    .eq('tournament_id', match.tournament_id)
    .eq('round', match.round)
    .eq('status', 'completed');

  if (!completedMatches) return;

  const { data: nextMatches } = await supabase
    .from('matches')
    .select('id, team_a_id, team_b_id')
    .eq('tournament_id', match.tournament_id)
    .eq('round', match.round + 1)
    .order('created_at');

  if (!nextMatches?.length) return;

  const winners = completedMatches.map(m => m.winner_id);
  for (let i = 0; i < nextMatches.length; i++) {
    const nextMatch = nextMatches[i];
    const w1 = winners[i * 2];
    const w2 = winners[i * 2 + 1];
    if (w1 && !nextMatch.team_a_id) {
      await supabase.from('matches').update({ team_a_id: w1 }).eq('id', nextMatch.id);
    }
    if (w2 && !nextMatch.team_b_id) {
      await supabase.from('matches').update({ team_b_id: w2 }).eq('id', nextMatch.id);
    }
  }
}
```

- [ ] **Step 2: Deploy**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npx supabase functions deploy poll-riot-results --project-ref YOUR_PROJECT_REF
```

- [ ] **Step 3: Set up cron job in Supabase**

In Supabase Dashboard → Database → Extensions → enable `pg_cron`, then in SQL Editor:

```sql
select cron.schedule(
  'poll-riot-results',
  '* * * * *',
  $$
  select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/poll-riot-results',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.service_role_key'))
  );
  $$
);
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/poll-riot-results/
git commit -m "feat: riot api polling edge function with bracket advancement"
```

---

### Task 4: Edge Function — distribute prizes and withdrawal

**Files:**
- Create: `supabase/functions/distribute-prizes/index.ts`
- Create: `supabase/functions/payout-withdrawal/index.ts`

- [ ] **Step 1: Create distribute-prizes function**

```ts
// supabase/functions/distribute-prizes/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  const { tournament_id, winner_team_id } = await req.json();

  const { data: tournament } = await supabase.from('tournaments').select('prize_pool').eq('id', tournament_id).single();
  if (!tournament) return new Response('Tournament not found', { status: 404 });

  const { data: members } = await supabase.from('team_members').select('user_id').eq('team_id', winner_team_id);
  if (!members?.length) return new Response('No members found', { status: 404 });

  const sharePerPlayer = tournament.prize_pool / members.length;

  for (const member of members) {
    await supabase.rpc('increment_wallet', { user_id: member.user_id, amount: sharePerPlayer });
    await supabase.from('transactions').insert({
      user_id: member.user_id,
      type: 'prize',
      amount: sharePerPlayer,
      status: 'completed',
    });
  }

  return new Response(JSON.stringify({ success: true, prize_per_player: sharePerPlayer }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Create payout-withdrawal function**

```ts
// supabase/functions/payout-withdrawal/index.ts
import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2023-10-16' });

Deno.serve(async (req) => {
  const { amount } = await req.json();
  const authHeader = req.headers.get('Authorization')!;
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const serviceSupabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  if (amount < 10) return new Response(JSON.stringify({ error: 'Minimum withdrawal is $10' }), { status: 400 });

  const { data: profile } = await supabase.from('users').select('wallet_balance, stripe_customer_id, kyc_verified').eq('id', user.id).single();
  if (!profile?.kyc_verified) return new Response(JSON.stringify({ error: 'KYC verification required' }), { status: 403 });
  if (!profile?.stripe_customer_id) return new Response(JSON.stringify({ error: 'No Stripe account linked' }), { status: 400 });
  if (profile.wallet_balance < amount) return new Response(JSON.stringify({ error: 'Insufficient balance' }), { status: 400 });

  await serviceSupabase.rpc('decrement_wallet', { user_id: user.id, amount });
  await serviceSupabase.from('transactions').insert({ user_id: user.id, type: 'withdrawal', amount, status: 'pending' });

  const payout = await stripe.payouts.create({ amount: Math.round(amount * 100), currency: 'usd' }, { stripeAccount: profile.stripe_customer_id });

  await serviceSupabase.from('transactions')
    .update({ status: 'completed', stripe_payment_id: payout.id })
    .eq('user_id', user.id).eq('type', 'withdrawal').eq('status', 'pending')
    .order('created_at', { ascending: false }).limit(1);

  return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
});
```

- [ ] **Step 3: Deploy both functions**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
npx supabase functions deploy distribute-prizes --project-ref YOUR_PROJECT_REF
npx supabase functions deploy payout-withdrawal --project-ref YOUR_PROJECT_REF
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/distribute-prizes/ supabase/functions/payout-withdrawal/
git commit -m "feat: distribute prizes and stripe bank withdrawal edge functions"
```

---

### Task 5: useMatch and useLiveMatches hooks

**Files:**
- Create: `hooks/useMatch.ts`
- Create: `hooks/useLiveMatches.ts`

- [ ] **Step 1: Create hooks/useMatch.ts**

```ts
import { supabase } from '@/lib/supabase';
import { MatchRow } from '@/types/database';
import { useEffect, useState } from 'react';

export function useMatch(matchId: string | undefined) {
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) return;
    supabase.from('matches').select('*').eq('id', matchId).single()
      .then(({ data }) => { if (data) setMatch(data); setLoading(false); });

    const sub = supabase.channel(`match:${matchId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload) => setMatch(payload.new as MatchRow)
      ).subscribe();

    return () => { sub.unsubscribe(); };
  }, [matchId]);

  async function setLive(riotMatchId: string) {
    if (!matchId) return;
    await supabase.from('matches').update({ status: 'live', riot_match_id: riotMatchId }).eq('id', matchId);
  }

  return { match, loading, setLive };
}
```

- [ ] **Step 2: Create hooks/useLiveMatches.ts**

```ts
import { supabase } from '@/lib/supabase';
import { MatchRow } from '@/types/database';
import { useEffect, useState } from 'react';

export function useLiveMatches() {
  const [matches, setMatches] = useState<MatchRow[]>([]);

  useEffect(() => {
    supabase.from('matches').select('*').eq('status', 'live')
      .then(({ data }) => { if (data) setMatches(data); });

    const sub = supabase.channel('live-matches')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' },
        (payload) => {
          const updated = payload.new as MatchRow;
          setMatches(prev => {
            if (updated.status === 'live') {
              return prev.some(m => m.id === updated.id) ? prev.map(m => m.id === updated.id ? updated : m) : [...prev, updated];
            }
            return prev.filter(m => m.id !== updated.id);
          });
        }
      ).subscribe();

    return () => { sub.unsubscribe(); };
  }, []);

  return { matches };
}
```

- [ ] **Step 3: Commit**

```bash
git add hooks/useMatch.ts hooks/useLiveMatches.ts
git commit -m "feat: useMatch and useLiveMatches hooks with realtime subscriptions"
```

---

### Task 6: Match Lobby screen

**Files:**
- Create: `app/team/lobby.tsx`

- [ ] **Step 1: Create app/team/lobby.tsx**

```tsx
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useMatch } from '@/hooks/useMatch';
import { generateLobbyCode, generateLobbyPassword, launchWildRiftLobby } from '@/lib/wildrift';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';

export default function MatchLobbyScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { match, loading, setLive } = useMatch(matchId);
  const [launching, setLaunching] = useState(false);
  const [riotMatchId, setRiotMatchId] = useState('');

  const lobbyCode = match?.wildrift_lobby_code ?? generateLobbyCode(matchId ?? '');
  const lobbyPassword = match?.wildrift_lobby_password ?? '';

  useEffect(() => {
    if (!matchId || match?.wildrift_lobby_code) return;
    const code = generateLobbyCode(matchId);
    const password = generateLobbyPassword();
    supabase.from('matches').update({ wildrift_lobby_code: code, wildrift_lobby_password: password }).eq('id', matchId);
  }, [matchId, match]);

  async function handleLaunch() {
    setLaunching(true);
    const opened = await launchWildRiftLobby(lobbyCode, lobbyPassword);
    if (!opened) {
      Alert.alert('Wild Rift not found', 'Please install Wild Rift on your device to launch the lobby.');
    }
    setLaunching(false);
  }

  async function handleMatchStarted() {
    if (!riotMatchId.trim()) {
      Alert.alert('Enter Riot Match ID', 'Paste the match ID from Wild Rift to start tracking.');
      return;
    }
    await setLive(riotMatchId.trim());
    Alert.alert('Match is Live!', 'Results will be tracked automatically.');
  }

  if (loading) return <Screen><Text style={Typography.body}>Loading lobby...</Text></Screen>;

  return (
    <Screen>
      <GlowText style={[Typography.title, { marginBottom: Spacing.md }]}>🎮 Match Lobby</GlowText>

      <Card glow style={{ marginBottom: Spacing.md }}>
        <Text style={Typography.label}>Lobby Code</Text>
        <GlowText style={[Typography.heading, { letterSpacing: 4, marginTop: Spacing.xs }]}>{lobbyCode}</GlowText>
        {lobbyPassword && <>
          <Text style={[Typography.label, { marginTop: Spacing.sm }]}>Password</Text>
          <GlowText style={[Typography.heading, { letterSpacing: 2, marginTop: Spacing.xs }]}>{lobbyPassword}</GlowText>
        </>}
        <Text style={[Typography.body, { marginTop: Spacing.sm }]}>Share with all 10 players</Text>
      </Card>

      <Button
        label="🎮 Launch Wild Rift"
        onPress={handleLaunch}
        loading={launching}
        style={{ marginBottom: Spacing.sm }}
      />

      {match?.status === 'scheduled' && (
        <Card style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
          <Text style={Typography.label}>After the match starts in Wild Rift</Text>
          <Text style={[Typography.body, { marginBottom: Spacing.xs }]}>Enter the Riot Match ID to enable live tracking:</Text>
          <Button label="Mark Match as Live" variant="secondary" onPress={handleMatchStarted} />
        </Card>
      )}

      {match?.status === 'live' && (
        <Card style={{ marginTop: Spacing.md }}>
          <GlowText style={Typography.subheading}>● Match is LIVE</GlowText>
          <Text style={[Typography.body, { marginTop: Spacing.xs }]}>Results will update automatically when the game ends.</Text>
        </Card>
      )}

      {match?.status === 'completed' && (
        <Card style={{ marginTop: Spacing.md }}>
          <Text style={[Typography.subheading, { color: Colors.success }]}>✓ Match Complete</Text>
        </Card>
      )}
    </Screen>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/team/lobby.tsx
git commit -m "feat: match lobby screen with wild rift deep-link and live tracking"
```

---

### Task 7: Live Match View screen

**Files:**
- Create: `app/match/[id].tsx`

- [ ] **Step 1: Create app/match/[id].tsx**

```tsx
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useMatch } from '@/hooks/useMatch';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { TeamRow } from '@/types/database';

export default function LiveMatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { match, loading } = useMatch(id);
  const [teamA, setTeamA] = useState<TeamRow | null>(null);
  const [teamB, setTeamB] = useState<TeamRow | null>(null);

  useEffect(() => {
    if (!match) return;
    const ids = [match.team_a_id, match.team_b_id].filter(Boolean) as string[];
    if (!ids.length) return;
    supabase.from('teams').select('*').in('id', ids).then(({ data }) => {
      if (!data) return;
      setTeamA(data.find(t => t.id === match.team_a_id) ?? null);
      setTeamB(data.find(t => t.id === match.team_b_id) ?? null);
    });
  }, [match?.team_a_id, match?.team_b_id]);

  if (loading) return <Screen><ActivityIndicator color={Colors.accent} style={{ flex: 1 }} /></Screen>;
  if (!match) return <Screen><Text style={Typography.body}>Match not found</Text></Screen>;

  const roundLabel = match.round === 1 ? 'Quarter-Final' : match.round === 2 ? 'Semi-Final' : '⚔️ GRAND FINAL';

  return (
    <Screen>
      <View style={{ gap: Spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={Typography.subheading}>{roundLabel}</Text>
          <Badge variant={match.status === 'live' ? 'live' : match.status === 'completed' ? 'completed' : 'open'} />
        </View>

        <Card glow={match.status === 'live'} style={{ alignItems: 'center', gap: Spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 28 }}>🛡️</Text>
              <Text style={[Typography.subheading, { textAlign: 'center', marginTop: Spacing.xs }]}>
                {teamA?.name ?? 'TBD'}
              </Text>
              {match.winner_id === match.team_a_id && <Text style={{ color: Colors.gold, fontSize: 10 }}>WINNER 🏆</Text>}
            </View>
            <View style={{ alignItems: 'center' }}>
              <GlowText style={{ fontSize: 40, fontWeight: '900' }}>
                {match.score_a} – {match.score_b}
              </GlowText>
              <Text style={[Typography.label, { marginTop: Spacing.xs }]}>Best of 1</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 28 }}>⚔️</Text>
              <Text style={[Typography.subheading, { textAlign: 'center', marginTop: Spacing.xs }]}>
                {teamB?.name ?? 'TBD'}
              </Text>
              {match.winner_id === match.team_b_id && <Text style={{ color: Colors.gold, fontSize: 10 }}>WINNER 🏆</Text>}
            </View>
          </View>
        </Card>

        {match.status === 'live' && (
          <Text style={[Typography.body, { textAlign: 'center', color: Colors.live }]}>
            ● Results update automatically every 60s
          </Text>
        )}
      </View>
    </Screen>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/match/[id].tsx
git commit -m "feat: live match view with realtime score and winner display"
```

---

### Task 8: Home Feed screen

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Replace app/(tabs)/index.tsx**

```tsx
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useLiveMatches } from '@/hooks/useLiveMatches';
import { useTournamentList } from '@/hooks/useTournament';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { TeamRow } from '@/types/database';

export default function HomeScreen() {
  const router = useRouter();
  const { matches: liveMatches } = useLiveMatches();
  const { tournaments } = useTournamentList();
  const [teamCache, setTeamCache] = useState<Record<string, TeamRow>>({});

  useEffect(() => {
    const ids = [...new Set(liveMatches.flatMap(m => [m.team_a_id, m.team_b_id]).filter(Boolean) as string[])];
    if (!ids.length) return;
    supabase.from('teams').select('*').in('id', ids).then(({ data }) => {
      if (data) setTeamCache(prev => ({ ...prev, ...Object.fromEntries(data.map(t => [t.id, t])) }));
    });
  }, [liveMatches]);

  const activeTournaments = tournaments.filter(t => t.status === 'active');
  const openTournaments = tournaments.filter(t => t.status === 'open');

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.lg }}>
        <GlowText style={[Typography.title, { marginBottom: Spacing.xs }]}>◈ THE LEAGUE</GlowText>

        {liveMatches.length > 0 && (
          <View style={{ gap: Spacing.sm }}>
            <Text style={Typography.label}>🔴 Live Now</Text>
            {liveMatches.map(match => (
              <TouchableOpacity key={match.id} onPress={() => router.push(`/match/${match.id}`)}>
                <Card glow style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Badge variant="live" />
                    <Text style={[Typography.subheading, { marginTop: Spacing.xs }]}>
                      {teamCache[match.team_a_id ?? '']?.name ?? 'TBD'} vs {teamCache[match.team_b_id ?? '']?.name ?? 'TBD'}
                    </Text>
                  </View>
                  <GlowText style={{ fontSize: 22, fontWeight: '900' }}>{match.score_a} – {match.score_b}</GlowText>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {activeTournaments.length > 0 && (
          <View style={{ gap: Spacing.sm }}>
            <Text style={Typography.label}>Active Tournaments</Text>
            {activeTournaments.map(t => (
              <TouchableOpacity key={t.id} onPress={() => router.push(`/tournament/${t.id}`)}>
                <Card style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={Typography.subheading}>{t.name}</Text>
                  <GlowText style={{ color: Colors.gold }}>🏆 ${t.prize_pool.toFixed(2)}</GlowText>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {openTournaments.length > 0 && (
          <View style={{ gap: Spacing.sm }}>
            <Text style={Typography.label}>Open for Registration</Text>
            {openTournaments.map(t => (
              <TouchableOpacity key={t.id} onPress={() => router.push(`/tournament/${t.id}`)}>
                <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={Typography.subheading}>{t.name}</Text>
                  <Badge variant="open" />
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {liveMatches.length === 0 && activeTournaments.length === 0 && openTournaments.length === 0 && (
          <Card style={{ alignItems: 'center', gap: Spacing.sm }}>
            <Text style={{ fontSize: 32 }}>⚔️</Text>
            <Text style={[Typography.subheading, { textAlign: 'center' }]}>No tournaments yet</Text>
            <Text style={[Typography.body, { textAlign: 'center' }]}>Head to Tournaments to create the first one</Text>
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: home feed with live match banner and tournament listings"
```

---

### Task 9: Withdrawal screen

**Files:**
- Modify: `app/wallet/withdraw.tsx`

- [ ] **Step 1: Replace app/wallet/withdraw.tsx**

```tsx
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useWallet } from '@/hooks/useWallet';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

export default function WithdrawScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>();
  const { balance } = useWallet(userId);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  async function handleWithdraw() {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 10) { setError('Minimum withdrawal is $10'); return; }
    if (amt > balance) { setError('Insufficient balance'); return; }
    setLoading(true);
    setError(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/payout-withdrawal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ amount: amt }),
    });
    const json = await res.json();
    if (json.error) { setError(json.error); } else { router.replace('/(tabs)/wallet'); }
    setLoading(false);
  }

  return (
    <Screen>
      <GlowText style={[Typography.title, { marginBottom: Spacing.md }]}>🏦 Withdraw</GlowText>
      <Card style={{ marginBottom: Spacing.lg }}>
        <Text style={Typography.label}>Available Balance</Text>
        <GlowText style={[Typography.heading, { marginTop: Spacing.xs }]}>${balance.toFixed(2)}</GlowText>
      </Card>
      <Input label="Amount ($)" placeholder="10.00" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <Text style={[Typography.body, { marginTop: Spacing.xs, marginBottom: Spacing.md }]}>Minimum $10 · KYC required · 1–3 business days</Text>
      {error && <Text style={{ color: Colors.error, fontSize: 13, marginBottom: Spacing.sm }}>{error}</Text>}
      <Button label="Withdraw to Bank" onPress={handleWithdraw} loading={loading} />
    </Screen>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/wallet/withdraw.tsx
git commit -m "feat: withdrawal screen with stripe payout integration"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run all tests**

```bash
export PATH="$HOME/.nvm/versions/node/v24.15.0/bin:$PATH"
cd /Users/loz/The-League && npx jest
```

Expected: All PASS.

- [ ] **Step 2: Full end-to-end flow on device**

1. Sign up two accounts, each create a team of 5
2. Create a tournament ($1 entry fee)
3. Both teams join the tournament — entry fees deducted from wallets
4. 8 teams trigger bracket generation — tournament goes Active
5. Tap a QF match → Match Lobby → tap Launch Wild Rift
6. After game: mark match as live, paste Riot match ID
7. Poll function detects result → bracket advances
8. Final completed → prize distributed to winner wallets
9. Winner taps Wallet → Withdraw → receives funds

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: phase 4 complete — wild rift integration, live matches, prizes, withdrawals"
```
