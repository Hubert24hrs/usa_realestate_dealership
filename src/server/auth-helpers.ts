import "server-only";

export interface SessionUser {
  id: string;
  email: string | null;
  name: string | null;
  role: "USER" | "AGENT" | "BROKER" | "PROPERTY_MANAGER" | "ADMIN";
}

/** Current signed-in user, or null. (Auth.js wiring lands in Phase 4.) */
export async function getSessionUser(): Promise<SessionUser | null> {
  return null;
}
