# The League — Design Spec
_Date: 2026-05-01_

## Overview

The League is a mobile app (iOS + Android) for organizing Wild Rift 5v5 tournament brackets with real prize pools. Players create accounts, fund in-app wallets, enter tournaments, and compete in matches that are launched directly into Wild Rift. Results are verified via the Riot Games API and prize money is distributed automatically.

---

## Visual Direction

**Hextech Blue** — dark navy base (`#070b14`), electric cyan accents (`#00c8ff`), glow effects, LoL-inspired iconography. Matches the aesthetic of the official League of Legends client.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | Expo (React Native) + Expo Router |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL |
| Real-time | Supabase Realtime subscriptions |
| Payments | Stripe (top-up via card, payout to bank) |
| KYC | Stripe Identity (required for first withdrawal) |
| Wild Rift | `wildrift://` deep-link + Riot Games API |
| Backend logic | Supabase Edge Functions (serverless) |

No custom backend server. All logic runs in Edge Functions or the client.

---

## User Accounts

- Sign up with email, password, and Riot ID (Wild Rift username)
- Every user is a player by default
- Any player can create a team and become its captain
- Biometric unlock on return visits
- KYC verification (via Stripe Identity) required before first withdrawal

---

## Tournament Structure

- **Format:** Single elimination, 8 teams × 5 players = 40 players per tournament
- **Matches:** Best of 1, 5v5
- **Rounds:** Quarter-finals (4 matches) → Semi-finals (2 matches) → Final (1 match) = 7 matches total
- **Entry fee:** Fixed per player (e.g. $5/player), paid from in-app wallet at team registration
- **Prize pool:** `entry_fee × 5 × 8 × (1 - platform_cut_percent)`
- **Prize distribution:** 1st place takes full prize pool (configurable later)
- **Bracket generation:** Auto-generated when 8th team registers, seeds randomised
- **Tournament lifecycle:** `open` → `active` (bracket locked, matches scheduled) → `completed`

---

## Wild Rift Integration

1. App generates lobby details (room name, password) and stores on the match record
2. Match lobby screen shows a **Launch Wild Rift** button that fires a `wildrift://` deep-link pre-filled with lobby details
3. After match ends, Riot Games API is polled every 60 seconds to fetch the match result by `riot_match_id`
4. Edge Function verifies result, updates `matches.winner_id`, advances bracket, triggers prize payout if final

---

## Wallet & Payments

- **Top up:** Stripe payment sheet (card). Preset amounts: $5, $10, $25, custom. Balance stored on `users.wallet_balance`.
- **Entry fee:** Deducted atomically from all 5 players' wallets when team enters tournament. Refunded if tournament cancelled.
- **Prizes:** Paid to winner's wallet balance automatically via Edge Function.
- **Withdrawal:** Stripe payout to bank account. Minimum $10. Requires KYC on first withdrawal.
- **Platform cut:** Configurable per-tournament percentage (default 10%).

---

## Navigation Structure

### Auth Stack (unauthenticated)
- `app/index.tsx` — Splash / Onboarding
- `app/auth/sign-up.tsx` — Sign Up
- `app/auth/log-in.tsx` — Log In

### Bottom Tab Navigation (authenticated)
1. **Home** — Feed, live match banner, recent results
2. **Tournaments** — Browse, join, create
3. **My Team** — Roster, match lobby, Wild Rift launch
4. **Wallet** — Balance, top up, withdraw, transaction history
5. **Profile** — Stats, Riot ID, settings, KYC status

### All Screens

| Screen | Path |
|---|---|
| Splash / Onboarding | `app/index.tsx` |
| Sign Up | `app/auth/sign-up.tsx` |
| Log In | `app/auth/log-in.tsx` |
| Home Feed | `app/(tabs)/index.tsx` |
| Live Match View | `app/match/[id].tsx` |
| Tournament List | `app/(tabs)/tournaments.tsx` |
| Tournament Detail + Bracket | `app/tournament/[id].tsx` |
| Create Tournament | `app/tournament/create.tsx` |
| Team Dashboard | `app/(tabs)/team.tsx` |
| Invite / Join Team | `app/team/invite.tsx` |
| Match Lobby | `app/team/lobby.tsx` |
| Wallet Overview | `app/(tabs)/wallet.tsx` |
| Top Up | `app/wallet/top-up.tsx` |
| Withdraw | `app/wallet/withdraw.tsx` |
| Profile | `app/(tabs)/profile.tsx` |
| Settings | `app/profile/settings.tsx` |

---

## Data Models

### `users`
```sql
id uuid PRIMARY KEY,
email text UNIQUE NOT NULL,
username text UNIQUE NOT NULL,
riot_id text,
avatar_url text,
wallet_balance numeric(10,2) DEFAULT 0,
stripe_customer_id text,
kyc_verified boolean DEFAULT false,
created_at timestamptz DEFAULT now()
```

### `teams`
```sql
id uuid PRIMARY KEY,
name text NOT NULL,
captain_id uuid REFERENCES users,
invite_code text UNIQUE NOT NULL,
created_at timestamptz DEFAULT now()
```

### `team_members`
```sql
team_id uuid REFERENCES teams,
user_id uuid REFERENCES users,
joined_at timestamptz DEFAULT now(),
PRIMARY KEY (team_id, user_id)
-- max 5 members enforced via Edge Function
```

### `tournaments`
```sql
id uuid PRIMARY KEY,
name text NOT NULL,
status text DEFAULT 'open', -- open | active | completed
entry_fee_per_player numeric(10,2) NOT NULL,
prize_pool numeric(10,2) DEFAULT 0,
platform_cut_percent numeric(4,2) DEFAULT 10,
max_teams int DEFAULT 8,
start_time timestamptz,
created_by uuid REFERENCES users,
created_at timestamptz DEFAULT now()
```

### `tournament_teams`
```sql
tournament_id uuid REFERENCES tournaments,
team_id uuid REFERENCES teams,
entry_paid_at timestamptz,
seed int,
PRIMARY KEY (tournament_id, team_id)
```

### `matches`
```sql
id uuid PRIMARY KEY,
tournament_id uuid REFERENCES tournaments,
round int NOT NULL, -- 1=QF, 2=SF, 3=Final
team_a_id uuid REFERENCES teams,
team_b_id uuid REFERENCES teams,
score_a int DEFAULT 0,
score_b int DEFAULT 0,
winner_id uuid REFERENCES teams,
status text DEFAULT 'scheduled', -- scheduled | live | completed
riot_match_id text,
wildrift_lobby_code text,
wildrift_lobby_password text,
scheduled_at timestamptz
```

### `transactions`
```sql
id uuid PRIMARY KEY,
user_id uuid REFERENCES users,
type text NOT NULL, -- topup | entry_fee | prize | withdrawal
amount numeric(10,2) NOT NULL,
stripe_payment_id text,
status text DEFAULT 'pending', -- pending | completed | failed
created_at timestamptz DEFAULT now()
```

---

## Build Order

The app is built in 4 phases, each depending on the previous:

1. **Phase 1 — Foundation:** Expo Router setup, Supabase connection, Hextech Blue theme, shared components
2. **Phase 2 — Auth + Profiles:** Sign up, log in, user profiles, Riot ID linking
3. **Phase 3 — Teams + Tournaments:** Team creation, tournament browse/create/join, bracket UI, entry fee payments, wallet top-up
4. **Phase 4 — Wild Rift + Live:** Match lobby, Wild Rift deep-link, Riot API result polling, live score updates, prize payouts, withdrawals
