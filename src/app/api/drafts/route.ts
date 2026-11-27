import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

const MAX_KEY_LENGTH = 200;
const MAX_DRAFT_LENGTH = 100_000;

const keySchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_KEY_LENGTH)
  .regex(/^[A-Za-z0-9._:/-]+$/, "Invalid draft key");

const putSchema = z.object({
  key: keySchema,
  data: z.unknown().refine((value) => value !== undefined, "Draft data is required"),
});

const NO_STORE = { "Cache-Control": "private, no-store" };

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE });
}

function toJsonValue(data: unknown): Prisma.InputJsonValue | null {
  try {
    const serialized = JSON.stringify(data);
    if (serialized === undefined || serialized.length > MAX_DRAFT_LENGTH) return null;
    return JSON.parse(serialized) as Prisma.InputJsonValue;
  } catch {
    return null;
  }
}

function readKey(request: Request) {
  const raw = new URL(request.url).searchParams.get("key");
  const parsed = keySchema.safeParse(raw ?? "");
  return parsed.success ? parsed.data : null;
}

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  const key = readKey(request);
  if (!key) return badRequest("A valid draft key is required");

  const draft = await prisma.userDraft.findUnique({
    where: { userId_key: { userId, key } },
    select: { data: true, updatedAt: true },
  });

  return NextResponse.json(
    {
      draft: draft
        ? { key, data: draft.data, updatedAt: draft.updatedAt.toISOString() }
        : null,
    },
    { headers: NO_STORE },
  );
}

export async function PUT(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const parsed = putSchema.safeParse(body);
  if (!parsed.success) return badRequest("A valid draft key and data are required");

  const data = toJsonValue(parsed.data.data);
  if (data === null) return badRequest("Draft is too large or not JSON serializable");

  const draft = await prisma.userDraft.upsert({
    where: { userId_key: { userId, key: parsed.data.key } },
    create: { userId, key: parsed.data.key, data },
    update: { data },
    select: { updatedAt: true },
  });

  return NextResponse.json(
    { ok: true, updatedAt: draft.updatedAt.toISOString() },
    { headers: NO_STORE },
  );
}

export async function DELETE(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  const key = readKey(request);
  if (!key) return badRequest("A valid draft key is required");

  await prisma.userDraft.deleteMany({ where: { userId, key } });
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
