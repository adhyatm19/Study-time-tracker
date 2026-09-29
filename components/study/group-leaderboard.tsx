"use client";
import Link from "next/link";
import { UsersRound } from "lucide-react";
import { useCallback, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { parseGroup } from "@/lib/summary";
import { useResource } from "./use-resource";
import { useStudy } from "./study-provider";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { LoadError } from "@/components/shared/feedback";
import { formatDuration } from "@/lib/utils";
import { LEADERBOARD_FILTERS } from "@/lib/constants";
export function GroupLeaderboard({ compact = false }: { compact?: boolean }) {
  const s = useStudy();
  const [range, setRange] = useState("week");
  const load = useCallback(async () => {
    const db = createSupabaseBrowserClient();
    const [group, board] = await Promise.all([
      db.rpc("manage_group", { action: "get" }),
      db.rpc("get_group_leaderboard", { range_key: range })
    ]);
    if (group.error) throw group.error;
    if (board.error) throw board.error;
    return { group: parseGroup(group.data), entries: board.data };
  }, [range]);
  const resource = useResource(load);
  if (resource.error) return <LoadError label="Group leaderboard" onRetry={resource.refresh} />;
  if (!resource.data) return <p role="status">Loading your group…</p>;
  if (!resource.data.group)
    return (
      <Card>
        <div className="flex items-center gap-2.5">
          <span className="section-icon tone-blue">
            <UsersRound size={17} aria-hidden="true" />
          </span>
          <h2 className="text-[15px] font-semibold tracking-tight">Study alongside your friends</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a private circle or join with an invitation.
        </p>
        <Link className="mt-4 inline-block text-sm font-medium text-accent underline" href="/settings#group">
          Set up your group
        </Link>
      </Card>
    );
  const { entries, group } = resource.data;
  const visible = compact ? entries.slice(0, 5) : entries;
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{group.name}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {LEADERBOARD_FILTERS.find((f) => f.value === range)?.label} · Dates use {s.profile.timezone}
          </p>
        </div>
        <div role="group" aria-label="Leaderboard period" className="flex flex-wrap gap-1">
          {LEADERBOARD_FILTERS.map((filter) => (
            <Button
              size="sm"
              key={filter.value}
              variant={range === filter.value ? "primary" : "ghost"}
              aria-pressed={range === filter.value}
              onClick={() => setRange(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>
      {resource.loading ? (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          Updating…
        </p>
      ) : null}
      <ol className="mt-4 divide-y divide-border">
        {visible.map((entry) => (
          <li
            key={entry.user_id}
            className={`flex items-center gap-3 rounded-lg px-2 py-4 ${entry.user_id === s.profile.id ? "bg-muted/70" : ""}`}
          >
            <span className="w-8 text-center font-mono text-sm" aria-label={`Rank ${entry.rank_number}`}>
              {entry.rank_number}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {entry.display_name || "Study buddy"}
              {entry.user_id === s.profile.id ? " · You" : ""}
            </span>
            <span className="text-sm tabular-nums">{formatDuration(entry.total_seconds)}</span>
          </li>
        ))}
      </ol>
      {entries.every((e) => e.total_seconds === 0) ? (
        <p className="mt-3 text-sm text-muted-foreground">No study time logged for this period yet.</p>
      ) : null}
      {compact ? (
        <Link className="mt-4 inline-block text-sm text-accent underline" href="/leaderboard">
          View full leaderboard
        </Link>
      ) : null}
    </Card>
  );
}
