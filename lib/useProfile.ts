// lib/useProfile.ts
"use client";

import { createBrowserSupabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export type Role = "admin" | "coach" | "player";

interface Profile {
  loading: boolean;
  role: Role | null;
  playerId: string | null;
}

export function useProfile(): Profile {
  const [profile, setProfile] = useState<Profile>({
    loading: true,
    role: null,
    playerId: null,
  });

  useEffect(() => {
    const supabase = createBrowserSupabase();

    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile({ loading: false, role: null, playerId: null });
        return;
      }

      const { data: link } = await supabase
        .from("mgc.user_players")
        .select("player_id")
        .eq("user_id", user.id)
        .single();

      if (!link?.player_id) {
        setProfile({ loading: false, role: null, playerId: null });
        return;
      }

      const { data: player } = await supabase
        .from("mgc.players")
        .select("id")
        .eq("id", link.player_id)
        .single();

      if (!player) {
        setProfile({ loading: false, role: null, playerId: null });
        return;
      }

      // Check team membership for role
      const { data: membership } = await supabase
        .from("team_members")
        .select("role")
        .eq("player_id", player.id)
        .single();

      const role = membership?.role as Role | null;

      setProfile({
        loading: false,
        role: role || "player",
        playerId: player.id,
      });
    };

    fetchProfile();
  }, []);

  return profile;
}