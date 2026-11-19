import type { Metadata } from "next";
import { AccountPageHeader } from "@/components/account/page-header";
import { MessagesInbox } from "@/components/account/messages-inbox";
import { ID_RE } from "@/server/api";
import { requireUser } from "@/server/auth-helpers";
import { listConversations } from "@/server/messages";

export const metadata: Metadata = { title: "Messages" };

type Props = { searchParams: Promise<{ c?: string }> };

export default async function MessagesPage({ searchParams }: Props) {
  const { c } = await searchParams;
  const user = await requireUser(c && ID_RE.test(c) ? `/account/messages?c=${c}` : "/account/messages");
  const conversations = await listConversations(user.id);
  return (
    <>
      <AccountPageHeader title="Messages" description="Conversations with agents, landlords and shopping partners. Never send deposits or wire money based on a message. See our scam guidance." />
      <MessagesInbox
        initial={conversations.map((conv) => ({ ...conv, others: conv.others.map((o) => ({ id: o.id, name: o.name, role: o.role })) }))}
        initialId={c && ID_RE.test(c) ? c : null}
      />
    </>
  );
}
