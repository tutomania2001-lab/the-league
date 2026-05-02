import { supabase } from '@/lib/supabase';
import { UserRow } from '@/types/database';
import { useEffect, useRef, useState } from 'react';

// Global cache and listeners — all useProfile instances share state
const cache: Record<string, UserRow> = {};
const listeners: Record<string, Set<(p: UserRow) => void>> = {};

function broadcast(userId: string, profile: UserRow) {
  cache[userId] = profile;
  listeners[userId]?.forEach(fn => fn(profile));
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserRow | null>(
    userId ? cache[userId] ?? null : null
  );
  const [loading, setLoading] = useState(!userId || !cache[userId]);
  const [error, setError] = useState<string | null>(null);
  const setRef = useRef(setProfile);
  setRef.current = setProfile;

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    // Subscribe so any updateProfile call (from any screen) updates this instance
    if (!listeners[userId]) listeners[userId] = new Set();
    const handler = (p: UserRow) => setRef.current(p);
    listeners[userId].add(handler);

    // Show cached value instantly
    if (cache[userId]) {
      setProfile(cache[userId]);
      setLoading(false);
    }

    // Fetch fresh from Supabase in background
    supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else if (data) broadcast(userId, data);
        setLoading(false);
      });

    return () => { listeners[userId]?.delete(handler); };
  }, [userId]);

  async function updateProfile(updates: Partial<Pick<UserRow, 'username' | 'riot_id' | 'avatar_url'>>) {
    if (!userId || !cache[userId]) return { error: 'Not ready' };

    // Broadcast optimistic update to ALL screens using this profile
    broadcast(userId, { ...cache[userId], ...updates });

    // Sync to Supabase in background
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (!error && data) broadcast(userId, data);
    return { error: error?.message ?? null };
  }

  async function refreshProfile() {
    if (!userId) return;
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    if (data) broadcast(userId, data);
  }

  return { profile, loading, error, updateProfile, refreshProfile };
}
