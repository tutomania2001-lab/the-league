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
  comments_count?: number;
  created_at: string;
  author?: { riot_id: string | null; username: string; avatar_url: string | null };
  liked?: boolean;
};

export type PostComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: { riot_id: string | null; username: string; avatar_url: string | null };
};

export function useTeamFeed(teamId: string | undefined, myId: string | undefined) {
  const [posts, setPosts] = useState<TeamPost[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPosts() {
    if (!teamId) return;

    // Fetch posts without join first (more reliable)
    const { data: postsData, error } = await supabase
      .from('team_posts')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) { console.log('fetchPosts error:', error.message); setLoading(false); return; }
    if (!postsData?.length) { setPosts([]); setLoading(false); return; }

    // Fetch authors separately
    const authorIds = [...new Set(postsData.map(p => p.user_id))];
    const { data: authors } = await supabase
      .from('users').select('id, riot_id, username, avatar_url')
      .in('id', authorIds);
    const authorMap = Object.fromEntries((authors ?? []).map((a: any) => [a.id, a]));

    // Fetch likes
    const { data: likes } = await supabase
      .from('team_post_likes').select('post_id')
      .eq('user_id', myId ?? '00000000-0000-0000-0000-000000000000');
    const likedSet = new Set((likes ?? []).map((l: any) => l.post_id));

    setPosts(postsData.map(p => ({
      ...p,
      author: authorMap[p.user_id],
      liked: likedSet.has(p.id),
    })));
    setLoading(false);
  }

  useEffect(() => {
    if (!teamId || !myId) { setLoading(false); return; }
    fetchPosts();
  }, [teamId, myId]);

  async function toggleLike(postId: string) {
    if (!myId) return;
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, liked: !p.liked, likes_count: p.liked ? p.likes_count - 1 : p.likes_count + 1 }
      : p
    ));
    await supabase.rpc('toggle_post_like', { p_post_id: postId, p_user_id: myId });
  }

  async function createPost(teamId: string, userId: string, mediaUrl: string | null, mediaType: 'image' | 'video' | null, caption: string) {
    const { data: insertedPost, error } = await supabase.from('team_posts')
      .insert({ team_id: teamId, user_id: userId, media_url: mediaUrl, media_type: mediaType, caption: caption.trim() || null })
      .select().single();
    if (error) return { error: error.message };
    const { data: author } = await supabase.from('users').select('riot_id, username, avatar_url').eq('id', userId).single();
    setPosts(prev => [{ ...insertedPost, author: author ?? undefined, liked: false }, ...prev]);
    return { error: null };
  }

  async function deletePost(postId: string) {
    await supabase.from('team_posts').delete().eq('id', postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  }

  async function uploadMedia(uri: string, type: 'image' | 'video', userId: string): Promise<string | null> {
    try {
      const ext = type === 'video' ? 'mp4' : 'jpg';
      const path = `${userId}/${Date.now()}.${ext}`;
      const contentType = type === 'video' ? 'video/mp4' : 'image/jpeg';

      // Use FormData REST upload — most reliable approach in React Native
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const formData = new FormData();
      formData.append('file', { uri, type: contentType, name: `upload.${ext}` } as any);

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/storage/v1/object/team-media/${path}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'x-upsert': 'false',
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.text();
        console.log('Upload failed:', err);
        return null;
      }

      const { data } = supabase.storage.from('team-media').getPublicUrl(path);
      return data.publicUrl;
    } catch (e: any) {
      console.log('Upload exception:', e?.message);
      return null;
    }
  }

  // Comments
  async function fetchComments(postId: string): Promise<PostComment[]> {
    const { data } = await supabase
      .from('team_post_comments')
      .select('*, author:users(riot_id, username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    return (data ?? []) as PostComment[];
  }

  async function addComment(postId: string, userId: string, content: string): Promise<{ error: string | null; comment?: PostComment }> {
    const { data, error } = await supabase.from('team_post_comments')
      .insert({ post_id: postId, user_id: userId, content: content.trim() })
      .select('*, author:users(riot_id, username, avatar_url)').single();
    if (error) return { error: error.message };
    return { error: null, comment: data as PostComment };
  }

  async function deleteComment(commentId: string) {
    await supabase.from('team_post_comments').delete().eq('id', commentId);
  }

  return { posts, loading, toggleLike, createPost, deletePost, uploadMedia, fetchComments, addComment, deleteComment, refresh: fetchPosts };
}
