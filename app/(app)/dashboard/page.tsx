import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { fetchGroupLeaderboard } from "@/lib/leaderboard";
import { getProfileFallback } from "@/lib/profile";
import { getUserOrRedirect } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const { supabase, user } = await getUserOrRedirect();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 120);

  const [{ data: profile }, { data: sessions }, leaderboardData] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("study_sessions").select("*").gte("started_at", cutoff.toISOString()).order("started_at", { ascending: false }),
    fetchGroupLeaderboard(supabase, "all")
  ]);

  return (
    <DashboardHome
      currentUserId={user.id}
      profile={profile ?? getProfileFallback(user)}
      initialSessions={sessions ?? []}
      leaderboardEntries={leaderboardData}
    />
  );
}
