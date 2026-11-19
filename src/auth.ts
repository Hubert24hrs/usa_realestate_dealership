import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import type { Provider } from "next-auth/providers";
import { db } from "@/lib/db";
import { site } from "@/lib/site";
import { emailLayout, sendEmail } from "@/server/email";

export type AppRole = "USER" | "AGENT" | "BROKER" | "PROPERTY_MANAGER" | "ADMIN";

/** One click guest accounts (seeded, isDemo = true). Enabled only while the site runs on sample data. */
export const GUEST_ACCOUNTS = [
  { email: "buyer@citiview.test", label: "Home buyer", description: "Saved homes, collections, tours, messages" },
  { email: "renter@citiview.test", label: "Renter", description: "Applications, lease and rent payments" },
  { email: "seller@citiview.test", label: "FSBO seller", description: "Owner listings and inquiries" },
  { email: "agent@citiview.test", label: "Agent", description: "Leads, listings and analytics" },
  { email: "manager@citiview.test", label: "Property manager", description: "Communities and applications" },
  { email: "admin@citiview.test", label: "Admin", description: "CMS, moderation and settings" },
] as const;

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

const providers: Provider[] = [
  Resend({
    id: "email",
    name: "Email",
    apiKey: process.env.RESEND_API_KEY || "dev-outbox",
    from: process.env.EMAIL_FROM || "CITI VIEW <no-reply@example.com>",
    maxAge: 60 * 60,
    async sendVerificationRequest({ identifier, url }) {
      await sendEmail({
        to: identifier,
        subject: "Your CITI VIEW sign in link",
        text: `Sign in to CITI VIEW: ${url}\nThis link expires in 1 hour. If you didn't request it, ignore this email.`,
        html: emailLayout({
          title: "Sign in to CITI VIEW",
          intro: "Click the button below to sign in. The link expires in 1 hour and can be used once.",
          cta: { label: "Sign in", url },
          footnote: "If you didn't request this email, you can safely ignore it.",
        }),
      });
    },
  }),
];

if (googleEnabled) providers.push(Google({ allowDangerousEmailAccountLinking: false }));

if (site.demoMode) {
  providers.push(
    Credentials({
      id: "guest",
      name: "Guest account",
      credentials: { email: { label: "Guest account", type: "email" } },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").toLowerCase();
        if (!GUEST_ACCOUNTS.some((a) => a.email === email)) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user?.isDemo) return null;
        return { id: user.id, email: user.email, name: user.name, image: user.image, role: user.role };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/sign-in", verifyRequest: "/sign-in/check-email", error: "/sign-in" },
  providers,
  trustHost: true,
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = ((user as { role?: AppRole }).role ?? "USER") as AppRole;
        token.roleCheckedAt = Date.now();
      } else if (token.id && (trigger === "update" || !token.roleCheckedAt || Date.now() - (token.roleCheckedAt as number) > 5 * 60_000)) {
        // Refresh role (and detect deleted users) every 5 minutes.
        const fresh = await db.user.findUnique({ where: { id: token.id as string }, select: { role: true, name: true } });
        if (!fresh) return null;
        token.role = fresh.role as AppRole;
        token.name = fresh.name;
        token.roleCheckedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as AppRole) ?? "USER";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) await db.notificationPreference.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    },
  },
});
