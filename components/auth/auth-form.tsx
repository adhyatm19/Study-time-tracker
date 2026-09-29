"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/shared/button";
import { Card, CardDescription, CardTitle } from "@/components/shared/card";
import { Input, Label } from "@/components/shared/input";
import { LoadingSpinner } from "@/components/shared/loading";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/validation";

type AuthMode = "login" | "sign-up";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const displayName = String(formData.get("displayName") ?? "").trim();

    if (!email || !password) {
      setError("Email and password are required.");
      setIsSubmitting(false);
      return;
    }

    if (mode === "sign-up" && !displayName) {
      setError("Display name is required.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) {
          setError(signInError.message);
          setIsSubmitting(false);
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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            display_name: displayName
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsSubmitting(false);
        return;
      }

      if (data.user && data.session) {
        startTransition(() => {
          router.replace("/dashboard");
          router.refresh();
        });
        return;
      }

      setSuccess("Account created. If email confirmation is enabled, check your inbox before signing in.");
      setIsSubmitting(false);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resend() {
    const email = (document.getElementById("email") as HTMLInputElement | null)?.value.trim();
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) throw error;
      setSuccess("If confirmation is needed, a new link will arrive in your inbox.");
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  const isBusy = isSubmitting || isPending;

  return (
    <Card className="mx-auto w-full max-w-lg p-8">
      <div className="mb-8">
        <CardTitle className="text-2xl">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </CardTitle>
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
            <Input
              id="displayName"
              name="displayName"
              placeholder="Your name"
              autoComplete="nickname"
              required
              maxLength={80}
            />
          </div>
        ) : null}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={mode === "sign-up" ? 8 : undefined}
            placeholder={mode === "sign-up" ? "At least 8 characters" : "Your password"}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
          />
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          >
            {error}
          </div>
        ) : null}

        {success ? (
          <div
            role="status"
            className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
          >
            {success}
          </div>
        ) : null}

        <Button className="w-full gap-2" size="lg" type="submit" disabled={isBusy}>
          {isBusy ? <LoadingSpinner /> : null}
          {isBusy
            ? mode === "login"
              ? "Signing in..."
              : "Creating account..."
            : mode === "login"
              ? "Sign in"
              : "Create account"}
        </Button>
      </form>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
        <Link href="/auth/recovery" className="underline underline-offset-4">
          Forgot password?
        </Link>
        <Button variant="ghost" size="sm" onClick={() => void resend()} disabled={isBusy}>
          Resend verification
        </Button>
      </div>
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
