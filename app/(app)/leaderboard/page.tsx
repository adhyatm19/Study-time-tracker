import { Leaderboard } from "@/components/dashboard/leaderboard";
import { Card, CardDescription, CardTitle } from "@/components/shared/card";
import { fetchGroupLeaderboard } from "@/lib/leaderboard";
import { getProfileFallback } from "@/lib/profile";
import { getUserOrRedirect } from "@/lib/supabase/server";

type SearchParams = Promise<{
  range?: string;
}>;

function resolveRange(value?: string) {
  if (value === "today" || value === "week" || value === "month" || value === "all") {
    return value;
  }

  return "week";
}

export default async function LeaderboardPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : undefined;
  const range = resolveRange(params?.range);
  const { supabase, user } = await getUserOrRedirect();

  const [{ data: profile }, leaderboardData] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    fetchGroupLeaderboard(supabase, range)
  ]);

  const resolvedProfile = profile ?? getProfileFallback(user);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Leaderboard</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">See how your group is pacing together.</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
            Only people sharing your group code appear here. Switch the range to compare today, this week, this month, or all time.
          </p>
        </div>

        <Card className="rounded-[1.75rem] p-5">
          <CardTitle>Current group</CardTitle>
          <CardDescription className="mt-2">
            {resolvedProfile.group_code
              ? `Leaderboard is scoped to ${resolvedProfile.group_code}.`
              : "You don’t have a group code yet, so no leaderboard members can be shown."}
          </CardDescription>
        </Card>
      </section>

      <Leaderboard
        entries={leaderboardData}
        activeFilter={range}
        currentUserId={user.id}
        groupCode={resolvedProfile.group_code}
      />
    </div>
  );
}
