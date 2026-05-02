import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export type TeamPost = {
  id: string;
  team_id: string;
  user_id: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  caption: string | null;
  likes_count: number;
  created_at: string;
  author?: { riot_id: string | null; username: string; avatar_url: string | null };
  liked?: boolean;
};

export function useTeamFeed(teamId: string | undefined, myId: string | undefined) {
  const [posts, setPosts] = useState<TeamPost[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPosts() {
    if (!teamId) return;
    const { data } = await supabase
      .from('team_posts')
      .select('*, author:users(riot_id, username, avatar_url)')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!data) { setLoading(false); return; }

    // Check which posts current user liked
    const { data: likes } = await supabase
      .from('team_post_likes')
      .select('post_id')
      .eq('user_id', myId ?? '00000000-0000-0000-0000-000000000000');

    const likedSet = new Set((likes ?? []).map((l: any) => l.post_id));
    setPosts(data.map((p: any) => ({ ...p, liked: likedSet.has(p.id) })));
    setLoading(false);
  }

  useEffect(() => {
    if (!teamId || !myId) { setLoading(false); return; }
    fetchPosts();

    const ch = supabase.channel(`feed:${teamId}-${Math.random().toString(36).slice(2, 6)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_posts', filter: `team_id=eq.${teamId}` },
        () => fetchPosts())
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [teamId, myId]);

  async function toggleLike(postId: string) {
    if (!myId) return;
    // Optimistic update
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, liked: !p.liked, likes_count: p.liked ? p.likes_count - 1 : p.likes_count + 1 }
      : p
    ));
    await supabase.rpc('toggle_post_like', { p_post_id: postId, p_user_id: myId });
  }

  async function createPost(teamId: string, userId: string, mediaUrl: string | null, mediaType: 'image' | 'video' | null, caption: string) {
    const { data, error } = await supabase.from('team_posts')
      .insert({ team_id: teamId, user_id: userId, media_url: mediaUrl, media_type: mediaType, caption: caption.trim() || null })
      .select('*, author:users(riot_id, username, avatar_url)').single();
    if (!error && data) setPosts(prev => [{ ...data, liked: false }, ...prev]);
    return { error: error?.message ?? null };
  }

  async function deletePost(postId: string) {
    await supabase.from('team_posts').delete().eq('id', postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  }

  async function uploadMedia(uri: string, type: 'image' | 'video', userId: string): Promise<string | null> {
    try {
      const ext = type === 'video' ? 'mp4' : 'jpg';
      const path = `${userId}/${Date.now()}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error } = await supabase.storage.from('team-media').upload(path, blob, {
        contentType: type === 'video' ? 'video/mp4' : 'image/jpeg',
        upsert: false,
      });
      if (error) return null;
      const { data } = supabase.storage.from('team-media').getPublicUrl(path);
      return data.publicUrl;
    } catch { return null; }
  }

  return { posts, loading, toggleLike, createPost, deletePost, uploadMedia, refresh: fetchPosts };
}
