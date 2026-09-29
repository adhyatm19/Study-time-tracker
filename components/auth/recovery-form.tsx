"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/shared/button";
import { Input, Label } from "@/components/shared/input";
import { Card } from "@/components/shared/card";
import { Feedback } from "@/components/shared/feedback";
import { errorMessage } from "@/lib/validation";
export function RecoveryForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const db = createSupabaseBrowserClient();
    let live = true;
    void db.auth.getUser().then(({ data }) => {
      if (live) {
        setCanReset(!!data.user);
        setReady(true);
      }
    });
    const {
      data: { subscription }
    } = db.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) {
        setCanReset(true);
        setReady(true);
      }
    });
    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);
  async function submit() {
    setBusy(true);
    setMessage(null);
    setError(false);
    try {
      const db = createSupabaseBrowserClient();
      if (canReset) {
        const { error } = await db.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Password updated. Returning to your timer.");
        router.replace("/dashboard");
        router.refresh();
      } else {
        const { error } = await db.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth/recovery`
        });
        if (error) throw error;
        setMessage("If this email has an account, a password reset link will arrive shortly.");
      }
    } catch (error) {
      setError(true);
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold">{canReset ? "Choose a new password" : "Reset your password"}</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {canReset ? (
          <div>
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        ) : (
          <div>
            <Label htmlFor="recovery-email">Email address</Label>
            <Input
              id="recovery-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        )}
        <Feedback message={message} error={error} />
        <Button type="submit" disabled={busy || !ready}>
          {busy ? "Please wait…" : canReset ? "Update password" : "Send reset link"}
        </Button>
      </form>
      <Link href="/auth/login" className="mt-5 inline-block text-sm underline">
        Back to sign in
      </Link>
    </Card>
  );
}
