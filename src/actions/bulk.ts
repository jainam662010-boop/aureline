"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ok, fail, type ApiResponse } from "@/lib/response";
import { auth } from "@/lib/auth";
import { storeUpload } from "@/lib/upload";
import { sendEmail, bulkEnquiryEmail } from "@/lib/mail";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

const enquirySchema = z.object({
  name: z.string().min(2, "Enter your name.").max(80),
  email: z.string().email("Enter a valid email address."),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."),
  company: z.string().max(120).optional().nullable(),
  productName: z.string().max(120).optional().nullable(),
  productIds: z.array(z.string()).max(20).default([]),
  quantity: z.number().int().min(10, "Bulk pricing starts at 10 pieces.").max(100000),
  deadline: z.string().optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
});

export type EnquiryFormData = z.infer<typeof enquirySchema>;

export async function submitBulkEnquiry(
  input: EnquiryFormData,
  artwork?: File | null,
): Promise<ApiResponse<{ id: string; reference: string }>> {
  const ip = clientIp(await headers());
  const limited = rateLimit(`enquiry:${ip}`, RATE_LIMITS.enquiry.limit, RATE_LIMITS.enquiry.windowMs);
  if (!limited.ok) return fail("Too many enquiries from this device. Try again later.", "RATE_LIMIT");

  const parsed = enquirySchema.safeParse(input);
  if (!parsed.success) {
    return fail("Please check the highlighted fields.", "VALIDATION", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  try {
    let artworkUrl: string | null = null;
    if (artwork && artwork.size > 0) {
      const upload = await storeUpload(artwork, { folder: "aureline/bulk-enquiries" });
      artworkUrl = upload.url;
    }

    const session = await auth();
    const enquiry = await prisma.bulkEnquiry.create({
      data: {
        userId: session?.user?.id ?? null,
        name: parsed.data.name.trim(),
        email: parsed.data.email.toLowerCase().trim(),
        phone: parsed.data.phone,
        company: parsed.data.company?.trim() || null,
        productName: parsed.data.productName?.trim() || null,
        productIds: parsed.data.productIds,
        quantity: parsed.data.quantity,
        deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
        message: parsed.data.message?.trim() || null,
        artworkUrl,
      },
    });

    // Fire-and-forget internal notification (admin also sees it in /admin/enquiries)
    await sendEmail(
      bulkEnquiryEmail({
        name: enquiry.name,
        email: enquiry.email,
        phone: enquiry.phone,
        quantity: enquiry.quantity,
        productName: enquiry.productName ?? undefined,
        message: enquiry.message ?? undefined,
      }),
    );

    return ok({ id: enquiry.id, reference: `BULK-${enquiry.id.slice(-6).toUpperCase()}` });
  } catch (error) {
    console.error("[bulk] submitBulkEnquiry", error);
    return fail("Could not submit your enquiry. Please try again.");
  }
}
