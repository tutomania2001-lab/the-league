import { supabase } from '@/lib/supabase';
import { TeamMemberRow, TeamRow } from '@/types/database';
import { useEffect, useState } from 'react';

export function useTeam(userId: string | undefined) {
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchTeam(uid: string) {
    const { data: membership } = await supabase
      .from('team_members').select('team_id').eq('user_id', uid).maybeSingle();
    if (!membership) { setLoading(false); return; }
    const [teamRes, membersRes] = await Promise.all([
      supabase.from('teams').select('*').eq('id', membership.team_id).single(),
      supabase.from('team_members').select('*').eq('team_id', membership.team_id),
    ]);
    if (teamRes.data) setTeam(teamRes.data);
    if (membersRes.data) setMembers(membersRes.data);
    setLoading(false);
  }

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchTeam(userId);
  }, [userId]);

  async function createTeam(name: string, roomCode?: string, roomPassword?: string) {
    if (!userId) return { error: 'Not authenticated' };
    const { data, error } = await supabase
      .from('teams')
      .insert({
        name,
        captain_id: userId,
        ...(roomCode ? { room_code: roomCode.toUpperCase() } : {}),
        ...(roomPassword ? { room_password: roomPassword } : {}),
      })
      .select()
      .single();
    if (error) return { error: error.message };
    await supabase.from('team_members').insert({ team_id: data.id, user_id: userId });
    setTeam(data);
    setMembers([{ team_id: data.id, user_id: userId, joined_at: new Date().toISOString() }]);
    return { error: null, team: data };
  }

  async function joinTeam(inviteCode: string) {
    if (!userId) return { error: 'Not authenticated' };
    const { data: found, error } = await supabase
      .from('teams').select('*').eq('invite_code', inviteCode.toUpperCase().trim()).single();
    if (error || !found) return { error: 'Team not found — check your invite code' };
    const { error: joinError } = await supabase
      .from('team_members').insert({ team_id: found.id, user_id: userId });
    if (joinError) return { error: joinError.message };
    setTeam(found);
    await fetchTeam(userId);
    return { error: null };
  }

  async function leaveTeam() {
    if (!userId || !team) return;
    await supabase.from('team_members').delete().eq('team_id', team.id).eq('user_id', userId);
    setTeam(null);
    setMembers([]);
  }

  return { team, members, loading, createTeam, joinTeam, leaveTeam };
}
