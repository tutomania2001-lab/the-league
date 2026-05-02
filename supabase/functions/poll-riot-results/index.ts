import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
const RIOT_KEY = Deno.env.get('RIOT_API_KEY');

Deno.serve(async () => {
  const { data: liveMatches } = await supabase
    .from('matches').select('*').eq('status', 'live').not('riot_match_id', 'is', null);

  if (!liveMatches?.length) return new Response('No live matches');

  for (const match of liveMatches) {
    try {
      const res = await fetch(
        `https://sea.api.riotgames.com/lol/match/v5/matches/${match.riot_match_id}`,
        { headers: { 'X-Riot-Token': RIOT_KEY! } }
      );
      if (!res.ok) continue;
      const data = await res.json();

      const winningTeam = data.info?.teams?.find((t: any) => t.win);
      if (!winningTeam) continue;

      const teamAWon = winningTeam.teamId === 100;
      const winnerId = teamAWon ? match.team_a_id : match.team_b_id;

      await supabase.from('matches').update({
        score_a: teamAWon ? 1 : 0,
        score_b: teamAWon ? 0 : 1,
        winner_id: winnerId,
        status: 'completed',
      }).eq('id', match.id);

      // Advance bracket or distribute prizes
      if (match.round === 3) {
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/distribute-prizes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ tournament_id: match.tournament_id, winner_team_id: winnerId }),
        });
      } else {
        await advanceBracket(match.tournament_id, match.round, winnerId);
      }
    } catch (e) {
      console.error('Error processing match', match.id, e);
    }
  }

  return new Response('Polled');
});

async function advanceBracket(tournamentId: string, completedRound: number, winnerId: string) {
  const { data: completedMatches } = await supabase
    .from('matches').select('winner_id')
    .eq('tournament_id', tournamentId).eq('round', completedRound).eq('status', 'completed');

  const { data: nextMatches } = await supabase
    .from('matches').select('id, team_a_id, team_b_id')
    .eq('tournament_id', tournamentId).eq('round', completedRound + 1).order('created_at');

  if (!completedMatches || !nextMatches?.length) return;

  const winners = completedMatches.map(m => m.winner_id).filter(Boolean);
  for (let i = 0; i < nextMatches.length; i++) {
    const next = nextMatches[i];
    const w1 = winners[i * 2];
    const w2 = winners[i * 2 + 1];
    if (w1 && !next.team_a_id) await supabase.from('matches').update({ team_a_id: w1 }).eq('id', next.id);
    if (w2 && !next.team_b_id) await supabase.from('matches').update({ team_b_id: w2 }).eq('id', next.id);
  }
}
