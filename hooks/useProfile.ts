import { supabase } from '@/lib/supabase';
import { UserRow } from '@/types/database';
import { useEffect, useState } from 'react';

// Module-level cache — persists across screen navigations
const cache: Record<string, UserRow> = {};

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserRow | null>(
    userId ? cache[userId] ?? null : null
  );
  const [loading, setLoading] = useState(!userId || !cache[userId]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    // If cached, show immediately and refresh in background
    if (cache[userId]) {
      setProfile(cache[userId]);
      setLoading(false);
    }

    supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error) { setError(error.message); }
        else if (data) {
          cache[userId] = data;
          setProfile(data);
        }
        setLoading(false);
      });
  }, [userId]);

  async function updateProfile(updates: Partial<Pick<UserRow, 'username' | 'riot_id' | 'avatar_url'>>) {
    if (!userId) return { error: 'Not authenticated' };

    // Optimistic update — instant
    const optimistic = { ...profile!, ...updates };
    cache[userId] = optimistic;
    setProfile(optimistic);

    // Background sync to Supabase
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (!error && data) {
      cache[userId] = data;
      setProfile(data);
    }

    return { error: error?.message ?? null };
  }

  return { profile, loading, error, updateProfile };
}
