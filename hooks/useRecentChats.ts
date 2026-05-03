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

// Singleton — one subscription shared across all callers
type Listener = (chats: RecentChat[]) => void;
const listeners = new Set<Listener>();
let cachedChats: RecentChat[] = [];
let activeSub: any = null;
let activeUserId: string | null = null;

function broadcast(chats: RecentChat[]) {
  cachedChats = chats;
  listeners.forEach(fn => fn(chats));
}

async function fetchChatsFor(myId: string) {
  const { data: messages } = await supabase
    .from('direct_messages')
    .select('sender_id, receiver_id, content, created_at, read')
    .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
    .order('created_at', { ascending: false })
    .limit(200);

  if (!messages?.length) { broadcast([]); return; }

  const convMap: Record<string, { lastMessage: string; lastAt: string; unread: number }> = {};
  for (const m of messages) {
    const otherId = m.sender_id === myId ? m.receiver_id : m.sender_id;
    if (!convMap[otherId]) {
      convMap[otherId] = { lastMessage: m.content, lastAt: m.created_at, unread: 0 };
    }
    if (m.receiver_id === myId && !m.read) convMap[otherId].unread++;
  }

  const otherIds = Object.keys(convMap);
  if (!otherIds.length) { broadcast([]); return; }

  const { data: profiles } = await supabase
    .from('users').select('id, riot_id, username, avatar_url').in('id', otherIds);

  const profileMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));

  const result: RecentChat[] = otherIds
    .map(uid => ({
      userId: uid,
      name: profileMap[uid]?.riot_id ?? profileMap[uid]?.username ?? 'Player',
      avatarUrl: profileMap[uid]?.avatar_url ?? null,
      ...convMap[uid],
    }))
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

  broadcast(result);
}

function ensureSubscription(myId: string) {
  if (activeSub && activeUserId === myId) return;
  if (activeSub) { activeSub.unsubscribe(); activeSub = null; }
  activeUserId = myId;
  fetchChatsFor(myId);
  activeSub = supabase.channel(`recent-chats-singleton:${myId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' },
      (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id === myId || msg.receiver_id === myId) fetchChatsFor(myId);
      }
    ).subscribe();
}

export function useRecentChats(myId: string | undefined) {
  const [chats, setChats] = useState<RecentChat[]>(cachedChats);

  useEffect(() => {
    if (!myId) return;
    ensureSubscription(myId);
    listeners.add(setChats);
    setChats(cachedChats);
    return () => { listeners.delete(setChats); };
  }, [myId]);

  return { chats, refresh: () => myId && fetchChatsFor(myId) };
}
