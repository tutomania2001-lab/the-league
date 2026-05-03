import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export type TeamInvite = {
  id: string;
  team_id: string;
  inviter_id: string;
  invitee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  team?: { name: string; invite_code: string };
  inviter?: { riot_id: string | null; username: string; avatar_url: string | null };
};

export function useTeamInvites(userId: string | undefined) {
  const [incoming, setIncoming] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchInvites();
  }, [userId]);

  async function fetchInvites() {
    if (!userId) return;
    const { data } = await supabase
      .from('team_invites')
      .select('*, team:teams(name,invite_code), inviter:users!team_invites_inviter_id_fkey(riot_id,username,avatar_url)')
      .eq('invitee_id', userId)
      .eq('status', 'pending');
    if (data) setIncoming(data as TeamInvite[]);
    setLoading(false);
  }

  async function sendInvite(teamId: string, inviteeId: string, inviterId: string) {
    const { error } = await supabase.from('team_invites').insert({
      team_id: teamId, inviter_id: inviterId, invitee_id: inviteeId,
    });
    return { error: error?.message ?? null };
  }

  async function accept(inviteId: string, teamId: string) {
    if (!userId) return;
    await supabase.from('team_invites').update({ status: 'accepted' }).eq('id', inviteId);
    await supabase.from('team_members').insert({ team_id: teamId, user_id: userId, status: 'active' });
    fetchInvites();
  }

  async function decline(inviteId: string) {
    await supabase.from('team_invites').update({ status: 'declined' }).eq('id', inviteId);
    fetchInvites();
  }

  return { incoming, loading, sendInvite, accept, decline };
}
