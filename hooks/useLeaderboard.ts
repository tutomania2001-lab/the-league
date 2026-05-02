import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export type LeaderboardEntry = {
  rank: number;
  team_id: string;
  team_name: string;
  wins: number;
  tournaments_played: number;
  total_earnings: number;
  member_count: number;
  win_rate: number;
};

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetch() {
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, wins, tournaments_played, total_earnings, team_members(count)')
      .order('wins', { ascending: false })
      .order('tournaments_played', { ascending: false })
      .limit(50);

    if (error || !data) { setLoading(false); return; }

    const ranked: LeaderboardEntry[] = data.map((t: any, i) => ({
      rank: i + 1,
      team_id: t.id,
      team_name: t.name,
      wins: t.wins ?? 0,
      tournaments_played: t.tournaments_played ?? 0,
      total_earnings: t.total_earnings ?? 0,
      member_count: t.team_members?.[0]?.count ?? 0,
      win_rate: t.tournaments_played > 0
        ? Math.round((t.wins / t.tournaments_played) * 100)
        : 0,
    }));

    setEntries(ranked);
    setLoading(false);
  }

  useEffect(() => {
    fetch();
  }, []);

  return { entries, loading, refresh: fetch };
}
