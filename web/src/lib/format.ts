import type { Classroom, Student } from "./types";

const DAY_MS = 86_400_000;

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function endOfToday(): Date {
  return new Date(startOfToday().getTime() + DAY_MS - 1);
}

export function startOfDaysAgo(days: number): Date {
  return new Date(startOfToday().getTime() - days * DAY_MS);
}

export function nameOf(student: Pick<Student, "firstName" | "lastName">) {
  return [student.firstName, student.lastName].filter(Boolean).join(" ");
}

export function initialsOf(student: Pick<Student, "firstName" | "lastName">) {
  return `${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase();
}

export function classLabel(classroom: Pick<Classroom, "period" | "name">) {
  return `${classroom.period} · ${classroom.name}`;
}

export function classShort(classroom: Pick<Classroom, "period">) {
  return classroom.period.replace(/^Period\s+/i, "P");
}

export function formatTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDay(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatDateHeading(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(value);
}

export function formatRelativeDay(value: string | Date) {
  const day = new Date(value);
  const today = startOfToday();
  const target = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const diff = Math.round((today.getTime() - target.getTime()) / DAY_MS);
  if (diff === 0) return `Today · ${formatTime(day)}`;
  if (diff === 1) return "Yesterday";
  return formatDay(day);
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
