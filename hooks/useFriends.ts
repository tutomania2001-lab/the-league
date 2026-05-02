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
      .from('users').select('*').in('id', otherIds.length ? otherIds : ['00000000-0000-0000-0000-000000000000']);

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

    const sub = supabase.channel(`friends:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' },
        () => fetchAll(userId)
      ).subscribe();

    return () => { sub.unsubscribe(); };
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
