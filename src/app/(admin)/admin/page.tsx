import type { Metadata } from "next";
import Link from "next/link";
import { getAdminStats } from "@/actions/admin";
import { prisma } from "@/lib/prisma";
import { StatusBadge } from "@/components/orders/order-status";
import { formatINR, formatDateTime } from "@/lib/utils";
import { ArrowUpRight, AlertTriangle, MessageSquare, Beaker, PackageCheck } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  if (process.env.STATIC_EXPORT === "1") {
    // Prerender must not touch the database; the (admin) layout renders the
    // demo notice instead of children in static builds.
    return null;
  }
  const statsResult = await getAdminStats();
  const stats = statsResult.ok ? statsResult.data : null;

  const recentOrders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 8,
    include: { items: { select: { quantity: true } } },
  });

  const kpis = stats
    ? [
        {
          label: "Total revenue",
          value: formatINR(stats.revenue, true),
          hint: `${stats.paidOrders} paid orders`,
          icon: ArrowUpRight,
          tint: "from-[#2563EB] to-[#0EA5E9]",
        },
        {
          label: "Awaiting artwork review",
          value: String(stats.pendingReview),
          hint: "needs a human check",
          icon: Beaker,
          tint: "from-[#0EA5E9] to-[#7C3AED]",
        },
        {
          label: "In production",
          value: String(stats.inProduction),
          hint: "printing / QC",
          icon: PackageCheck,
          tint: "from-[#7C3AED] to-[#0891B2]",
        },
        {
          label: "New bulk enquiries",
          value: String(stats.newEnquiries),
          hint: "reply within 12h",
          icon: MessageSquare,
          tint: "from-[#0891B2] to-[#22c55e]",
        },
      ]
    : [];

  const maxRevenue = stats ? Math.max(...stats.revenueByDay.map((d) => d.revenue), 1) : 1;

  return (
    <div className="flex flex-col gap-space-lg">
      <header>
        <span className="label-tech">Last 30 days</span>
        <h1 className="font-headline-xl text-headline-xl text-slate-900 font-bold tracking-tight">Dashboard</h1>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-sm">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="glass-panel p-space-md relative overflow-hidden">
            <span
              className={`absolute -top-10 -right-10 h-24 w-24 rounded-full bg-gradient-to-br ${kpi.tint} opacity-25 blur-2xl`}
              aria-hidden
            />
            <span className={`inline-flex w-9 h-9 rounded-xl bg-gradient-to-br ${kpi.tint} items-center justify-center mb-space-xs`}>
              <kpi.icon className="size-4 text-slate-900" />
            </span>
            <p className="font-headline-md text-headline-md font-bold text-slate-900 tabular-nums">{kpi.value}</p>
            <p className="font-label-md text-label-md text-slate-700">{kpi.label}</p>
            <p className="font-body-sm text-body-sm text-slate-500">{kpi.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-md">
        {/* Revenue chart */}
        <section className="glass-panel p-space-md xl:col-span-2">
          <div className="flex items-center justify-between mb-space-sm">
            <h2 className="font-headline-md text-headline-md font-bold text-slate-900">Revenue</h2>
            <span className="font-label-technical text-[9px] uppercase tracking-widest text-slate-500">
              daily · INR
            </span>
          </div>
          {stats && stats.revenueByDay.some((d) => d.revenue > 0) ? (
            <div className="flex items-end gap-[3px] h-40" role="img" aria-label="Daily revenue chart for the last 30 days">
              {stats.revenueByDay.map((day) => (
                <div
                  key={day.day}
                  title={`${day.day}: ${formatINR(day.revenue, true)}`}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-[#2563EB]/70 to-[#0EA5E9] hover:brightness-125 transition-all min-w-[4px]"
                  style={{ height: `${Math.max(3, (day.revenue / maxRevenue) * 100)}%` }}
                />
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center font-body-sm text-body-sm text-slate-500">
              No paid orders in the last 30 days yet.
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm mt-space-md pt-space-sm border-t border-slate-900/[0.08]">
            {(stats?.statusBreakdown ?? [])
              .sort((a, b) => b.count - a.count)
              .slice(0, 4)
              .map((group) => (
                <div key={group.status}>
                  <p className="font-headline-md text-headline-md font-bold text-slate-900 tabular-nums">{group.count}</p>
                  <p className="font-label-technical text-[9px] uppercase tracking-widest text-slate-500">
                    {group.status.replace(/_/g, " ").toLowerCase()}
                  </p>
                </div>
              ))}
          </div>
        </section>

        {/* Top products + low stock */}
        <section className="flex flex-col gap-space-md">
          <div className="glass-panel p-space-md">
            <h2 className="font-headline-md text-headline-md font-bold text-slate-900 mb-space-sm">Top products</h2>
            {stats && stats.topProducts.length > 0 ? (
              <ul className="flex flex-col gap-space-xs">
                {stats.topProducts.map((product, index) => (
                  <li key={product.name} className="flex items-center justify-between gap-space-xs">
                    <span className="flex items-center gap-space-xs min-w-0">
                      <span className="font-label-technical text-[9px] text-slate-400 w-4">0{index + 1}</span>
                      <span className="font-body-sm text-body-sm text-slate-700 truncate">{product.name}</span>
                    </span>
                    <span className="font-label-md text-label-md text-slate-900 tabular-nums whitespace-nowrap">
                      {product.units} pcs · {formatINR(product.revenue, true)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-body-sm text-body-sm text-slate-500">No sales data yet.</p>
            )}
          </div>

          <div className="glass-panel p-space-md">
            <h2 className="font-headline-md text-headline-md font-bold text-slate-900 mb-space-sm flex items-center gap-space-xs">
              <AlertTriangle className="size-4 text-[#D97706]" /> Low stock
            </h2>
            {stats && stats.lowStock.length > 0 ? (
              <ul className="flex flex-col gap-space-xs">
                {stats.lowStock.map((item) => (
                  <li key={`${item.name}-${item.size}-${item.color}`} className="flex items-center justify-between gap-space-xs">
                    <span className="font-body-sm text-body-sm text-slate-700 truncate">
                      {item.name} · {item.color} · {item.size}
                    </span>
                    <span
                      className={`font-label-md text-label-md tabular-nums ${item.stock === 0 ? "text-[#BE123C]" : "text-[#B45309]"}`}
                    >
                      {item.stock} left
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-body-sm text-body-sm text-slate-500">All variants comfortably in stock.</p>
            )}
            <Link
              href="/admin/products"
              className="inline-block mt-space-xs font-label-md text-label-md text-[#0891B2] hover:underline"
            >
              Manage inventory →
            </Link>
          </div>
        </section>
      </div>

      {/* Recent orders */}
      <section className="glass-panel overflow-hidden">
        <div className="flex items-center justify-between p-space-md pb-space-sm">
          <h2 className="font-headline-md text-headline-md font-bold text-slate-900">Recent orders</h2>
          <Link href="/admin/orders" className="font-label-md text-label-md text-[#0891B2] hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-900/[0.08]">
                {["Order", "Placed", "Items", "Status"].map((head) => (
                  <th
                    key={head}
                    className="px-space-md py-2 font-label-technical text-[9px] uppercase tracking-widest text-slate-500"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="border-b border-slate-900/[0.05] hover:bg-slate-900/[0.03] transition-colors">
                  <td className="px-space-md py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-label-lg text-label-lg text-slate-900 hover:text-[#0284C7] transition-colors"
                    >
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-space-md py-3 font-body-sm text-body-sm text-slate-600">{formatDateTime(order.createdAt)}</td>
                  <td className="px-space-md py-3 font-body-sm text-body-sm text-slate-600 tabular-nums">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </td>
                  <td className="px-space-md py-3">
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-space-md py-6 text-center font-body-sm text-body-sm text-slate-500">
                    No orders yet — they&apos;ll appear here the moment checkout runs.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
