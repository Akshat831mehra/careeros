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

export type BadgeVariant =
  | "default"
  | "brand"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "outline"
  | "solid";

type Option<T extends string> = { value: T; label: string };

function options<T extends string>(values: readonly T[], labels: Record<T, string>): Option<T>[] {
  return values.map((value) => ({ value, label: labels[value] }));
}

export const PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const satisfies readonly Priority[];
export const PRIORITY_LABELS: Record<Priority, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};
export const PRIORITY_VARIANTS: Record<Priority, BadgeVariant> = {
  HIGH: "danger",
  MEDIUM: "warning",
  LOW: "default",
};
export const PRIORITY_OPTIONS = options(PRIORITIES, PRIORITY_LABELS);

export const COMPANY_STATUSES = [
  "TARGET",
  "CONTACTED",
  "APPLIED",
  "NOT_INTERESTED",
] as const satisfies readonly CompanyStatus[];
export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  TARGET: "Target",
  CONTACTED: "Contacted",
  APPLIED: "Applied",
  NOT_INTERESTED: "Not interested",
};
export const COMPANY_STATUS_VARIANTS: Record<CompanyStatus, BadgeVariant> = {
  TARGET: "default",
  CONTACTED: "brand",
  APPLIED: "info",
  NOT_INTERESTED: "danger",
};
export const COMPANY_STATUS_OPTIONS = options(COMPANY_STATUSES, COMPANY_STATUS_LABELS);

export const WORK_MODES = ["REMOTE", "HYBRID", "ONSITE"] as const satisfies readonly WorkMode[];
export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
};
export const WORK_MODE_OPTIONS = options(WORK_MODES, WORK_MODE_LABELS);

export const APPLICATION_STATUSES = [
  "INTERESTED",
  "PREPARING",
  "APPLIED",
  "HR_CONTACTED",
  "RECRUITER_SCREENING",
  "TECHNICAL_INTERVIEW",
  "MANAGERIAL_INTERVIEW",
  "FINAL_INTERVIEW",
  "OFFER_RECEIVED",
  "REJECTED",
  "WITHDRAWN",
] as const satisfies readonly ApplicationStatus[];
export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  INTERESTED: "Interested",
  PREPARING: "Preparing",
  APPLIED: "Applied",
  HR_CONTACTED: "HR contacted",
  RECRUITER_SCREENING: "Recruiter screening",
  TECHNICAL_INTERVIEW: "Technical interview",
  MANAGERIAL_INTERVIEW: "Managerial interview",
  FINAL_INTERVIEW: "Final interview",
  OFFER_RECEIVED: "Offer received",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};
export const APPLICATION_STATUS_VARIANTS: Record<ApplicationStatus, BadgeVariant> = {
  INTERESTED: "default",
  PREPARING: "default",
  APPLIED: "info",
  HR_CONTACTED: "brand",
  RECRUITER_SCREENING: "brand",
  TECHNICAL_INTERVIEW: "warning",
  MANAGERIAL_INTERVIEW: "warning",
  FINAL_INTERVIEW: "warning",
  OFFER_RECEIVED: "success",
  REJECTED: "danger",
  WITHDRAWN: "danger",
};
export const APPLICATION_STATUS_OPTIONS = options(APPLICATION_STATUSES, APPLICATION_STATUS_LABELS);

export const CONTACT_TYPES = [
  "HR",
  "RECRUITER",
  "TALENT_ACQUISITION",
  "ENGINEERING_MANAGER",
  "DEVOPS_LEAD",
  "SRE_MANAGER",
  "CTO",
  "SENIOR_ENGINEER",
  "EMPLOYEE_REFERRAL",
  "OTHER",
] as const satisfies readonly ContactType[];
export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  HR: "HR",
  RECRUITER: "Recruiter",
  TALENT_ACQUISITION: "Talent acquisition",
  ENGINEERING_MANAGER: "Engineering manager",
  DEVOPS_LEAD: "DevOps lead",
  SRE_MANAGER: "SRE manager",
  CTO: "CTO",
  SENIOR_ENGINEER: "Senior engineer",
  EMPLOYEE_REFERRAL: "Employee referral",
  OTHER: "Other",
};
export const CONTACT_TYPE_OPTIONS = options(CONTACT_TYPES, CONTACT_TYPE_LABELS);

export const RELATIONSHIP_STATUSES = [
  "NOT_CONTACTED",
  "CONTACTED",
  "CONNECTED_ON_LINKEDIN",
  "REPLIED",
  "FOLLOW_UP_REQUIRED",
  "INTERESTED",
  "NOT_INTERESTED",
] as const satisfies readonly RelationshipStatus[];
export const RELATIONSHIP_STATUS_LABELS: Record<RelationshipStatus, string> = {
  NOT_CONTACTED: "Not contacted",
  CONTACTED: "Contacted",
  CONNECTED_ON_LINKEDIN: "Connected on LinkedIn",
  REPLIED: "Replied",
  FOLLOW_UP_REQUIRED: "Follow-up required",
  INTERESTED: "Interested",
  NOT_INTERESTED: "Not interested",
};
export const RELATIONSHIP_STATUS_VARIANTS: Record<RelationshipStatus, BadgeVariant> = {
  NOT_CONTACTED: "default",
  CONTACTED: "info",
  CONNECTED_ON_LINKEDIN: "brand",
  REPLIED: "success",
  FOLLOW_UP_REQUIRED: "warning",
  INTERESTED: "success",
  NOT_INTERESTED: "danger",
};
export const RELATIONSHIP_STATUS_OPTIONS = options(RELATIONSHIP_STATUSES, RELATIONSHIP_STATUS_LABELS);

export const OUTREACH_CHANNELS = [
  "COLD_EMAIL",
  "LINKEDIN_CONNECTION",
  "LINKEDIN_MESSAGE",
  "REFERRAL_REQUEST",
  "HR_FOLLOW_UP",
] as const satisfies readonly OutreachChannel[];
export const OUTREACH_CHANNEL_LABELS: Record<OutreachChannel, string> = {
  COLD_EMAIL: "Cold email",
  LINKEDIN_CONNECTION: "LinkedIn connection",
  LINKEDIN_MESSAGE: "LinkedIn message",
  REFERRAL_REQUEST: "Referral request",
  HR_FOLLOW_UP: "HR follow-up",
};
export const OUTREACH_CHANNEL_OPTIONS = options(OUTREACH_CHANNELS, OUTREACH_CHANNEL_LABELS);

export const OUTREACH_STATUSES = [
  "DRAFT",
  "READY_TO_SEND",
  "SENT",
  "AWAITING_RESPONSE",
  "REPLIED",
  "FOLLOW_UP_DUE",
  "COMPLETED",
] as const satisfies readonly OutreachStatus[];
export const OUTREACH_STATUS_LABELS: Record<OutreachStatus, string> = {
  DRAFT: "Draft",
  READY_TO_SEND: "Ready to send",
  SENT: "Sent",
  AWAITING_RESPONSE: "Awaiting response",
  REPLIED: "Replied",
  FOLLOW_UP_DUE: "Follow-up due",
  COMPLETED: "Completed",
};
export const OUTREACH_STATUS_VARIANTS: Record<OutreachStatus, BadgeVariant> = {
  DRAFT: "default",
  READY_TO_SEND: "info",
  SENT: "brand",
  AWAITING_RESPONSE: "warning",
  REPLIED: "success",
  FOLLOW_UP_DUE: "danger",
  COMPLETED: "success",
};
export const OUTREACH_STATUS_OPTIONS = options(OUTREACH_STATUSES, OUTREACH_STATUS_LABELS);

export const EVENT_TYPES = [
  "HR_FOLLOW_UP",
  "RECRUITER_FOLLOW_UP",
  "INTERVIEW",
  "TECHNICAL_ASSESSMENT",
  "APPLICATION_DEADLINE",
  "NETWORKING",
  "CUSTOM",
] as const satisfies readonly EventType[];
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  HR_FOLLOW_UP: "HR follow-up",
  RECRUITER_FOLLOW_UP: "Recruiter follow-up",
  INTERVIEW: "Interview",
  TECHNICAL_ASSESSMENT: "Technical assessment",
  APPLICATION_DEADLINE: "Application deadline",
  NETWORKING: "Networking reminder",
  CUSTOM: "Custom task",
};
export const EVENT_TYPE_VARIANTS: Record<EventType, BadgeVariant> = {
  HR_FOLLOW_UP: "brand",
  RECRUITER_FOLLOW_UP: "brand",
  INTERVIEW: "warning",
  TECHNICAL_ASSESSMENT: "info",
  APPLICATION_DEADLINE: "danger",
  NETWORKING: "success",
  CUSTOM: "default",
};
export const EVENT_TYPE_OPTIONS = options(EVENT_TYPES, EVENT_TYPE_LABELS);

export const TASK_STATUSES = ["PENDING", "IN_PROGRESS", "COMPLETED"] as const satisfies readonly TaskStatus[];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
};
export const TASK_STATUS_VARIANTS: Record<TaskStatus, BadgeVariant> = {
  PENDING: "default",
  IN_PROGRESS: "brand",
  COMPLETED: "success",
};
export const TASK_STATUS_OPTIONS = options(TASK_STATUSES, TASK_STATUS_LABELS);

export const JOB_SOURCES = [
  "LINKEDIN",
  "NAUKRI",
  "INDEED",
  "INSTAHYRE",
  "CUTSHORT",
  "HIRIST",
  "WELLFOUND",
  "OTHER",
] as const satisfies readonly JobSource[];
export const JOB_SOURCE_LABELS: Record<JobSource, string> = {
  LINKEDIN: "LinkedIn",
  NAUKRI: "Naukri",
  INDEED: "Indeed",
  INSTAHYRE: "Instahyre",
  CUTSHORT: "Cutshort",
  HIRIST: "Hirist",
  WELLFOUND: "Wellfound",
  OTHER: "Other",
};
export const JOB_SOURCE_VARIANTS: Record<JobSource, BadgeVariant> = {
  LINKEDIN: "brand",
  NAUKRI: "warning",
  INDEED: "info",
  INSTAHYRE: "success",
  CUTSHORT: "brand",
  HIRIST: "warning",
  WELLFOUND: "info",
  OTHER: "default",
};
export const JOB_SOURCE_OPTIONS = options(JOB_SOURCES, JOB_SOURCE_LABELS);

export const JOB_CAPTURE_KINDS = ["SEARCH_RESULT", "APPLIED"] as const satisfies readonly JobCaptureKind[];
export const JOB_CAPTURE_KIND_LABELS: Record<JobCaptureKind, string> = {
  SEARCH_RESULT: "Discovered",
  APPLIED: "Applied",
};
export const JOB_CAPTURE_KIND_VARIANTS: Record<JobCaptureKind, BadgeVariant> = {
  SEARCH_RESULT: "default",
  APPLIED: "success",
};

export const JOB_CAPTURE_STATUSES = ["NEW", "TRACKED", "IGNORED"] as const satisfies readonly JobCaptureStatus[];
export const JOB_CAPTURE_STATUS_LABELS: Record<JobCaptureStatus, string> = {
  NEW: "New",
  TRACKED: "Tracked",
  IGNORED: "Ignored",
};
export const JOB_CAPTURE_STATUS_VARIANTS: Record<JobCaptureStatus, BadgeVariant> = {
  NEW: "warning",
  TRACKED: "success",
  IGNORED: "default",
};
