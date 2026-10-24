import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { EnquiriesManager } from "@/components/admin/enquiries-manager";

export const metadata: Metadata = { title: "Bulk enquiries" };
export const dynamic = "force-dynamic";

export default async function AdminEnquiriesPage() {
  if (process.env.STATIC_EXPORT === "1") {
    // Prerender must not touch the database; the (admin) layout renders the
    // demo notice instead of children in static builds.
    return null;
  }
  const enquiries = await prisma.bulkEnquiry.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const serialized = enquiries.map((enquiry) => ({
    id: enquiry.id,
    name: enquiry.name,
    email: enquiry.email,
    phone: enquiry.phone,
    company: enquiry.company,
    productName: enquiry.productName,
    quantity: enquiry.quantity,
    deadline: enquiry.deadline?.toISOString() ?? null,
    message: enquiry.message,
    artworkUrl: enquiry.artworkUrl,
    status: enquiry.status,
    adminNotes: enquiry.adminNotes,
    createdAt: enquiry.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-space-md">
      <header>
        <span className="label-tech">{enquiries.length} enquiries</span>
        <h1 className="font-headline-xl text-headline-xl text-white font-bold tracking-tight">Bulk enquiries</h1>
      </header>

      <EnquiriesManager enquiries={serialized} />
    </div>
  );
}
