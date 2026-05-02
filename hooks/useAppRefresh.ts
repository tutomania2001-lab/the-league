import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// Global listeners — any hook can subscribe to be refreshed on foreground
const listeners = new Set<() => void>();

export function notifyRefresh() {
  listeners.forEach(fn => fn());
}

// Call this in any hook to auto-refresh when app comes to foreground
export function useAppRefresh(onRefresh: () => void) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const handler = () => onRefreshRef.current();
    listeners.add(handler);

    const appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') onRefreshRef.current();
    });

    return () => {
      listeners.delete(handler);
      appStateSub.remove();
    };
  }, []);
}
