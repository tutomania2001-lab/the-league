import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useFriends } from '@/hooks/useFriends';
import { withClanTag } from '@/lib/clanTag';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, RefreshControl,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FriendsScreen() {
  const [userId, setUserId] = useState<string>();
  const { friends, incoming, outgoing, loading, sendRequest, accept, decline, remove } = useFriends(userId);
  const [searchRiotId, setSearchRiotId] = useState('');
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  async function handleAdd() {
    if (!searchRiotId.trim()) { setAddError('Enter a Riot ID'); return; }
    setAdding(true); setAddError(null); setAddSuccess(false);
    const { error } = await sendRequest(searchRiotId);
    if (error) setAddError(error);
    else { setAddSuccess(true); setSearchRiotId(''); }
    setAdding(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <GlowText style={[Typography.heading, { flex: 1 }]}>👥 Friends</GlowText>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); setRefreshing(false); }} tintColor={Colors.accent} />}
      >

        {/* Add friend */}
        <Card style={styles.addCard}>
          <Text style={Typography.label}>Add by Riot ID</Text>
          <View style={styles.addRow}>
            <Input
              placeholder="Name#TAG"
              value={searchRiotId}
              onChangeText={setSearchRiotId}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.addInput}
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={adding}>
              {adding ? <ActivityIndicator color={Colors.background} size="small" /> : <Text style={styles.addBtnText}>ADD</Text>}
            </TouchableOpacity>
          </View>
          {addError && <Text style={{ color: Colors.error, fontSize: 12, marginTop: 4 }}>{addError}</Text>}
          {addSuccess && <Text style={{ color: Colors.success, fontSize: 12, marginTop: 4 }}>✓ Friend request sent!</Text>}
        </Card>

        {/* Incoming requests */}
        {incoming.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={Typography.label}>Requests</Text>
              <View style={styles.badge}><Text style={styles.badgeText}>{incoming.length}</Text></View>
            </View>
            {incoming.map(f => (
              <TouchableOpacity key={f.id} onPress={() => router.push(`/profile/${f.profile.id}`)} activeOpacity={0.85}>
              <Card style={styles.friendRow}>
                <FriendAvatar profile={f.profile} />
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{withClanTag(f.profile.riot_id ?? f.profile.username, (f.profile as any).clan_tag)}</Text>
                  <Text style={styles.friendSub}>Wants to play with you</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.acceptBtn} onPress={() => accept(f.id)}>
                    <Text style={styles.acceptText}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.declineBtn} onPress={() => decline(f.id)}>
                    <Text style={styles.declineText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Friends list */}
        <View style={styles.section}>
          <Text style={Typography.label}>Friends {friends.length > 0 ? `(${friends.length})` : ''}</Text>
          {loading ? (
            <ActivityIndicator color={Colors.accent} style={{ marginTop: Spacing.md }} />
          ) : friends.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={{ fontSize: 32, marginBottom: Spacing.xs }}>🎮</Text>
              <Text style={[Typography.subheading, { textAlign: 'center' }]}>No friends yet</Text>
              <Text style={[Typography.body, { textAlign: 'center', marginTop: 4 }]}>
                Add players by their Riot ID above
              </Text>
            </Card>
          ) : (
            friends.map(f => (
              <TouchableOpacity key={f.id} onPress={() => router.push(`/profile/${f.profile.id}`)} activeOpacity={0.85}>
                <Card style={styles.friendRow}>
                  <FriendAvatar profile={f.profile} />
                  <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{withClanTag(f.profile.riot_id ?? f.profile.username, (f.profile as any).clan_tag)}</Text>
                    <Text style={styles.friendSub}>Wild Rift Player</Text>
                  </View>
                  <TouchableOpacity style={styles.removeBtn} onPress={(e) => { e.stopPropagation?.(); remove(f.id); }}>
                    <Text style={styles.removeBtnText}>···</Text>
                  </TouchableOpacity>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Pending sent */}
        {outgoing.length > 0 && (
          <View style={styles.section}>
            <Text style={Typography.label}>Sent Requests ({outgoing.length})</Text>
            {outgoing.map(f => (
              <Card key={f.id} style={[styles.friendRow, { opacity: 0.6 }]}>
                <FriendAvatar profile={f.profile} />
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{withClanTag(f.profile.riot_id ?? f.profile.username, (f.profile as any).clan_tag)}</Text>
                  <Text style={styles.friendSub}>Pending...</Text>
                </View>
                <TouchableOpacity onPress={() => remove(f.id)}>
                  <Text style={[Typography.body, { color: Colors.error, fontSize: 11 }]}>Cancel</Text>
                </TouchableOpacity>
              </Card>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function FriendAvatar({ profile }: { profile: any }) {
  if (profile.avatar_url) {
    return <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />;
  }
  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarLetter}>{(profile.riot_id ?? profile.username ?? 'S')[0].toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderBottomWidth: 1, borderBottomColor: Colors.accentBorder,
  },
  backBtn: { paddingVertical: 4, paddingRight: 4 },
  backText: { color: Colors.accent, fontSize: 15, fontWeight: '600' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },

  addCard: { gap: Spacing.sm },
  addRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  addInput: { flex: 1 },
  addBtn: {
    backgroundColor: Colors.accent, borderRadius: 8,
    paddingHorizontal: Spacing.md, paddingVertical: 14, minWidth: 64, alignItems: 'center',
  },
  addBtnText: { color: Colors.background, fontWeight: '900', fontSize: 12, letterSpacing: 1 },

  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  badge: {
    backgroundColor: Colors.accent, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  badgeText: { color: Colors.background, fontSize: 10, fontWeight: '800' },

  friendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm },
  avatar: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: Colors.accentBorder },
  avatarFallback: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: Colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 18, fontWeight: '800', color: Colors.accent },
  friendInfo: { flex: 1, gap: 4 },
  friendName: { ...Typography.subheading, color: Colors.text, fontSize: 14 },
  friendSub: { ...Typography.body, fontSize: 11 },

  actions: { flexDirection: 'row', gap: Spacing.xs },
  acceptBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: 'rgba(0,255,136,0.15)', borderWidth: 1, borderColor: Colors.success + '66',
    alignItems: 'center', justifyContent: 'center',
  },
  acceptText: { color: Colors.success, fontWeight: '900', fontSize: 14 },
  declineBtn: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: 'rgba(255,68,68,0.12)', borderWidth: 1, borderColor: Colors.error + '55',
    alignItems: 'center', justifyContent: 'center',
  },
  declineText: { color: Colors.error, fontWeight: '900', fontSize: 13 },

  removeBtn: { padding: Spacing.xs },
  removeBtnText: { color: Colors.textMuted, fontSize: 18, letterSpacing: 2 },

  emptyCard: { alignItems: 'center', gap: 4, paddingVertical: Spacing.xl },
});
