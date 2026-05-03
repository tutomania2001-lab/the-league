import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { TappableAvatar } from '@/components/ui/TappableAvatar';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { withClanTag } from '@/lib/clanTag';
import { useGlobalFeed, GlobalPost } from '@/hooks/useGlobalFeed';
import { PostComment } from '@/hooks/useTeamFeed';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Modal,
  Platform, RefreshControl, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function FeedVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, p => { p.loop = true; p.muted = false; });
  return (
    <VideoView player={player} style={styles.postMedia} contentFit="cover" nativeControls />
  );
}

function PostCard({ post, myId, onToggleLike, onFetchComments, onAddComment, onDeleteComment }: {
  post: GlobalPost;
  myId: string | undefined;
  onToggleLike: (id: string) => void;
  onFetchComments: (id: string) => Promise<PostComment[]>;
  onAddComment: (id: string, content: string) => Promise<{ error: string | null; comment?: PostComment }>;
  onDeleteComment: (commentId: string, postId: string) => void;
}) {
  const [comments, setComments] = useState<PostComment[] | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const authorName = withClanTag(
    post.author?.riot_id ?? post.author?.username ?? 'Player',
    post.team?.clan_tag
  );
  const teamLabel = post.team ? (post.team.clan_tag ? `[${post.team.clan_tag.toUpperCase()}] ${post.team.name}` : post.team.name) : '';

  async function toggleComments() {
    if (comments !== null) { setComments(null); return; }
    const data = await onFetchComments(post.id);
    setComments(data);
  }

  async function handleComment() {
    if (!commentInput.trim()) return;
    setSendingComment(true);
    const { comment } = await onAddComment(post.id, commentInput.trim());
    if (comment) setComments(prev => [...(prev ?? []), comment]);
    setCommentInput('');
    setSendingComment(false);
  }

  return (
    <View style={styles.postCard}>
      {/* Header */}
      <View style={styles.postHeader}>
        <TappableAvatar userId={post.user_id} avatarUrl={post.author?.avatar_url} name={authorName} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={styles.postAuthor}>{authorName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {teamLabel ? <Text style={styles.postTeam}>{teamLabel}</Text> : null}
            <Text style={styles.postTime}>{timeAgo(post.created_at)}</Text>
          </View>
        </View>
        <View style={styles.hubBadge}>
          <Text style={styles.hubBadgeText}>HUB</Text>
        </View>
      </View>

      {/* Media */}
      {post.media_url && post.media_type === 'image' && (
        <Image source={{ uri: post.media_url }} style={styles.postMedia} resizeMode="cover" />
      )}
      {post.media_url && post.media_type === 'video' && (
        <FeedVideo uri={post.media_url} />
      )}

      {/* Actions */}
      <View style={styles.postFooter}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onToggleLike(post.id)}>
          <Text style={[styles.actionIcon, post.liked && { color: Colors.error }]}>
            {post.liked ? '❤️' : '🤍'}
          </Text>
          <Text style={[styles.actionCount, post.liked && { color: Colors.error }]}>
            {post.likes_count}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={toggleComments}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>
            {comments !== null ? comments.length : (post.comments_count ?? 0)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Caption */}
      {post.caption && (
        <View style={styles.captionRow}>
          <Text style={styles.captionAuthor}>{authorName} </Text>
          <Text style={styles.captionText}>{post.caption}</Text>
        </View>
      )}

      {/* Comments */}
      {comments !== null && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.commentsSection}>
            {comments.map(c => (
              <View key={c.id} style={styles.commentRow}>
                <Text style={styles.commentAuthor}>
                  {c.author?.riot_id ?? c.author?.username ?? 'Player'}{' '}
                </Text>
                <Text style={styles.commentText}>{c.content}</Text>
                {c.user_id === myId && (
                  <TouchableOpacity onPress={() => {
                    onDeleteComment(c.id, post.id);
                    setComments(prev => (prev ?? []).filter(x => x.id !== c.id));
                  }}>
                    <Text style={{ color: Colors.error, fontSize: 10, marginLeft: 4 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                value={commentInput}
                onChangeText={setCommentInput}
                placeholder="Add a comment..."
                placeholderTextColor={Colors.textDim}
                onSubmitEditing={handleComment}
                returnKeyType="send"
              />
              <TouchableOpacity onPress={handleComment} disabled={sendingComment || !commentInput.trim()}>
                {sendingComment
                  ? <ActivityIndicator size="small" color={Colors.accent} />
                  : <Text style={[styles.commentSend, !commentInput.trim() && { opacity: 0.3 }]}>›</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

export default function PlayerHubScreen() {
  const router = useRouter();
  const [myId, setMyId] = useState<string>();
  const { posts, loading, toggleLike, fetchComments, addComment, deleteComment, refresh, createHubPost, uploadMedia } = useGlobalFeed(myId);
  const { team } = useTeam(myId);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewPost, setShowNewPost] = useState(false);
  const [postCaption, setPostCaption] = useState('');
  const [postMedia, setPostMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
  const [posting, setPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id));
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }

  async function handlePost() {
    if (!myId || !team) return;
    setPosting(true);
    let mediaUrl: string | null = null;
    let mediaType: 'image' | 'video' | null = null;
    if (postMedia) {
      setUploadProgress('Uploading...');
      mediaUrl = await uploadMedia(postMedia.uri, postMedia.type, myId);
      mediaType = postMedia.type;
      setUploadProgress('');
    }
    await createHubPost(myId, mediaUrl, mediaType, postCaption, team?.id ?? null);
    setPosting(false);
    setShowNewPost(false);
    setPostMedia(null);
    setPostCaption('');
    refresh();
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <GlowText style={styles.headerTitle}>🌐 PLAYER HUB</GlowText>
          <Text style={styles.headerSub}>Community highlights from all clans</Text>
        </View>
        <TouchableOpacity style={styles.newPostBtn} onPress={() => setShowNewPost(true)}>
          <Text style={styles.newPostBtnText}>＋ Post</Text>
        </TouchableOpacity>
      </View>

      {/* New post modal */}
      <Modal visible={showNewPost} animationType="slide" transparent onRequestClose={() => setShowNewPost(false)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowNewPost(false)} />
        </View>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📸 New Hub Post</Text>
            <TouchableOpacity onPress={() => { setShowNewPost(false); setPostMedia(null); setPostCaption(''); }}>
              <Text style={{ color: Colors.textMuted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Media preview or picker */}
          {postMedia ? (
            <View style={{ position: 'relative' }}>
              {postMedia.type === 'image'
                ? <Image source={{ uri: postMedia.uri }} style={styles.mediaPreview} resizeMode="cover" />
                : <View style={[styles.mediaPreview, { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ color: '#fff', fontSize: 40 }}>🎬</Text>
                    <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 4 }}>Video selected</Text>
                  </View>
              }
              <TouchableOpacity style={styles.removeMedia} onPress={() => setPostMedia(null)}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mediaPicker}>
              <TouchableOpacity style={styles.mediaPickBtn} onPress={async () => {
                const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
                if (!r.canceled && r.assets[0]) setPostMedia({ uri: r.assets[0].uri, type: 'image' });
              }}>
                <Text style={{ fontSize: 28 }}>🖼️</Text>
                <Text style={styles.mediaPickLabel}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaPickBtn} onPress={async () => {
                const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, videoMaxDuration: 30, quality: 0.8 });
                if (!r.canceled && r.assets[0]) setPostMedia({ uri: r.assets[0].uri, type: 'video' });
              }}>
                <Text style={{ fontSize: 28 }}>🎬</Text>
                <Text style={styles.mediaPickLabel}>Clip (30s)</Text>
              </TouchableOpacity>
            </View>
          )}

          <TextInput
            style={styles.captionInput}
            value={postCaption}
            onChangeText={setPostCaption}
            placeholder="Write a caption..."
            placeholderTextColor={Colors.textDim}
            multiline maxLength={200}
          />

          {uploadProgress ? <Text style={{ color: Colors.accent, fontSize: 12, textAlign: 'center', marginBottom: 8 }}>{uploadProgress}</Text> : null}

          <TouchableOpacity
            style={[styles.submitBtn, (!postMedia && !postCaption.trim()) && { opacity: 0.4 }]}
            disabled={(!postMedia && !postCaption.trim()) || posting}
            onPress={handlePost}
          >
            {posting
              ? <ActivityIndicator color={Colors.background} size="small" />
              : <Text style={styles.submitBtnText}>Share to Hub 🌐</Text>
            }
          </TouchableOpacity>
        </View>
      </Modal>

      {loading ? (
        <ActivityIndicator color={Colors.accent} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} colors={[Colors.accent]} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🌐</Text>
              <Text style={[Typography.subheading, { textAlign: 'center', marginTop: Spacing.sm }]}>No public posts yet</Text>
              <Text style={[Typography.body, { textAlign: 'center', marginTop: 4 }]}>
                Be the first — share a highlight from your clan feed
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              myId={myId}
              onToggleLike={toggleLike}
              onFetchComments={fetchComments}
              onAddComment={(id, content) => addComment(id, content)}
              onDeleteComment={deleteComment}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.accentBorder,
  },
  backBtn: { paddingRight: 4 },
  backText: { color: Colors.accent, fontSize: 28, fontWeight: '300', lineHeight: 32 },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
  headerSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  newPostBtn: {
    backgroundColor: Colors.accent, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  newPostBtnText: { color: Colors.background, fontSize: 12, fontWeight: '900' },

  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 10 },
  modalSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 11,
    backgroundColor: 'rgba(8,12,22,0.99)', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 2, borderTopColor: Colors.accent + '55', paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.accentBorder,
  },
  modalTitle: { fontSize: 15, fontWeight: '900', color: Colors.text },
  mediaPreview: { width: '100%', height: 200 },
  removeMedia: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12,
    width: 24, height: 24, alignItems: 'center', justifyContent: 'center',
  },
  mediaPicker: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.md, justifyContent: 'center' },
  mediaPickBtn: {
    alignItems: 'center', gap: 6, flex: 1,
    backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.accentBorder,
  },
  mediaPickLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  captionInput: {
    margin: Spacing.md, marginTop: 0,
    backgroundColor: Colors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: Colors.accentBorder,
    color: Colors.text, fontSize: 13, padding: 12, minHeight: 72, textAlignVertical: 'top',
  },
  submitBtn: {
    margin: Spacing.md, marginTop: 0,
    backgroundColor: Colors.accent, borderRadius: 10, padding: 14, alignItems: 'center',
  },
  submitBtnText: { color: Colors.background, fontWeight: '900', fontSize: 14 },

  list: { padding: Spacing.sm, gap: Spacing.sm, paddingBottom: 80 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 32 },

  postCard: {
    backgroundColor: 'rgba(13,21,32,0.92)',
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.accentBorder,
  },
  postHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.sm,
  },
  postAvatar: { width: 38, height: 38, borderRadius: 8, borderWidth: 1, borderColor: Colors.accentBorder },
  postAvatarFallback: { backgroundColor: 'rgba(200,155,60,0.2)', alignItems: 'center', justifyContent: 'center' },
  postAvatarLetter: { color: Colors.gold, fontSize: 15, fontWeight: '800' },
  postAuthor: { fontSize: 13, fontWeight: '800', color: Colors.text },
  postTeam: { fontSize: 10, color: Colors.gold, fontWeight: '700' },
  postTime: { fontSize: 10, color: Colors.textMuted },
  hubBadge: {
    backgroundColor: 'rgba(0,200,255,0.15)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    borderWidth: 1, borderColor: Colors.accent + '44',
  },
  hubBadgeText: { fontSize: 8, fontWeight: '900', color: Colors.accent, letterSpacing: 1 },

  postMedia: { width: '100%', height: 260 },

  postFooter: { flexDirection: 'row', padding: Spacing.sm, gap: Spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionIcon: { fontSize: 18 },
  actionCount: { fontSize: 13, color: Colors.textMuted, fontWeight: '700' },

  captionRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.sm, paddingBottom: Spacing.sm },
  captionAuthor: { fontSize: 12, fontWeight: '800', color: Colors.text },
  captionText: { fontSize: 12, color: Colors.textMuted, flex: 1 },

  commentsSection: { borderTopWidth: 1, borderTopColor: Colors.accentBorder, padding: Spacing.sm, gap: 6 },
  commentRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  commentAuthor: { fontSize: 11, fontWeight: '800', color: Colors.text },
  commentText: { fontSize: 11, color: Colors.textMuted },
  commentInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    marginTop: 4,
  },
  commentInput: {
    flex: 1, fontSize: 12, color: Colors.text,
    backgroundColor: Colors.surfaceAlt, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: Colors.accentBorder,
  },
  commentSend: {
    fontSize: 28, color: Colors.accent, fontWeight: '900', lineHeight: 32,
  },
});
