import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function usePresence(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return;

    async function setStatus(status: 'online' | 'offline' | 'away') {
      await supabase.from('users').update({ status, last_seen: new Date().toISOString() }).eq('id', userId!);
    }

    // Go online immediately
    setStatus('online');

    // Watch app state changes
    function handleAppState(nextState: AppStateStatus) {
      if (nextState === 'active') setStatus('online');
      else if (nextState === 'background' || nextState === 'inactive') setStatus('away');
    }

    const sub = AppState.addEventListener('change', handleAppState);

    // Go offline when hook unmounts (logout/app close)
    return () => {
      sub.remove();
      setStatus('offline');
    };
  }, [userId]);
}
