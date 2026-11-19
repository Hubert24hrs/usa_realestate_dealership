import type { Metadata } from "next";
import Link from "@/components/app-link";
import { Bell } from "lucide-react";
import { NotificationsList } from "@/components/account/notifications-list";
import { AccountPageHeader, EmptyState } from "@/components/account/page-header";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/format";
import { requireUser } from "@/server/auth-helpers";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser("/account/notifications");
  const now = new Date();
  const rows = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <AccountPageHeader
        title="Notifications"
        description="Listing alerts, price drops, tour updates and replies."
        actions={<Button asChild variant="link"><Link href="/account/settings#notifications">Notification settings</Link></Button>}
      />
      {rows.length ? (
        <NotificationsList
          items={rows.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, url: n.url, read: Boolean(n.readAt), ago: timeAgo(n.createdAt, now), createdAt: n.createdAt.toISOString() }))}
        />
      ) : (
        <EmptyState icon={Bell} title="No notifications yet">Save a search or a home and we&apos;ll let you know when something changes.</EmptyState>
      )}
    </>
  );
}
