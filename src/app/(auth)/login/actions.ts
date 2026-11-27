"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export type LoginState = {
  error?: string;
  fields?: { email?: string };
};

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check your details and try again.",
      fields: { email: String(formData.get("email") ?? "") },
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, passwordHash: true },
  });

  if (!user) {
    return {
      error: "No account found with that email address.",
      fields: { email: parsed.data.email },
    };
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return {
      error: "That password doesn't match. Try again.",
      fields: { email: parsed.data.email },
    };
  }

  await createSession(user.id);
  redirect("/");
}

export async function demoLoginAction() {
  const user = await prisma.user.findUnique({
    where: { email: "demo@careeros.app" },
    select: { id: true },
  });

  if (!user) {
    redirect("/login?error=demo-unavailable");
  }

  await createSession(user.id);
  redirect("/");
}
