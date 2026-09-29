// Generated from schema.sql + all migrations by npm run db:types. Do not edit by hand.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Database = { public: { Tables: {
  daily_goals: {
    Row: {
      user_id: string;
      day: string;
      seconds: number;
    };
    Insert: {
      user_id?: string;
      day: string;
      seconds: number;
    };
    Update: {
      user_id?: string;
      day?: string;
      seconds?: number;
    };
    Relationships: [];
  };
  group_invites: {
    Row: {
      id: string;
      group_id: string;
      token: string;
      expires_at: string;
      revoked: boolean;
    };
    Insert: {
      id?: string;
      group_id: string;
      token?: string;
      expires_at?: string;
      revoked?: boolean;
    };
    Update: {
      id?: string;
      group_id?: string;
      token?: string;
      expires_at?: string;
      revoked?: boolean;
    };
    Relationships: [];
  };
  group_members: {
    Row: {
      user_id: string;
      group_id: string;
    };
    Insert: {
      user_id: string;
      group_id: string;
    };
    Update: {
      user_id?: string;
      group_id?: string;
    };
    Relationships: [];
  };
  profiles: {
    Row: {
      id: string;
      display_name: string | null;
      group_code: string | null;
      preferred_bgm: 'off' | 'white-noise' | 'fireplace' | 'rain';
      default_focus_minutes: number;
      default_break_minutes: number;
      created_at: string;
      timezone: string;
    };
    Insert: {
      id: string;
      display_name?: string | null;
      group_code?: string | null;
      preferred_bgm?: 'off' | 'white-noise' | 'fireplace' | 'rain';
      default_focus_minutes?: number;
      default_break_minutes?: number;
      created_at?: string;
      timezone?: string;
    };
    Update: {
      id?: string;
      display_name?: string | null;
      group_code?: string | null;
      preferred_bgm?: 'off' | 'white-noise' | 'fireplace' | 'rain';
      default_focus_minutes?: number;
      default_break_minutes?: number;
      created_at?: string;
      timezone?: string;
    };
    Relationships: [];
  };
  study_groups: {
    Row: {
      id: string;
      name: string;
      owner_id: string;
      created_at: string;
    };
    Insert: {
      id?: string;
      name: string;
      owner_id: string;
      created_at?: string;
    };
    Update: {
      id?: string;
      name?: string;
      owner_id?: string;
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
      mode: 'stopwatch' | 'pomodoro';
      note: string | null;
      created_at: string;
      subject: string | null;
      task_id: string | null;
    };
    Insert: {
      id?: string;
      user_id?: string;
      started_at: string;
      ended_at: string;
      duration_seconds: number;
      mode: 'stopwatch' | 'pomodoro';
      note?: string | null;
      created_at?: string;
      subject?: string | null;
      task_id?: string | null;
    };
    Update: {
      id?: string;
      user_id?: string;
      started_at?: string;
      ended_at?: string;
      duration_seconds?: number;
      mode?: 'stopwatch' | 'pomodoro';
      note?: string | null;
      created_at?: string;
      subject?: string | null;
      task_id?: string | null;
    };
    Relationships: [];
  };
  tasks: {
    Row: {
      id: string;
      user_id: string;
      title: string;
      completed: boolean;
      created_at: string;
    };
    Insert: {
      id?: string;
      user_id?: string;
      title: string;
      completed?: boolean;
      created_at?: string;
    };
    Update: {
      id?: string;
      user_id?: string;
      title?: string;
      completed?: boolean;
      created_at?: string;
    };
    Relationships: [];
  };
}; Views: Record<string, never>; Functions: {
  get_group_leaderboard: { Args: { range_key?: string | null }; Returns: { user_id: string; display_name: string | null; group_code: string | null; total_seconds: number; total_hours: number; rank_number: number }[] };
  get_session_history: { Args: { after_start?: string | null; after_id?: string | null; filter_start?: string | null; filter_end?: string | null; search_text?: string | null; page_size?: number | null }; Returns: Database['public']['Tables']['study_sessions']['Row'][] };
  get_study_summary: { Args: Record<string, never>; Returns: Json };
  manage_group: { Args: { action: string | null; value?: string | null }; Returns: Json };
  save_study_session: { Args: { session_id: string | null; session_start: string | null; session_end: string | null; seconds: number | null; timer_mode: string | null; session_note?: string | null; session_subject?: string | null; session_task?: string | null }; Returns: Database['public']['Tables']['study_sessions']['Row'][] };
}; Enums: Record<string, never>; CompositeTypes: Record<string, never>; } };
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type StudySession = Database['public']['Tables']['study_sessions']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
