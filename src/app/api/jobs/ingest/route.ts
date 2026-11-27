import { NextResponse } from "next/server";
import { ingestCapturedJobs, portalCorsHeaders, resolveApiUser } from "@/lib/job-radar";
import { firstZodMessage, isZodError, jobIngestSchema } from "@/lib/validations";

function corsJson(request: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: portalCorsHeaders(request) });
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...portalCorsHeaders(request),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function POST(request: Request) {
  const headers = portalCorsHeaders(request);
  const userId = await resolveApiUser(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }

  try {
    const input = jobIngestSchema.parse(await request.json());
    const result = await ingestCapturedJobs(userId, input);
    return corsJson(request, result);
  } catch (error) {
    return corsJson(
      request,
      { error: firstZodMessage(error, "Could not save captured jobs.") },
      isZodError(error) ? 400 : 500,
    );
  }
}
