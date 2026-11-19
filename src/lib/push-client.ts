/** Browser-side Web Push helpers (service worker at /sw.js, VAPID public key from env). */

export type PushState = "enabled" | "disabled" | "denied" | "unsupported" | "unconfigured";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padded = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration("/");
  return existing ?? navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "unconfigured";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "enabled" : "disabled";
}

/** Asks permission, subscribes this browser and registers it with the server. */
export async function enablePush(): Promise<PushState | "error"> {
  if (!pushSupported()) return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "unconfigured";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "disabled";
  try {
    const reg = await registration();
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) }));
    const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
    return res.ok ? "enabled" : "error";
  } catch {
    return "error";
  }
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => undefined);
  await sub.unsubscribe().catch(() => undefined);
}

export const PUSH_STATE_HINT: Record<PushState | "error", string> = {
  enabled: "Push notifications are on for this browser.",
  disabled: "Push notifications are off for this browser.",
  denied: "Notifications are blocked for this site. Allow them in your browser's site settings.",
  unsupported: "This browser doesn't support push notifications. Email alerts still work.",
  unconfigured: "Push isn't configured on this server yet (add VAPID keys). Email alerts still work.",
  error: "Couldn't turn on push notifications. Please try again.",
};
