import { RecoveryForm } from "@/components/auth/recovery-form";
import { SiteHeader } from "@/components/layout/site-header";
export default function RecoveryPage() {
  return (
    <>
      <SiteHeader isAuthenticated={false} />
      <main className="px-4 py-10">
        <RecoveryForm />
      </main>
    </>
  );
}
