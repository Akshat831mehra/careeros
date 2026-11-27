import type { Metadata } from "next";
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Database,
  KeyRound,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { requireUser } from "@/lib/session";
import { SignOutButton } from "@/components/auth/sign-out";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { AppearanceSettings } from "./appearance-settings";

// This route reads the user session on every request; allow it to block navigation.
export const instant = false;

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Workspace
        </div>
        <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.04em] text-foreground">Settings</h1>
        <p className="mt-1 text-[12.5px] text-muted">Manage your workspace, appearance and account.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-7">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Appearance</CardTitle>
                <p className="mt-1 text-[11px] text-muted">Choose how CareerOS looks on this device.</p>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <AppearanceSettings />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Account</CardTitle>
                <p className="mt-1 text-[11px] text-muted">Your sign-in and workspace identity.</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted/50 px-3 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-muted">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9.5px] uppercase tracking-[0.06em] text-muted">Email</p>
                  <p className="truncate text-[11.5px] font-medium text-foreground">{user.email}</p>
                </div>
                <Badge variant="success">Verified</Badge>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted/50 px-3 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-muted">
                  <KeyRound className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9.5px] uppercase tracking-[0.06em] text-muted">Password</p>
                  <p className="text-[11.5px] font-medium text-foreground">Email & password</p>
                </div>
                <Badge variant="outline">Secure</Badge>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <div>
                  <p className="text-[11.5px] font-medium text-foreground">Member since</p>
                  <p className="mt-0.5 text-[10px] text-muted">{formatDate(user.createdAt)}</p>
                </div>
                <SignOutButton variant="destructive" size="sm" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Integrations</CardTitle>
                <p className="mt-1 text-[11px] text-muted">Connect your communication and calendar tools later.</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              {[
                { icon: Mail, name: "Gmail", description: "Sync outreach and replies", phase: "Planned" },
                { icon: CalendarDays, name: "Google Calendar", description: "Two-way calendar sync", phase: "Planned" },
                { icon: CalendarDays, name: "Microsoft Outlook", description: "Calendar and email sync", phase: "Planned" },
              ].map((integration) => (
                <div
                  key={integration.name}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted/40 px-3 py-2.5"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-muted">
                    <integration.icon className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11.5px] font-medium text-foreground">{integration.name}</p>
                    <p className="mt-0.5 text-[10px] text-muted">{integration.description}</p>
                  </div>
                  <Badge variant="outline">{integration.phase}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-[11px] font-semibold text-background">
                  AS
                </span>
                <div>
                  <p className="text-[12px] font-medium text-foreground">{user.name}&apos;s workspace</p>
                  <p className="text-[10px] text-muted">Personal plan · MVP</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
                <div className="rounded-lg border border-border bg-surface-muted/50 p-2.5">
                  <Users className="h-3.5 w-3.5 text-muted" />
                  <p className="mt-2 text-[10px] text-muted">Seats</p>
                  <p className="text-[13px] font-semibold text-foreground">1</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-muted/50 p-2.5">
                  <Database className="h-3.5 w-3.5 text-muted" />
                  <p className="mt-2 text-[10px] text-muted">Data</p>
                  <p className="text-[13px] font-semibold text-foreground">Private</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacy & security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {[
                "Every record is scoped to your user account.",
                "Session cookies are HTTP-only and signed.",
                "Database access happens on the server only.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                  <p className="text-[10.5px] leading-relaxed text-muted-strong">{item}</p>
                </div>
              ))}
              <div className="flex items-start gap-2 rounded-lg border border-border bg-surface-muted/50 p-3">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                <p className="text-[10px] leading-relaxed text-muted">
                  CareerOS never sends your data to third parties. Email and calendar integrations will be opt-in.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plans</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-start gap-2.5 rounded-lg border border-brand/15 bg-brand-soft/50 p-3">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11.5px] font-medium text-foreground">Free</p>
                    <Badge variant="brand">Current</Badge>
                  </div>
                  <p className="mt-1 text-[10px] leading-relaxed text-muted">
                    Full access to the core workflows. Pro plans and usage limits are ready for a future release.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted">
                <CreditCard className="h-3 w-3" />
                Billing is not enabled in the MVP.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
