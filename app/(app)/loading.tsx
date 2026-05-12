import { PageLoader } from "@/components/shared/loading";

export default function AppLoading() {
  return (
    <>
      <PageLoader />
      <div className="space-y-6">
        <div className="h-28 rounded-[1.35rem] border border-border/70 bg-muted/40" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
          <div className="h-[34rem] rounded-[1.35rem] border border-border/70 bg-muted/40" />
          <div className="space-y-4">
            <div className="h-40 rounded-[1.35rem] border border-border/70 bg-muted/40" />
            <div className="h-72 rounded-[1.35rem] border border-border/70 bg-muted/40" />
          </div>
        </div>
      </div>
    </>
  );
}
