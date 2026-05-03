import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { PostComment } from './useTeamFeed';

export type GlobalPost = {
  id: string;
  team_id: string;
  user_id: string;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  caption: string | null;
  likes_count: number;
  comments_count?: number;
  created_at: string;
  author?: { id: string; riot_id: string | null; username: string; avatar_url: string | null };
  team?: { id: string; name: string; clan_tag: string | null };
  liked?: boolean;
};

export function useGlobalFeed(myId: string | undefined) {
  const [posts, setPosts] = useState<GlobalPost[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPosts() {
    const { data: postsData, error } = await supabase
      .from('team_posts')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(60);

    if (error || !postsData?.length) { setPosts([]); setLoading(false); return; }

    const authorIds = [...new Set(postsData.map(p => p.user_id))];
    const teamIds   = [...new Set(postsData.map(p => p.team_id))];

    const [{ data: authors }, { data: teams }, { data: likes }] = await Promise.all([
      supabase.from('users').select('id, riot_id, username, avatar_url').in('id', authorIds),
      supabase.from('teams').select('id, name, clan_tag').in('id', teamIds),
      supabase.from('team_post_likes').select('post_id').eq('user_id', myId ?? '00000000-0000-0000-0000-000000000000'),
    ]);

    const authorMap = Object.fromEntries((authors ?? []).map((a: any) => [a.id, a]));
    const teamMap   = Object.fromEntries((teams   ?? []).map((t: any) => [t.id, t]));
    const likedSet  = new Set((likes ?? []).map((l: any) => l.post_id));

    setPosts(postsData.map(p => ({
      ...p,
      author: authorMap[p.user_id],
      team: teamMap[p.team_id],
      liked: likedSet.has(p.id),
    })));
    setLoading(false);
  }

  useEffect(() => { fetchPosts(); }, [myId]);

  async function toggleLike(postId: string) {
    if (!myId) return;
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, liked: !p.liked, likes_count: p.liked ? p.likes_count - 1 : p.likes_count + 1 }
      : p
    ));
    await supabase.rpc('toggle_post_like', { p_post_id: postId, p_user_id: myId });
  }

  async function fetchComments(postId: string): Promise<PostComment[]> {
    const { data } = await supabase
      .from('team_post_comments')
      .select('*, author:users(riot_id, username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    return (data ?? []) as PostComment[];
  }

  async function addComment(postId: string, content: string): Promise<{ error: string | null; comment?: PostComment }> {
    if (!myId) return { error: 'Not authenticated' };
    const { data, error } = await supabase.from('team_post_comments')
      .insert({ post_id: postId, user_id: myId, content: content.trim() })
      .select('*, author:users(riot_id, username, avatar_url)').single();
    if (error) return { error: error.message };
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, comments_count: (p.comments_count ?? 0) + 1 }
      : p
    ));
    return { error: null, comment: data as PostComment };
  }

  async function deleteComment(commentId: string, postId: string) {
    await supabase.from('team_post_comments').delete().eq('id', commentId);
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, comments_count: Math.max(0, (p.comments_count ?? 1) - 1) }
      : p
    ));
  }

  return { posts, loading, toggleLike, fetchComments, addComment, deleteComment, refresh: fetchPosts };
}
