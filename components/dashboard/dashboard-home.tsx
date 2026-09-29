"use client";
import { TodoList } from "./todo-list";
import { DailyGoal } from "@/components/study/daily-goal";
import { SessionHistory } from "@/components/study/session-history";
import { SummaryView } from "@/components/study/summary-view";
import { GroupLeaderboard } from "@/components/study/group-leaderboard";
export function DashboardHome() {
  return (
    <div className="space-y-6">
      <SummaryView compact />
      <div className="grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <TodoList />
        <DailyGoal />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <SessionHistory compact />
        <GroupLeaderboard compact />
      </div>
    </div>
  );
}
