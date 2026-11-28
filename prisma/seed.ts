import {
  ActivityType,
  ApplicationStatus,
  CompanyStatus,
  ContactType,
  EventType,
  OutreachChannel,
  OutreachStatus,
  PrismaClient,
  Priority,
  RelationshipStatus,
  TaskStatus,
  WorkMode,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { addDays, addHours, addMinutes, startOfDay, subDays, subHours } from "date-fns";
import { jobTitleSeeds } from "../src/data/job-titles";
import { normalizeJobTitle } from "../src/lib/job-title-utils";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@careeros.app";
const DEMO_PASSWORD = "careeros123";

const day = startOfDay(new Date());

function at(offsetDays: number, hour: number, minute = 0) {
  return addMinutes(addHours(startOfDay(addDays(day, offsetDays)), hour), minute);
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function createDemoPdf(title: string, fileName: string) {
  const lines = [
    "CareerOS - tailored resume version",
    title,
    `File: ${fileName}`,
    "Stored privately in your local resume library.",
  ];
  let content = "BT\n/F1 18 Tf\n72 720 Td\n";
  lines.forEach((line, index) => {
    if (index > 0) content += "0 -30 Td\n";
    content += `(${escapePdfText(line)}) Tj\n`;
  });
  content += "ET\n";

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}endstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

async function main() {
  console.log("🌱 Seeding CareerOS demo workspace…");

  await prisma.activityLog.deleteMany();
  await prisma.task.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.outreach.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.application.deleteMany();
  await prisma.resume.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.candidateProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.jobTitleSuggestion.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.create({
    data: {
      name: "Hitesh Singh",
      email: DEMO_EMAIL,
      passwordHash,
      profile: {
        create: {
          headline: "DevOps Engineer · Cloud Infrastructure · SRE",
          location: "Bengaluru, India",
          phone: "+91 98765 43210",
          openToWork: true,
          currentDesignation: "DevOps Engineer",
          totalExperience: "5.5 years",
          currentCompany: "Nimbus Labs",
          linkedinUrl: "https://linkedin.com/in/hiteshsingh",
          githubUrl: "https://github.com/hiteshsingh",
          portfolioUrl: "https://hitesh.dev",
          preferredRoles: ["DevOps Engineer", "Site Reliability Engineer", "Cloud Engineer", "Platform Engineer"],
          preferredLocations: ["Remote", "Bengaluru", "Hybrid"],
          workMode: "HYBRID",
          expectedSalary: "₹32–40 LPA",
          noticePeriod: "30 days",
          skills: ["Kubernetes", "AWS", "Terraform", "Go", "Python", "Prometheus", "Grafana", "CI/CD", "Linux"],
          bio: "Infrastructure engineer who enjoys building calm, reliable systems. Currently exploring platform and SRE roles at product-led companies.",
          projectsAchievements:
            "Migrated a monolith to Kubernetes with zero-downtime rollouts. Built Terraform modules used across 12 services and cut deployment time by 40%.",
        },
      },
    },
  });

  for (const role of jobTitleSeeds) {
    const normalizedTitle = normalizeJobTitle(role.title);
    await prisma.jobTitleSuggestion.upsert({
      where: { normalizedTitle },
      update: {
        title: role.title,
        category: role.category,
        popularity: role.popularity,
      },
      create: {
        title: role.title,
        normalizedTitle,
        category: role.category,
        popularity: role.popularity,
      },
    });
  }

  const resumeSeed = [
    { name: "DevOps Engineer Resume", fileName: "hitesh-singh-devops-2026.pdf" },
    { name: "Cloud Engineer Resume", fileName: "hitesh-singh-cloud-2026.pdf" },
    { name: "SRE Resume", fileName: "hitesh-singh-sre-2026.pdf" },
  ];
  const resumeStorageRoot = path.join(process.cwd(), ".data", "resumes");
  const resumeStorageDir = path.join(resumeStorageRoot, user.id);
  await rm(resumeStorageRoot, { recursive: true, force: true });
  await mkdir(resumeStorageDir, { recursive: true, mode: 0o700 });

  const resumes = [];
  for (const [index, item] of resumeSeed.entries()) {
    const storedName = `${randomUUID()}.pdf`;
    const pdf = createDemoPdf(item.name, item.fileName);
    await writeFile(path.join(resumeStorageDir, storedName), pdf, { mode: 0o600 });

    const created = await prisma.resume.create({
      data: {
        userId: user.id,
        name: item.name,
        fileName: item.fileName,
        fileUrl: "/api/profile/resume",
        fileSize: pdf.length,
        mimeType: "application/pdf",
        storagePath: path.join(user.id, storedName),
        isDefault: index === 0,
      },
    });
    resumes.push(
      await prisma.resume.update({
        where: { id: created.id },
        data: { fileUrl: `/api/profile/resume?id=${created.id}` },
      }),
    );
  }

  const companySeed = [
    {
      key: "vercel",
      name: "Vercel",
      website: "https://vercel.com",
      careersUrl: "https://vercel.com/careers",
      linkedinUrl: "https://linkedin.com/company/vercel",
      industry: "Developer Tools",
      location: "Remote · Global",
      size: "500–1,000",
      priority: Priority.HIGH,
      status: CompanyStatus.CONTACTED,
      notes: "Dream infrastructure team. Met Sarah at a meetup; warm intro possible through Marcus.",
    },
    {
      key: "linear",
      name: "Linear",
      website: "https://linear.app",
      careersUrl: "https://linear.app/careers",
      linkedinUrl: "https://linkedin.com/company/linear",
      industry: "Productivity Software",
      location: "Remote · Global",
      size: "50–200",
      priority: Priority.HIGH,
      status: CompanyStatus.APPLIED,
      notes: "Small, high-bar team. Platform engineering role looks like a strong fit.",
    },
    {
      key: "stripe",
      name: "Stripe",
      website: "https://stripe.com",
      careersUrl: "https://stripe.com/jobs",
      linkedinUrl: "https://linkedin.com/company/stripe",
      industry: "Fintech",
      location: "Bengaluru · Hybrid",
      size: "5,000+",
      priority: Priority.HIGH,
      status: CompanyStatus.APPLIED,
      notes: "In final interview loop. Elena has been exceptionally responsive.",
    },
    {
      key: "grafana",
      name: "Grafana Labs",
      website: "https://grafana.com",
      careersUrl: "https://grafana.com/careers",
      linkedinUrl: "https://linkedin.com/company/grafana-labs",
      industry: "Observability",
      location: "Remote · India",
      size: "1,000–5,000",
      priority: Priority.MEDIUM,
      status: CompanyStatus.TARGET,
      notes: "Great observability story. Aisha offered a referral once a role opens.",
    },
    {
      key: "hashicorp",
      name: "HashiCorp",
      website: "https://hashicorp.com",
      careersUrl: "https://hashicorp.com/careers",
      linkedinUrl: "https://linkedin.com/company/hashicorp",
      industry: "Cloud Infrastructure",
      location: "Remote · Global",
      size: "1,000–5,000",
      priority: Priority.HIGH,
      status: CompanyStatus.CONTACTED,
      notes: "Terraform is core to my stack. Applied to SRE II; Alex referred me internally.",
    },
    {
      key: "cloudflare",
      name: "Cloudflare",
      website: "https://cloudflare.com",
      careersUrl: "https://cloudflare.com/careers",
      linkedinUrl: "https://linkedin.com/company/cloudflare",
      industry: "Cloud Security",
      location: "Austin · Remote",
      size: "5,000+",
      priority: Priority.MEDIUM,
      status: CompanyStatus.APPLIED,
      notes: "Systems engineering role. Application submitted; waiting on recruiter response.",
    },
    {
      key: "datadog",
      name: "Datadog",
      website: "https://datadoghq.com",
      careersUrl: "https://datadoghq.com/careers",
      linkedinUrl: "https://linkedin.com/company/datadog",
      industry: "Observability",
      location: "New York · Remote",
      size: "5,000+",
      priority: Priority.MEDIUM,
      status: CompanyStatus.TARGET,
      notes: "Preparing a tailored cloud engineering application. Need a referral contact.",
    },
    {
      key: "railway",
      name: "Railway",
      website: "https://railway.com",
      careersUrl: "https://railway.com/careers",
      linkedinUrl: "https://linkedin.com/company/railway",
      industry: "Developer Tools",
      location: "Remote · Global",
      size: "50–200",
      priority: Priority.HIGH,
      status: CompanyStatus.APPLIED,
      notes: "Offer received. Team is small, product velocity is high. Reviewing compensation.",
    },
    {
      key: "postman",
      name: "Postman",
      website: "https://postman.com",
      careersUrl: "https://postman.com/careers",
      linkedinUrl: "https://linkedin.com/company/postman",
      industry: "API Platform",
      location: "Bengaluru · Hybrid",
      size: "500–1,000",
      priority: Priority.LOW,
      status: CompanyStatus.NOT_INTERESTED,
      notes: "Role was more backend product engineering than infrastructure. Archived for now.",
    },
  ] as const;

  const companies: Record<string, { id: string }> = {};
  for (const c of companySeed) {
    const { key, ...data } = c;
    companies[key] = await prisma.company.create({
      data: { ...data, userId: user.id, createdAt: subDays(new Date(), 40) },
    });
  }

  const contactSeed = [
    {
      key: "sarah",
      fullName: "Sarah Chen",
      designation: "Senior Technical Recruiter",
      companyId: companies.vercel.id,
      department: "Talent",
      email: "sarah.chen@vercel.com",
      linkedinUrl: "https://linkedin.com/in/sarahchen",
      type: ContactType.RECRUITER,
      relationship: RelationshipStatus.REPLIED,
      notes: "Reached out after the platform engineering meetup. Warm and responsive.",
    },
    {
      key: "marcus",
      fullName: "Marcus Lee",
      designation: "Engineering Manager, Infrastructure",
      companyId: companies.vercel.id,
      department: "Infrastructure",
      email: "marcus.lee@vercel.com",
      linkedinUrl: "https://linkedin.com/in/marcuslee",
      type: ContactType.ENGINEERING_MANAGER,
      relationship: RelationshipStatus.CONTACTED,
      notes: "Spoke briefly after the meetup. Follow up with a concise note about platform work.",
    },
    {
      key: "priya",
      fullName: "Priya Nair",
      designation: "Head of Talent",
      companyId: companies.linear.id,
      department: "People",
      email: "priya@linear.app",
      linkedinUrl: "https://linkedin.com/in/priyanair",
      type: ContactType.HR,
      relationship: RelationshipStatus.CONNECTED_ON_LINKEDIN,
      notes: "Connected on LinkedIn. Prefers async communication.",
    },
    {
      key: "daniel",
      fullName: "Daniel Park",
      designation: "Staff Platform Engineer",
      companyId: companies.linear.id,
      department: "Platform",
      email: "daniel@linear.app",
      linkedinUrl: "https://linkedin.com/in/danielpark",
      type: ContactType.SENIOR_ENGINEER,
      relationship: RelationshipStatus.REPLIED,
      notes: "Shared useful notes about Linear's infra stack. Potential referral.",
    },
    {
      key: "elena",
      fullName: "Elena Rossi",
      designation: "Talent Acquisition Partner",
      companyId: companies.stripe.id,
      department: "Talent",
      email: "elena.rossi@stripe.com",
      linkedinUrl: "https://linkedin.com/in/elenarossi",
      type: ContactType.TALENT_ACQUISITION,
      relationship: RelationshipStatus.REPLIED,
      notes: "Coordinating the final interview loop. Very organized.",
    },
    {
      key: "rohan",
      fullName: "Rohan Mehta",
      designation: "SRE Manager",
      companyId: companies.stripe.id,
      department: "Reliability",
      email: "rohan.mehta@stripe.com",
      linkedinUrl: "https://linkedin.com/in/rohanmehta",
      type: ContactType.SRE_MANAGER,
      relationship: RelationshipStatus.FOLLOW_UP_REQUIRED,
      notes: "Follow-up on the system design discussion is overdue.",
    },
    {
      key: "alex",
      fullName: "Alex Kim",
      designation: "DevOps Lead",
      companyId: companies.hashicorp.id,
      department: "Cloud Platform",
      email: "alex.kim@hashicorp.com",
      linkedinUrl: "https://linkedin.com/in/alexkim",
      type: ContactType.DEVOPS_LEAD,
      relationship: RelationshipStatus.CONTACTED,
      notes: "Submitted an internal referral. Confirmed it was received.",
    },
    {
      key: "maya",
      fullName: "Maya Patel",
      designation: "Recruiter, Systems Engineering",
      companyId: companies.cloudflare.id,
      department: "Talent",
      email: "maya.patel@cloudflare.com",
      linkedinUrl: "https://linkedin.com/in/mayapatel",
      type: ContactType.RECRUITER,
      relationship: RelationshipStatus.NOT_CONTACTED,
      notes: "Draft outreach ready. Personalize with the Cloudflare reliability blog post.",
    },
    {
      key: "jordan",
      fullName: "Jordan Blake",
      designation: "Chief Technology Officer",
      companyId: companies.railway.id,
      department: "Engineering",
      email: "jordan@railway.com",
      linkedinUrl: "https://linkedin.com/in/jordanblake",
      type: ContactType.CTO,
      relationship: RelationshipStatus.INTERESTED,
      notes: "Offer conversation scheduled. Interested in ownership and platform scope.",
    },
    {
      key: "aisha",
      fullName: "Aisha Khan",
      designation: "Senior Software Engineer",
      companyId: companies.grafana.id,
      department: "Observability",
      email: "aisha.khan@grafana.com",
      linkedinUrl: "https://linkedin.com/in/aishakhan",
      type: ContactType.EMPLOYEE_REFERRAL,
      relationship: RelationshipStatus.CONNECTED_ON_LINKEDIN,
      notes: "Former colleague. Happy to refer once the right role opens.",
    },
    {
      key: "chris",
      fullName: "Chris Wong",
      designation: "Technical Recruiter",
      companyId: companies.datadog.id,
      department: "Talent",
      email: "chris.wong@datadoghq.com",
      linkedinUrl: "https://linkedin.com/in/chriswong",
      type: ContactType.HR,
      relationship: RelationshipStatus.NOT_CONTACTED,
      notes: "Find a warm introduction before reaching out.",
    },
  ] as const;

  const contacts: Record<string, { id: string }> = {};
  for (const c of contactSeed) {
    const { key, ...data } = c;
    contacts[key] = await prisma.contact.create({
      data: { ...data, userId: user.id, createdAt: subDays(new Date(), 30) },
    });
  }

  const applicationSeed = [
    {
      key: "vercel",
      companyId: companies.vercel.id,
      title: "Senior DevOps Engineer",
      description:
        "Own the build and deployment platform used by millions of developers. Deep work across Kubernetes, Go, and edge infrastructure.",
      postingUrl: "https://vercel.com/careers/senior-devops-engineer",
      careersUrl: "https://vercel.com/careers",
      location: "Remote · Global",
      workMode: WorkMode.REMOTE,
      salaryRange: "$150k–$190k",
      dateApplied: subDays(new Date(), 18),
      resumeId: resumes[0].id,
      referralSource: "Meetup intro",
      status: ApplicationStatus.TECHNICAL_INTERVIEW,
      nextFollowUp: at(1, 10),
      notes: "Technical interview went well. Waiting on the panel debrief.",
    },
    {
      key: "linear",
      companyId: companies.linear.id,
      title: "Platform Engineer",
      description:
        "Build the internal platform that keeps Linear fast and reliable. TypeScript, Postgres, AWS, and a strong product mindset.",
      postingUrl: "https://linear.app/careers/platform-engineer",
      careersUrl: "https://linear.app/careers",
      location: "Remote · Global",
      workMode: WorkMode.REMOTE,
      salaryRange: "$140k–$180k",
      dateApplied: subDays(new Date(), 12),
      resumeId: resumes[1].id,
      referralSource: "LinkedIn",
      status: ApplicationStatus.RECRUITER_SCREENING,
      nextFollowUp: at(2, 11, 30),
      notes: "Recruiter screen scheduled. Prepare examples around developer velocity.",
    },
    {
      key: "stripe",
      companyId: companies.stripe.id,
      title: "Infrastructure Engineer",
      description:
        "Design and operate the systems behind global payments. Focus on reliability, observability, and safe change at scale.",
      postingUrl: "https://stripe.com/jobs/infrastructure-engineer",
      careersUrl: "https://stripe.com/jobs",
      location: "Bengaluru · Hybrid",
      workMode: WorkMode.HYBRID,
      salaryRange: "₹45–60 LPA",
      dateApplied: subDays(new Date(), 26),
      resumeId: resumes[2].id,
      referralSource: "Elena Rossi",
      status: ApplicationStatus.FINAL_INTERVIEW,
      nextFollowUp: at(0, 15),
      notes: "Final loop today at 3 PM with the reliability leadership team.",
    },
    {
      key: "hashicorp",
      companyId: companies.hashicorp.id,
      title: "Site Reliability Engineer II",
      description:
        "Operate HashiCorp Cloud Platform. Terraform, Vault, Kubernetes, and a strong culture of automation.",
      postingUrl: "https://hashicorp.com/careers/sre-ii",
      careersUrl: "https://hashicorp.com/careers",
      location: "Remote · Global",
      workMode: WorkMode.REMOTE,
      salaryRange: "$135k–$170k",
      dateApplied: subDays(new Date(), 9),
      resumeId: resumes[2].id,
      referralSource: "Alex Kim referral",
      status: ApplicationStatus.APPLIED,
      nextFollowUp: at(3, 9),
      notes: "Referral confirmed. Follow up if there is no update by Friday.",
    },
    {
      key: "cloudflare",
      companyId: companies.cloudflare.id,
      title: "Systems Engineer",
      description:
        "Work on the edge network that powers a huge portion of the internet. Linux internals, networking, and distributed systems.",
      postingUrl: "https://cloudflare.com/careers/systems-engineer",
      careersUrl: "https://cloudflare.com/careers",
      location: "Austin · Remote",
      workMode: WorkMode.REMOTE,
      salaryRange: "$145k–$185k",
      dateApplied: subDays(new Date(), 6),
      resumeId: resumes[1].id,
      status: ApplicationStatus.HR_CONTACTED,
      nextFollowUp: at(1, 14),
      notes: "Reached out to Maya. No reply yet.",
    },
    {
      key: "grafana",
      companyId: companies.grafana.id,
      title: "Senior SRE",
      description:
        "Help run Grafana Cloud at scale. Kubernetes, Go, observability, and a fully remote engineering culture.",
      postingUrl: "https://grafana.com/careers/senior-sre",
      careersUrl: "https://grafana.com/careers",
      location: "Remote · India",
      workMode: WorkMode.REMOTE,
      salaryRange: "₹35–48 LPA",
      dateApplied: null,
      resumeId: resumes[2].id,
      referralSource: "Aisha Khan",
      status: ApplicationStatus.INTERESTED,
      nextFollowUp: at(4, 10),
      notes: "Tailor SRE resume and ask Aisha about the team before applying.",
    },
    {
      key: "datadog",
      companyId: companies.datadog.id,
      title: "Cloud Infrastructure Engineer",
      description:
        "Scale the observability platform across multiple clouds. Strong AWS, Kubernetes, and distributed systems background required.",
      postingUrl: "https://datadoghq.com/careers/cloud-infrastructure-engineer",
      careersUrl: "https://datadoghq.com/careers",
      location: "New York · Remote",
      workMode: WorkMode.REMOTE,
      salaryRange: "$150k–$190k",
      dateApplied: null,
      resumeId: resumes[1].id,
      status: ApplicationStatus.PREPARING,
      nextFollowUp: at(5, 10),
      notes: "Need a referral contact. Research the observability org first.",
    },
    {
      key: "railway",
      companyId: companies.railway.id,
      title: "DevOps Engineer",
      description:
        "Own deployment infrastructure for a fast-growing developer platform. Small team, broad scope, high ownership.",
      postingUrl: "https://railway.com/careers/devops-engineer",
      careersUrl: "https://railway.com/careers",
      location: "Remote · Global",
      workMode: WorkMode.REMOTE,
      salaryRange: "$140k–$175k",
      dateApplied: subDays(new Date(), 22),
      resumeId: resumes[0].id,
      referralSource: "Inbound",
      status: ApplicationStatus.OFFER_RECEIVED,
      nextFollowUp: at(5, 16),
      notes: "Offer received. Call with Jordan scheduled to discuss scope and equity.",
    },
    {
      key: "postman",
      companyId: companies.postman.id,
      title: "Backend Engineer, Platform",
      description:
        "Backend product engineering role focused on API tooling. Less infrastructure ownership than expected.",
      postingUrl: "https://postman.com/careers/backend-engineer",
      careersUrl: "https://postman.com/careers",
      location: "Bengaluru · Hybrid",
      workMode: WorkMode.HYBRID,
      dateApplied: subDays(new Date(), 31),
      resumeId: resumes[0].id,
      status: ApplicationStatus.REJECTED,
      nextFollowUp: null,
      notes: "Rejected after the recruiter screen. Role was not the right fit.",
    },
    {
      key: "cloudflare2",
      companyId: companies.cloudflare.id,
      title: "Infrastructure Security Engineer",
      description:
        "Secure the edge platform. Mix of systems engineering, IAM, and security operations.",
      postingUrl: "https://cloudflare.com/careers/infrastructure-security",
      careersUrl: "https://cloudflare.com/careers",
      location: "Remote · Global",
      workMode: WorkMode.REMOTE,
      dateApplied: subDays(new Date(), 42),
      resumeId: resumes[1].id,
      status: ApplicationStatus.WITHDRAWN,
      notes: "Withdrew to focus on the systems engineering role.",
    },
    {
      key: "linear2",
      companyId: companies.linear.id,
      title: "Infrastructure Engineer",
      description:
        "Infrastructure role focused on Postgres, AWS, and internal developer experience.",
      postingUrl: "https://linear.app/careers/infrastructure-engineer",
      careersUrl: "https://linear.app/careers",
      location: "Remote · Global",
      workMode: WorkMode.REMOTE,
      dateApplied: subDays(new Date(), 52),
      resumeId: resumes[0].id,
      status: ApplicationStatus.REJECTED,
      notes: "Rejected after a strong first round. Reapply in six months.",
    },
    {
      key: "vercel2",
      companyId: companies.vercel.id,
      title: "Platform Engineer",
      description:
        "Developer experience and internal platform role. Focus on build systems and CI.",
      postingUrl: "https://vercel.com/careers/platform-engineer",
      careersUrl: "https://vercel.com/careers",
      location: "Remote · Global",
      workMode: WorkMode.REMOTE,
      dateApplied: subDays(new Date(), 63),
      resumeId: resumes[1].id,
      status: ApplicationStatus.REJECTED,
      notes: "Rejected at resume screen for the earlier role. New team is a better fit.",
    },
  ] as const;

  const applications: Record<string, { id: string }> = {};
  for (const a of applicationSeed) {
    const { key, ...data } = a;
    applications[key] = await prisma.application.create({
      data: {
        ...data,
        userId: user.id,
        createdAt: data.dateApplied ?? subDays(new Date(), 10),
        updatedAt: subDays(new Date(), 1),
      },
    });
  }

  const outreachSeed = [
    {
      key: "sarah-email",
      contactId: contacts.sarah.id,
      companyId: companies.vercel.id,
      applicationId: applications.vercel.id,
      channel: OutreachChannel.COLD_EMAIL,
      subject: "Platform engineering at Vercel — quick intro",
      message:
        "Hi Sarah, I'm a DevOps engineer working on Kubernetes and developer platforms. I'd love to learn more about the infrastructure team at Vercel and whether the Senior DevOps role is still open.",
      sentAt: subDays(new Date(), 8),
      status: OutreachStatus.AWAITING_RESPONSE,
      nextFollowUp: at(0, 10),
      notes: "Warm intro from Marcus. Follow up if no reply by today.",
    },
    {
      key: "priya-linkedin",
      contactId: contacts.priya.id,
      companyId: companies.linear.id,
      applicationId: applications.linear.id,
      channel: OutreachChannel.LINKEDIN_CONNECTION,
      message:
        "Hi Priya — I've been following Linear's approach to building fast software. I'm a platform engineer exploring infra roles and would love to connect.",
      sentAt: subDays(new Date(), 14),
      status: OutreachStatus.REPLIED,
      responseStatus: "Accepted connection and asked for my resume.",
      nextFollowUp: at(2, 11),
      notes: "Sent resume. Recruiter screen scheduled.",
    },
    {
      key: "aisha-referral",
      contactId: contacts.aisha.id,
      companyId: companies.grafana.id,
      channel: OutreachChannel.REFERRAL_REQUEST,
      subject: "Referral for the Senior SRE role?",
      message:
        "Hey Aisha, hope you're doing well. I saw the Senior SRE opening at Grafana and it looks like a great fit. Would you be open to referring me? Happy to send a short summary.",
      sentAt: subDays(new Date(), 5),
      status: OutreachStatus.AWAITING_RESPONSE,
      nextFollowUp: at(1, 9),
      notes: "Aisha is checking with the hiring manager.",
    },
    {
      key: "elena-followup",
      contactId: contacts.elena.id,
      companyId: companies.stripe.id,
      applicationId: applications.stripe.id,
      channel: OutreachChannel.HR_FOLLOW_UP,
      subject: "Final interview — thank you",
      message:
        "Hi Elena, thank you for coordinating the final loop. I enjoyed meeting the reliability team and am very excited about the opportunity. Let me know if anything else is needed from me.",
      sentAt: subDays(new Date(), 2),
      status: OutreachStatus.FOLLOW_UP_DUE,
      nextFollowUp: at(0, 15),
      notes: "Follow up after today's final interview.",
    },
    {
      key: "maya-draft",
      contactId: contacts.maya.id,
      companyId: companies.cloudflare.id,
      applicationId: applications.cloudflare.id,
      channel: OutreachChannel.COLD_EMAIL,
      subject: "Systems Engineering at Cloudflare",
      message:
        "Hi Maya, I recently applied for the Systems Engineer role and wanted to introduce myself. I've spent the last five years building reliable cloud infrastructure with Kubernetes and Terraform.",
      status: OutreachStatus.READY_TO_SEND,
      nextFollowUp: at(1, 14),
      notes: "Add a specific reference to Cloudflare's reliability blog before sending.",
    },
    {
      key: "daniel-linkedin",
      contactId: contacts.daniel.id,
      companyId: companies.linear.id,
      applicationId: applications.linear.id,
      channel: OutreachChannel.LINKEDIN_MESSAGE,
      message:
        "Thanks for the notes on Linear's platform stack, Daniel. Really helpful. If you're open to it, I'd love to ask a couple of questions about the team's reliability work.",
      sentAt: subDays(new Date(), 4),
      status: OutreachStatus.REPLIED,
      responseStatus: "Happy to chat. Suggested a 20-minute call next week.",
      nextFollowUp: at(3, 17),
      notes: "Schedule a short call.",
    },
    {
      key: "marcus-thanks",
      contactId: contacts.marcus.id,
      companyId: companies.vercel.id,
      applicationId: applications.vercel.id,
      channel: OutreachChannel.COLD_EMAIL,
      subject: "Great meeting you at the platform meetup",
      message:
        "Hi Marcus, it was great meeting you at the platform meetup. I enjoyed our conversation about build systems at scale. I'd love to stay in touch as I explore infrastructure roles.",
      sentAt: subDays(new Date(), 7),
      status: OutreachStatus.SENT,
      nextFollowUp: at(2, 10),
      notes: "No reply yet.",
    },
    {
      key: "rohan-draft",
      contactId: contacts.rohan.id,
      companyId: companies.stripe.id,
      applicationId: applications.stripe.id,
      channel: OutreachChannel.HR_FOLLOW_UP,
      subject: "System design discussion — follow-up",
      message:
        "Hi Rohan, thank you for the thoughtful system design conversation. I've been thinking about the trade-offs we discussed around multi-region failover and would love to continue the conversation.",
      status: OutreachStatus.DRAFT,
      nextFollowUp: at(0, 12),
      notes: "Send after the final interview.",
    },
  ] as const;

  const outreach: Record<string, { id: string }> = {};
  for (const o of outreachSeed) {
    const { key, ...data } = o;
    outreach[key] = await prisma.outreach.create({
      data: {
        ...data,
        userId: user.id,
        createdAt: "sentAt" in data && data.sentAt ? data.sentAt : subDays(new Date(), 3),
      },
    });
  }

  const eventSeed = [
    {
      title: "Follow up with Sarah Chen",
      type: EventType.HR_FOLLOW_UP,
      startAt: at(0, 10),
      endAt: at(0, 10, 30),
      companyId: companies.vercel.id,
      contactId: contacts.sarah.id,
      applicationId: applications.vercel.id,
      description: "Send a short follow-up on the Senior DevOps application.",
      completed: false,
    },
    {
      title: "Stripe final interview",
      type: EventType.INTERVIEW,
      startAt: at(0, 15),
      endAt: at(0, 16),
      companyId: companies.stripe.id,
      contactId: contacts.elena.id,
      applicationId: applications.stripe.id,
      description: "Final loop with the reliability leadership team. Review incident response stories.",
      completed: false,
    },
    {
      title: "HashiCorp recruiter screening",
      type: EventType.RECRUITER_FOLLOW_UP,
      startAt: at(1, 11),
      endAt: at(1, 11, 30),
      companyId: companies.hashicorp.id,
      contactId: contacts.alex.id,
      applicationId: applications.hashicorp.id,
      description: "30-minute screen with talent acquisition.",
      completed: false,
    },
    {
      title: "Linear technical interview",
      type: EventType.INTERVIEW,
      startAt: at(2, 14),
      endAt: at(2, 15, 15),
      companyId: companies.linear.id,
      contactId: contacts.priya.id,
      applicationId: applications.linear.id,
      description: "Platform engineering deep dive. Prepare deployment pipeline examples.",
      completed: false,
    },
    {
      title: "Cloudflare application deadline",
      type: EventType.APPLICATION_DEADLINE,
      startAt: at(3, 23, 59),
      companyId: companies.cloudflare.id,
      applicationId: applications.cloudflare.id,
      description: "Last day to complete the systems engineering application.",
      completed: false,
    },
    {
      title: "Vercel technical interview",
      type: EventType.INTERVIEW,
      startAt: at(-1, 14),
      endAt: at(-1, 15),
      companyId: companies.vercel.id,
      contactId: contacts.marcus.id,
      applicationId: applications.vercel.id,
      description: "Deep dive on Kubernetes and deployment architecture.",
      completed: true,
    },
    {
      title: "Follow up with Rohan Mehta",
      type: EventType.HR_FOLLOW_UP,
      startAt: at(-1, 12),
      endAt: at(-1, 12, 30),
      companyId: companies.stripe.id,
      contactId: contacts.rohan.id,
      applicationId: applications.stripe.id,
      description: "Overdue follow-up after the system design conversation.",
      completed: false,
    },
    {
      title: "Railway offer call",
      type: EventType.CUSTOM,
      startAt: at(5, 16),
      endAt: at(5, 17),
      companyId: companies.railway.id,
      contactId: contacts.jordan.id,
      applicationId: applications.railway.id,
      description: "Discuss scope, equity, and start date with Jordan.",
      completed: false,
    },
    {
      title: "Grafana networking coffee chat",
      type: EventType.NETWORKING,
      startAt: at(6, 18),
      endAt: at(6, 18, 30),
      companyId: companies.grafana.id,
      contactId: contacts.aisha.id,
      description: "Casual chat with Aisha about the observability team.",
      completed: false,
    },
    {
      title: "Prepare Stripe system design notes",
      type: EventType.CUSTOM,
      startAt: at(-2, 20),
      endAt: at(-2, 21),
      companyId: companies.stripe.id,
      applicationId: applications.stripe.id,
      description: "Review multi-region failover and incident response scenarios.",
      completed: true,
    },
  ] as const;

  for (const e of eventSeed) {
    await prisma.calendarEvent.create({ data: { ...e, userId: user.id } });
  }

  const taskSeed = [
    {
      title: "Send thank-you note to Marcus",
      description: "Reference the build systems discussion and keep it concise.",
      priority: Priority.HIGH,
      dueDate: at(0, 18),
      companyId: companies.vercel.id,
      contactId: contacts.marcus.id,
      applicationId: applications.vercel.id,
      status: TaskStatus.PENDING,
    },
    {
      title: "Follow up with Rohan Mehta",
      description: "Overdue. Send a short note after the system design conversation.",
      priority: Priority.HIGH,
      dueDate: at(-1, 12),
      companyId: companies.stripe.id,
      contactId: contacts.rohan.id,
      applicationId: applications.stripe.id,
      status: TaskStatus.PENDING,
    },
    {
      title: "Prepare system design notes",
      description: "Multi-region failover, incident response, and reliability trade-offs.",
      priority: Priority.MEDIUM,
      dueDate: at(0, 20),
      companyId: companies.stripe.id,
      applicationId: applications.stripe.id,
      status: TaskStatus.IN_PROGRESS,
    },
    {
      title: "Tailor SRE resume for Grafana",
      description: "Emphasize Prometheus, Grafana, and large-scale observability work.",
      priority: Priority.MEDIUM,
      dueDate: at(2, 12),
      companyId: companies.grafana.id,
      contactId: contacts.aisha.id,
      applicationId: applications.grafana.id,
      status: TaskStatus.PENDING,
    },
    {
      title: "Research Railway engineering blog",
      description: "Understand their deployment architecture before the offer call.",
      priority: Priority.LOW,
      dueDate: at(3, 17),
      companyId: companies.railway.id,
      applicationId: applications.railway.id,
      status: TaskStatus.PENDING,
    },
    {
      title: "Send follow-up to Aisha",
      description: "Ask whether the referral was submitted and if a role is opening.",
      priority: Priority.HIGH,
      dueDate: at(0, 16),
      companyId: companies.grafana.id,
      contactId: contacts.aisha.id,
      applicationId: applications.grafana.id,
      status: TaskStatus.PENDING,
    },
    {
      title: "Review Stripe offer details",
      description: "Compare compensation, equity, and hybrid expectations.",
      priority: Priority.HIGH,
      dueDate: at(4, 19),
      companyId: companies.stripe.id,
      contactId: contacts.elena.id,
      applicationId: applications.stripe.id,
      status: TaskStatus.PENDING,
    },
    {
      title: "Update LinkedIn headline",
      description: "Reflect platform engineering and SRE focus.",
      priority: Priority.LOW,
      dueDate: subDays(new Date(), 3),
      status: TaskStatus.COMPLETED,
      completedAt: subDays(new Date(), 2),
    },
  ] as const;

  for (const t of taskSeed) {
    await prisma.task.create({ data: { ...t, userId: user.id } });
  }

  const templates = [
    {
      name: "Cold email to HR",
      category: "Cold email",
      subject: "Quick introduction — {{job_title}} at {{company}}",
      body: `Hi {{name}},

I'm {{candidate_name}}, a platform engineer with experience building reliable cloud infrastructure. I noticed the {{job_title}} opening at {{company}} and wanted to introduce myself.

I've recently worked on:
• Running Kubernetes at scale across multiple regions
• Reducing deployment lead time with Terraform and CI/CD
• Improving reliability through observability and incident response

Would you be open to a short conversation about the role?

Best,
{{candidate_name}}`,
      isDefault: true,
    },
    {
      name: "Cold email to recruiter",
      category: "Cold email",
      subject: "{{job_title}} at {{company}} — {{candidate_name}}",
      body: `Hi {{name}},

I hope you're having a good week. I'm reaching out about the {{job_title}} role at {{company}}. My background is in cloud infrastructure, Kubernetes, and reliability engineering, and the team's work is exactly the kind of problem I want to be solving.

I've attached my resume and would be glad to share more detail if it's useful.

Thanks,
{{candidate_name}}`,
      isDefault: true,
    },
    {
      name: "Referral request",
      category: "Referral",
      subject: "Quick referral question — {{company}}",
      body: `Hi {{name}},

Hope you're doing well. I'm exploring the {{job_title}} opening at {{company}} and it looks like a strong fit for my background in cloud infrastructure and SRE.

Would you be comfortable referring me internally, or pointing me to the right person on the team? Happy to send a short summary and my resume.

Really appreciate it,
{{candidate_name}}`,
      isDefault: true,
    },
    {
      name: "LinkedIn connection request",
      category: "LinkedIn",
      subject: "Connection request",
      body: `Hi {{name}} — I've been following the infrastructure work at {{company}} and would love to connect. I'm a platform engineer exploring {{job_title}} roles and would value your perspective.`,
      isDefault: true,
    },
    {
      name: "LinkedIn follow-up",
      category: "LinkedIn",
      subject: "Following up",
      body: `Hi {{name}}, thanks for connecting. I wanted to follow up on my note about the {{job_title}} role at {{company}}. I'd be glad to share a bit more about my background if that's helpful.`,
      isDefault: true,
    },
    {
      name: "Post-interview thank-you",
      category: "Interview",
      subject: "Thank you — {{job_title}} conversation",
      body: `Hi {{name}},

Thank you for taking the time to speak with me about the {{job_title}} role at {{company}}. I really enjoyed learning more about the team and the problems you're working on.

The conversation reinforced my excitement about the opportunity. Please let me know if there's anything else I can provide.

Best,
{{candidate_name}}`,
      isDefault: true,
    },
    {
      name: "Application follow-up",
      category: "Follow-up",
      subject: "Following up on my {{job_title}} application",
      body: `Hi {{name}},

I wanted to follow up on my application for the {{job_title}} role at {{company}}. I remain very interested and would be glad to provide any additional information.

Thanks,
{{candidate_name}}`,
      isDefault: true,
    },
  ];

  for (const t of templates) {
    await prisma.emailTemplate.create({ data: { ...t, userId: user.id } });
  }

  const activitySeed = [
    {
      type: ActivityType.INTERVIEW_SCHEDULED,
      title: "Stripe final interview scheduled",
      description: "Final loop with the reliability leadership team · Today at 3:00 PM",
      companyId: companies.stripe.id,
      applicationId: applications.stripe.id,
      createdAt: subHours(new Date(), 2),
    },
    {
      type: ActivityType.FOLLOW_UP_COMPLETED,
      title: "Follow-up completed with Daniel Park",
      description: "Replied on LinkedIn and agreed to a short call next week.",
      companyId: companies.linear.id,
      contactId: contacts.daniel.id,
      applicationId: applications.linear.id,
      createdAt: subHours(new Date(), 5),
    },
    {
      type: ActivityType.LINKEDIN_MESSAGE,
      title: "LinkedIn message sent to Daniel Park",
      description: "Asked about Linear's platform reliability work.",
      companyId: companies.linear.id,
      contactId: contacts.daniel.id,
      createdAt: subDays(new Date(), 1),
    },
    {
      type: ActivityType.STATUS_UPDATED,
      title: "Vercel application moved to Technical Interview",
      description: "Application status updated from Recruiter Screening.",
      companyId: companies.vercel.id,
      applicationId: applications.vercel.id,
      createdAt: subDays(new Date(), 1),
    },
    {
      type: ActivityType.HR_CONTACTED,
      title: "Cold email sent to Maya Patel",
      description: "Cloudflare Systems Engineer · Outreach marked ready to send.",
      companyId: companies.cloudflare.id,
      contactId: contacts.maya.id,
      applicationId: applications.cloudflare.id,
      createdAt: subDays(new Date(), 2),
    },
    {
      type: ActivityType.APPLICATION_SUBMITTED,
      title: "Applied to Cloudflare",
      description: "Systems Engineer · Remote",
      companyId: companies.cloudflare.id,
      applicationId: applications.cloudflare.id,
      createdAt: subDays(new Date(), 6),
    },
    {
      type: ActivityType.OUTREACH_SENT,
      title: "Referral request sent to Aisha Khan",
      description: "Grafana Labs · Senior SRE",
      companyId: companies.grafana.id,
      contactId: contacts.aisha.id,
      createdAt: subDays(new Date(), 5),
    },
    {
      type: ActivityType.APPLICATION_SUBMITTED,
      title: "Applied to HashiCorp",
      description: "Site Reliability Engineer II · Referred by Alex Kim",
      companyId: companies.hashicorp.id,
      applicationId: applications.hashicorp.id,
      createdAt: subDays(new Date(), 9),
    },
    {
      type: ActivityType.CONTACT_ADDED,
      title: "Added Sarah Chen at Vercel",
      description: "Senior Technical Recruiter · Warm intro available.",
      companyId: companies.vercel.id,
      contactId: contacts.sarah.id,
      createdAt: subDays(new Date(), 10),
    },
    {
      type: ActivityType.COMPANY_ADDED,
      title: "Added Vercel to target companies",
      description: "Priority: High · Developer Tools",
      companyId: companies.vercel.id,
      createdAt: subDays(new Date(), 18),
    },
  ];

  for (const a of activitySeed) {
    await prisma.activityLog.create({ data: { ...a, userId: user.id } });
  }

  console.log("✅ Seed complete");
  console.log(`   Demo account: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("❌ Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
