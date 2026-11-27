"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Phone, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { patchJson } from "@/lib/client-api";

export function AccountPhoneSettings({ phone }: { phone: string }) {
  const router = useRouter();
  const [value, setValue] = React.useState(phone);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    try {
      await patchJson("/api/profile", { phone: value.trim() || null });
      toast.success("Phone number saved");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save phone number";
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface-muted/50 px-3 py-3">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-muted">
          <Phone className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[9.5px] uppercase tracking-[0.06em] text-muted">Phone · optional</p>
          <Input
            type="tel"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Add a phone number"
            className="mt-1 h-8"
          />
        </div>
        <Button type="button" size="xs" variant="secondary" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      </div>
      {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
