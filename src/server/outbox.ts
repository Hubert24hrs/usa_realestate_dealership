import "server-only";
import { notFound } from "next/navigation";
import { getSessionUser } from "./auth-helpers";

/** The dev outbox can contain sign-in links: available in development, or to admins in production. */
export async function assertOutboxAccess() {
  if (process.env.NODE_ENV !== "production") return;
  const user = await getSessionUser();
  if (user?.role !== "ADMIN") notFound();
}
