import { Colors } from '@/constants/theme';
import { StyleSheet, Text, View } from 'react-native';

export type UserStatus = 'online' | 'in_game' | 'away' | 'offline';

export const STATUS_CONFIG: Record<UserStatus, { color: string; label: string; icon: string }> = {
  online:  { color: '#00e676', label: 'Online',  icon: '●' },
  in_game: { color: Colors.accent, label: 'In Game', icon: '⚔' },
  away:    { color: '#ffab00', label: 'Away',    icon: '◐' },
  offline: { color: '#546e7a', label: 'Offline', icon: '○' },
};

type Props = { status: UserStatus; size?: number; showLabel?: boolean };

export function StatusDot({ status, size = 10, showLabel = false }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.offline;
  return (
    <View style={styles.row}>
      <View style={[
        styles.dot,
        {
          width: size, height: size, borderRadius: size,
          backgroundColor: cfg.color,
          shadowColor: cfg.color, shadowOpacity: status !== 'offline' ? 0.8 : 0, shadowRadius: size * 0.6,
        },
      ]} />
      {showLabel && <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { shadowOffset: { width: 0, height: 0 } },
  label: { fontSize: 11, fontWeight: '600' },
});
