import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { ALLOWED_IMAGE_MIME, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { sanitizeFilename } from "@/lib/utils";

export interface UploadedFile {
  url: string;
  publicId?: string;
  bytes: number;
  contentType: string;
  width?: number;
  height?: number;
}

export function cloudinaryEnabled(): boolean {
  return Boolean(process.env.CLOUDINARY_URL || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
}

/** Validates MIME type + size and rejects dangerous uploads. */
export function validateUpload(file: { type: string; size: number }): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_MIME.includes(file.type as (typeof ALLOWED_IMAGE_MIME)[number])) {
    return { valid: false, error: "Unsupported file type. Upload JPG, PNG, WEBP or SVG." };
  }
  if (file.size <= 0) return { valid: false, error: "That file appears to be empty." };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { valid: false, error: "File too large. Maximum upload size is 10 MB." };
  }
  return { valid: true };
}

/**
 * Stores an artwork file.
 *  • Cloudinary when configured (recommended for Vercel)
 *  • Local /public/uploads fallback for development
 */
export async function storeUpload(
  file: File,
  opts: { folder?: string } = {},
): Promise<UploadedFile> {
  const validation = validateUpload(file);
  if (!validation.valid) throw new Error(validation.error);

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = sanitizeFilename(file.name || "artwork");
  const ext = path.extname(safeName) || mimeToExt(file.type);
  const base = safeName.replace(/\.[^.]+$/, "");
  const filename = `${base}-${randomUUID().slice(0, 8)}${ext}`;

  if (cloudinaryEnabled()) {
    if (!process.env.CLOUDINARY_URL) {
      cloudinary.config({
        cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
    }
    const result = await new Promise<{ secure_url: string; public_id: string; bytes: number; width: number; height: number }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: opts.folder ?? "aureline/artwork",
            resource_type: "auto",
            public_id: base,
            overwrite: false,
          },
          (error, res) => {
            if (error || !res) return reject(error ?? new Error("Upload failed"));
            resolve(res as unknown as { secure_url: string; public_id: string; bytes: number; width: number; height: number });
          },
        );
        stream.end(bytes);
      },
    );
    return {
      url: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
      contentType: file.type,
      width: result.width,
      height: result.height,
    };
  }

  // Local fallback (development only — ephemeral on serverless)
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), bytes);
  return { url: `/uploads/${filename}`, bytes: bytes.length, contentType: file.type };
}

function mimeToExt(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/svg+xml":
      return ".svg";
    default:
      return ".png";
  }
}
