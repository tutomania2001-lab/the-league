import { supabase } from '@/lib/supabase';
import { MatchRow } from '@/types/database';
import { useEffect, useState } from 'react';

export function useMatch(matchId: string | undefined) {
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) { setLoading(false); return; }

    supabase.from('matches').select('*').eq('id', matchId).single()
      .then(({ data }) => { if (data) setMatch(data); setLoading(false); });

    const sub = supabase.channel(`match:${matchId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        (payload) => setMatch(payload.new as MatchRow)
      ).subscribe();

    return () => { sub.unsubscribe(); };
  }, [matchId]);

  async function markLive(riotMatchId: string) {
    if (!matchId) return;
    await supabase.from('matches').update({ status: 'live', riot_match_id: riotMatchId }).eq('id', matchId);
  }

  async function setLobbyDetails(code: string, password: string) {
    if (!matchId) return;
    await supabase.from('matches').update({
      wildrift_lobby_code: code,
      wildrift_lobby_password: password,
    }).eq('id', matchId);
  }

  return { match, loading, markLive, setLobbyDetails };
}

export function useLiveMatches() {
  const [matches, setMatches] = useState<MatchRow[]>([]);

  useEffect(() => {
    supabase.from('matches').select('*').eq('status', 'live')
      .then(({ data }) => { if (data) setMatches(data); });

    // Use unique channel name to avoid duplicate subscription errors with PagerView
    const channelName = `live-matches-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase.channel(channelName);
    ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' },
      (payload) => {
        const updated = payload.new as MatchRow;
        setMatches(prev => {
          if (updated.status === 'live') {
            return prev.some(m => m.id === updated.id)
              ? prev.map(m => m.id === updated.id ? updated : m)
              : [...prev, updated];
          }
          return prev.filter(m => m.id !== updated.id);
        });
      }
    ).subscribe();

    return () => { ch.unsubscribe(); };
  }, []);

  return { matches };
}
