import { SummaryView } from "@/components/study/summary-view";
export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Your study rhythm</h1>
        <p className="mt-2 text-sm text-muted-foreground">Accurate totals, small steps, steady progress.</p>
      </div>
      <SummaryView />
    </div>
  );
}
