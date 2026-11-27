"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Sparkles } from "lucide-react";
import { demoLoginAction, loginAction, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full max-w-[360px]">
      <div className="mb-8">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Demo workspace ready
        </div>
        <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-foreground">Welcome back</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Sign in to pick up where you left off.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-4 text-center text-[11px] text-muted">
        Need a fresh workspace?{" "}
        <Link href="/signup" className="font-medium text-brand transition-colors hover:text-brand-hover">
          Create your account
        </Link>
      </p>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={demoLoginAction}>
        <Button type="submit" variant="secondary" className="h-10 w-full justify-between px-3.5">
          <span className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Open the demo workspace
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-muted" />
        </Button>
      </form>

      <div className="mt-8 flex items-start gap-2 rounded-lg border border-border bg-surface-muted/60 px-3 py-2.5">
        <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
        <p className="text-[11px] leading-relaxed text-muted">
          This is a private workspace. All records are scoped to your account and never shared.
        </p>
      </div>
    </div>
  );
}
