"use client";
import { useCallback, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { parseGroup } from "@/lib/summary";
import { errorMessage } from "@/lib/validation";
import { useResource } from "./use-resource";
import { useStudy } from "./study-provider";
import { Card } from "@/components/shared/card";
import { Button } from "@/components/shared/button";
import { Input, Label } from "@/components/shared/input";
import { Dialog } from "@/components/shared/dialog";
import { Feedback, LoadError } from "@/components/shared/feedback";
export function GroupPanel() {
  const s = useStudy();
  const load = useCallback(async () => {
    const { data, error } = await createSupabaseBrowserClient().rpc("manage_group", { action: "get" });
    if (error) throw error;
    return { group: parseGroup(data) };
  }, []);
  const resource = useResource(load);
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [leave, setLeave] = useState(false);
  async function action(action: string, value = "") {
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await createSupabaseBrowserClient().rpc("manage_group", { action, value });
      if (error) throw error;
      setLeave(false);
      resource.refresh();
      s.invalidate();
      setMessage(action === "revoke" ? "Invitation revoked." : "Group updated.");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  if (resource.error) return <LoadError label="Group settings" onRetry={resource.refresh} />;
  const group = resource.data?.group;
  return (
    <Card className="space-y-4">
      <h2 className="text-xl font-semibold">Your study circle</h2>
      {resource.loading && !resource.data ? (
        <p role="status">Loading group…</p>
      ) : group ? (
        <>
          <p className="text-lg font-medium">{group.name}</p>
          <p className="text-sm text-muted-foreground">
            {group.member_count} members · {group.is_owner ? "You own this group" : "Member"}. Only invited
            members can view this leaderboard.
          </p>
          {group.is_owner ? (
            <div className="space-y-3">
              {group.invite ? (
                <>
                  <Label htmlFor="invite-token">Invitation code</Label>
                  <Input
                    id="invite-token"
                    value={group.invite.token}
                    readOnly
                    onFocus={(e) => e.target.select()}
                  />
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(group.invite.expires_at).toLocaleString()}. Share this code only with
                    people you want to invite.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(group.invite!.token)
                          .then(() => setMessage("Invitation copied."))
                          .catch(() => setMessage("Select and copy the invitation code above."))
                      }
                    >
                      Copy invitation
                    </Button>
                    <Button variant="ghost" disabled={busy} onClick={() => void action("revoke")}>
                      Revoke invitation
                    </Button>
                  </div>
                </>
              ) : null}
              <Button disabled={busy} variant="outline" onClick={() => void action("invite")}>
                {group.invite ? "Replace invitation" : "Create invitation"}
              </Button>
            </div>
          ) : null}
          <Button variant="ghost" disabled={busy} onClick={() => setLeave(true)}>
            Leave group
          </Button>
        </>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void action("create", name);
            }}
          >
            <Label htmlFor="group-name">Create a circle</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Your group’s name"
              required
            />
            <Button type="submit" disabled={busy || !name.trim()}>
              Create group
            </Button>
          </form>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void action("join", token.trim());
            }}
          >
            <Label htmlFor="join-token">Join with an invitation</Label>
            <Input
              id="join-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              maxLength={64}
              placeholder="Paste invitation code"
              required
            />
            <Button type="submit" disabled={busy || !token.trim()} variant="outline">
              Join group
            </Button>
          </form>
        </div>
      )}
      <Feedback message={message} />
      <Dialog open={leave} title="Leave your study circle?" busy={busy} onClose={() => setLeave(false)}>
        <p className="mb-4 text-sm">
          Your personal study history stays with you. You will need a new invitation to rejoin. Owners can
          leave only when the group has no other members.
        </p>
        <Feedback message={message} />
        <div className="mt-4 flex gap-2">
          <Button variant="outline" disabled={busy} onClick={() => setLeave(false)}>
            Stay
          </Button>
          <Button disabled={busy} onClick={() => void action("leave")}>
            Leave group
          </Button>
        </div>
      </Dialog>
    </Card>
  );
}
