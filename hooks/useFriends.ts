import { supabase } from '@/lib/supabase';
import { UserRow } from '@/types/database';
import { useEffect, useState } from 'react';

export type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
};

export type FriendWithProfile = FriendshipRow & {
  profile: UserRow;
};

export function useFriends(userId: string | undefined) {
  const [friends, setFriends] = useState<FriendWithProfile[]>([]);
  const [incoming, setIncoming] = useState<FriendWithProfile[]>([]);
  const [outgoing, setOutgoing] = useState<FriendWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAll(uid: string) {
    const { data } = await supabase
      .from('friendships')
      .select('*')
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`);

    if (!data) { setLoading(false); return; }

    const otherIds = data.map(f => f.requester_id === uid ? f.addressee_id : f.requester_id);
    const { data: profiles } = await supabase
      .from('users')
      .select('id, email, username, riot_id, avatar_url, wallet_balance, kyc_verified, is_admin, status, current_game, last_seen, created_at, stripe_customer_id')
      .in('id', otherIds.length ? otherIds : ['00000000-0000-0000-0000-000000000000']);

    const profileMap: Record<string, UserRow> = {};
    profiles?.forEach(p => { profileMap[p.id] = p; });

    const withProfiles = data.map(f => ({
      ...f,
      profile: profileMap[f.requester_id === uid ? f.addressee_id : f.requester_id],
    })).filter(f => f.profile);

    setFriends(withProfiles.filter(f => f.status === 'accepted'));
    setIncoming(withProfiles.filter(f => f.status === 'pending' && f.addressee_id === uid));
    setOutgoing(withProfiles.filter(f => f.status === 'pending' && f.requester_id === uid));
    setLoading(false);
  }

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchAll(userId);
  }, [userId]);

  async function sendRequest(riotId: string): Promise<{ error: string | null }> {
    if (!userId) return { error: 'Not authenticated' };
    const { data: target, error: findError } = await supabase
      .from('users').select('id, riot_id').eq('riot_id', riotId.trim()).single();
    if (findError || !target) return { error: 'Player not found — check their Riot ID' };
    if (target.id === userId) return { error: 'You can\'t add yourself' };

    const { error } = await supabase.from('friendships').insert({
      requester_id: userId,
      addressee_id: target.id,
    });
    if (error) {
      if (error.code === '23505') return { error: 'Friend request already sent' };
      return { error: error.message };
    }
    await fetchAll(userId);
    return { error: null };
  }

  async function accept(friendshipId: string) {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    if (userId) fetchAll(userId);
  }

  async function decline(friendshipId: string) {
    await supabase.from('friendships').update({ status: 'declined' }).eq('id', friendshipId);
    if (userId) fetchAll(userId);
  }

  async function remove(friendshipId: string) {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    if (userId) fetchAll(userId);
  }

  return { friends, incoming, outgoing, loading, sendRequest, accept, decline, remove };
}

export type RecentPlayer = UserRow & { matchedAt: string; teamName: string };

export function useRecentPlayers(userId: string | undefined) {
  const [recentPlayers, setRecentPlayers] = useState<RecentPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetchRecent(userId);
  }, [userId]);

  async function fetchRecent(uid: string) {
    // Find user's team
    const { data: membership } = await supabase
      .from('team_members').select('team_id').eq('user_id', uid).maybeSingle();
    if (!membership) { setLoading(false); return; }

    const teamId = membership.team_id;

    // Get recent completed matches involving the user's team
    const { data: matches } = await supabase
      .from('matches')
      .select('id, team_a_id, team_b_id, tournament_id, scheduled_at')
      .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
      .eq('status', 'completed')
      .order('scheduled_at', { ascending: false })
      .limit(10);

    if (!matches?.length) { setLoading(false); return; }

    // Collect all team IDs from those matches (both sides)
    const allTeamIds = [...new Set(
      matches.flatMap(m => [m.team_a_id, m.team_b_id]).filter(Boolean) as string[]
    )];

    // Get all members from those teams (excluding self)
    const { data: members } = await supabase
      .from('team_members')
      .select('user_id, team_id')
      .in('team_id', allTeamIds)
      .neq('user_id', uid);

    if (!members?.length) { setLoading(false); return; }

    const uniqueUserIds = [...new Set(members.map(m => m.user_id))];
    const { data: profiles } = await supabase
      .from('users').select('*').in('id', uniqueUserIds);

    if (!profiles) { setLoading(false); return; }

    // Attach match date to each player
    const memberTeamMap: Record<string, string> = {};
    members.forEach(m => { memberTeamMap[m.user_id] = m.team_id; });

    const teamMatchDate: Record<string, string> = {};
    matches.forEach(m => {
      if (m.team_a_id && !teamMatchDate[m.team_a_id]) teamMatchDate[m.team_a_id] = m.scheduled_at ?? m.tournament_id;
      if (m.team_b_id && !teamMatchDate[m.team_b_id]) teamMatchDate[m.team_b_id] = m.scheduled_at ?? m.tournament_id;
    });

    const result: RecentPlayer[] = profiles.map(p => ({
      ...p,
      matchedAt: teamMatchDate[memberTeamMap[p.id]] ?? '',
      teamName: memberTeamMap[p.id] ?? '',
    }));

    // Deduplicate and sort by most recent
    const seen = new Set<string>();
    const deduped = result.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
    deduped.sort((a, b) => b.matchedAt.localeCompare(a.matchedAt));

    setRecentPlayers(deduped.slice(0, 20));
    setLoading(false);
  }

  return { recentPlayers, loading };
}
