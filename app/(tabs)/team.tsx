import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { StatusDot } from '@/components/ui/StatusDot';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useTeam } from '@/hooks/useTeam';
import { useTeamChat } from '@/hooks/useTeamChat';
import { useTournamentList } from '@/hooks/useTournament';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Easing, FlatList, Image,
  KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Info modal ─────────────────────────────────────────────
function RoomCodeInfo({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.infoBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🎮 How to join the match</Text>
        {['1. Open Wild Rift on your device','2. Tap Play → Custom Game','3. Tap Join Game','4. Paste the Room Code shown here','5. Enter the password if shown','6. Ready up and wait for match start']
          .map((s, i) => <Text key={i} style={styles.infoStep}>{s}</Text>)}
        <TouchableOpacity style={styles.infoDismiss} onPress={onClose}>
          <Text style={{ color: Colors.accent, fontWeight: '700', fontSize: 13 }}>Got it</Text>
        </TouchableOpacity>
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

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length]);

  async function handleSend() {
    if (!text.trim()) return;
    justSent.current = true;
    setSending(true);
    const content = text.trim();
    setText('');
    await send(content);
    setSending(false);
  }

  if (loading) return <ActivityIndicator color={Colors.accent} style={{ flex: 1 }} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={{ padding: Spacing.sm, gap: 6, flexGrow: 1 }}
        onLayout={() => listRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>💬</Text>
            <Text style={[Typography.subheading, { textAlign: 'center' }]}>Team chat</Text>
            <Text style={[Typography.body, { textAlign: 'center', marginTop: 4 }]}>Say something to your team!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.user_id === myId;
          const name = item.profile?.riot_id ?? item.profile?.username ?? memberProfiles[item.user_id] ?? '?';
          const avatar = item.profile?.avatar_url;
          return (
            <View style={[styles.chatRow, isMe && styles.chatRowMe]}>
              {!isMe && (
                avatar ? <Image source={{ uri: avatar }} style={styles.chatAvatar} />
                  : <View style={[styles.chatAvatar, { backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center' }]}>
                      <Text style={{ color: Colors.accent, fontSize: 12, fontWeight: '800' }}>{name[0]}</Text>
                    </View>
              )}
              <View style={{ flex: 1 }}>
                {!isMe && <Text style={styles.chatName}>{name}</Text>}
                <View style={[styles.chatBubble, isMe ? styles.chatBubbleMe : styles.chatBubbleThem]}>
                  <Text style={[styles.chatText, isMe && { color: Colors.background }]}>{item.content}</Text>
                </View>
                <Text style={[styles.chatTime, isMe && { textAlign: 'right' }]}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          );
        }}
      />
      <View style={styles.chatInput}>
        <TextInput
          style={styles.chatTextInput}
          value={text}
          onChangeText={v => { if (justSent.current) { justSent.current = false; setText(v.replace(/\n$/, '')); return; } setText(v); }}
          placeholder="Message team..."
          placeholderTextColor={Colors.textDim}
          multiline maxLength={500}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
          returnKeyType="send"
          onKeyPress={({ nativeEvent }) => { if (nativeEvent.key === 'Enter' && !(nativeEvent as any).shiftKey) handleSend(); }}
        />
        <TouchableOpacity style={[styles.chatSendBtn, !text.trim() && { opacity: 0.4 }]} onPress={handleSend} disabled={!text.trim() || sending}>
          {sending ? <ActivityIndicator color={Colors.background} size="small" /> : <Text style={{ color: Colors.background, fontSize: 16, fontWeight: '900' }}>➤</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Lineup picker modal ────────────────────────────────────
function LineupPicker({ visible, members, memberProfiles, onConfirm, onClose, fee }: {
  visible: boolean; members: any[]; memberProfiles: Record<string, any>;
  onConfirm: (ids: string[]) => void; onClose: () => void; fee: number;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 5 ? [...prev, id] : prev);
  }

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.lineupBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} />
      </View>
      <View style={styles.lineupSheet}>
        <View style={styles.lineupHeader}>
          <Text style={styles.lineupTitle}>⚔️ Select 5 Players</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 16 }}>✕</Text>
          </TouchableOpacity>
        </View>
        <Text style={[Typography.body, { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm }]}>
          Choose which 5 players enter this tournament. Each pays £{fee}.
        </Text>
        <ScrollView contentContainerStyle={{ padding: Spacing.sm, gap: Spacing.xs }}>
          {members.map(m => {
            const isSelected = selected.includes(m.user_id);
            const name = memberProfiles[m.user_id] ?? 'Player';
            return (
              <TouchableOpacity
                key={m.user_id}
                onPress={() => toggle(m.user_id)}
                style={[styles.lineupRow, isSelected && styles.lineupRowSelected]}
              >
                <View style={[styles.lineupCheck, isSelected && styles.lineupCheckDone]}>
                  {isSelected && <Text style={{ color: Colors.background, fontSize: 10, fontWeight: '900' }}>✓</Text>}
                </View>
                <Text style={[styles.lineupName, isSelected && { color: Colors.accent }]}>{name}</Text>
                {isSelected && <Text style={styles.lineupFee}>£{fee}</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.lineupFooter}>
          <View>
            <Text style={[Typography.subheading, { color: selected.length === 5 ? Colors.accent : Colors.textMuted }]}>
              {selected.length}/5 selected
            </Text>
            {selected.length === 5 && (
              <Text style={[Typography.body, { color: Colors.gold }]}>Total: £{fee * 5}</Text>
            )}
          </View>
          <Button
            label="Confirm Lineup →"
            onPress={() => onConfirm(selected)}
            disabled={selected.length !== 5}
            style={{ minWidth: 140 }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ────────────────────────────────────────────
export default function TeamScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>();
  const { team, members, loading, createTeam, leaveTeam, refreshTeam } = useTeam(userId);
  const { tournaments } = useTournamentList();
  const openTournaments = tournaments.filter(t => t.status === 'open');
  const [memberProfiles, setMemberProfiles] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'chat' | 'roster' | 'stats' | 'tournaments'>('chat');

  // Creation flow
  const [step, setStep] = useState<'room' | 'name'>('room');
  const [roomCode, setRoomCode] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Room code editing
  const [editingCode, setEditingCode] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Lineup picker
  const [lineupTournamentId, setLineupTournamentId] = useState<string | null>(null);
  const [lineupFee, setLineupFee] = useState(0);
  const [joiningTournament, setJoiningTournament] = useState(false);

  // Info
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  useEffect(() => {
    if (!members.length) return;
    supabase.from('users').select('id, riot_id, username, avatar_url, status').in('id', members.map(m => m.user_id))
      .then(({ data }) => {
        if (data) setMemberProfiles(Object.fromEntries(data.map(u => [u.id, u])));
      });
  }, [members]);

  async function handleCreate() {
    if (!teamName.trim()) { setError('Team name is required'); return; }
    setCreating(true);
    const { error } = await createTeam(teamName.trim(), roomCode.trim(), roomPassword.trim() || undefined);
    if (error) { setError(error); setCreating(false); return; }
    await refreshTeam();
    setCreating(false);
  }

  async function handleEnterTournament(ids: string[]) {
    if (!team || !lineupTournamentId) return;
    setJoiningTournament(true);

    // Register team in tournament
    const { error: regError } = await supabase.from('tournament_teams')
      .insert({ tournament_id: lineupTournamentId, team_id: team.id });
    if (regError && !regError.message.includes('duplicate')) {
      setJoiningTournament(false); setLineupTournamentId(null); return;
    }

    // Save lineup
    await supabase.from('tournament_lineups').insert(
      ids.map(uid => ({ tournament_id: lineupTournamentId, team_id: team.id, user_id: uid }))
    );

    setJoiningTournament(false);
    setLineupTournamentId(null);
    setActiveTab('tournaments');
    router.push(`/tournament/${lineupTournamentId}`);
  }

  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator color={Colors.accent} style={{ flex: 1 }} /></SafeAreaView>;

  // ── No team — creation ──────────────────────────────────
  if (!team) return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <GlowText style={Typography.title}>⚔️ My Team</GlowText>
          {step === 'room' && (
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
              <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {step === 'room' ? (
          <Card style={{ gap: Spacing.md }}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNum}>Step 1 of 2</Text>
              <Text style={[Typography.subheading, { color: Colors.text }]}>Wild Rift Room Code</Text>
            </View>
            <Text style={[Typography.body, { lineHeight: 20 }]}>Create a Custom Game in Wild Rift and enter the 5-digit room code. All 10 team members use this to join.</Text>
            <Input label="Room Code * (5 digits)" placeholder="e.g. 48271" value={roomCode} onChangeText={v => setRoomCode(v.replace(/[^0-9]/g, '').slice(0, 5))} keyboardType="numeric" maxLength={5} autoCorrect={false} />
            {roomCode.length > 0 && roomCode.length < 5 && <Text style={{ color: Colors.warning, fontSize: 11 }}>{5 - roomCode.length} more digit{5 - roomCode.length !== 1 ? 's' : ''} needed</Text>}
            <Input label="Password (optional)" placeholder="Leave blank if none" value={roomPassword} onChangeText={setRoomPassword} autoCapitalize="none" />
            {error && <Text style={{ color: Colors.error, fontSize: 12 }}>{error}</Text>}
            <Button label="Next →" onPress={() => { if (!/^\d{5}$/.test(roomCode)) { setError('5 digits required'); return; } setError(null); setStep('name'); }} />
          </Card>
        ) : (
          <Card style={{ gap: Spacing.md }}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNum}>Step 2 of 2</Text>
              <Text style={[Typography.subheading, { color: Colors.text }]}>Name Your Team</Text>
            </View>
            <View style={styles.codePreview}>
              <Text style={[Typography.label, { flex: 1 }]}>Room Code</Text>
              <Text style={[Typography.mono, { color: Colors.accent, letterSpacing: 2 }]}>{roomCode}</Text>
            </View>
            <Input label="Team Name *" placeholder="e.g. Dragon Fist" value={teamName} onChangeText={setTeamName} />
            {error && <Text style={{ color: Colors.error, fontSize: 12 }}>{error}</Text>}
            <Button label="Create Team" onPress={handleCreate} loading={creating} />
            <Button label="‹ Back" variant="ghost" onPress={() => { setStep('room'); setError(null); }} />
            <Button label="Cancel" variant="ghost" onPress={() => { setStep('room'); setRoomCode(''); setRoomPassword(''); setTeamName(''); setError(null); router.back(); }} />
          </Card>
        )}

        <Card style={{ gap: Spacing.sm }}>
          <Text style={Typography.label}>Have a room code? Join a team</Text>
          <Button label="Join with Room Code" variant="secondary" onPress={() => router.push('/team/invite')} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );

  const isCaptain = team.captain_id === userId;

  // ── Team Hub ────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      {/* Team header */}
      <View style={styles.hubHeader}>
        <View style={{ flex: 1 }}>
          <GlowText style={styles.hubName}>{team.name}</GlowText>
          <Text style={[Typography.body, { fontSize: 11, marginTop: 2 }]}>{members.length}/10 members{isCaptain ? ' · Captain' : ''}</Text>
        </View>
        {team.room_code && (
          <TouchableOpacity style={styles.codeChip} onPress={async () => { await Clipboard.setStringAsync(team.room_code!); }}>
            <Text style={styles.codeChipText}>🎮 {team.room_code}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => setShowInfo(true)} style={styles.infoBtn}>
          <Text style={styles.infoBtnText}>ℹ</Text>
        </TouchableOpacity>
      </View>

      {/* Inner tabs */}
      <View style={styles.innerTabs}>
        {([['chat','💬','Chat'],['roster','⚔️','Roster'],['stats','📊','Stats'],['tournaments','🏆','Play']] as const).map(([t, emoji, label]) => (
          <TouchableOpacity key={t} style={[styles.innerTab, activeTab === t && styles.innerTabActive]} onPress={() => setActiveTab(t)}>
            <Text style={styles.innerTabEmoji}>{emoji}</Text>
            <Text style={[styles.innerTabLabel, activeTab === t && { color: Colors.accent }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>

        {/* CHAT */}
        {activeTab === 'chat' && userId && (
          <TeamChat teamId={team.id} myId={userId} memberProfiles={Object.fromEntries(Object.entries(memberProfiles).map(([k, v]) => [k, v?.riot_id ?? v?.username ?? '?']))} />
        )}

        {/* ROSTER */}
        {activeTab === 'roster' && (
          <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xxl }}>
            <Text style={Typography.label}>Roster ({members.length}/10)</Text>
            {members.map(m => {
              const p = memberProfiles[m.user_id];
              return (
                <Card key={m.user_id} style={styles.memberRow}>
                  {p?.avatar_url
                    ? <Image source={{ uri: p.avatar_url }} style={styles.memberAvatar} />
                    : <View style={[styles.memberAvatar, { backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ color: Colors.accent, fontSize: 14, fontWeight: '800' }}>{(p?.riot_id ?? p?.username ?? '?')[0]}</Text>
                      </View>
                  }
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[Typography.subheading, { fontSize: 13 }]}>{p?.riot_id ?? p?.username ?? 'Player'}</Text>
                    <StatusDot status={p?.status ?? 'offline'} size={8} showLabel />
                  </View>
                  {m.user_id === team.captain_id && <Text style={[Typography.label, { color: Colors.gold }]}>CAPTAIN</Text>}
                  {isCaptain && m.user_id !== userId && (
                    <TouchableOpacity onPress={async () => {
                      await supabase.from('team_members').delete().eq('team_id', team.id).eq('user_id', m.user_id);
                      refreshTeam();
                    }}>
                      <Text style={{ color: Colors.error, fontSize: 11 }}>Kick</Text>
                    </TouchableOpacity>
                  )}
                </Card>
              );
            })}
            {Array.from({ length: Math.max(0, 10 - members.length) }).map((_, i) => (
              <Card key={`empty-${i}`} style={[styles.memberRow, { borderStyle: 'dashed', opacity: 0.4 }]}>
                <Text style={{ fontSize: 20 }}>➕</Text>
                <Text style={Typography.body}>Invite a player...</Text>
              </Card>
            ))}
            <Button label="📨 Invite Players" variant="secondary" onPress={() => router.push('/team/invite')} />
            {/* Room code edit for captain */}
            {isCaptain && (
              <Card style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={Typography.label}>Wild Rift Room Code</Text>
                  <TouchableOpacity onPress={() => { setEditingCode(!editingCode); setNewCode(team.room_code ?? ''); setNewPassword(team.room_password ?? ''); }}>
                    <Text style={{ color: Colors.gold, fontSize: 11, fontWeight: '700' }}>{editingCode ? 'Cancel' : '✏️ Edit'}</Text>
                  </TouchableOpacity>
                </View>
                {!editingCode ? (
                  <TouchableOpacity style={styles.codeBlock} onPress={async () => { await Clipboard.setStringAsync(team.room_code ?? ''); }}>
                    <GlowText style={styles.codeText}>{team.room_code ?? '—'}</GlowText>
                    <Text style={styles.copyText}>📋 Copy</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ gap: Spacing.sm }}>
                    <Input label="New Code (5 digits)" value={newCode} onChangeText={v => setNewCode(v.replace(/[^0-9]/g, '').slice(0, 5))} keyboardType="numeric" maxLength={5} autoCorrect={false} />
                    <Input label="Password (optional)" value={newPassword} onChangeText={setNewPassword} autoCapitalize="none" />
                    <Button label="Save" disabled={newCode.length !== 5} onPress={async () => {
                      if (!/^\d{5}$/.test(newCode)) return;
                      await supabase.from('teams').update({ room_code: newCode.toUpperCase(), room_password: newPassword.trim() || null }).eq('id', team.id);
                      setEditingCode(false);
                      refreshTeam();
                    }} />
                  </View>
                )}
              </Card>
            )}
            <Button label="Leave Team" variant="ghost" onPress={leaveTeam} style={{ borderColor: Colors.error + '44', marginTop: Spacing.sm }} />
          </ScrollView>
        )}

        {/* STATS */}
        {activeTab === 'stats' && (
          <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}>
            <GlowText style={Typography.heading}>📊 Team Stats</GlowText>
            <View style={styles.statsGrid}>
              {[
                { label: 'Wins', value: (team as any).wins ?? 0, icon: '🏆', color: Colors.gold },
                { label: 'Tournaments', value: (team as any).tournaments_played ?? 0, icon: '⚔️', color: Colors.accent },
                { label: 'Earnings', value: `£${((team as any).total_earnings ?? 0).toFixed(0)}`, icon: '💰', color: Colors.success },
                { label: 'Members', value: `${members.length}/10`, icon: '👥', color: Colors.text },
              ].map(s => (
                <Card key={s.label} style={styles.statCard}>
                  <Text style={{ fontSize: 28 }}>{s.icon}</Text>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={Typography.label}>{s.label}</Text>
                </Card>
              ))}
            </View>
            <Card>
              <Text style={Typography.label}>Win Rate</Text>
              <GlowText style={[Typography.heading, { marginTop: 4 }]}>
                {(team as any).tournaments_played > 0
                  ? `${Math.round(((team as any).wins / (team as any).tournaments_played) * 100)}%`
                  : '—'}
              </GlowText>
            </Card>
          </ScrollView>
        )}

        {/* TOURNAMENTS */}
        {activeTab === 'tournaments' && (
          <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl }}>
            <GlowText style={Typography.heading}>🏆 Enter a Tournament</GlowText>
            <Text style={[Typography.body, { lineHeight: 20 }]}>
              Your team has {members.length} players. Select 5 to enter — each pays the entry fee from their wallet.
            </Text>
            {!team.room_code && (
              <Card style={{ borderColor: Colors.error + '55' }}>
                <Text style={{ color: Colors.error, fontSize: 12, fontWeight: '700' }}>⚠️ Set a room code first in the Roster tab before entering tournaments.</Text>
              </Card>
            )}
            {openTournaments.length === 0 ? (
              <Card style={{ alignItems: 'center', gap: Spacing.sm }}>
                <Text style={{ fontSize: 32 }}>🏆</Text>
                <Text style={[Typography.subheading, { textAlign: 'center' }]}>No open tournaments</Text>
                <Text style={[Typography.body, { textAlign: 'center' }]}>Check back soon</Text>
              </Card>
            ) : (
              openTournaments.map(t => (
                <Card key={t.id} style={{ gap: Spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.subheading, { color: Colors.text }]}>{t.name}</Text>
                      <Text style={[Typography.body, { fontSize: 11, marginTop: 2 }]}>£{t.entry_fee_per_player}/player · Prize pool £{(t.entry_fee_per_player * 5 * t.max_teams * 0.9).toFixed(0)}</Text>
                    </View>
                    <GlowText style={{ color: Colors.gold, fontWeight: '900' }}>£{t.entry_fee_per_player * 5}</GlowText>
                  </View>
                  <Button
                    label={team.room_code ? 'Select 5 Players →' : 'Set room code first'}
                    onPress={() => { if (!team.room_code) return; setLineupFee(t.entry_fee_per_player); setLineupTournamentId(t.id); }}
                    disabled={!team.room_code}
                    loading={joiningTournament && lineupTournamentId === t.id}
                  />
                </Card>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* Lineup picker modal */}
      {lineupTournamentId && (
        <LineupPicker
          visible={!!lineupTournamentId}
          members={members}
          memberProfiles={Object.fromEntries(Object.entries(memberProfiles).map(([k, v]) => [k, v?.riot_id ?? v?.username ?? '?']))}
          fee={lineupFee}
          onConfirm={handleEnterTournament}
          onClose={() => setLineupTournamentId(null)}
        />
      )}

      <RoomCodeInfo visible={showInfo} onClose={() => setShowInfo(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  stepHeader: { gap: 2 },
  stepNum: { fontSize: 10, fontWeight: '700', color: Colors.accent, letterSpacing: 1, textTransform: 'uppercase' },
  codePreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderWidth: 1, borderColor: Colors.accentBorder },

  // Hub
  hubHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.accentBorder, backgroundColor: 'rgba(8,14,24,0.8)' },
  hubName: { fontSize: 20, fontWeight: '900' },
  codeChip: { backgroundColor: Colors.accentDim, borderRadius: 8, borderWidth: 1, borderColor: Colors.accentBorder, paddingHorizontal: 8, paddingVertical: 4 },
  codeChipText: { color: Colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  infoBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: Colors.accentBorder, alignItems: 'center', justifyContent: 'center' },
  infoBtnText: { color: Colors.accent, fontSize: 12, fontWeight: '800' },

  innerTabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.accentBorder, backgroundColor: 'rgba(8,14,24,0.6)' },
  innerTab: { flex: 1, alignItems: 'center', paddingVertical: 6, gap: 2 },
  innerTabActive: { borderBottomWidth: 2, borderBottomColor: Colors.accent },
  innerTabEmoji: { fontSize: 16 },
  innerTabLabel: { fontSize: 9, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5 },

  // Chat
  chatRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-end' },
  chatRowMe: { flexDirection: 'row-reverse' },
  chatAvatar: { width: 28, height: 28, borderRadius: 6, borderWidth: 1, borderColor: Colors.accentBorder },
  chatName: { fontSize: 10, color: Colors.textMuted, marginBottom: 2, marginLeft: 4 },
  chatBubble: { maxWidth: '80%', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  chatBubbleMe: { backgroundColor: Colors.accent, borderBottomRightRadius: 3 },
  chatBubbleThem: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.accentBorder, borderBottomLeftRadius: 3 },
  chatText: { fontSize: 13, color: Colors.text, lineHeight: 18 },
  chatTime: { fontSize: 9, color: Colors.textDim, marginTop: 2, marginHorizontal: 4 },
  chatInput: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, padding: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.accentBorder, backgroundColor: 'rgba(8,14,24,0.95)' },
  chatTextInput: { flex: 1, minHeight: 40, maxHeight: 100, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.accentBorder, paddingHorizontal: Spacing.sm, paddingVertical: 8, color: Colors.text, fontSize: 13 },
  chatSendBtn: { width: 40, height: 40, borderRadius: Radius.md, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },

  // Roster
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm },
  memberAvatar: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: Colors.accentBorder },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statCard: { width: '47%', alignItems: 'center', gap: 4, padding: Spacing.md },
  statValue: { fontSize: 24, fontWeight: '900' },

  // Room code
  codeBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,200,255,0.05)', borderRadius: 10, borderWidth: 1, borderColor: Colors.accentBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  codeText: { fontSize: 22, fontWeight: '900', letterSpacing: 5 },
  copyText: { color: Colors.accent, fontSize: 11, fontWeight: '700' },

  // Lineup picker
  lineupBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 99 },
  lineupSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(10,16,26,0.99)', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTopWidth: 1, borderTopColor: Colors.accentBorder, maxHeight: '80%', zIndex: 100 },
  lineupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.accentBorder },
  lineupTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  lineupRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: 10, borderWidth: 1, borderColor: Colors.accentBorder, backgroundColor: Colors.surface },
  lineupRowSelected: { borderColor: Colors.accent, backgroundColor: 'rgba(0,200,255,0.08)' },
  lineupCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: Colors.accentBorder, alignItems: 'center', justifyContent: 'center' },
  lineupCheckDone: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  lineupName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  lineupFee: { fontSize: 12, color: Colors.gold, fontWeight: '700' },
  lineupFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.accentBorder },

  // Info modal
  infoBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  infoCard: { position: 'absolute', left: '5%', right: '5%', top: '25%', backgroundColor: 'rgba(10,16,28,0.98)', borderRadius: 16, borderWidth: 1, borderColor: Colors.accentBorder, padding: Spacing.lg, gap: Spacing.sm },
  infoTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  infoStep: { fontSize: 13, color: Colors.textMuted, lineHeight: 22 },
  infoDismiss: { marginTop: Spacing.sm, alignItems: 'center', paddingVertical: 10, borderRadius: 8, backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: Colors.accentBorder },
});
