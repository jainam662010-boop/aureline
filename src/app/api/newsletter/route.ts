import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

const schema = z.object({ email: z.string().email("Enter a valid email address.") });

export const dynamic = "force-dynamic";

/** Newsletter capture — POST { email } → standard API envelope. */
export async function POST(req: Request) {
  if (process.env.STATIC_EXPORT === "1") {
    return NextResponse.json(
      { ok: false, error: "Newsletter signup is not available in the static demo build." },
      { status: 503 },
    );
  }
  const ip = clientIp(new Headers(req.headers));
  const limited = rateLimit(`newsletter:${ip}`, RATE_LIMITS.enquiry.limit, RATE_LIMITS.enquiry.windowMs);
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten().fieldErrors.email?.[0] ?? "Enter a valid email address." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase().trim();

  try {
    // Subscribers are stored as Setting rows keyed `newsletter:<email>` so the
    // table stays a single catch-all for lightweight config/data pairs.
    await prisma.setting.upsert({
      where: { key: `newsletter:${email}` },
      update: { value: { subscribedAt: new Date().toISOString() } },
      create: { key: `newsletter:${email}`, value: { subscribedAt: new Date().toISOString() } },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[newsletter]", error);
    return NextResponse.json({ ok: false, error: "Could not subscribe right now." }, { status: 500 });
  }
}
