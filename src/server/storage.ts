import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Object storage for user uploads.
 *  - UPLOAD_DRIVER=local (default, development): files under .data/uploads, served by /media/uploads/*
 *  - UPLOAD_DRIVER=vercel-blob: Vercel Blob (BLOB_READ_WRITE_TOKEN), public CDN URLs
 */
export type StorageDriver = "local" | "vercel-blob";

export const storageDriver = (): StorageDriver => (process.env.UPLOAD_DRIVER === "vercel-blob" ? "vercel-blob" : "local");

const LOCAL_ROOT = path.resolve(process.cwd(), ".data", "uploads");
/** Keys are generated server-side: lowercase segments of [a-z0-9-] ending in an image extension. */
export const KEY_RE = /^(?:[a-z0-9-]{1,64}\/){1,4}[a-z0-9-]{8,80}\.(?:webp|jpg|png)$/;

export async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  if (!KEY_RE.test(key)) throw new Error("Invalid storage key");
  if (storageDriver() === "vercel-blob") {
    const { put } = await import("@vercel/blob");
    const blob = await put(key, body, { access: "public", contentType, addRandomSuffix: false, cacheControlMaxAge: 31_536_000, token: process.env.BLOB_READ_WRITE_TOKEN });
    return blob.url;
  }
  const file = path.join(LOCAL_ROOT, ...key.split("/"));
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
  return `/media/uploads/${key}`;
}

/** Local driver only: read a stored object, refusing anything outside the upload root. */
export async function readLocalObject(key: string): Promise<Buffer | null> {
  if (!KEY_RE.test(key)) return null;
  const file = path.resolve(LOCAL_ROOT, ...key.split("/"));
  if (!file.startsWith(LOCAL_ROOT + path.sep)) return null;
  return readFile(file).catch(() => null);
}
