import { supabase } from '@/lib/supabase';
import { TeamMemberRow, TeamRow } from '@/types/database';
import { useEffect, useState } from 'react';
import { useAppRefresh } from './useAppRefresh';

export function useTeam(userId: string | undefined) {
  const [team, setTeam] = useState<TeamRow | null>(null);
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [pendingMembers, setPendingMembers] = useState<TeamMemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchTeam(uid: string) {
    // Find any membership — use limit(1) to avoid maybeSingle() failing on duplicate rows
    const { data: membershipRows } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', uid)
      .limit(1);
    const membership = membershipRows?.[0] ?? null;

    if (!membership) {
      // Check if they're pending somewhere
      setLoading(false);
      return;
    }

    const [teamRes, membersRes] = await Promise.all([
      supabase.from('teams').select('*, clan_tag, privacy, bank_balance, wins, tournaments_played, total_earnings, room_code, room_password').eq('id', membership.team_id).single(),
      supabase.from('team_members').select('*').eq('team_id', membership.team_id),
    ]);

    if (teamRes.data) setTeam(teamRes.data);
    if (membersRes.data) {
      setMembers(membersRes.data.filter((m: any) => m.status === 'active' || !m.status));
      setPendingMembers(membersRes.data.filter((m: any) => m.status === 'pending'));
    }
    setLoading(false);
  }

  useAppRefresh(() => { if (userId) fetchTeam(userId); });

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchTeam(userId);
  }, [userId]);

  // Re-fetch whenever team membership or team data (e.g. clan_tag) changes
  useEffect(() => {
    if (!team?.id || !userId) return;
    const suffix = Math.random().toString(36).slice(2, 6);
    const ch = supabase.channel(`team-watch-${team.id}-${suffix}`);
    ch.on('postgres_changes', {
      event: '*', schema: 'public', table: 'team_members',
      filter: `team_id=eq.${team.id}`,
    }, () => fetchTeam(userId))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'teams',
        filter: `id=eq.${team.id}`,
      }, () => fetchTeam(userId))
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [team?.id, userId]);

  async function createTeam(name: string, roomCode?: string, roomPassword?: string) {
    if (!userId) return { error: 'Not authenticated' };
    const { data, error } = await supabase
      .from('teams')
      .insert({
        name, captain_id: userId,
        ...(roomCode ? { room_code: roomCode.toUpperCase() } : {}),
        ...(roomPassword ? { room_password: roomPassword } : {}),
      })
      .select().single();
    if (error) return { error: error.message };
    await supabase.from('team_members').insert({ team_id: data.id, user_id: userId, status: 'active' });
    setTeam(data);
    setMembers([{ team_id: data.id, user_id: userId, joined_at: new Date().toISOString() } as any]);
    return { error: null, team: data };
  }

  // Join via invite code OR room code — adds as PENDING (captain must approve)
  async function joinTeam(inviteCode: string) {
    if (!userId) return { error: 'Not authenticated' };
    const code = inviteCode.trim().toUpperCase();
    // Try invite_code first, then room_code
    let found: any = null;
    const { data: byInvite } = await supabase.from('teams').select('*').eq('invite_code', code).maybeSingle();
    if (byInvite) { found = byInvite; }
    else {
      const { data: byRoom } = await supabase.from('teams').select('*').eq('room_code', code).maybeSingle();
      if (byRoom) found = byRoom;
    }
    if (!found) return { error: 'Clan not found — check your invite or room code' };
    const { error: joinError } = await supabase
      .from('team_members')
      .insert({ team_id: found.id, user_id: userId, status: 'pending' });
    if (joinError) return { error: joinError.message };
    return { error: null, pendingApproval: true };
  }

  async function promoteToAdmin(memberId: string) {
    if (!team) return;
    await supabase.from('team_members').update({ role: 'admin' }).eq('team_id', team.id).eq('user_id', memberId);
    if (userId) fetchTeam(userId);
  }

  async function demoteToMember(memberId: string) {
    if (!team) return;
    await supabase.from('team_members').update({ role: 'member' }).eq('team_id', team.id).eq('user_id', memberId);
    if (userId) fetchTeam(userId);
  }

  // Captain/admin approves a pending member
  async function approveMember(memberId: string) {
    if (!team) return;
    await supabase.from('team_members')
      .update({ status: 'active' })
      .eq('team_id', team.id)
      .eq('user_id', memberId);
    if (userId) fetchTeam(userId);
  }

  // Captain rejects / any member kicks
  async function removeMember(memberId: string) {
    if (!team) return;
    await supabase.from('team_members').delete()
      .eq('team_id', team.id).eq('user_id', memberId);
    if (userId) fetchTeam(userId);
  }

  async function leaveTeam() {
    if (!userId || !team) return;
    await supabase.from('team_members').delete().eq('team_id', team.id).eq('user_id', userId);
    setTeam(null);
    setMembers([]);
    setPendingMembers([]);
  }

  async function refreshTeam() {
    if (userId) await fetchTeam(userId);
  }

  return { team, members, pendingMembers, loading, createTeam, joinTeam, approveMember, removeMember, leaveTeam, refreshTeam, promoteToAdmin, demoteToMember };
}
