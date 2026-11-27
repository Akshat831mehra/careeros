import type { Metadata } from "next";
import { ContactType, RelationshipStatus } from "@prisma/client";
import { MessageSquareReply, UserCheck, UserRound, Users } from "lucide-react";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/modules/page-header";
import { ContactsWorkspace, type ContactRow } from "@/components/contacts/contacts-workspace";
import { StatCard } from "@/components/dashboard/stat-card";
import { CONTACT_TYPES, RELATIONSHIP_STATUSES } from "@/lib/constants";

// This route reads the user session on every request; allow it to block navigation.
export const instant = false;

export const metadata: Metadata = { title: "Contacts" };

type SearchParams = Promise<{ q?: string; company?: string; type?: string; relationship?: string }>;

export default async function ContactsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const query = params.q?.trim();

  const where: Prisma.ContactWhereInput = {
    userId: user.id,
    ...(params.company ? { companyId: params.company } : {}),
    ...(CONTACT_TYPES.includes(params.type as ContactType) ? { type: params.type as ContactType } : {}),
    ...(RELATIONSHIP_STATUSES.includes(params.relationship as RelationshipStatus)
      ? { relationship: params.relationship as RelationshipStatus }
      : {}),
    ...(query
      ? {
          OR: [
            { fullName: { contains: query, mode: "insensitive" } },
            { designation: { contains: query, mode: "insensitive" } },
            { department: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { company: { name: { contains: query, mode: "insensitive" } } },
            { notes: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [contacts, allContacts, companies] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { outreach: true, events: true, tasks: true } },
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.contact.findMany({
      where: { userId: user.id },
      select: { type: true, relationship: true },
    }),
    prisma.company.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const recruiters = allContacts.filter((contact) =>
    ["HR", "RECRUITER", "TALENT_ACQUISITION"].includes(contact.type),
  ).length;
  const replied = allContacts.filter((contact) => contact.relationship === "REPLIED").length;
  const followUps = allContacts.filter((contact) => contact.relationship === "FOLLOW_UP_REQUIRED").length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Relationships"
        title="Contacts"
        description="Your personal network of recruiters, hiring managers and senior employees — with every conversation in context."
      />

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Contacts" value={allContacts.length} sub="People in your network" icon={Users} tone="brand" />
        <StatCard label="Recruiters & HR" value={recruiters} sub="Talent contacts" icon={UserRound} tone="blue" />
        <StatCard label="Replied" value={replied} sub="Active conversations" icon={MessageSquareReply} tone="green" />
        <StatCard label="Follow-up required" value={followUps} sub="Need a nudge" icon={UserCheck} tone="amber" />
      </section>

      <ContactsWorkspace contacts={contacts as ContactRow[]} companies={companies} />
    </div>
  );
}
