export type UserRow = {
  id: string;
  email: string;
  username: string;
  riot_id: string | null;
  avatar_url: string | null;
  wallet_balance: number;
  stripe_customer_id: string | null;
  kyc_verified: boolean;
  is_admin: boolean;
  status: 'online' | 'in_game' | 'away' | 'offline';
  current_game: string | null;
  last_seen: string | null;
  lp: number;
  peak_lp: number;
  created_at: string;
};

export type TeamRow = {
  id: string;
  name: string;
  captain_id: string;
  invite_code: string;
  room_code: string | null;
  room_password: string | null;
  clan_tag: string | null;
  privacy: 'open' | 'invite_only' | 'private';
  wins: number;
  tournaments_played: number;
  total_earnings: number;
  bank_balance: number;
  created_at: string;
};

export type TeamMemberRow = {
  team_id: string;
  user_id: string;
  role: 'member' | 'admin';
  joined_at: string;
};

export type TournamentStatus = 'open' | 'active' | 'completed' | 'cancelled';

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
  tournament_type: 'team_battle' | 'tournament';
  prize_format: 'winner_takes_all' | 'top_two';
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
