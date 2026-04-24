import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  group_code: string | null;
  total_seconds: number;
  total_hours: number;
  rank_number: number;
}

type RangeKey = "today" | "week" | "month" | "all";
type ServerSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function fetchGroupLeaderboard(supabase: ServerSupabase, range: RangeKey) {
  const { data, error } = await supabase.rpc("get_group_leaderboard" as never, { range_key: range } as never);

  if (error) {
    throw error;
  }

  return (data ?? []) as LeaderboardEntry[];
}
