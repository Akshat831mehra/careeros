"use client";

import * as React from "react";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";

export function useSignOut() {
  const [pending, setPending] = React.useState(false);

  const signOut = React.useCallback(async () => {
    if (pending) return;
    setPending(true);

    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Could not sign out. Please try again.");

      toast.success("Signed out");
      window.location.assign("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out. Please try again.");
      setPending(false);
    }
  }, [pending]);

  return { signOut, pending };
}

export function SignOutButton({
  label = "Sign out",
  pendingLabel = "Signing out…",
  showIcon = true,
  ...props
}: ButtonProps & { label?: string; pendingLabel?: string; showIcon?: boolean }) {
  const { signOut, pending } = useSignOut();

  return (
    <Button
      type="button"
      {...props}
      disabled={pending || props.disabled}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) void signOut();
      }}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : showIcon ? <LogOut /> : null}
      {pending ? pendingLabel : label}
    </Button>
  );
}
