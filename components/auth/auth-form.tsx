"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/shared/button";
import { Card, CardDescription, CardTitle } from "@/components/shared/card";
import { Input, Label } from "@/components/shared/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { type Database } from "@/types/database";

type AuthMode = "login" | "sign-up";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const displayName = String(formData.get("displayName") ?? "").trim();
    const groupCode = String(formData.get("groupCode") ?? "").trim().toUpperCase();

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (mode === "sign-up" && !displayName) {
      setError("Display name is required.");
      return;
    }

    if (mode === "login") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      startTransition(() => {
        router.replace("/dashboard");
        router.refresh();
      });
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          group_code: groupCode || null
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.user && data.session) {
      const profilePayload: Database["public"]["Tables"]["profiles"]["Insert"] = {
        id: data.user.id,
        display_name: displayName,
        group_code: groupCode || null
      };

      const { error: profileError } = await supabase.from("profiles").upsert(profilePayload as never);

      if (profileError) {
        setError(profileError.message);
        return;
      }

      startTransition(() => {
        router.replace("/dashboard");
        router.refresh();
      });
      return;
    }

    setSuccess("Account created. If email confirmation is enabled, check your inbox before signing in.");
  }

  return (
    <Card className="mx-auto w-full max-w-lg p-8">
      <div className="mb-8">
        <CardTitle className="text-2xl">{mode === "login" ? "Welcome back" : "Create your account"}</CardTitle>
        <CardDescription className="mt-2">
          {mode === "login"
            ? "Sign in to keep your study sessions, analytics, and leaderboard in sync."
            : "Join your study group with a calm, private dashboard for shared accountability."}
        </CardDescription>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {mode === "sign-up" ? (
          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" name="displayName" placeholder="Aadhya" autoComplete="nickname" />
          </div>
        ) : null}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={6}
            placeholder="At least 6 characters"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
          />
        </div>

        {mode === "sign-up" ? (
          <div>
            <Label htmlFor="groupCode">Group code</Label>
            <Input
              id="groupCode"
              name="groupCode"
              placeholder="FOCUS-7"
              maxLength={20}
              autoCapitalize="characters"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Use the same code as your friends to share a private leaderboard.
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
            {success}
          </div>
        ) : null}

        <Button className="w-full" size="lg" type="submit" disabled={isPending}>
          {isPending
            ? mode === "login"
              ? "Signing in..."
              : "Creating account..."
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {mode === "login" ? "New here?" : "Already have an account?"}{" "}
        <Link
          href={mode === "login" ? "/auth/sign-up" : "/auth/login"}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {mode === "login" ? "Create one" : "Sign in instead"}
        </Link>
      </p>
    </Card>
  );
}
