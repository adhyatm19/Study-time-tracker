import { GroupLeaderboard } from "@/components/study/group-leaderboard";
export default function LeaderboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">A little shared accountability</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Celebrate steady effort with your private study circle.
        </p>
      </div>
      <GroupLeaderboard />
    </div>
  );
}
