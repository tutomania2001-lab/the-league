import { supabase } from '@/lib/supabase';
import { useEffect, useRef, useState } from 'react';

export type DirectMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

export function useChat(userId: string | undefined, friendId: string | undefined) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !friendId) { setLoading(false); return; }
    fetchMessages();

    const sub = supabase.channel(`chat:${[userId, friendId].sort().join('-')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        (payload) => {
          const msg = payload.new as DirectMessage;
          if ((msg.sender_id === userId && msg.receiver_id === friendId) ||
              (msg.sender_id === friendId && msg.receiver_id === userId)) {
            setMessages(prev => [...prev, msg]);
            if (msg.receiver_id === userId) markRead(msg.id);
          }
        }
      ).subscribe();

    return () => { sub.unsubscribe(); };
  }, [userId, friendId]);

  async function fetchMessages() {
    if (!userId || !friendId) return;
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
    setLoading(false);
    // Mark unread messages as read
    await supabase.from('direct_messages')
      .update({ read: true })
      .eq('receiver_id', userId).eq('sender_id', friendId).eq('read', false);
  }

  async function send(content: string): Promise<{ error: string | null }> {
    if (!userId || !friendId || !content.trim()) return { error: 'Not ready' };

    // Optimistic — add to UI immediately
    const optimistic: DirectMessage = {
      id: `temp-${Date.now()}`,
      sender_id: userId,
      receiver_id: friendId,
      content: content.trim(),
      read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    const { data, error } = await supabase
      .from('direct_messages')
      .insert({ sender_id: userId, receiver_id: friendId, content: content.trim() })
      .select()
      .single();

    if (error) {
      // Roll back optimistic update on failure
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      return { error: error.message };
    }

    // Replace temp with real message
    if (data) setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m));
    return { error: null };
  }

  async function markRead(messageId: string) {
    await supabase.from('direct_messages').update({ read: true }).eq('id', messageId);
  }

  return { messages, loading, send };
}

export function useUnreadCounts(userId: string | undefined) {
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!userId) return;
    fetchUnread();

    const sub = supabase.channel(`unread:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages',
        filter: `receiver_id=eq.${userId}` },
        () => fetchUnread()
      ).subscribe();

    return () => { sub.unsubscribe(); };
  }, [userId]);

  async function fetchUnread() {
    if (!userId) return;
    const { data } = await supabase
      .from('direct_messages')
      .select('sender_id')
      .eq('receiver_id', userId)
      .eq('read', false);
    const counts: Record<string, number> = {};
    data?.forEach(m => { counts[m.sender_id] = (counts[m.sender_id] ?? 0) + 1; });
    setUnreadByUser(counts);
  }

  const totalUnread = Object.values(unreadByUser).reduce((a, b) => a + b, 0);
  return { unreadByUser, totalUnread };
}
