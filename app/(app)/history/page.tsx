import { SessionHistory } from "@/components/study/session-history";
export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Study history</h1>
        <p className="mt-2 text-sm text-muted-foreground">Find, correct, and export your saved sessions.</p>
      </div>
      <SessionHistory />
    </div>
  );
}
