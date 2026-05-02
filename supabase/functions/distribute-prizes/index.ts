import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const { tournament_id, winner_team_id } = await req.json();

  const { data: tournament } = await supabase
    .from('tournaments').select('prize_pool').eq('id', tournament_id).single();
  if (!tournament) return new Response('Tournament not found', { status: 404 });

  const { data: members } = await supabase
    .from('team_members').select('user_id').eq('team_id', winner_team_id);
  if (!members?.length) return new Response('No members found', { status: 404 });

  const sharePerPlayer = Number((tournament.prize_pool / members.length).toFixed(2));

  for (const member of members) {
    await supabase.rpc('increment_wallet', { user_id: member.user_id, amount: sharePerPlayer });
    await supabase.from('transactions').insert({
      user_id: member.user_id,
      type: 'prize',
      amount: sharePerPlayer,
      status: 'completed',
    });
  }

  await supabase.from('tournaments').update({ status: 'completed' }).eq('id', tournament_id);

  return new Response(JSON.stringify({ success: true, prize_per_player: sharePerPlayer }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
