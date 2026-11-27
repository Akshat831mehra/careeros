import type { Metadata } from "next";
import { OutreachChannel, OutreachStatus, Prisma } from "@prisma/client";
import { Clock3, MessageSquareReply, Send, Trophy } from "lucide-react";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/modules/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { OutreachWorkspace, type OutreachRow } from "@/components/outreach/outreach-workspace";
import { OUTREACH_CHANNELS, OUTREACH_STATUSES } from "@/lib/constants";

// This route reads the user session on every request; allow it to block navigation.
export const instant = false;

export const metadata: Metadata = { title: "Outreach" };

type SearchParams = Promise<{ q?: string; status?: string; channel?: string; company?: string }>;

export default async function OutreachPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const query = params.q?.trim();

  const where: Prisma.OutreachWhereInput = {
    userId: user.id,
    ...(params.company ? { companyId: params.company } : {}),
    ...(OUTREACH_STATUSES.includes(params.status as OutreachStatus) ? { status: params.status as OutreachStatus } : {}),
    ...(OUTREACH_CHANNELS.includes(params.channel as OutreachChannel)
      ? { channel: params.channel as OutreachChannel }
      : {}),
    ...(query
      ? {
          OR: [
            { subject: { contains: query, mode: "insensitive" } },
            { message: { contains: query, mode: "insensitive" } },
            { responseStatus: { contains: query, mode: "insensitive" } },
            { notes: { contains: query, mode: "insensitive" } },
            { contact: { fullName: { contains: query, mode: "insensitive" } } },
            { company: { name: { contains: query, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [records, allRecords, contacts, companies, applications, templates] = await Promise.all([
    prisma.outreach.findMany({
      where,
      include: {
        contact: { select: { id: true, fullName: true, designation: true } },
        company: { select: { id: true, name: true } },
        application: { select: { id: true, title: true } },
      },
      orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
    }),
    prisma.outreach.findMany({
      where: { userId: user.id },
      select: { status: true, sentAt: true },
    }),
    prisma.contact.findMany({
      where: { userId: user.id },
      select: { id: true, fullName: true, companyId: true, designation: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.company.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.application.findMany({
      where: { userId: user.id },
      select: { id: true, title: true, companyId: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.emailTemplate.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, category: true, subject: true, body: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    }),
  ]);

  const sent = allRecords.filter((record) => record.sentAt).length;
  const awaiting = allRecords.filter((record) => record.status === "AWAITING_RESPONSE").length;
  const replied = allRecords.filter((record) => record.status === "REPLIED").length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Conversations"
        title="Outreach"
        description="Cold emails, LinkedIn messages, referrals and HR follow-ups — track every conversation and never let a warm lead go cold."
      />

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total outreach" value={allRecords.length} sub="Messages logged" icon={Send} tone="brand" />
        <StatCard label="Sent" value={sent} sub="Out in the wild" icon={MessageSquareReply} tone="blue" />
        <StatCard label="Awaiting reply" value={awaiting} sub="Need patience or a nudge" icon={Clock3} tone="amber" />
        <StatCard label="Replied" value={replied} sub="Active conversations" icon={Trophy} tone="green" />
      </section>

      <OutreachWorkspace
        records={records as OutreachRow[]}
        contacts={contacts}
        companies={companies}
        applications={applications}
        templates={templates}
      />
    </div>
  );
}
