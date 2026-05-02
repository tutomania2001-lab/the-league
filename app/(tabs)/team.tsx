import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { GlowText } from '@/components/ui/GlowText';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useTeam } from '@/hooks/useTeam';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Wild Rift Info Tooltip ─────────────────────────────────
function RoomCodeInfo({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.infoBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🎮 How to join the match</Text>
        {[
          '1. Open Wild Rift on your device',
          '2. Tap Play → Custom Game',
          '3. Tap Join Game',
          '4. Paste the Room Code shown here',
          '5. Enter the password if shown',
          '6. Ready up and wait for the match to start',
        ].map((step, i) => (
          <Text key={i} style={styles.infoStep}>{step}</Text>
        ))}
        <TouchableOpacity style={styles.infoDismiss} onPress={onClose}>
          <Text style={{ color: Colors.accent, fontWeight: '700', fontSize: 13 }}>Got it</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ── Room Code Display Card ─────────────────────────────────
function RoomCodeCard({ code, password }: { code: string; password?: string }) {
  const [copied, setCopied] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  async function copyCode() {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Card glow style={styles.roomCard}>
        <View style={styles.roomHeader}>
          <Text style={Typography.label}>🎮 Wild Rift Room Code</Text>
          <TouchableOpacity onPress={() => setShowInfo(true)} style={styles.infoBtn}>
            <Text style={styles.infoBtnText}>ℹ</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={copyCode} activeOpacity={0.8} style={styles.codeBlock}>
          <GlowText style={styles.codeText}>{code}</GlowText>
          <View style={[styles.copyBadge, copied && styles.copyBadgeDone]}>
            <Text style={styles.copyBadgeText}>{copied ? '✓ Copied!' : '📋 Copy'}</Text>
          </View>
        </TouchableOpacity>

        {password && (
          <View style={styles.passwordRow}>
            <Text style={[Typography.label, { flex: 1 }]}>Password</Text>
            <Text style={[Typography.mono, { letterSpacing: 2 }]}>{password}</Text>
          </View>
        )}

        <Text style={[Typography.body, { fontSize: 11, opacity: 0.6 }]}>
          Tap the code to copy · Paste in Wild Rift → Custom Game → Join
        </Text>
      </Card>
      <RoomCodeInfo visible={showInfo} onClose={() => setShowInfo(false)} />
    </>
  );
}

// ── Main screen ────────────────────────────────────────────
export default function TeamScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>();
  const { team, members, loading, createTeam, leaveTeam, refreshTeam } = useTeam(userId);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, string>>({});

  // Step 1: room code, Step 2: team name
  const [step, setStep] = useState<'room' | 'name'>('room');
  const [roomCode, setRoomCode] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id));
  }, []);

  useEffect(() => {
    if (!members.length) return;
    supabase.from('users').select('id, riot_id, username').in('id', members.map(m => m.user_id))
      .then(({ data }) => {
        if (data) setMemberProfiles(Object.fromEntries(data.map(u => [u.id, u.riot_id ?? u.username ?? 'Unknown'])));
      });
  }, [members]);

  async function handleCreate() {
    if (!teamName.trim()) { setError('Team name is required'); return; }
    setCreating(true);
    const { error } = await createTeam(
      teamName.trim(),
      roomCode.trim(),
      roomPassword.trim() || undefined,
    );
    if (error) { setError(error); setCreating(false); return; }
    // Re-fetch so the team state includes room_code from DB
    await refreshTeam();
    setCreating(false);
  }

  if (loading) return <SafeAreaView style={styles.safe}><ActivityIndicator color={Colors.accent} style={{ flex: 1 }} /></SafeAreaView>;

  // ── No team — creation flow ────────────────────────────
  if (!team) return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <GlowText style={Typography.title}>⚔️ My Team</GlowText>
          {step === 'room' && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 8 }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {step === 'room' ? (
          /* Step 1 — Wild Rift Room Code */
          <Card style={{ gap: Spacing.md }}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNum}>Step 1 of 2</Text>
              <Text style={[Typography.subheading, { color: Colors.text }]}>Wild Rift Room Code</Text>
            </View>
            <Text style={[Typography.body, { lineHeight: 20 }]}>
              Open Wild Rift, create a Custom Game room, and paste your room code here. Your team will use this to join your private match.
            </Text>
            <Input
              label="Room Code * (5 digits)"
              placeholder="e.g. 48271"
              value={roomCode}
              onChangeText={v => setRoomCode(v.replace(/[^0-9]/g, '').slice(0, 5))}
              keyboardType="numeric"
              maxLength={5}
              autoCorrect={false}
            />
            {roomCode.length > 0 && roomCode.length < 5 && (
              <Text style={{ color: Colors.warning, fontSize: 11 }}>
                {5 - roomCode.length} more digit{5 - roomCode.length !== 1 ? 's' : ''} needed
              </Text>
            )}
            <Input
              label="Room Password (optional)"
              placeholder="Leave blank if none"
              value={roomPassword}
              onChangeText={setRoomPassword}
              autoCapitalize="none"
            />
            <Button
              label="Next →"
              onPress={() => {
                if (!roomCode.trim()) { setError('Room code is required'); return; }
                if (!/^\d{5}$/.test(roomCode)) { setError('Room code must be exactly 5 digits (0–9)'); return; }
                setError(null);
                setStep('name');
              }}
            />
            {error && <Text style={{ color: Colors.error, fontSize: 12 }}>{error}</Text>}
          </Card>
        ) : (
          /* Step 2 — Team Name */
          <Card style={{ gap: Spacing.md }}>
            <View style={styles.stepHeader}>
              <Text style={styles.stepNum}>Step 2 of 2</Text>
              <Text style={[Typography.subheading, { color: Colors.text }]}>Name Your Team</Text>
            </View>
            <View style={styles.codePreview}>
              <Text style={[Typography.label, { flex: 1 }]}>Room Code</Text>
              <Text style={[Typography.mono, { color: Colors.accent, letterSpacing: 2 }]}>{roomCode}</Text>
            </View>
            <Input
              label="Team Name *"
              placeholder="e.g. Dragon Fist"
              value={teamName}
              onChangeText={setTeamName}
            />
            {error && <Text style={{ color: Colors.error, fontSize: 12 }}>{error}</Text>}
            <Button label="Create Team" onPress={handleCreate} loading={creating} />
            <Button label="‹ Back" variant="ghost" onPress={() => { setStep('room'); setError(null); }} />
            <Button label="Cancel" variant="ghost" onPress={() => { setStep('room'); setRoomCode(''); setRoomPassword(''); setTeamName(''); setError(null); router.back(); }} />
          </Card>
        )}

        <Card style={{ gap: Spacing.sm }}>
          <Text style={Typography.label}>Already have an invite code?</Text>
          <Button label="Join with Invite Code" variant="secondary" onPress={() => router.push('/team/invite')} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );

  // ── Has team ──────────────────────────────────────────
  const isCaptain = team.captain_id === userId;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <GlowText style={Typography.title}>{team.name}</GlowText>
        <Text style={[Typography.body, { marginTop: 2 }]}>
          {members.length}/5 players{isCaptain ? ' · Captain' : ''}
        </Text>

        {/* Room code — required to enter tournaments */}
        {team.room_code ? (
          <RoomCodeCard code={team.room_code} password={team.room_password} />
        ) : isCaptain ? (
          <Card style={{ gap: Spacing.sm, borderColor: Colors.error + '55' }}>
            <Text style={{ color: Colors.error, fontWeight: '700', fontSize: 13 }}>
              ⚠️ No Wild Rift Room Code Set
            </Text>
            <Text style={[Typography.body, { fontSize: 12 }]}>
              You must set a room code before entering any tournament.
            </Text>
            <Input
              label="Wild Rift Room Code * (5 digits)"
              placeholder="e.g. 48271"
              value={roomCode}
              onChangeText={v => setRoomCode(v.replace(/[^0-9]/g, '').slice(0, 5))}
              keyboardType="numeric"
              maxLength={5}
              autoCorrect={false}
            />
            <Input
              label="Password (optional)"
              placeholder="Leave blank if none"
              value={roomPassword}
              onChangeText={setRoomPassword}
              autoCapitalize="none"
            />
            {roomCode.length > 0 && roomCode.length < 5 && (
              <Text style={{ color: Colors.warning, fontSize: 11 }}>
                {5 - roomCode.length} more digit{5 - roomCode.length !== 1 ? 's' : ''} needed
              </Text>
            )}
            <Button
              label="Save Room Code"
              disabled={roomCode.length !== 5}
              onPress={async () => {
                if (!/^\d{5}$/.test(roomCode)) return;
                const { error } = await supabase.from('teams').update({
                  room_code: roomCode.trim().toUpperCase(),
                  room_password: roomPassword.trim() || null,
                }).eq('id', team.id);
                if (!error) {
                  setRoomCode('');
                  setRoomPassword('');
                  await refreshTeam(); // Reload team to show new code
                }
              }}
            />
          </Card>
        ) : (
          <Card style={{ borderColor: Colors.error + '44' }}>
            <Text style={[Typography.body, { color: Colors.error, fontSize: 12 }]}>
              ⚠️ Captain hasn't set a Wild Rift room code yet. Tournament entry is blocked.
            </Text>
          </Card>
        )}

        {/* App invite code */}
        <Card style={{ gap: Spacing.xs }}>
          <Text style={Typography.label}>App Invite Code</Text>
          <GlowText style={[Typography.heading, { letterSpacing: 5 }]}>{team.invite_code}</GlowText>
          <Text style={[Typography.body, { fontSize: 11 }]}>Share with teammates to join The League team</Text>
        </Card>

        {/* Roster */}
        <View style={{ gap: Spacing.xs }}>
          <Text style={Typography.label}>Roster ({members.length}/5)</Text>
          {members.map(m => (
            <Card key={m.user_id} style={styles.memberRow}>
              <Text style={{ fontSize: 20 }}>🎮</Text>
              <Text style={[Typography.subheading, { flex: 1 }]}>{memberProfiles[m.user_id] ?? '...'}</Text>
              {m.user_id === team.captain_id && (
                <Text style={[Typography.label, { color: Colors.gold }]}>CAPTAIN</Text>
              )}
            </Card>
          ))}
          {Array.from({ length: Math.max(0, 5 - members.length) }).map((_, i) => (
            <Card key={`empty-${i}`} style={[styles.memberRow, { borderStyle: 'dashed', opacity: 0.4 }]}>
              <Text style={{ fontSize: 20 }}>➕</Text>
              <Text style={Typography.body}>Waiting for player...</Text>
            </Card>
          ))}
        </View>

        <Button label="📨 Invite / Join" variant="secondary" onPress={() => router.push('/team/invite')} />
        <Button label="Leave Team" variant="ghost" onPress={leaveTeam} style={{ borderColor: Colors.error + '44' }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xxl },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm },

  stepHeader: { gap: 2 },
  stepNum: { fontSize: 10, fontWeight: '700', color: Colors.accent, letterSpacing: 1, textTransform: 'uppercase' },

  codePreview: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt, borderRadius: 8,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    borderWidth: 1, borderColor: Colors.accentBorder,
  },

  // Room code card
  roomCard: { gap: Spacing.sm },
  roomHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: Colors.accentBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  infoBtnText: { color: Colors.accent, fontSize: 12, fontWeight: '800' },
  codeBlock: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(0,200,255,0.05)', borderRadius: 10,
    borderWidth: 1, borderColor: Colors.accentBorder,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  codeText: { fontSize: 22, fontWeight: '900', letterSpacing: 5 },
  copyBadge: {
    backgroundColor: Colors.accentDim, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.accent + '66',
  },
  copyBadgeDone: { backgroundColor: 'rgba(0,255,136,0.12)', borderColor: Colors.success + '66' },
  copyBadgeText: { color: Colors.accent, fontSize: 11, fontWeight: '700' },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt, borderRadius: 6,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },

  // Info modal
  infoBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  infoCard: {
    position: 'absolute', left: '5%', right: '5%', top: '25%',
    backgroundColor: 'rgba(10,16,28,0.98)',
    borderRadius: 16, borderWidth: 1, borderColor: Colors.accentBorder,
    padding: Spacing.lg, gap: Spacing.sm,
  },
  infoTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  infoStep: { fontSize: 13, color: Colors.textMuted, lineHeight: 22 },
  infoDismiss: {
    marginTop: Spacing.sm, alignItems: 'center',
    paddingVertical: 10, borderRadius: 8,
    backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: Colors.accentBorder,
  },
});
