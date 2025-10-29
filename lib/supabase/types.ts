// lib/supabase/types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  mgc: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone: string | null
          is_admin: boolean
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone?: string | null
          is_admin?: boolean
          created_at?: string
        }
        Update: {
          full_name?: string | null
          phone?: string | null
          is_admin?: boolean
          created_at?: string
        }
      }
      // ... all other mgc tables (teams, scheduled_rounds, etc.)
    }
    Views: {}
    Functions: {}
  }
}