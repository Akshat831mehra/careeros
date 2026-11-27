"use client";

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data;
}

export function postJson<T = unknown>(url: string, body: unknown) {
  return request<T>(url, { method: "POST", body: JSON.stringify(body) });
}

export function patchJson<T = unknown>(url: string, body: unknown) {
  return request<T>(url, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteJson<T = unknown>(url: string) {
  return request<T>(url, { method: "DELETE" });
}

export function toIsoDate(value: string | null | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
