"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Sparkles, UserPlus } from "lucide-react";
import { signupAction, type SignupState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<SignupState, FormData>(signupAction, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full max-w-[360px]">
      <div className="mb-8">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Start with an empty workspace
        </div>
        <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-foreground">Create your account</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          A private CareerOS just for you — no demo data, no sharing.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Akshat Sharma"
            defaultValue={state.fields?.name ?? ""}
            className="h-10"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            defaultValue={state.fields?.email ?? ""}
            className="h-10"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="h-10 pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted transition-colors hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Re-enter your password"
            className="h-10"
            required
          />
        </div>

        {state.error && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/15 bg-danger-soft px-3 py-2.5 text-[12px] leading-relaxed text-danger animate-fade-in">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {state.error}
          </div>
        )}

        <Button type="submit" className="h-10 w-full" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              <UserPlus className="h-3.5 w-3.5" />
              Create account
            </>
          )}
        </Button>
      </form>

      <p className="mt-4 text-center text-[11px] text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand transition-colors hover:text-brand-hover">
          Sign in
        </Link>
      </p>

      <div className="mt-8 flex items-start gap-2 rounded-lg border border-border bg-surface-muted/60 px-3 py-2.5">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
        <p className="text-[11px] leading-relaxed text-muted">
          Your companies, contacts, applications and Job Radar captures stay scoped to this account.
        </p>
      </div>

      <Link
        href="/login"
        className="mt-4 flex items-center justify-center gap-1 text-[10.5px] text-muted transition-colors hover:text-foreground"
      >
        Just exploring? Open the demo workspace
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
