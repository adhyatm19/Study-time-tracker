import Link from "next/link";

import { buttonStyles } from "@/components/shared/button";
import { Card, CardDescription, CardTitle } from "@/components/shared/card";
import { LEADERBOARD_FILTERS } from "@/lib/constants";
import { type LeaderboardEntry } from "@/lib/leaderboard";
import { cn, formatStudyDuration } from "@/lib/utils";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  activeFilter: "today" | "week" | "month" | "all";
  currentUserId?: string;
  groupCode?: string | null;
  compact?: boolean;
  showFilters?: boolean;
}

export function Leaderboard({
  entries,
  activeFilter,
  currentUserId,
  groupCode,
  compact = false,
  showFilters = true
}: LeaderboardProps) {
  if (!groupCode) {
    return (
      <Card className="p-6">
        <CardTitle>Add a group code to see your leaderboard</CardTitle>
        <CardDescription className="mt-2">
          Set the same group code as your friends in settings, then this page will only show your shared circle.
        </CardDescription>
      </Card>
    );
  }

  if (!entries.length) {
    return (
      <Card className="p-6">
        <CardTitle>No sessions in this range yet</CardTitle>
        <CardDescription className="mt-2">
          Your group is connected under <span className="font-medium text-foreground">{groupCode}</span>, but no one has
          saved study time for this filter yet.
        </CardDescription>
      </Card>
    );
  }

  const visibleEntries = compact ? entries.slice(0, 5) : entries;

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border/70 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>{compact ? "Group leaderboard" : "Leaderboard"}</CardTitle>
            <CardDescription className="mt-2">
              Ranked study time for everyone using the same group code: <span className="font-medium text-foreground">{groupCode}</span>
            </CardDescription>
          </div>

          {showFilters ? (
            <div className="flex flex-wrap gap-2">
              {LEADERBOARD_FILTERS.map((filter) => (
                <Link
                  key={filter.value}
                  href={`/leaderboard?range=${filter.value}`}
                  className={cn(
                    buttonStyles({
                      variant: activeFilter === filter.value ? "primary" : "outline",
                      size: "sm"
                    })
                  )}
                >
                  {filter.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="divide-y divide-border/70">
        {visibleEntries.map((entry) => {
          const isCurrentUser = entry.user_id === currentUserId;

          return (
            <div key={entry.user_id} className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border/70 bg-background/70 text-sm font-semibold">
                  {entry.rank_number}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {entry.display_name || "Study buddy"} {isCurrentUser ? "· You" : ""}
                  </p>
                  <p className="text-sm text-muted-foreground">{formatStudyDuration(entry.total_seconds)} total</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-semibold">{formatStudyDuration(entry.total_seconds)}</p>
                <p className="text-sm text-muted-foreground">Logged time</p>
              </div>
            </div>
          );
        })}
      </div>

      {compact ? (
        <div className="border-t border-border/70 px-6 py-4">
          <Link href="/leaderboard" className={buttonStyles({ variant: "outline" })}>
            View full leaderboard
          </Link>
        </div>
      ) : null}
    </Card>
  );
}
