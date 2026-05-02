import { supabase } from '@/lib/supabase';
import { UserRow } from '@/types/database';
import { useEffect, useState } from 'react';

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setProfile(data);
        setLoading(false);
      });

    const sub = supabase
      .channel(`profile:${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
        (payload) => setProfile(payload.new as UserRow)
      ).subscribe();

    return () => { sub.unsubscribe(); };
  }, [userId]);

  async function updateProfile(updates: Partial<Pick<UserRow, 'username' | 'riot_id'>>) {
    if (!userId) return { error: 'Not authenticated' };
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (!error && data) setProfile(data);
    return { error: error?.message ?? null };
  }

  return { profile, loading, error, updateProfile };
}
