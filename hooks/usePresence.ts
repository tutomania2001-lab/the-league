import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { AppState } from 'react-native';

export function usePresence(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    async function ping() {
      await supabase.from('users')
        .update({ last_seen: new Date().toISOString(), status: 'online' })
        .eq('id', userId!);
    }

    // Ping immediately and every 30s while active
    ping();
    const interval = setInterval(ping, 30000);

    // On background set away, on foreground set online
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') ping();
      else supabase.from('users').update({ status: 'away', last_seen: new Date().toISOString() }).eq('id', userId!);
    });

    return () => {
      clearInterval(interval);
      sub.remove();
      // Best-effort offline on unmount
      supabase.from('users').update({ status: 'offline', last_seen: new Date().toISOString() }).eq('id', userId!);
    };
  }, [userId]);
}

// Compute status from last_seen timestamp — used in UI
export function getStatusFromLastSeen(lastSeen: string | null, currentStatus: string): string {
  if (!lastSeen) return 'offline';
  const diff = Date.now() - new Date(lastSeen).getTime();
  if (diff < 90000) return currentStatus === 'away' ? 'away' : 'online'; // < 1.5 min
  if (diff < 300000) return 'away';   // < 5 min
  return 'offline';
}
