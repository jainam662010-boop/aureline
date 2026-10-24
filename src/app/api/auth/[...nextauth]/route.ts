import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

/**
 * Static export (GitHub Pages): authentication has no server runtime, so the
 * NextAuth handler is swapped for a stub at build time.
 */
const staticStub = () =>
  NextResponse.json(
    { ok: false, error: "Authentication is not available in the static demo build." },
    { status: 404 },
  );

const isStatic = process.env.STATIC_EXPORT === "1";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  // Static export: satisfy route validation with a placeholder segment.
  if (process.env.STATIC_EXPORT === "1") return [{ nextauth: ["static"] }];
  return [];
}

export const GET = isStatic ? staticStub : handler;
export const POST = isStatic ? staticStub : handler;
