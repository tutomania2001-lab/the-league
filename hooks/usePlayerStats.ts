import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export type PlayerStats = {
  tournamentsEntered: number;
  wins: number;
  earnings: number;
};

export function usePlayerStats(userId: string | undefined) {
  const [stats, setStats] = useState<PlayerStats>({ tournamentsEntered: 0, wins: 0, earnings: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchStats(userId);
  }, [userId]);

  async function fetchStats(uid: string) {
    // Get all team IDs this user has been active in
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', uid)
      .eq('status', 'active');

    const teamIds = (memberships ?? []).map((m: any) => m.team_id);

    const [tournamentsRes, winsRes, earningsRes] = await Promise.all([
      // Tournaments entered via any of user's teams
      teamIds.length > 0
        ? supabase.from('tournament_teams').select('tournament_id', { count: 'exact', head: true }).in('team_id', teamIds)
        : Promise.resolve({ count: 0 }),

      // Match wins where user's team won
      teamIds.length > 0
        ? supabase.from('matches').select('id', { count: 'exact', head: true }).in('winner_id', teamIds)
        : Promise.resolve({ count: 0 }),

      // Prize earnings
      supabase.from('transactions').select('amount').eq('user_id', uid).eq('type', 'prize').eq('status', 'completed'),
    ]);

    const earnings = ((earningsRes as any).data ?? []).reduce((sum: number, t: any) => sum + (t.amount ?? 0), 0);

    setStats({
      tournamentsEntered: (tournamentsRes as any).count ?? 0,
      wins: (winsRes as any).count ?? 0,
      earnings,
    });
    setLoading(false);
  }

  return { stats, loading };
}
