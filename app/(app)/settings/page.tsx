import { ProfileSettings } from "@/components/dashboard/profile-settings";
export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Make room for your rhythm</h1>
      <ProfileSettings />
    </div>
  );
}
