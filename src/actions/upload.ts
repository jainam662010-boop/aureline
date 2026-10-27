"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { ok, fail, type ApiResponse } from "@/lib/response";
import { storeUpload, validateUpload } from "@/lib/upload";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

export interface UploadedArtwork {
  url: string;
  width: number;
  height: number;
  bytes: number;
}

/** Validates + stores a single artwork file from the design studio. */
export async function uploadArtwork(file: File): Promise<ApiResponse<UploadedArtwork>> {
  const ip = clientIp(await headers());
  const limited = rateLimit(`upload:${ip}`, RATE_LIMITS.upload.limit, RATE_LIMITS.upload.windowMs);
  if (!limited.ok) return fail("Too many uploads. Please wait a minute.", "RATE_LIMIT");

  if (!file || typeof file === "string") return fail("No file received.", "VALIDATION");

  const check = validateUpload({ type: file.type, size: file.size });
  if (!check.valid) return fail(check.error ?? "Invalid file.", "UPLOAD");

  try {
    const upload = await storeUpload(file, { folder: "aureline/designs" });

    // Dimensions: probe via createImageBitmap on the server when available,
    // otherwise fall back to a safe default (client supplies real numbers too).
    let width = 0;
    let height = 0;
    try {
      if (typeof createImageBitmap === "function" && file.type !== "image/svg+xml") {
        const bitmap = await createImageBitmap(file);
        width = bitmap.width;
        height = bitmap.height;
        bitmap.close();
      }
    } catch {
      /* dimensions unknown — client-side layer creation uses its own values */
    }

    return ok({ url: upload.url, width, height, bytes: upload.bytes });
  } catch (error) {
    console.error("[upload] artwork", error);
    return fail(error instanceof Error ? error.message : "Upload failed.", "UPLOAD");
  }
}

const contactSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  message: z.string().min(10).max(2000),
});

/** Generic contact form endpoint (footer / support widgets). */
export async function sendContactMessage(input: z.infer<typeof contactSchema>): Promise<ApiResponse<{ sent: boolean }>> {
  const ip = clientIp(await headers());
  const limited = rateLimit(`contact:${ip}`, RATE_LIMITS.enquiry.limit, RATE_LIMITS.enquiry.windowMs);
  if (!limited.ok) return fail("Too many messages. Try again later.", "RATE_LIMIT");

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return fail("Please complete all fields.", "VALIDATION");

  const { sendEmail, emailShell } = await import("@/lib/mail");
  await sendEmail({
    to: parsed.data.email,
    subject: "We received your message",
    html: emailShell(
      "Thanks for reaching out",
      `<p style="color:#475569;">Hi ${parsed.data.name.split(" ")[0]}, our team will get back to you within one working day.</p>
       <p style="color:#64748B;font-size:13px;">Your message: ${parsed.data.message.replace(/</g, "&lt;")}</p>`,
    ),
  });
  return ok({ sent: true });
}
