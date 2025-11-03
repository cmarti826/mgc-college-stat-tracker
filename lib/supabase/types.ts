// lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          full_name?: string | null;
          phone?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
      };

      courses: {
        Row: {
          id: string;
          name: string;
          city: string | null;
          state: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          city?: string | null;
          state?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          city?: string | null;
          state?: string | null;
          created_at?: string;
        };
      };

      holes: {
        Row: {
          id: string;
          course_id: string;
          number: number;
          par: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          number: number;
          par: number;
          created_at?: string;
        };
        Update: {
          number?: number;
          par?: number;
          created_at?: string;
        };
      };

      players: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          full_name: string;
          grad_year: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          full_name?: string;
          grad_year?: number | null;
          created_at?: string;
        };
        Update: {
          first_name?: string;
          last_name?: string;
          full_name?: string;
          grad_year?: number | null;
          created_at?: string;
        };
      };

      tee_sets: {
        Row: {
          id: string;
          course_id: string;
          name: string;
          rating: number | null;
          slope: number | null;
          par: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          name: string;
          rating?: number | null;
          slope?: number | null;
          par?: number | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          rating?: number | null;
          slope?: number | null;
          par?: number | null;
          created_at?: string;
        };
      };

      teams: {
        Row: {
          id: string;
          name: string;
          school: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          school?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          school?: string | null;
          created_at?: string;
        };
      };

      team_members: {
        Row: {
          id: string;
          team_id: string;
          player_id: string;
          role: "admin" | "coach" | "player";
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          player_id: string;
          role?: "admin" | "coach" | "player";
          created_at?: string;
        };
        Update: {
          role?: "admin" | "coach" | "player";
          created_at?: string;
        };
      };

      user_players: {
        Row: {
          user_id: string;
          player_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          player_id: string;
          created_at?: string;
        };
        Update: {
          created_at?: string;
        };
      };

      scheduled_rounds: {
        Row: {
          id: string;
          player_id: string;
          course_id: string;
          tee_set_id: string;
          round_date: string;
          name: string | null;
          notes: string | null;
          status: "scheduled" | "in_progress" | "completed";
          type: "PRACTICE" | "QUALIFYING" | "TOURNAMENT";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          course_id: string;
          tee_set_id: string;
          round_date: string;
          name?: string | null;
          notes?: string | null;
          status?: "scheduled" | "in_progress" | "completed";
          type?: "PRACTICE" | "QUALIFYING" | "TOURNAMENT";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          round_date?: string;
          name?: string | null;
          notes?: string | null;
          status?: "scheduled" | "in_progress" | "completed";
          type?: "PRACTICE" | "QUALIFYING" | "TOURNAMENT";
          updated_at?: string;
        };
      };

      round_holes: {
        Row: {
          round_id: string;
          hole_number: number;
          par: number;
          yards: number | null;
          strokes: number | null;
          putts: number | null;
          fir: boolean | null;
          gir: boolean | null;
          up_down: boolean | null;
          sand_save: boolean | null;
          penalty: boolean | null;
        };
        Insert: {
          round_id: string;
          hole_number: number;
          par: number;
          yards?: number | null;
          strokes?: number | null;
          putts?: number | null;
          fir?: boolean | null;
          gir?: boolean | null;
          up_down?: boolean | null;
          sand_save?: boolean | null;
          penalty?: boolean | null;
        };
        Update: {
          par?: number;
          yards?: number | null;
          strokes?: number | null;
          putts?: number | null;
          fir?: boolean | null;
          gir?: boolean | null;
          up_down?: boolean | null;
          sand_save?: boolean | null;
          penalty?: boolean | null;
        };
      };
    };

    Views: {};
    Functions: {};
  };
}