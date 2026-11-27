import {
  ApplicationStatus,
  CompanyStatus,
  ContactType,
  EventType,
  JobCaptureKind,
  JobCaptureStatus,
  JobSource,
  OutreachChannel,
  OutreachStatus,
  Priority,
  RelationshipStatus,
  TaskStatus,
  WorkMode,
} from "@prisma/client";
import { z } from "zod";

// Empty strings and null both mean "clear this field". Undefined means the
// caller did not touch the field, which matters for partial updates.
const optionalText = z.preprocess(
  (value) => (value === null || (typeof value === "string" && value.trim() === "") ? null : value),
  z.string().trim().nullable().optional(),
);

const optionalUrl = z.preprocess(
  (value) => (value === null || (typeof value === "string" && value.trim() === "") ? null : value),
  z.string().trim().url("Enter a valid URL").nullable().optional(),
);

const optionalDate = z.preprocess(
  (value) => (value === null || (typeof value === "string" && value.trim() === "") ? null : value),
  z.string().datetime({ offset: true }).or(z.string().datetime()).nullable().optional(),
);

const optionalEmail = z.preprocess(
  (value) => (value === null || (typeof value === "string" && value.trim() === "") ? null : value),
  z.string().trim().email("Enter a valid email").nullable().optional(),
);

const companyFields = {
  name: z.string().trim().min(2, "Company name is required").max(120),
  logoUrl: optionalUrl,
  website: optionalUrl,
  careersUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  industry: optionalText,
  location: optionalText,
  size: optionalText,
  priority: z.nativeEnum(Priority),
  status: z.nativeEnum(CompanyStatus),
  notes: optionalText,
};

const applicationFields = {
  title: z.string().trim().min(2, "Job title is required").max(160),
  description: optionalText,
  postingUrl: optionalUrl,
  careersUrl: optionalUrl,
  location: optionalText,
  workMode: z.nativeEnum(WorkMode),
  employmentType: z.string().trim().min(1).optional(),
  salaryRange: optionalText,
  dateApplied: optionalDate,
  resumeId: optionalText,
  referralSource: optionalText,
  status: z.nativeEnum(ApplicationStatus),
  nextFollowUp: optionalDate,
  notes: optionalText,
};

const contactFields = {
  fullName: z.string().trim().min(2, "Contact name is required").max(120),
  avatarUrl: optionalUrl,
  companyId: optionalText,
  designation: optionalText,
  department: optionalText,
  email: optionalEmail,
  linkedinUrl: optionalUrl,
  phone: optionalText,
  type: z.nativeEnum(ContactType),
  relationship: z.nativeEnum(RelationshipStatus),
  notes: optionalText,
};

const eventFields = {
  title: z.string().trim().min(2, "Event title is required").max(160),
  type: z.nativeEnum(EventType),
  startAt: z.string().min(1, "Choose a date and time"),
  endAt: optionalDate,
  allDay: z.boolean(),
  companyId: optionalText,
  contactId: optionalText,
  applicationId: optionalText,
  description: optionalText,
  completed: z.boolean(),
};

const taskFields = {
  title: z.string().trim().min(2, "Task title is required").max(160),
  description: optionalText,
  priority: z.nativeEnum(Priority),
  dueDate: optionalDate,
  companyId: optionalText,
  contactId: optionalText,
  applicationId: optionalText,
  status: z.nativeEnum(TaskStatus),
  completedAt: optionalDate,
};

const outreachFields = {
  contactId: z.string().min(1, "Choose a contact"),
  companyId: z.string().min(1, "Choose a company"),
  applicationId: optionalText,
  channel: z.nativeEnum(OutreachChannel),
  subject: optionalText,
  message: z.string().trim().min(1, "Message is required"),
  sentAt: optionalDate,
  status: z.nativeEnum(OutreachStatus),
  responseStatus: optionalText,
  nextFollowUp: optionalDate,
  notes: optionalText,
};

const templateFields = {
  name: z.string().trim().min(2, "Template name is required").max(120),
  category: z.string().trim().min(1, "Category is required").max(60),
  subject: z.string().trim().max(200),
  body: z.string().trim().min(1, "Template body is required"),
  isDefault: z.boolean(),
};

// Create schemas supply defaults; update schemas never do, so a partial patch
// cannot silently reset fields the user did not touch.
export const companyCreateSchema = z.object({
  ...companyFields,
  priority: companyFields.priority.default(Priority.MEDIUM),
  status: companyFields.status.default(CompanyStatus.TARGET),
});
export const companyUpdateSchema = z.object(companyFields).partial();

export const applicationCreateSchema = z.object({
  companyId: z.string().min(1, "Choose a company"),
  ...applicationFields,
  workMode: applicationFields.workMode.default(WorkMode.REMOTE),
  status: applicationFields.status.default(ApplicationStatus.INTERESTED),
});
export const applicationUpdateSchema = z
  .object({
    companyId: z.string().trim().min(1, "Choose a company").optional(),
    ...applicationFields,
  })
  .partial();

export const contactCreateSchema = z.object({
  ...contactFields,
  type: contactFields.type.default(ContactType.OTHER),
  relationship: contactFields.relationship.default(RelationshipStatus.NOT_CONTACTED),
});
export const contactUpdateSchema = z.object(contactFields).partial();

export const eventCreateSchema = z.object({
  ...eventFields,
  type: eventFields.type.default(EventType.HR_FOLLOW_UP),
  allDay: eventFields.allDay.default(false),
  completed: eventFields.completed.default(false),
});
export const eventUpdateSchema = z.object(eventFields).partial();

export const taskCreateSchema = z.object({
  ...taskFields,
  priority: taskFields.priority.default(Priority.MEDIUM),
  status: taskFields.status.default(TaskStatus.PENDING),
  completedAt: optionalDate,
});
export const taskUpdateSchema = z.object(taskFields).partial();

export const outreachCreateSchema = z.object({
  ...outreachFields,
  channel: outreachFields.channel,
  status: outreachFields.status.default(OutreachStatus.DRAFT),
});
export const outreachUpdateSchema = z.object(outreachFields).partial();

export const templateCreateSchema = z.object({
  ...templateFields,
  subject: z.string().trim().max(200).default(""),
  isDefault: templateFields.isDefault.default(false),
});
export const templateUpdateSchema = z.object(templateFields).partial();

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80).optional(),
  headline: optionalText,
  location: optionalText,
  phone: optionalText,
  openToWork: z.boolean().optional(),
  currentDesignation: optionalText,
  totalExperience: optionalText,
  currentCompany: optionalText,
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  preferredRoles: z.array(z.string().trim().min(1)).optional(),
  preferredLocations: z.array(z.string().trim().min(1)).optional(),
  workMode: z.nativeEnum(WorkMode).nullable().optional(),
  expectedSalary: optionalText,
  noticePeriod: optionalText,
  skills: z.array(z.string().trim().min(1)).optional(),
  bio: optionalText,
  projectsAchievements: optionalText,
});

const savedSearchCityNames = z.array(z.string().trim().min(1).max(120)).optional();

const savedSearchFields = {
  name: z.string().trim().min(2, "Give this search a name").max(80),
  query: z.string().trim().min(1, "Enter a role or keyword").max(160),
  location: optionalText,
  locations: savedSearchCityNames,
  experienceMin: z.number().int().min(0).max(50).nullable().optional(),
  experienceMax: z.number().int().min(0).max(50).nullable().optional(),
  postedWithinHours: z.number().int().min(1).max(2160).nullable().optional(),
  sources: z.array(z.nativeEnum(JobSource)).min(1, "Choose at least one portal"),
};

export const savedSearchCreateSchema = z
  .object(savedSearchFields)
  .refine(
    (data) =>
      data.experienceMin == null ||
      data.experienceMax == null ||
      data.experienceMin <= data.experienceMax,
    { message: "Minimum experience cannot be greater than maximum", path: ["experienceMin"] },
  );

export const savedSearchUpdateSchema = z
  .object(savedSearchFields)
  .partial()
  .refine(
    (data) =>
      data.experienceMin == null ||
      data.experienceMax == null ||
      data.experienceMin <= data.experienceMax,
    { message: "Minimum experience cannot be greater than maximum", path: ["experienceMin"] },
  );

const capturedJobSchema = z.object({
  externalId: optionalText,
  url: z.string().trim().url("Captured job needs a valid URL"),
  title: z.string().trim().min(2).max(160),
  company: z.string().trim().min(2).max(120),
  companyUrl: optionalUrl,
  location: optionalText,
  employmentType: optionalText,
  experienceMin: z.number().int().min(0).max(50).nullable().optional(),
  experienceMax: z.number().int().min(0).max(50).nullable().optional(),
  postedAt: optionalDate,
  appliedAt: optionalDate,
  description: optionalText,
  salaryText: optionalText,
});

export const jobIngestSchema = z.object({
  source: z.nativeEnum(JobSource),
  kind: z.nativeEnum(JobCaptureKind),
  savedSearchId: optionalText,
  searchQuery: optionalText,
  searchLocation: optionalText,
  jobs: z.array(capturedJobSchema).min(1, "No jobs were captured").max(100, "Capture at most 100 jobs at once"),
});

export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;
export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>;
export type ApplicationUpdateInput = z.infer<typeof applicationUpdateSchema>;
export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;
export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;
export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type OutreachCreateInput = z.infer<typeof outreachCreateSchema>;
export type OutreachUpdateInput = z.infer<typeof outreachUpdateSchema>;
export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type SavedSearchCreateInput = z.infer<typeof savedSearchCreateSchema>;
export type SavedSearchUpdateInput = z.infer<typeof savedSearchUpdateSchema>;
export type JobIngestInput = z.infer<typeof jobIngestSchema>;

export const jobCaptureUpdateSchema = z.object({
  status: z.nativeEnum(JobCaptureStatus),
});
export type JobCaptureUpdateInput = z.infer<typeof jobCaptureUpdateSchema>;

export function firstZodMessage(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallback;
  }
  return fallback;
}

export function isZodError(error: unknown) {
  return error instanceof z.ZodError;
}
