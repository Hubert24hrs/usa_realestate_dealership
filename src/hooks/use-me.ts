"use client";

import { useQuery } from "@tanstack/react-query";

export interface Me {
  user: { id: string; name: string | null; email: string | null; role: string; image: string | null; agentSlug: string | null } | null;
  unread: number;
  unreadMessages: number;
}

export const SIGNED_OUT: Me = { user: null, unread: 0, unreadMessages: 0 };

/** Client-side session probe (keeps pages static; see /api/me). Shared through the React Query cache. */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => (await (await fetch("/api/me", { cache: "no-store" })).json()) as Me,
    staleTime: 60_000,
  });
}
