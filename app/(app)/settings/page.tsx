import { ProfileSettings } from "@/components/dashboard/profile-settings";
import { Card, CardDescription, CardTitle } from "@/components/shared/card";
import { getProfileFallback } from "@/lib/profile";
import { getUserOrRedirect } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const { supabase, user } = await getUserOrRedirect();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Settings</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Shape the app around your study habits.</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
          Update your display name, group code, Pomodoro defaults, and audio preferences in one place.
        </p>
      </section>

      <Card className="p-6">
        <CardTitle>Everything here is lightweight</CardTitle>
        <CardDescription className="mt-2">
          No paid integrations, no cluttered add-ons, just the preferences needed for a polished study MVP.
        </CardDescription>
      </Card>

      <ProfileSettings profile={profile ?? getProfileFallback(user)} />
    </div>
  );
}
