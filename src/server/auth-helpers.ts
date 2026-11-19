import "server-only";
import { redirect } from "next/navigation";
import { auth, type AppRole } from "@/auth";

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: AppRole;
}

/** Current signed-in user, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, email: session.user.email ?? null, name: session.user.name ?? null, image: session.user.image ?? null, role: session.user.role ?? "USER" };
}

/** Only allow same-site relative redirect targets (prevents open redirects). */
export function safeCallback(value: unknown, fallback = "/account"): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : fallback;
}

export async function requireUser(callbackUrl = "/account"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/sign-in?callbackUrl=${encodeURIComponent(safeCallback(callbackUrl))}`);
  return user;
}

export async function requireRole(roles: AppRole[], callbackUrl: string): Promise<SessionUser> {
  const user = await requireUser(callbackUrl);
  if (!roles.includes(user.role) && user.role !== "ADMIN") redirect("/account?denied=1");
  return user;
}

export function unauthorized(): Response {
  return Response.json({ error: "Sign in required" }, { status: 401 });
}
