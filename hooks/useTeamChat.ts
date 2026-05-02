import { supabase } from '@/lib/supabase';
import { useEffect, useRef, useState } from 'react';

export type TeamMessage = {
  id: string;
  team_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { riot_id: string | null; username: string; avatar_url: string | null };
};

export function useTeamChat(teamId: string | undefined, myId: string | undefined) {
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) { setLoading(false); return; }
    fetchMessages();

    const sub = supabase.channel(`team-chat:${teamId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_messages', filter: `team_id=eq.${teamId}` },
        async (payload) => {
          const msg = payload.new as TeamMessage;
          const { data: profile } = await supabase.from('users')
            .select('riot_id, username, avatar_url').eq('id', msg.user_id).single();
          setMessages(prev => [...prev, { ...msg, profile: profile ?? undefined }]);
        }
      ).subscribe();

    return () => { sub.unsubscribe(); };
  }, [teamId]);

  async function fetchMessages() {
    if (!teamId) return;
    const { data } = await supabase
      .from('team_messages')
      .select('*, profile:users(riot_id, username, avatar_url)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) setMessages(data as TeamMessage[]);
    setLoading(false);
  }

  async function send(content: string): Promise<{ error: string | null }> {
    if (!teamId || !myId || !content.trim()) return { error: 'Not ready' };

    const optimistic: TeamMessage = {
      id: `tmp-${Date.now()}`, team_id: teamId, user_id: myId,
      content: content.trim(), created_at: new Date().toISOString(),
      profile: undefined,
    };
    setMessages(prev => [...prev, optimistic]);

    const { data, error } = await supabase.from('team_messages')
      .insert({ team_id: teamId, user_id: myId, content: content.trim() })
      .select('*, profile:users(riot_id, username, avatar_url)').single();

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      return { error: error.message };
    }
    if (data) setMessages(prev => prev.map(m => m.id === optimistic.id ? data as TeamMessage : m));
    return { error: null };
  }

  return { messages, loading, send };
}
