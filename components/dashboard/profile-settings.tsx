"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/shared/button";
import { Card, CardDescription, CardTitle } from "@/components/shared/card";
import { Input, Label, Select } from "@/components/shared/input";
import { BGM_OPTIONS } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { type Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export function ProfileSettings({ profile }: { profile: ProfileRow }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [groupCode, setGroupCode] = useState(profile.group_code ?? "");
  const [preferredBgm, setPreferredBgm] = useState(profile.preferred_bgm);
  const [focusMinutes, setFocusMinutes] = useState(profile.default_focus_minutes);
  const [breakMinutes, setBreakMinutes] = useState(profile.default_break_minutes);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setFeedback(null);

    const supabase = createSupabaseBrowserClient();
    const profilePayload: Database["public"]["Tables"]["profiles"]["Insert"] = {
      id: profile.id,
      display_name: displayName.trim() || "Study buddy",
      group_code: groupCode.trim().toUpperCase() || null,
      preferred_bgm: preferredBgm,
      default_focus_minutes: Math.max(1, focusMinutes),
      default_break_minutes: Math.max(1, breakMinutes)
    };

    const { error } = await supabase.from("profiles").upsert(profilePayload as never);

    if (error) {
      setFeedback(error.message);
      setIsSaving(false);
      return;
    }

    setFeedback("Settings saved.");
    setIsSaving(false);
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="p-6">
        <CardTitle>Profile & defaults</CardTitle>
        <CardDescription className="mt-2">
          Set the way your dashboard should feel every time you open it.
        </CardDescription>

        <div className="mt-8 grid gap-5">
          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </div>

          <div>
            <Label htmlFor="groupCode">Group code</Label>
            <Input
              id="groupCode"
              value={groupCode}
              onChange={(event) => setGroupCode(event.target.value.toUpperCase())}
              placeholder="FOCUS-7"
              maxLength={20}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Anyone with the same code will appear in the private leaderboard.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="focusDefault">Default focus minutes</Label>
              <Input
                id="focusDefault"
                type="number"
                min={1}
                max={180}
                value={focusMinutes}
                onChange={(event) => setFocusMinutes(Math.max(1, Number(event.target.value) || 25))}
              />
            </div>
            <div>
              <Label htmlFor="breakDefault">Default break minutes</Label>
              <Input
                id="breakDefault"
                type="number"
                min={1}
                max={60}
                value={breakMinutes}
                onChange={(event) => setBreakMinutes(Math.max(1, Number(event.target.value) || 5))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="preferredBgm">Preferred BGM</Label>
            <Select
              id="preferredBgm"
              value={preferredBgm}
              onChange={(event) => setPreferredBgm(event.target.value as ProfileRow["preferred_bgm"])}
            >
              {BGM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {feedback ? (
            <div className="rounded-3xl border border-border/70 bg-muted px-4 py-3 text-sm text-foreground">{feedback}</div>
          ) : null}

          <Button size="lg" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save settings"}
          </Button>
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="p-6">
          <CardTitle>Audio files</CardTitle>
          <CardDescription className="mt-2">
            Place your audio files in <code className="rounded bg-muted px-2 py-1 text-xs">public/audio/</code> with the names:
          </CardDescription>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            <li>white-noise.mp3</li>
            <li>fireplace.mp3</li>
            <li>rain.mp3</li>
          </ul>
        </Card>

        <Card className="p-6">
          <CardTitle>Account</CardTitle>
          <CardDescription className="mt-2">
            Need to step away? You can sign out here and come back to the same sessions and settings later.
          </CardDescription>
          <div className="mt-6">
            <SignOutButton variant="outline" size="md" />
          </div>
        </Card>
      </div>
    </div>
  );
}
