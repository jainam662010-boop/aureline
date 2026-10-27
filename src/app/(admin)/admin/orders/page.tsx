import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/orders/order-status";
import { Suspense } from "react";
import { OrderFilters } from "@/components/admin/order-filters";
import { formatINR, formatDateTime, num } from "@/lib/utils";
import type { OrderStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const STATUSES: (OrderStatus | "ALL")[] = [
  "ALL",
  "PENDING_PAYMENT",
  "PAYMENT_CONFIRMED",
  "ARTWORK_REVIEW",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUND_REQUESTED",
  "REFUNDED",
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  if (process.env.STATIC_EXPORT === "1") {
    // Prerender must not touch the database; the (admin) layout renders the
    // demo notice instead of children in static builds.
    return null;
  }
  const { status = "ALL", q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const take = 20;
  const activeStatus = STATUSES.includes(status as OrderStatus) ? status : "ALL";

  const where = {
    ...(activeStatus !== "ALL" ? { status: activeStatus as OrderStatus } : {}),
    ...(q.trim()
      ? {
          OR: [
            { orderNumber: { contains: q.trim() } },
            { email: { contains: q.trim() } },
            { shippingFullName: { contains: q.trim() } },
          ],
        }
      : {}),
  };

  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNum - 1) * take,
      take,
      include: { items: { select: { quantity: true } } },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / take));
  const pageUrl = (next: number) => {
    const params = new URLSearchParams();
    if (activeStatus !== "ALL") params.set("status", activeStatus);
    if (q) params.set("q", q);
    if (next > 1) params.set("page", String(next));
    const qs = params.toString();
    return `/admin/orders${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-space-md">
      <header className="flex items-end justify-between gap-space-sm flex-wrap">
        <div>
          <span className="label-tech">{totalCount} total</span>
          <h1 className="font-headline-xl text-headline-xl text-slate-900 font-bold tracking-tight">Orders</h1>
        </div>
      </header>

      <Suspense fallback={null}>
        <OrderFilters statuses={STATUSES} active={activeStatus} query={q} />
      </Suspense>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-900/[0.08]">
                {["Order", "Customer", "Placed", "Items", "Total", "Status", ""].map((head) => (
                  <th key={head} className="px-space-md py-3 font-label-technical text-[9px] uppercase tracking-widest text-slate-500">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-slate-900/[0.05] hover:bg-slate-900/[0.03] transition-colors">
                  <td className="px-space-md py-3">
                    <Link href={`/admin/orders/${order.id}`} className="font-label-lg text-label-lg text-slate-900 hover:text-[#0284C7]">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-space-md py-3">
                    <p className="font-body-sm text-body-sm text-slate-700 truncate max-w-44">{order.shippingFullName}</p>
                    <p className="font-body-sm text-body-sm text-slate-500 truncate max-w-44">{order.email}</p>
                  </td>
                  <td className="px-space-md py-3 font-body-sm text-body-sm text-slate-600 whitespace-nowrap">
                    {formatDateTime(order.createdAt)}
                  </td>
                  <td className="px-space-md py-3 font-body-sm text-body-sm text-slate-600 tabular-nums">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </td>
                  <td className="px-space-md py-3 font-label-md text-label-md text-slate-900 tabular-nums">
                    {formatINR(num(order.total), true)}
                  </td>
                  <td className="px-space-md py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-space-md py-3 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="inline-flex items-center h-8 px-3 rounded-full bg-slate-900/[0.05] border border-slate-900/[0.1] font-label-md text-label-md text-slate-800 hover:bg-slate-900/[0.09] transition-all"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-space-md py-10 text-center font-body-sm text-body-sm text-slate-500">
                    No orders match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 ? (
        <nav className="flex items-center justify-center gap-space-xs" aria-label="Orders pagination">
          {pageNum > 1 ? (
            <Link href={pageUrl(pageNum - 1)} className="btn-glass px-4 h-9 inline-flex items-center font-label-md text-label-md">
              ← Prev
            </Link>
          ) : null}
          <span className="font-label-technical text-[9px] uppercase tracking-widest text-slate-500 px-space-sm">
            Page {pageNum} of {totalPages}
          </span>
          {pageNum < totalPages ? (
            <Link href={pageUrl(pageNum + 1)} className="btn-glass px-4 h-9 inline-flex items-center font-label-md text-label-md">
              Next →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
