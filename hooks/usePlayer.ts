'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Result = {
  userId: string | null;
  playerId: string | null;
  loading: boolean;
  error: string | null;
};

export function usePlayer(): Result {
  const supabase = createClient();
  const [state, setState] = useState<Result>({
    userId: null,
    playerId: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const { data: { user }, error: uerr } = await supabase.auth.getUser();
        if (uerr) throw uerr;
        if (!user) {
          if (!ignore) setState({ userId: null, playerId: null, loading: false, error: null });
          return;
        }
        const { data, error } = await supabase
          .from('user_players')
          .select('player_id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (error) throw error;
        if (!ignore) {
          setState({
            userId: user.id,
            playerId: data?.player_id ?? null,
            loading: false,
            error: null,
          });
        }
      } catch (e: any) {
        if (!ignore) setState((s) => ({ ...s, loading: false, error: e?.message ?? 'Error' }));
      }
    })();

    return () => {
      ignore = true;
    };
  }, [supabase]);

  return state;
}
