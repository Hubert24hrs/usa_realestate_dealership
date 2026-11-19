import "server-only";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { site } from "@/lib/site";

let resend: Resend | null = null;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Branded, inline-styled HTML email. All dynamic strings must go through `esc`. */
export function emailLayout(opts: { title: string; intro?: string; rows?: Array<[string, string]>; body?: string; cta?: { label: string; url: string }; footnote?: string }): string {
  const rows = (opts.rows ?? [])
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#6b7080;font-size:13px;width:38%">${esc(k)}</td><td style="padding:6px 0;color:#1d2140;font-size:14px">${esc(v)}</td></tr>`)
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#f4f5fb;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6e7f0">
<tr><td style="background:#1e1f5c;padding:18px 24px;color:#ffffff;font-size:16px;font-weight:700;letter-spacing:.06em">CITI VIEW <span style="font-weight:500;opacity:.7;font-size:11px;letter-spacing:.3em">REAL ESTATE</span></td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 8px;font-size:20px;color:#1d2140">${esc(opts.title)}</h1>
${opts.intro ? `<p style="margin:0 0 16px;color:#40455c;font-size:14px;line-height:1.55">${esc(opts.intro)}</p>` : ""}
${rows ? `<table role="presentation" width="100%" style="border-top:1px solid #eef0f6;margin:8px 0 16px">${rows}</table>` : ""}
${opts.body ? `<p style="margin:0 0 16px;color:#40455c;font-size:14px;line-height:1.55;white-space:pre-line">${esc(opts.body)}</p>` : ""}
${opts.cta ? `<a href="${esc(opts.cta.url)}" style="display:inline-block;background:#2c3aa3;color:#ffffff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:600;font-size:14px">${esc(opts.cta.label)}</a>` : ""}
</td></tr>
<tr><td style="padding:16px 24px;background:#f8f9fc;color:#8a8fa3;font-size:11px;line-height:1.5">${esc(opts.footnote ?? "This message relates to demo data on the CITI VIEW platform.")}<br>Equal Housing Opportunity · ${esc(site.url)}</td></tr>
</table></td></tr></table></body></html>`;
}

export interface SendResult {
  ok: boolean;
  provider: "resend" | "dev-outbox";
  id?: string;
}

/** Sends via Resend when RESEND_API_KEY is set; otherwise records the message in the dev outbox (/dev/outbox). */
export async function sendEmail(msg: { to: string; subject: string; html: string; text?: string }): Promise<SendResult> {
  if (process.env.RESEND_API_KEY) {
    resend ??= new Resend(process.env.RESEND_API_KEY);
    try {
      const { data, error } = await resend.emails.send({ from: process.env.EMAIL_FROM || "CITI VIEW <onboarding@resend.dev>", to: msg.to, subject: msg.subject, html: msg.html, text: msg.text });
      await db.emailLog.create({ data: { to: msg.to, subject: msg.subject, html: msg.html, text: msg.text, provider: "resend", status: error ? "failed" : "sent", error: error?.message } });
      return { ok: !error, provider: "resend", id: data?.id };
    } catch (error) {
      await db.emailLog.create({ data: { to: msg.to, subject: msg.subject, html: msg.html, text: msg.text, provider: "resend", status: "failed", error: String(error) } });
      return { ok: false, provider: "resend" };
    }
  }
  const log = await db.emailLog.create({ data: { to: msg.to, subject: msg.subject, html: msg.html, text: msg.text, provider: "dev-outbox", status: "logged" } });
  if (process.env.NODE_ENV !== "production") console.info(`[dev-outbox] → ${msg.to} · ${msg.subject} (view at /dev/outbox/${log.id})`);
  return { ok: true, provider: "dev-outbox", id: log.id };
}
