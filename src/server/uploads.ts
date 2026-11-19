import "server-only";
import { createHash, randomBytes } from "node:crypto";
import sharp from "sharp";
import { db } from "@/lib/db";
import { putObject } from "./storage";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "avif", "heif"]);
const DAILY_LIMIT = 150;

export class UploadError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export interface StoredImage {
  id: string;
  url: string;
  width: number;
  height: number;
  blurDataUrl: string;
  color: string;
}

const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");

/**
 * Secure image upload: size/type limits, real decoding with sharp (never trust the declared type),
 * auto-orient, resize, re-encode to WebP (which drops EXIF/GPS metadata), blur placeholder + colour.
 */
export async function storeImageUpload(file: File, userId: string): Promise<StoredImage> {
  if (file.size === 0) throw new UploadError("That file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Photos must be 10 MB or smaller.", 413);
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) throw new UploadError("Use a JPEG, PNG, WebP or AVIF photo.", 415);

  const since = new Date(Date.now() - 86_400_000);
  if ((await db.upload.count({ where: { userId, createdAt: { gte: since } } })) >= DAILY_LIMIT) throw new UploadError("Daily upload limit reached — try again tomorrow.", 429);

  const input = Buffer.from(await file.arrayBuffer());
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input, { limitInputPixels: 80_000_000 }).metadata();
  } catch {
    throw new UploadError("We couldn't read that image.", 415);
  }
  if (!meta.format || !ACCEPTED_FORMATS.has(meta.format)) throw new UploadError("Use a JPEG, PNG, WebP or AVIF photo.", 415);
  if (!meta.width || !meta.height || meta.width < 320 || meta.height < 240) throw new UploadError("Photos must be at least 320 × 240 pixels.");

  const pipeline = sharp(input, { limitInputPixels: 80_000_000 }).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true });
  const { data, info } = await pipeline.clone().webp({ quality: 80, effort: 4 }).toBuffer({ resolveWithObject: true });
  const blur = await sharp(data).resize(16).webp({ quality: 40 }).toBuffer();
  const { dominant } = await sharp(data).stats();

  const now = new Date();
  const owner = createHash("sha256").update(userId).digest("hex").slice(0, 12);
  const key = `listings/${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}/${owner}/${randomBytes(12).toString("hex")}.webp`;
  const url = await putObject(key, data, "image/webp");
  const row = await db.upload.create({ data: { userId, key, url, mime: "image/webp", size: data.length, width: info.width, height: info.height } });
  return {
    id: row.id,
    url,
    width: info.width,
    height: info.height,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
    color: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`,
  };
}
