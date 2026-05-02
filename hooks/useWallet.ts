import { supabase } from '@/lib/supabase';
import { TransactionRow } from '@/types/database';
import { useEffect, useState } from 'react';

export function useWallet(userId: string | undefined) {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetch(uid: string) {
    const [u, t] = await Promise.all([
      supabase.from('users').select('wallet_balance').eq('id', uid).single(),
      supabase.from('transactions').select('*').eq('user_id', uid)
        .order('created_at', { ascending: false }).limit(30),
    ]);
    if (u.data) setBalance(u.data.wallet_balance);
    if (t.data) setTransactions(t.data);
    setLoading(false);
  }

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(userId);
  }, [userId]);

  async function refresh() {
    if (!userId) return;
    fetch(userId);
  }

  async function topUp(amountCents: number): Promise<{ clientSecret: string | null; error: string | null }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { clientSecret: null, error: 'Not authenticated' };
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount: amountCents }),
      });
      const json = await res.json();
      return { clientSecret: json.clientSecret ?? null, error: json.error ?? null };
    } catch (e) {
      return { clientSecret: null, error: 'Network error' };
    }
  }

  return { balance, transactions, loading, topUp, refresh };
}
