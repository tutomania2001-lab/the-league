import { Button } from '@/components/ui/Button';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { LeagueEmblem } from '@/components/ui/LeagueEmblem';
import { StatusDot } from '@/components/ui/StatusDot';
import { LeaderboardView } from '@/components/tournament/LeaderboardView';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useTeam } from '@/hooks/useTeam';
import { useTeamChat } from '@/hooks/useTeamChat';
import { useTournamentList } from '@/hooks/useTournament';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Dimensions, FlatList, Image,
  KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

const { width } = Dimensions.get('window');

// ── Role config ────────────────────────────────────────────
const ROLES: Record<string, { label: string; color: string; bg: string }> = {
  leader:    { label: 'LEADER',    color: Colors.gold,    bg: 'rgba(200,155,60,0.2)' },
  member:    { label: 'MEMBER',    color: Colors.textMuted, bg: Colors.surfaceAlt },
};

function getRoleLabel(captainId: string, userId: string) {
  return captainId === userId ? 'leader' : 'member';
}

// ── Team Banner ────────────────────────────────────────────
function TeamBanner({ team, memberCount, wins }: {
  team: any; memberCount: number; wins: number;
}) {
  const level = Math.floor(wins / 3) + 1;
  const tag = team.name.slice(0, 4).toUpperCase();

  return (
    <View style={styles.banner}>
      {/* Gold gradient background */}
      <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
        <Defs>
          <LinearGradient id="bannerGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#1a1200" stopOpacity="1" />
            <Stop offset="0.5" stopColor="#0d0d1f" stopOpacity="1" />
            <Stop offset="1" stopColor="#0a0a14" stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#bannerGrad)" />
      </Svg>

      {/* Gold top border */}
      <View style={styles.bannerBorder} />

      <View style={styles.bannerContent}>
        {/* Emblem */}
        <View style={styles.emblemWrap}>
          <LeagueEmblem size={72} color={Colors.gold} />
        </View>

        {/* Info */}
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <Text style={styles.clanName}>{team.name}</Text>
            <View style={styles.tagChip}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          </View>
          <View style={styles.levelRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>Lv.{level}</Text>
            </View>
            <Text style={styles.bannerSub}>{memberCount}/10 members</Text>
          </View>
          {/* Stats row */}
          <View style={styles.bannerStats}>
            <View style={styles.bannerStat}>
              <Text style={styles.bannerStatVal}>{wins}</Text>
              <Text style={styles.bannerStatLabel}>Wins</Text>
            </View>
            <View style={styles.bannerStatDiv} />
            <View style={styles.bannerStat}>
              <Text style={styles.bannerStatVal}>{memberCount}</Text>
              <Text style={styles.bannerStatLabel}>Members</Text>
            </View>
            <View style={styles.bannerStatDiv} />
            <View style={styles.bannerStat}>
              <Text style={styles.bannerStatVal}>{team.tournaments_played ?? 0}</Text>
              <Text style={styles.bannerStatLabel}>Played</Text>
            </View>
          </View>
        </View>
      </View>

    </View>
  );
}

// ── Room Code modal ────────────────────────────────────────
function RoomCodeInfo({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🎮 How to join the match</Text>
        {['1. Open Wild Rift on your device','2. Tap Play → Custom Game','3. Tap Join Game','4. Paste the Room Code shown here','5. Enter the password if shown','6. Ready up and wait for match start']
          .map((s, i) => <Text key={i} style={styles.infoStep}>{s}</Text>)}
        <TouchableOpacity style={styles.infoDismiss} onPress={onClose}>
          <Text style={{ color: Colors.gold, fontWeight: '700', fontSize: 13 }}>Got it</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Lineup picker ──────────────────────────────────────────
function LineupPicker({ visible, members, memberProfiles, onConfirm, onClose, fee, captainId }: {
  visible: boolean; members: any[]; memberProfiles: Record<string, any>;
  onConfirm: (ids: string[], captainPaysAll: boolean) => void;
  onClose: () => void; fee: number; captainId: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [captainPaysAll, setCaptainPaysAll] = useState(false);

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 5 ? [...prev, id] : prev);
  }

  const totalFee = fee * 5;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </View>
      <View style={styles.lineupSheet}>
        <View style={styles.lineupHeader}>
          <Text style={styles.lineupTitle}>⚔️ Select Starting 5</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Payment method toggle */}
        <View style={styles.paymentToggle}>
          <TouchableOpacity
            style={[styles.payOption, !captainPaysAll && styles.payOptionActive]}
            onPress={() => setCaptainPaysAll(false)}
          >
            <Text style={[styles.payOptionIcon]}>👥</Text>
            <View>
              <Text style={[styles.payOptionTitle, !captainPaysAll && { color: Colors.gold }]}>Split Payment</Text>
              <Text style={styles.payOptionSub}>£{fee} each · 5 players</Text>
            </View>
            {!captainPaysAll && <View style={styles.payOptionCheck}><Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>✓</Text></View>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.payOption, captainPaysAll && styles.payOptionActive]}
            onPress={() => setCaptainPaysAll(true)}
          >
            <Text style={styles.payOptionIcon}>👑</Text>
            <View>
              <Text style={[styles.payOptionTitle, captainPaysAll && { color: Colors.gold }]}>Captain Pays All</Text>
              <Text style={styles.payOptionSub}>£{totalFee} from captain's wallet</Text>
            </View>
            {captainPaysAll && <View style={styles.payOptionCheck}><Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>✓</Text></View>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: Spacing.sm, gap: Spacing.xs }}>
          {members.map(m => {
            const p = memberProfiles[m.user_id];
            const name = p?.riot_id ?? p?.username ?? 'Player';
            const isSelected = selected.includes(m.user_id);
            const isCaptain = m.user_id === captainId;
            return (
              <TouchableOpacity key={m.user_id} onPress={() => toggle(m.user_id)}
                style={[styles.lineupRow, isSelected && styles.lineupRowSelected]}>
                {p?.avatar_url
                  ? <Image source={{ uri: p.avatar_url }} style={styles.lineupAvatar} />
                  : <View style={[styles.lineupAvatar, { backgroundColor: 'rgba(200,155,60,0.15)', alignItems:'center', justifyContent:'center' }]}>
                      <Text style={{ color: Colors.gold, fontWeight: '800' }}>{name[0]}</Text>
                    </View>
                }
                <View style={{ flex: 1 }}>
                  <Text style={[styles.lineupName, isSelected && { color: Colors.gold }]}>{name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <StatusDot status={p?.status ?? 'offline'} size={7} showLabel />
                    {isCaptain && <Text style={{ fontSize: 9, color: Colors.gold, fontWeight: '700' }}>CAPTAIN</Text>}
                  </View>
                </View>
                {isSelected && !captainPaysAll && (
                  <Text style={{ fontSize: 11, color: Colors.gold, fontWeight: '700' }}>£{fee}</Text>
                )}
                <View style={[styles.lineupCheck, isSelected && styles.lineupCheckDone]}>
                  {isSelected && <Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.lineupFooter}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: selected.length === 5 ? Colors.gold : Colors.textMuted, fontWeight: '700', fontSize: 14 }}>
              {selected.length}/5 selected
            </Text>
            {selected.length === 5 && (
              <Text style={{ color: Colors.accent, fontSize: 12 }}>
                {captainPaysAll ? `Captain pays £${totalFee}` : `5 × £${fee} = £${totalFee}`}
              </Text>
            )}
          </View>
          <Button
            label="Confirm →"
            onPress={() => onConfirm(selected, captainPaysAll)}
            disabled={selected.length !== 5}
            style={{ minWidth: 130, backgroundColor: Colors.gold }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Team Chat ──────────────────────────────────────────────
function TeamChat({ teamId, myId, memberProfiles }: { teamId: string; myId: string; memberProfiles: Record<string, any> }) {
  const { messages, loading, send } = useTeamChat(teamId, myId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const justSent = useRef(false);

  useEffect(() => { setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100); }, [messages.length]);

  async function handleSend() {
    if (!text.trim()) return;
    justSent.current = true;
    const content = text.trim();
    setText('');
    setSending(true);
    setTimeout(() => setText(''), 0);
    await send(content);
    setSending(false);
  }

  if (loading) return <ActivityIndicator color={Colors.gold} style={{ flex: 1 }} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: Spacing.sm, gap: 8, flexGrow: 1 }}
        onLayout={() => listRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>💬</Text>
            <Text style={[Typography.subheading, { textAlign: 'center', color: Colors.gold }]}>Clan Chat</Text>
            <Text style={[Typography.body, { textAlign: 'center', marginTop: 4 }]}>Say something to your clan!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.user_id === myId;
          const p = memberProfiles[item.user_id];
          const name = p?.riot_id ?? p?.username ?? '?';
          const avatar = p?.avatar_url;
          return (
            <View style={[styles.chatRow, isMe && styles.chatRowMe]}>
              {!isMe && (
                avatar
                  ? <Image source={{ uri: avatar }} style={styles.chatAvatar} />
                  : <View style={[styles.chatAvatar, { backgroundColor: 'rgba(200,155,60,0.2)', alignItems:'center', justifyContent:'center' }]}>
                      <Text style={{ color: Colors.gold, fontSize: 12, fontWeight: '800' }}>{name[0]}</Text>
                    </View>
              )}
              <View style={{ flex: 1 }}>
                {!isMe && <Text style={styles.chatName}>{name}</Text>}
                <View style={[styles.chatBubble, isMe ? styles.chatBubbleMe : styles.chatBubbleThem]}>
                  <Text style={[styles.chatText, isMe && { color: '#0a0800' }]}>{item.content}</Text>
                </View>
                <Text style={[styles.chatTime, isMe && { textAlign: 'right' }]}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        }}
      />
      <View style={styles.chatInputRow}>
        <TextInput
          style={styles.chatTextInput}
          value={text}
          onChangeText={v => {
            const cleaned = v.replace(/\n/g, '');
            if (justSent.current) { justSent.current = false; setText(cleaned); return; }
            if (v.endsWith('\n') && v.trim() === text.trim()) return;
            setText(v);
          }}
          placeholder="Clan chat..."
          placeholderTextColor={Colors.textDim}
          multiline maxLength={500}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          returnKeyType="send"
          onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Enter' && !(nativeEvent as any).shiftKey) handleSend(); }}
        />
        <TouchableOpacity style={[styles.chatSendBtn, !text.trim() && { opacity: 0.4 }]} onPress={handleSend} disabled={!text.trim() || sending}>
          {sending ? <ActivityIndicator color="#0a0800" size="small" /> : <Text style={{ color: '#0a0800', fontSize: 16, fontWeight: '900' }}>➤</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Main ───────────────────────────────────────────────────
export default function TeamScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>();
  const { team, members, pendingMembers, loading, createTeam, leaveTeam, refreshTeam, approveMember, removeMember } = useTeam(userId);
  const { teamBattles } = useTournamentList();
  const openTournaments = teamBattles.filter(t => t.status === 'open');
  const [memberProfiles, setMemberProfiles] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'chat' | 'play'>('overview');
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [lineupTournamentId, setLineupTournamentId] = useState<string | null>(null);
  const [lineupFee, setLineupFee] = useState(0);
  const [joiningTournament, setJoiningTournament] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showInviteInfo, setShowInviteInfo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mvp, setMvp] = useState<{ userId: string; wins: number } | null>(null);
  const [bankBalance, setBankBalance] = useState(0);
  const [bankTxns, setBankTxns] = useState<any[]>([]);
  const [contributeAmount, setContributeAmount] = useState('');
  const [contributing, setContributing] = useState(false);
  const [contributeError, setContributeError] = useState<string | null>(null);
  const [contributeSuccess, setContributeSuccess] = useState(false);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id)); }, []);

  // Fetch MVP and bank data when team loads
  useEffect(() => {
    if (!team?.id) return;
    // Bank balance + recent transactions
    supabase.from('teams').select('bank_balance').eq('id', team.id).single()
      .then(({ data }) => { if (data) setBankBalance(data.bank_balance ?? 0); });
    supabase.from('team_bank_transactions').select('*, user:users(riot_id,username,avatar_url)')
      .eq('team_id', team.id).order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setBankTxns(data); });
  }, [team?.id]);

  useEffect(() => {
    if (!members.length || !team?.id) return;
    supabase.from('users').select('id, riot_id, username, avatar_url, status').in('id', members.map(m => m.user_id))
      .then(({ data }) => {
        if (data) setMemberProfiles(Object.fromEntries(data.map(u => [u.id, u])));
      });
    // Fetch MVP — show player with most wins, or captain as placeholder
    supabase.rpc('get_team_mvp', { p_team_id: team.id })
      .then(({ data }) => {
        console.log('MVP data:', JSON.stringify(data));
        if (data?.[0]) {
          setMvp({ userId: String(data[0].user_id), wins: Number(data[0].wins) });
        } else {
          // No wins yet — show captain
          const captain = members.find(m => m.user_id === team.captain_id) ?? members[0];
          if (captain) setMvp({ userId: captain.user_id, wins: 0 });
        }
      })
      .catch((err) => {
        console.log('MVP error:', err?.message);
        // Fallback to captain
        const captain = members.find(m => m.user_id === team.captain_id) ?? members[0];
        if (captain) setMvp({ userId: captain.user_id, wins: 0 });
      });
  }, [members, team?.id]);

  async function handleCreate() {
    if (!teamName.trim()) { setError('Team name is required'); return; }
    setCreating(true);
    const { error } = await createTeam(teamName.trim());
    if (error) { setError(error); setCreating(false); return; }
    await refreshTeam();
    setCreating(false);
  }

  async function handleContribute() {
    const amt = parseFloat(contributeAmount);
    if (!amt || amt < 1 || !team || !userId) { setContributeError('Enter a valid amount (min £1)'); return; }
    setContributing(true); setContributeError(null);
    const { error } = await supabase.rpc('contribute_to_team_bank', {
      p_team_id: team.id, p_user_id: userId, p_amount: amt,
    });
    if (error) { setContributeError(error.message.includes('Insufficient') ? 'Insufficient wallet balance' : error.message); }
    else {
      setContributeAmount('');
      setContributeSuccess(true);
      setTimeout(() => setContributeSuccess(false), 2000);
      // Refresh bank balance
      const { data } = await supabase.from('teams').select('bank_balance').eq('id', team.id).single();
      if (data) setBankBalance(data.bank_balance);
      const { data: txns } = await supabase.from('team_bank_transactions')
        .select('*, user:users(riot_id,username,avatar_url)').eq('team_id', team.id)
        .order('created_at', { ascending: false }).limit(10);
      if (txns) setBankTxns(txns);
    }
    setContributing(false);
  }

  async function handleEnterTournament(ids: string[], captainPaysAll: boolean) {
    if (!team || !lineupTournamentId || !userId) return;
    setJoiningTournament(true);

    // Register team — force team_battle type for player-created matches
    const { error: regError } = await supabase.from('tournament_teams')
      .insert({ tournament_id: lineupTournamentId, team_id: team.id });

    if (!regError || regError.message.includes('duplicate')) {
      // Save lineup
      await supabase.from('tournament_lineups').insert(
        ids.map(uid => ({ tournament_id: lineupTournamentId, team_id: team.id, user_id: uid }))
      );

      // Deduct entry fees
      const { data: tournament } = await supabase
        .from('tournaments').select('entry_fee_per_player').eq('id', lineupTournamentId).single();
      const fee = tournament?.entry_fee_per_player ?? lineupFee;

      if (captainPaysAll) {
        await supabase.rpc('decrement_wallet', { user_id: userId, amount: fee * 5 });
        await supabase.from('transactions').insert({
          user_id: userId, type: 'entry_fee', amount: fee * 5,
          status: 'completed', tournament_id: lineupTournamentId,
        });
      } else {
        for (const uid of ids) {
          await supabase.rpc('decrement_wallet', { user_id: uid, amount: fee });
          await supabase.from('transactions').insert({
            user_id: uid, type: 'entry_fee', amount: fee,
            status: 'completed', tournament_id: lineupTournamentId,
          });
        }
      }
    }

    setJoiningTournament(false);
    setLineupTournamentId(null);
    router.push(`/tournament/${lineupTournamentId}`);
  }

  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator color={Colors.gold} style={{ flex: 1 }} /></SafeAreaView>;

  // ── No team ──────────────────────────────────────────────
  if (!team) return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <GlowText style={[Typography.title, { color: Colors.gold }]}>⚔️ My Clan</GlowText>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.createCard}>
          <LeagueEmblem size={64} color={Colors.gold} />
          <Text style={styles.createTitle}>Create a Clan</Text>
          <Text style={[Typography.body, { textAlign: 'center', lineHeight: 20 }]}>
            Assemble up to 10 players. Free to create — you only pay when entering tournaments.
          </Text>
          <Input label="Clan Name *" placeholder="e.g. Dragon Fist" value={teamName} onChangeText={setTeamName} autoCorrect={false} style={{ width: '100%' }} />
          {error && <Text style={{ color: Colors.error, fontSize: 12 }}>{error}</Text>}
          <Button label="Create Clan" onPress={handleCreate} loading={creating} style={styles.createBtn} />
        </View>

        <TouchableOpacity style={styles.joinCard} onPress={() => router.push('/team/invite')}>
          <Text style={{ fontSize: 24 }}>🔗</Text>
          <View style={{ flex: 1 }}>
            <Text style={[Typography.subheading, { color: Colors.gold }]}>Join a Clan</Text>
            <Text style={[Typography.body, { fontSize: 11 }]}>Enter a room code to join an existing clan</Text>
          </View>
          <Text style={{ color: Colors.gold, fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  const isCaptain = team.captain_id === userId;
  const wins = team.wins ?? 0;

  // ── Clan Hub ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <TeamBanner team={team} memberCount={members.length} wins={wins} />

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {([['overview','🏰','Overview'],['members','👥','Members'],['chat','💬','Chat'],['play','⚔️','Battle']] as const).map(([t, emoji, label]) => (
          <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[styles.tabLabel, activeTab === t && styles.tabLabelActive]}>{emoji} {label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <ScrollView contentContainerStyle={styles.tabContent}>
            {/* Room code card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🎮 Wild Rift Room</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {isCaptain && (
                    <TouchableOpacity onPress={() => { setEditingCode(!editingCode); setNewCode(team.room_code ?? ''); setNewPassword(team.room_password ?? ''); }}>
                      <Text style={{ color: Colors.gold, fontSize: 12 }}>{editingCode ? 'Cancel' : '✏️ Edit'}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setShowInfo(true)}>
                    <Text style={{ color: Colors.textMuted, fontSize: 12 }}>ℹ️</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {!editingCode ? (
                team.room_code ? (
                  <TouchableOpacity style={styles.roomCodeBlock} onPress={async () => { await Clipboard.setStringAsync(team.room_code!); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                    <Text style={styles.roomCodeText}>{team.room_code}</Text>
                    <View style={[styles.copyChip, copied && { backgroundColor: 'rgba(0,255,136,0.15)', borderColor: Colors.success + '55' }]}>
                      <Text style={{ color: copied ? Colors.success : Colors.gold, fontSize: 11, fontWeight: '700' }}>{copied ? '✓ Copied' : '📋 Copy'}</Text>
                    </View>
                  </TouchableOpacity>
                ) : isCaptain ? (
                  <TouchableOpacity style={styles.noCodeBtn} onPress={() => setEditingCode(true)}>
                    <Text style={{ color: Colors.gold, fontSize: 12 }}>+ Set room code for tournaments</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[Typography.body, { color: Colors.error, fontSize: 12 }]}>⚠️ Leader hasn't set a room code</Text>
                )
              ) : (
                <View style={{ gap: Spacing.sm }}>
                  <Input label="Room Code (5 digits)" value={newCode} onChangeText={v => setNewCode(v.replace(/[^0-9]/g, '').slice(0, 5))} keyboardType="numeric" maxLength={5} />
                  <Input label="Password (optional)" value={newPassword} onChangeText={setNewPassword} autoCapitalize="none" />
                  <Button label="Save" disabled={newCode.length !== 5} onPress={async () => {
                    if (!/^\d{5}$/.test(newCode)) return;
                    await supabase.from('teams').update({ room_code: newCode, room_password: newPassword.trim() || null }).eq('id', team.id);
                    setEditingCode(false); refreshTeam();
                  }} />
                </View>
              )}
            </View>

            {/* Clan Invite Code — visible to all members */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🔗 Clan Invite Code</Text>
                <TouchableOpacity onPress={() => setShowInviteInfo(true)}>
                  <Text style={{ color: Colors.textMuted, fontSize: 12 }}>ℹ️</Text>
                </TouchableOpacity>
              </View>
              <Text style={[Typography.body, { fontSize: 11, marginBottom: Spacing.sm }]}>
                Share with friends — they paste it in My Team → 📨 Invite / Join
              </Text>
              <TouchableOpacity
                style={styles.roomCodeBlock}
                onPress={async () => { await Clipboard.setStringAsync(team.invite_code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              >
                <Text style={styles.roomCodeText}>{team.invite_code}</Text>
                <View style={[styles.copyChip, copied && { backgroundColor: 'rgba(0,255,136,0.15)', borderColor: Colors.success + '55' }]}>
                  <Text style={{ color: copied ? Colors.success : Colors.gold, fontSize: 11, fontWeight: '700' }}>
                    {copied ? '✓ Copied' : '📋 Copy'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>📊 Clan Stats</Text>
              <View style={styles.statsRow}>
                {[
                  { label: 'Wins', val: wins, icon: '🏆' },
                  { label: 'Played', val: team.tournaments_played ?? 0, icon: '⚔️' },
                  { label: 'Earnings', val: `£${((team as any).total_earnings ?? 0).toFixed(0)}`, icon: '💰' },
                ].map(s => (
                  <View key={s.label} style={styles.statBox}>
                    <Text style={{ fontSize: 22 }}>{s.icon}</Text>
                    <Text style={styles.statVal}>{s.val}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── MVP Banner ── */}
            {mvp && (
              <View style={styles.mvpBanner}>
                <View style={styles.mvpGlow} />
                <View style={styles.mvpLeft}>
                  <Text style={styles.mvpCrown}>👑</Text>
                  <Text style={styles.mvpLabel}>CLAN MVP</Text>
                </View>
                <View style={styles.mvpCenter}>
                  {memberProfiles[mvp.userId]?.avatar_url
                    ? <Image source={{ uri: memberProfiles[mvp.userId].avatar_url }} style={styles.mvpAvatar} />
                    : <View style={[styles.mvpAvatar, { backgroundColor: 'rgba(200,155,60,0.3)', alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ color: Colors.gold, fontSize: 22, fontWeight: '900' }}>
                          {(memberProfiles[mvp.userId]?.riot_id ?? memberProfiles[mvp.userId]?.username ?? '👑')[0]}
                        </Text>
                      </View>
                  }
                  <Text style={styles.mvpName} numberOfLines={1}>
                    {memberProfiles[mvp.userId]?.riot_id ?? memberProfiles[mvp.userId]?.username ?? 'MVP Player'}
                  </Text>
                </View>
                <View style={styles.mvpRight}>
                  <Text style={styles.mvpWins}>{mvp.wins}</Text>
                  <Text style={styles.mvpWinsLabel}>WINS</Text>
                </View>
              </View>
            )}

            {/* ── Team Bank ── */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>🏦 Clan Bank</Text>
              {/* Balance */}
              <View style={styles.bankBalance}>
                <Text style={styles.bankBalanceLabel}>Available Funds</Text>
                <Text style={styles.bankBalanceValue}>£{bankBalance.toFixed(2)}</Text>
              </View>
              {/* Contribute */}
              <View style={styles.bankContribute}>
                <TextInput
                  style={styles.bankInput}
                  value={contributeAmount}
                  onChangeText={setContributeAmount}
                  placeholder="£ Amount"
                  placeholderTextColor={Colors.textDim}
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  style={[styles.bankBtn, contributing && { opacity: 0.5 }]}
                  onPress={handleContribute}
                  disabled={contributing}
                >
                  <Text style={styles.bankBtnText}>{contributing ? '...' : contributeSuccess ? '✓' : 'Contribute'}</Text>
                </TouchableOpacity>
              </View>
              {contributeError && <Text style={{ color: Colors.error, fontSize: 11, marginTop: 4 }}>{contributeError}</Text>}
              {contributeSuccess && <Text style={{ color: Colors.success, fontSize: 11, marginTop: 4 }}>✓ Contribution added!</Text>}
              {/* Recent transactions */}
              {bankTxns.length > 0 && (
                <View style={{ marginTop: Spacing.sm, gap: 4 }}>
                  <Text style={[Typography.label, { marginBottom: 2 }]}>Recent Contributions</Text>
                  {bankTxns.slice(0, 4).map(t => (
                    <View key={t.id} style={styles.bankTxn}>
                      <Text style={styles.bankTxnName} numberOfLines={1}>
                        {t.user?.riot_id ?? t.user?.username ?? 'Member'}
                      </Text>
                      <Text style={styles.bankTxnAmt}>+£{t.amount.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Clan Leaderboard — compact top 5 */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>🏆 Clan Rankings</Text>
              <LeaderboardView compact teamId={team.id} />
            </View>

            {/* Quick actions */}
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickBtn} onPress={() => setActiveTab('play')}>
                <Text style={{ fontSize: 24 }}>⚔️</Text>
                <Text style={styles.quickLabel}>Enter{'\n'}Tournament</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => setActiveTab('chat')}>
                <Text style={{ fontSize: 24 }}>💬</Text>
                <Text style={styles.quickLabel}>Clan{'\n'}Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/team/invite')}>
                <Text style={{ fontSize: 24 }}>👥</Text>
                <Text style={styles.quickLabel}>Invite{'\n'}Players</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* MEMBERS */}
        {activeTab === 'members' && (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>👥 Members — {members.length}/10</Text>
              {members.map(m => {
                const p = memberProfiles[m.user_id];
                const role = getRoleLabel(team.captain_id, m.user_id);
                const roleCfg = ROLES[role];
                return (
                  <View key={m.user_id} style={styles.memberRow}>
                    {p?.avatar_url
                      ? <Image source={{ uri: p.avatar_url }} style={styles.memberAvatar} />
                      : <View style={[styles.memberAvatar, { backgroundColor: 'rgba(200,155,60,0.15)', alignItems:'center', justifyContent:'center' }]}>
                          <Text style={{ color: Colors.gold, fontSize: 16, fontWeight: '800' }}>{(p?.riot_id ?? p?.username ?? '?')[0]}</Text>
                        </View>
                    }
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={styles.memberName}>{p?.riot_id ?? p?.username ?? 'Player'}</Text>
                      <StatusDot status={p?.status ?? 'offline'} size={8} showLabel />
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: roleCfg.bg, borderColor: roleCfg.color + '55' }]}>
                      <Text style={[styles.roleText, { color: roleCfg.color }]}>{roleCfg.label}</Text>
                    </View>
                    {isCaptain && m.user_id !== userId && (
                      <TouchableOpacity style={styles.kickBtn} onPress={() => removeMember(m.user_id)}>
                        <Text style={{ color: Colors.error, fontSize: 11 }}>Kick</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
              {Array.from({ length: Math.max(0, 10 - members.length) }).map((_, i) => (
                <View key={`e-${i}`} style={[styles.memberRow, { opacity: 0.35 }]}>
                  <View style={[styles.memberAvatar, { borderStyle: 'dashed', backgroundColor: 'transparent' }]} />
                  <Text style={[Typography.body, { fontSize: 12 }]}>Open slot</Text>
                </View>
              ))}
            </View>
            {/* Pending approvals — captain only */}
            {isCaptain && pendingMembers.length > 0 && (
              <View style={[styles.sectionCard, { borderColor: Colors.warning + '55', marginTop: Spacing.sm }]}>
                <Text style={[styles.sectionTitle, { color: Colors.warning }]}>
                  ⏳ Pending Approval ({pendingMembers.length})
                </Text>
                {pendingMembers.map(m => {
                  const p = memberProfiles[m.user_id];
                  return (
                    <View key={m.user_id} style={styles.memberRow}>
                      {p?.avatar_url
                        ? <Image source={{ uri: p.avatar_url }} style={styles.memberAvatar} />
                        : <View style={[styles.memberAvatar, { backgroundColor: 'rgba(255,170,0,0.15)', alignItems:'center', justifyContent:'center' }]}>
                            <Text style={{ color: Colors.warning, fontSize: 16, fontWeight: '800' }}>{(p?.riot_id ?? p?.username ?? '?')[0]}</Text>
                          </View>
                      }
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>{p?.riot_id ?? p?.username ?? 'Player'}</Text>
                        <Text style={{ fontSize: 10, color: Colors.warning }}>Wants to join</Text>
                      </View>
                      <TouchableOpacity
                        style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: 'rgba(0,255,136,0.15)', borderWidth: 1, borderColor: Colors.success + '55', marginRight: 6 }}
                        onPress={() => approveMember(m.user_id)}
                      >
                        <Text style={{ color: Colors.success, fontWeight: '800', fontSize: 12 }}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: 'rgba(255,68,68,0.1)', borderWidth: 1, borderColor: Colors.error + '44' }}
                        onPress={() => removeMember(m.user_id)}
                      >
                        <Text style={{ color: Colors.error, fontWeight: '800', fontSize: 12 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            <Button label="📨 Invite Players" variant="secondary" onPress={() => router.push('/team/invite')} style={{ borderColor: Colors.gold + '88', marginTop: Spacing.sm }} />
            <Button label="Leave Clan" variant="ghost" onPress={leaveTeam} style={{ borderColor: Colors.error + '44', marginTop: Spacing.xs }} />
          </ScrollView>
        )}

        {/* CHAT */}
        {activeTab === 'chat' && userId && (
          <TeamChat
            teamId={team.id}
            myId={userId}
            memberProfiles={memberProfiles}
          />
        )}

        {/* PLAY */}
        {activeTab === 'play' && (
          <ScrollView contentContainerStyle={styles.tabContent}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>⚔️ Team Battle</Text>
              <Text style={[Typography.body, { fontSize: 12, marginBottom: Spacing.sm }]}>
                Challenge other teams. Select 5 of your {members.length} clan members — split the fee or captain pays all.
              </Text>
              {!team.room_code && (
                <View style={styles.warningBox}>
                  <Text style={{ color: Colors.warning, fontSize: 12, fontWeight: '600' }}>⚠️ Set a room code in Overview before entering</Text>
                </View>
              )}
            </View>

            {openTournaments.length === 0 ? (
              <View style={styles.sectionCard}>
                <Text style={[Typography.subheading, { textAlign: 'center', color: Colors.gold }]}>No open tournaments</Text>
                <Text style={[Typography.body, { textAlign: 'center', marginTop: 4 }]}>Check back soon for upcoming events</Text>
              </View>
            ) : (
              openTournaments.map(t => {
                const prize = (t.entry_fee_per_player * 5 * t.max_teams * 0.9).toFixed(0);
                return (
                  <View key={t.id} style={styles.tourneyCard}>
                    <View style={styles.tourneyGold} />
                    <View style={styles.tourneyBody}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tourneyName}>{t.name}</Text>
                          <Text style={styles.tourneySub}>£{t.entry_fee_per_player}/player · 8 teams</Text>
                        </View>
                        <View style={styles.prizeTag}>
                          <Text style={styles.prizeText}>🏆 £{prize}</Text>
                        </View>
                      </View>
                      <Button
                        label={team.room_code ? '⚔️ Select 5 Players' : 'Set room code first →'}
                        onPress={() => {
                          if (!team.room_code) { setActiveTab('overview'); return; }
                          setLineupFee(t.entry_fee_per_player);
                          setLineupTournamentId(t.id);
                        }}
                        style={[styles.enterBtn, !team.room_code && { backgroundColor: Colors.surfaceAlt, borderColor: Colors.accentBorder, borderWidth: 1 }]}
                        loading={joiningTournament && lineupTournamentId === t.id}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </View>

      {lineupTournamentId && (
        <LineupPicker
          visible={!!lineupTournamentId}
          members={members}
          memberProfiles={memberProfiles}
          fee={lineupFee}
          captainId={team.captain_id}
          onConfirm={handleEnterTournament}
          onClose={() => setLineupTournamentId(null)}
        />
      )}
      <RoomCodeInfo visible={showInfo} onClose={() => setShowInfo(false)} />

      {/* Clan invite info modal */}
      <Modal transparent visible={showInviteInfo} animationType="fade" onRequestClose={() => setShowInviteInfo(false)}>
        <TouchableOpacity style={styles.infoBackdrop} activeOpacity={1} onPress={() => setShowInviteInfo(false)} />
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🔗 How to invite players</Text>
          {[
            '1. Copy your Clan Invite Code above',
            '2. Share it with your friend (Discord, WhatsApp, etc.)',
            '3. They open the app → My Team tab',
            '4. Tap 📨 Invite / Join',
            '5. They paste the code and tap Request to Join',
            '6. You\'ll see them in the Pending Approval section',
            '7. Tap ✓ to approve them into your clan',
          ].map((s, i) => <Text key={i} style={styles.infoStep}>{s}</Text>)}
          <TouchableOpacity style={styles.infoDismiss} onPress={() => setShowInviteInfo(false)}>
            <Text style={{ color: Colors.gold, fontWeight: '700', fontSize: 13 }}>Got it</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxl, alignItems: 'center' },

  // Create screen
  createCard: { alignItems: 'center', gap: Spacing.md, backgroundColor: 'rgba(10,8,3,0.85)', borderRadius: 16, borderWidth: 1, borderColor: Colors.gold + '44', padding: Spacing.xl, width: '100%' },
  createTitle: { fontSize: 22, fontWeight: '900', color: Colors.gold, letterSpacing: 1 },
  createBtn: { backgroundColor: Colors.gold, width: '100%' },
  joinCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: 'rgba(10,8,3,0.7)', borderRadius: 12, borderWidth: 1, borderColor: Colors.gold + '33', padding: Spacing.md, width: '100%' },

  // Banner
  banner: { position: 'relative', paddingTop: Spacing.md, paddingBottom: Spacing.sm, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.gold + '44', overflow: 'hidden' },
  bannerBorder: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: Colors.gold, opacity: 0.6 },
  bannerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  emblemWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  clanName: { fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  tagChip: { backgroundColor: 'rgba(200,155,60,0.2)', borderRadius: 4, borderWidth: 1, borderColor: Colors.gold + '55', paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '800', color: Colors.gold, letterSpacing: 1 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  levelBadge: { backgroundColor: Colors.gold, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  levelText: { fontSize: 10, fontWeight: '900', color: '#0a0800' },
  bannerSub: { fontSize: 11, color: Colors.textMuted },
  bannerStats: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  bannerStat: { alignItems: 'center', paddingHorizontal: 10 },
  bannerStatVal: { fontSize: 16, fontWeight: '900', color: Colors.gold },
  bannerStatLabel: { fontSize: 9, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  bannerStatDiv: { width: 1, height: 24, backgroundColor: Colors.gold + '33' },
  inviteBtn: { position: 'absolute', top: Spacing.md, right: Spacing.md, backgroundColor: 'rgba(200,155,60,0.15)', borderRadius: 8, borderWidth: 1, borderColor: Colors.gold + '66', paddingHorizontal: 10, paddingVertical: 5 },
  inviteBtnText: { color: Colors.gold, fontSize: 12, fontWeight: '700' },

  // MVP Banner
  mvpBanner: {
    borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: Colors.gold + '88',
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md,
    backgroundColor: 'rgba(15,10,0,0.9)',
  },
  mvpGlow: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(200,155,60,0.06)' },
  mvpLeft: { alignItems: 'center', gap: 2 },
  mvpCrown: { fontSize: 22 },
  mvpLabel: { fontSize: 8, fontWeight: '900', color: Colors.gold, letterSpacing: 1.5 },
  mvpCenter: { flex: 1, alignItems: 'center', gap: 6 },
  mvpAvatar: { width: 52, height: 52, borderRadius: 10, borderWidth: 2, borderColor: Colors.gold },
  mvpName: { fontSize: 13, fontWeight: '800', color: Colors.gold, textAlign: 'center' },
  mvpRight: { alignItems: 'center' },
  mvpWins: { fontSize: 28, fontWeight: '900', color: Colors.gold, textShadowColor: Colors.gold, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  mvpWinsLabel: { fontSize: 8, fontWeight: '700', color: Colors.gold + '88', letterSpacing: 1 },

  // Team Bank
  bankBalance: { backgroundColor: 'rgba(200,155,60,0.08)', borderRadius: 10, borderWidth: 1, borderColor: Colors.gold + '33', padding: Spacing.sm, alignItems: 'center', gap: 2, marginBottom: Spacing.sm },
  bankBalanceLabel: { fontSize: 9, fontWeight: '700', color: Colors.gold + '88', letterSpacing: 1.5, textTransform: 'uppercase' },
  bankBalanceValue: { fontSize: 28, fontWeight: '900', color: Colors.gold, textShadowColor: Colors.gold, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  bankContribute: { flexDirection: 'row', gap: Spacing.sm },
  bankInput: { flex: 1, height: 40, backgroundColor: 'rgba(20,14,0,0.8)', borderRadius: 8, borderWidth: 1, borderColor: Colors.gold + '44', paddingHorizontal: Spacing.sm, color: Colors.text, fontSize: 14 },
  bankBtn: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.gold, borderRadius: 8 },
  bankBtnText: { color: '#0a0800', fontWeight: '900', fontSize: 12 },
  bankTxn: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: Colors.gold + '15' },
  bankTxnName: { fontSize: 11, color: Colors.textMuted, flex: 1 },
  bankTxnAmt: { fontSize: 11, fontWeight: '700', color: Colors.success },

  // Tab bar
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.gold + '33', backgroundColor: 'rgba(8,6,0,0.8)' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: Colors.gold },
  tabLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  tabLabelActive: { color: Colors.gold },

  // Tab content
  tabContent: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  sectionCard: { backgroundColor: 'rgba(10,8,3,0.75)', borderRadius: 12, borderWidth: 1, borderColor: Colors.gold + '33', padding: Spacing.md, gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: Colors.gold, letterSpacing: 0.5, textTransform: 'uppercase' },

  // Room code
  roomCodeBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(200,155,60,0.08)', borderRadius: 8, borderWidth: 1, borderColor: Colors.gold + '44', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  roomCodeText: { fontSize: 26, fontWeight: '900', color: Colors.gold, letterSpacing: 6, textShadowColor: Colors.gold, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  copyChip: { backgroundColor: 'rgba(200,155,60,0.15)', borderRadius: 6, borderWidth: 1, borderColor: Colors.gold + '55', paddingHorizontal: 8, paddingVertical: 4 },
  noCodeBtn: { padding: Spacing.sm, borderRadius: 8, borderWidth: 1, borderColor: Colors.gold + '44', borderStyle: 'dashed', alignItems: 'center' },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statBox: { alignItems: 'center', gap: 4 },
  statVal: { fontSize: 22, fontWeight: '900', color: Colors.gold },
  statLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Quick actions
  quickActions: { flexDirection: 'row', gap: Spacing.sm },
  quickBtn: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: 'rgba(10,8,3,0.75)', borderRadius: 12, borderWidth: 1, borderColor: Colors.gold + '33', paddingVertical: Spacing.md },
  quickLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textAlign: 'center', lineHeight: 14 },

  // Members
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.gold + '15' },
  memberAvatar: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: Colors.gold + '33' },
  memberName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  roleBadge: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 },
  roleText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  kickBtn: { padding: 4 },
  warningBox: { backgroundColor: 'rgba(255,170,0,0.1)', borderRadius: 8, borderWidth: 1, borderColor: Colors.warning + '44', padding: Spacing.sm },

  // Tournament card
  tourneyCard: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.gold + '44' },
  tourneyGold: { height: 3, backgroundColor: Colors.gold },
  tourneyBody: { backgroundColor: 'rgba(10,8,3,0.85)', padding: Spacing.md, gap: Spacing.sm },
  tourneyName: { fontSize: 15, fontWeight: '800', color: Colors.text },
  tourneySub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  prizeTag: { backgroundColor: 'rgba(200,155,60,0.15)', borderRadius: 6, borderWidth: 1, borderColor: Colors.gold + '55', paddingHorizontal: 8, paddingVertical: 4 },
  prizeText: { color: Colors.gold, fontSize: 12, fontWeight: '800' },
  enterBtn: { backgroundColor: Colors.gold },

  // Chat
  chatRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-end' },
  chatRowMe: { flexDirection: 'row-reverse' },
  chatAvatar: { width: 30, height: 30, borderRadius: 6, borderWidth: 1, borderColor: Colors.gold + '44' },
  chatName: { fontSize: 10, color: Colors.gold, marginBottom: 2, marginLeft: 4, fontWeight: '600' },
  chatBubble: { maxWidth: '80%', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12 },
  chatBubbleMe: { backgroundColor: Colors.gold, borderBottomRightRadius: 3 },
  chatBubbleThem: { backgroundColor: 'rgba(20,16,4,0.9)', borderWidth: 1, borderColor: Colors.gold + '33', borderBottomLeftRadius: 3 },
  chatText: { fontSize: 13, color: Colors.text, lineHeight: 18 },
  chatTime: { fontSize: 9, color: Colors.textDim, marginTop: 2, marginHorizontal: 4 },
  chatInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, padding: Spacing.sm, paddingHorizontal: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.gold + '33', backgroundColor: 'rgba(8,6,0,0.95)' },
  chatTextInput: { flex: 1, minHeight: 40, maxHeight: 100, backgroundColor: 'rgba(20,16,4,0.9)', borderRadius: 8, borderWidth: 1, borderColor: Colors.gold + '44', paddingHorizontal: Spacing.sm, paddingVertical: 8, color: Colors.text, fontSize: 13 },
  chatSendBtn: { width: 40, height: 40, borderRadius: 8, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },

  // Lineup
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 99 },
  lineupSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(10,8,3,0.99)', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 2, borderTopColor: Colors.gold + '66', maxHeight: '82%', zIndex: 100 },
  paymentToggle: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.sm, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.gold + '22' },
  payOption: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, padding: Spacing.sm, borderRadius: 10, borderWidth: 1, borderColor: Colors.gold + '22', backgroundColor: 'rgba(20,16,4,0.6)' },
  payOptionActive: { borderColor: Colors.gold + '88', backgroundColor: 'rgba(200,155,60,0.1)' },
  payOptionIcon: { fontSize: 20 },
  payOptionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  payOptionSub: { fontSize: 10, color: Colors.textDim, marginTop: 1 },
  payOptionCheck: { width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  lineupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.gold + '33' },
  lineupTitle: { fontSize: 16, fontWeight: '800', color: Colors.gold },
  lineupRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: 10, borderWidth: 1, borderColor: Colors.gold + '22', backgroundColor: 'rgba(20,16,4,0.8)' },
  lineupRowSelected: { borderColor: Colors.gold, backgroundColor: 'rgba(200,155,60,0.12)' },
  lineupAvatar: { width: 38, height: 38, borderRadius: 8, borderWidth: 1, borderColor: Colors.gold + '44' },
  lineupName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  lineupCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: Colors.gold + '55', alignItems: 'center', justifyContent: 'center' },
  lineupCheckDone: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  lineupFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.gold + '33' },

  // Info modal
  infoCard: { position: 'absolute', left: '5%', right: '5%', top: '25%', backgroundColor: 'rgba(10,8,3,0.98)', borderRadius: 16, borderWidth: 1, borderColor: Colors.gold + '55', padding: Spacing.lg, gap: Spacing.sm, zIndex: 100 },
  infoTitle: { fontSize: 16, fontWeight: '800', color: Colors.gold, marginBottom: 4 },
  infoStep: { fontSize: 13, color: Colors.textMuted, lineHeight: 22 },
  infoDismiss: { marginTop: Spacing.sm, alignItems: 'center', paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(200,155,60,0.1)', borderWidth: 1, borderColor: Colors.gold + '55' },
});
