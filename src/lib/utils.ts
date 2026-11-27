import { type ClassValue, clsx } from "clsx";
import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

export function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? parseISO(value) : value;
}

export function formatShortDate(value: Date | string | null | undefined) {
  const date = toDate(value);
  if (!date) return "—";
  return format(date, "MMM d");
}

export function formatDate(value: Date | string | null | undefined) {
  const date = toDate(value);
  if (!date) return "—";
  return format(date, "MMM d, yyyy");
}

export function formatDateTime(value: Date | string | null | undefined) {
  const date = toDate(value);
  if (!date) return "—";
  return format(date, "MMM d, yyyy · h:mm a");
}

export function formatTime(value: Date | string | null | undefined) {
  const date = toDate(value);
  if (!date) return "—";
  return format(date, "h:mm a");
}

export function friendlyDate(value: Date | string | null | undefined) {
  const date = toDate(value);
  if (!date) return "—";
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE, MMM d");
}

export function relativeTime(value: Date | string | null | undefined) {
  const date = toDate(value);
  if (!date) return "—";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
