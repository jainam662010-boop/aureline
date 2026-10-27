import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { StaticNotice } from "@/components/shared/static-notice";

export const metadata: Metadata = {
  title: { template: "%s · Admin", default: "Admin" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defence in depth: middleware gates /admin, but server components re-check
  // the session role so a stale token can never render staff-only data.
  if (process.env.STATIC_EXPORT === "1") {
    return (
      <div className="min-h-screen bg-[#F4F7FB] w-full">
        <main className="max-w-4xl mx-auto px-gutter lg:px-gutter-lg py-space-lg">
          <StaticNotice
            title="The admin console needs the live backend"
            description="Orders, coupons, products and enquiries are stored in the database, which isn't available in this static demo build."
            linkHref="/"
            linkLabel="Back to storefront"
          />
        </main>
      </div>
    );
  }
  const admin = await requireAdmin();
  if (!admin) {
    const session = await auth();
    redirect(session?.user ? "/" : "/login?callbackUrl=/admin");
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] w-full">
      <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row">
        <AdminNav user={{ name: admin.name ?? "Staff", role: admin.role, email: admin.email ?? "" }} />
        <main className="flex-1 min-w-0 px-gutter lg:px-gutter-lg py-space-lg">{children}</main>
      </div>
    </div>
  );
}
