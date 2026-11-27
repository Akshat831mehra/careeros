import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import {
  ensureIntegrationToken,
  regenerateIntegrationToken,
} from "@/lib/job-radar";

export async function GET() {
  const user = await requireUser();
  const token = await ensureIntegrationToken(user.id);
  return NextResponse.json({ token });
}

export async function POST() {
  const user = await requireUser();
  const token = await regenerateIntegrationToken(user.id);
  return NextResponse.json({ token });
}
