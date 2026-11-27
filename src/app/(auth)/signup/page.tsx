import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "./signup-form";

// This route reads the user session on every request; allow it to block navigation.
export const instant = false;

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a private CareerOS workspace.",
};

export default async function SignupPage() {
  // During an action re-render Next swaps the cookie store; treat a read failure as anonymous here.
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect("/");

  return (
    <AuthShell>
      <SignupForm />
    </AuthShell>
  );
}
