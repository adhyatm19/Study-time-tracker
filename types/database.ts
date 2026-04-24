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
          display_name: string | null;
          group_code: string | null;
          preferred_bgm: "white-noise" | "fireplace" | "rain" | "off";
          default_focus_minutes: number;
          default_break_minutes: number;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          group_code?: string | null;
          preferred_bgm?: "white-noise" | "fireplace" | "rain" | "off";
          default_focus_minutes?: number;
          default_break_minutes?: number;
          created_at?: string;
        };
        Update: {
          display_name?: string | null;
          group_code?: string | null;
          preferred_bgm?: "white-noise" | "fireplace" | "rain" | "off";
          default_focus_minutes?: number;
          default_break_minutes?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          started_at: string;
          ended_at: string;
          duration_seconds: number;
          mode: "stopwatch" | "pomodoro";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          started_at: string;
          ended_at: string;
          duration_seconds: number;
          mode: "stopwatch" | "pomodoro";
          created_at?: string;
        };
        Update: {
          started_at?: string;
          ended_at?: string;
          duration_seconds?: number;
          mode?: "stopwatch" | "pomodoro";
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_group_leaderboard: {
        Args: {
          range_key?: string | null;
        };
        Returns: {
          user_id: string;
          display_name: string | null;
          group_code: string | null;
          total_seconds: number;
          total_hours: number;
          rank_number: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
