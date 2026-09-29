"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStudy } from "@/components/study/study-provider";
import { LegacyImport } from "@/components/study/legacy-import";
import { GroupPanel } from "@/components/study/group-panel";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { Input, Label, Select } from "@/components/shared/input";
import { Feedback } from "@/components/shared/feedback";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { integerInRange, validTimeZone, errorMessage } from "@/lib/validation";
import { BGM_OPTIONS } from "@/lib/constants";
import type { Profile } from "@/types/database";
export function ProfileSettings() {
  const s = useStudy();
  const router = useRouter();
  const [name, setName] = useState(s.profile.display_name ?? "");
  const [zone, setZone] = useState(s.profile.timezone);
  const [focus, setFocus] = useState(String(s.profile.default_focus_minutes));
  const [rest, setRest] = useState(String(s.profile.default_break_minutes));
  const [bgm, setBgm] = useState(s.profile.preferred_bgm);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);
  async function save() {
    setBusy(true);
    setMessage(null);
    setError(false);
    try {
      if (!name.trim()) throw new Error("Enter a display name.");
      if (!validTimeZone(zone)) throw new Error("Choose a valid timezone such as Asia/Kolkata.");
      const focusMinutes = integerInRange(focus, 1, 180, "Focus minutes");
      const breakMinutes = integerInRange(rest, 1, 60, "Break minutes");
      const { error } = await createSupabaseBrowserClient().from("profiles").upsert({
        id: s.profile.id,
        display_name: name.trim(),
        timezone: zone.trim(),
        preferred_bgm: bgm,
        default_focus_minutes: focusMinutes,
        default_break_minutes: breakMinutes
      });
      if (error) throw error;
      s.configure({ focusMinutes, breakMinutes });
      s.setTrack(bgm);
      s.invalidate();
      router.refresh();
      setMessage("Preferences saved. Active timers keep their current durations.");
    } catch (error) {
      setError(true);
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold">Profile and preferences</h2>
        <form
          className="mt-5 grid gap-5 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div>
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="timezone">Study timezone</Label>
            <Input
              id="timezone"
              list="timezones"
              required
              value={zone}
              onChange={(e) => setZone(e.target.value)}
            />
            <datalist id="timezones">
              {[
                "Asia/Kolkata",
                "UTC",
                "Europe/London",
                "America/New_York",
                "America/Los_Angeles",
                "Asia/Singapore",
                "Australia/Sydney"
              ].map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-muted-foreground">
              Used for goals, history, and leaderboard dates.
            </p>
          </div>
          <div>
            <Label htmlFor="default-focus">Default focus minutes</Label>
            <Input
              id="default-focus"
              type="number"
              min={1}
              max={180}
              step={1}
              required
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="default-break">Default break minutes</Label>
            <Input
              id="default-break"
              type="number"
              min={1}
              max={60}
              step={1}
              required
              value={rest}
              onChange={(e) => setRest(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="preferred-sound">Preferred sound</Label>
            <Select
              id="preferred-sound"
              value={bgm}
              onChange={(e) => setBgm(e.target.value as Profile["preferred_bgm"])}
            >
              {BGM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="self-end">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save preferences"}
            </Button>
          </div>
          <div className="sm:col-span-2">
            <Feedback message={message} error={error} />
          </div>
        </form>
      </Card>
      <LegacyImport />
      <section id="group">
        <GroupPanel />
      </section>
      <Card>
        <h2 className="text-lg font-semibold">Account</h2>
        <p className="my-3 text-sm text-muted-foreground">
          Your saved sessions stay in your account. Unsaved timers are available only on this browser.
        </p>
        <SignOutButton variant="outline" size="md" />
      </Card>
    </div>
  );
}
