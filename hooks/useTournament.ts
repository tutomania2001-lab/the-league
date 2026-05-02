import { supabase } from '@/lib/supabase';
import { MatchRow, TournamentRow } from '@/types/database';
import { useEffect, useState } from 'react';

export function useTournamentList() {
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetch() {
    const { data } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
    if (data) setTournaments(data);
    setLoading(false);
  }

  useEffect(() => { fetch(); }, []);

  return { tournaments, loading, refresh: fetch };
}

export function useTournament(id: string | undefined) {
  const [tournament, setTournament] = useState<TournamentRow | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [registeredTeamIds, setRegisteredTeamIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('tournaments').select('*').eq('id', id).single(),
      supabase.from('matches').select('*').eq('tournament_id', id).order('round'),
      supabase.from('tournament_teams').select('team_id').eq('tournament_id', id),
    ]).then(([t, m, tt]) => {
      if (t.data) setTournament(t.data);
      if (m.data) setMatches(m.data);
      if (tt.data) setRegisteredTeamIds(tt.data.map(r => r.team_id));
      setLoading(false);
    });

    const sub = supabase.channel(`tournament:${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${id}` },
        () => supabase.from('matches').select('*').eq('tournament_id', id).order('round')
          .then(({ data }) => { if (data) setMatches(data); })
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_teams', filter: `tournament_id=eq.${id}` },
        () => supabase.from('tournament_teams').select('team_id').eq('tournament_id', id)
          .then(({ data }) => { if (data) setRegisteredTeamIds(data.map(r => r.team_id)); })
      )
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [id]);

  async function createTournament(name: string, entryFee: number, userId: string) {
    const { data, error } = await supabase.from('tournaments')
      .insert({ name, entry_fee_per_player: entryFee, created_by: userId }).select().single();
    return { data, error: error?.message ?? null };
  }

  async function registerTeam(teamId: string) {
    if (!id) return { error: 'No tournament' };
    const { error } = await supabase.from('tournament_teams')
      .insert({ tournament_id: id, team_id: teamId });
    if (!error) setRegisteredTeamIds(prev => [...prev, teamId]);
    return { error: error?.message ?? null };
  }

  return { tournament, matches, registeredTeamIds, loading, createTournament, registerTeam };
}
