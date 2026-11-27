import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "./login-form";

// This route reads the user session on every request; allow it to block navigation.
export const instant = false;

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your CareerOS workspace.",
};

export default async function LoginPage() {
  // During an action re-render Next swaps the cookie store; treat a read failure as anonymous here.
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect("/");

  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
