import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export type RecentChat = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  lastMessage: string;
  lastAt: string;
  unread: number;
};

export function useRecentChats(myId: string | undefined) {
  const [chats, setChats] = useState<RecentChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!myId) { setLoading(false); return; }
    fetchChats();

    const sub = supabase.channel(`recent-chats:${myId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === myId || msg.receiver_id === myId) fetchChats();
        }
      ).subscribe();

    return () => { sub.unsubscribe(); };
  }, [myId]);

  async function fetchChats() {
    if (!myId) return;

    // Get all messages involving me
    const { data: messages } = await supabase
      .from('direct_messages')
      .select('sender_id, receiver_id, content, created_at, read')
      .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
      .order('created_at', { ascending: false })
      .limit(200);

    if (!messages?.length) { setChats([]); setLoading(false); return; }

    // Build conversation map — keyed by the OTHER person's ID
    const convMap: Record<string, { lastMessage: string; lastAt: string; unread: number }> = {};
    for (const m of messages) {
      const otherId = m.sender_id === myId ? m.receiver_id : m.sender_id;
      if (!convMap[otherId]) {
        convMap[otherId] = { lastMessage: m.content, lastAt: m.created_at, unread: 0 };
      }
      if (m.receiver_id === myId && !m.read) {
        convMap[otherId].unread++;
      }
    }

    const otherIds = Object.keys(convMap);
    if (!otherIds.length) { setChats([]); setLoading(false); return; }

    const { data: profiles } = await supabase
      .from('users').select('id, riot_id, username, avatar_url').in('id', otherIds);

    const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

    const result: RecentChat[] = otherIds
      .map(uid => {
        const p = profileMap[uid];
        return {
          userId: uid,
          name: p?.riot_id ?? p?.username ?? 'Player',
          avatarUrl: p?.avatar_url ?? null,
          ...convMap[uid],
        };
      })
      .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

    setChats(result);
    setLoading(false);
  }

  return { chats, loading, refresh: fetchChats };
}
