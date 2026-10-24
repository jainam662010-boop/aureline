import type { NextAuthOptions } from "next-auth";
import { getServerSession as getServerSessionFn } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimit, RATE_LIMITS, clientIp } from "@/lib/rate-limit";

const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials.password) return null;

        const ip = req?.headers ? clientIp(req.headers as unknown as Headers) : "unknown";
        const limited = rateLimit(`login:${ip}:${credentials.email.toLowerCase()}`, RATE_LIMITS.auth.limit, RATE_LIMITS.auth.windowMs);
        if (!limited.ok) throw new Error("Too many attempts. Please wait a minute and try again.");

        const email = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findFirst({
          where: { email, deletedAt: null, isActive: true },
        });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) return true;
      const existing = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
      if (existing?.deletedAt || existing?.isActive === false) return false;
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = (user as { id?: string }).id ?? token.sub ?? "";
        token.role = ((user as { role?: Role }).role ?? "USER") as Role;
      } else if (token.id && (trigger === "update" || !token.role)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, name: true, image: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.image = dbUser.image;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? "";
        session.user.role = (token.role as Role) ?? "USER";
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email) return;
      await prisma.user.updateMany({
        where: { email: user.email.toLowerCase() },
        data: { email: user.email.toLowerCase() },
      });
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
};

export async function auth(): Promise<import("next-auth").Session | null> {
  return getServerSessionFn(authOptions);
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") return null;
  return session.user;
}
