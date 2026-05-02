import { supabase } from '@/lib/supabase';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function usePresence(userId: string | undefined) {
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    if (!userId) return;

    async function setStatus(status: 'online' | 'offline' | 'away') {
      const id = userIdRef.current;
      if (!id) return;
      const { error } = await supabase
        .from('users')
        .update({ status, last_seen: new Date().toISOString() })
        .eq('id', id);
      if (error) console.log('Presence update error:', error.message);
    }

    // Go online immediately
    setStatus('online');

    // Heartbeat every 20s to keep online status fresh
    const heartbeat = setInterval(() => setStatus('online'), 20000);

    function handleAppState(nextState: AppStateStatus) {
      if (nextState === 'active') setStatus('online');
      else setStatus('away');
    }

    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      sub.remove();
      clearInterval(heartbeat);
      setStatus('offline');
    };
  }, [userId]);
}
