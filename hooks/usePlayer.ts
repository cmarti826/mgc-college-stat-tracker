// hooks/usePlayer.ts

"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";

export interface UsePlayerResult {
  userId: string | null;
  playerId: string | null;
  loading: boolean;
  error: string | null;
}

export function usePlayer(): UsePlayerResult {
  const [state, setState] = useState<UsePlayerResult>({
    userId: null,
    playerId: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchPlayer = async () => {
      try {
        const supabase = createBrowserSupabase();

        // 1. Get current user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!user) {
          if (isMounted) {
            setState({
              userId: null,
              playerId: null,
              loading: false,
              error: null,
            });
          }
          return;
        }

        // 2. Get player link
        const { data: link, error: linkError } = await supabase
          .from("mgc.user_players")
          .select("player_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (linkError && linkError.code !== "PGRST116") {
          throw linkError; // PGRST116 = no rows → not an error
        }

        if (isMounted) {
          setState({
            userId: user.id,
            playerId: link?.player_id ?? null,
            loading: false,
            error: null,
          });
        }
      } catch (err: any) {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err?.message ?? "Failed to load player profile",
          }));
        }
      }
    };

    fetchPlayer();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}