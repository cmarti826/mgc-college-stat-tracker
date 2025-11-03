// lib/useProfile.ts

"use client";

import { createBrowserSupabase } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export type Role = "admin" | "coach" | "player";

interface Profile {
  loading: boolean;
  role: Role | null;
  playerId: string | null;
  error: Error | null; // ← ADD THIS
}

export function useProfile(): Profile {
  const [profile, setProfile] = useState<Profile>({
    loading: true,
    role: null,
    playerId: null,
    error: null, // ← ADD THIS
  });

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      try {
        const supabase = createBrowserSupabase();

        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) {
          if (isMounted) {
            setProfile({ loading: false, role: null, playerId: null, error: null });
          }
          return;
        }

        const { data: link, error: linkError } = await supabase
          .from("user_players")
          .select("player_id")
          .eq("user_id", authData.user.id)
          .maybeSingle();

        if (linkError && linkError.code !== "PGRST116") throw linkError;
        if (!link?.player_id) {
          if (isMounted) {
            setProfile({ loading: false, role: null, playerId: null, error: null });
          }
          return;
        }

        const { data: player, error: playerError } = await supabase
          .from("players")
          .select("id")
          .eq("id", link.player_id)
          .single();

        if (playerError) throw playerError;

        const { data: membership, error: membershipError } = await supabase
          .from("team_members")
          .select("role")
          .eq("player_id", player.id)
          .maybeSingle();

        if (membershipError && membershipError.code !== "PGRST116") throw membershipError;

        const role = (membership?.role as Role | undefined) ?? "player";

        if (isMounted) {
          setProfile({
            loading: false,
            role,
            playerId: player.id,
            error: null,
          });
        }
      } catch (err) {
        if (isMounted) {
          setProfile((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err : new Error("Failed to load profile"),
          }));
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  return profile;
}