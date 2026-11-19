"use client";

import { useRef } from "react";

/**
 * GET filter form that submits itself when a select changes (works without JS via its
 * submit button). Keeps filters in the URL so results are shareable and crawlable.
 */
export function AutoSubmitForm({ action, className, children }: { action: string; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={action}
      method="get"
      className={className}
      onChange={(e) => {
        if ((e.target as HTMLElement).tagName === "SELECT") ref.current?.requestSubmit();
      }}
      onSubmit={(e) => {
        // Drop empty params for clean URLs.
        const form = e.currentTarget;
        for (const el of Array.from(form.elements) as HTMLInputElement[]) {
          if (el.name && !el.value) el.disabled = true;
        }
        setTimeout(() => {
          for (const el of Array.from(form.elements) as HTMLInputElement[]) el.disabled = false;
        }, 0);
      }}
    >
      {children}
    </form>
  );
}
