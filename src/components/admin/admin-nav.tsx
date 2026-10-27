"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  Shirt,
  TicketPercent,
  Inbox,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: Package },
  { href: "/admin/products", label: "Products", icon: Shirt },
  { href: "/admin/coupons", label: "Coupons", icon: TicketPercent },
  { href: "/admin/enquiries", label: "Bulk enquiries", icon: Inbox },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav({ user }: { user: { name: string; role: string; email: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const isActive = (section: (typeof SECTIONS)[number]) =>
    section.exact ? pathname === section.href : pathname.startsWith(section.href);

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        className="lg:hidden fixed bottom-5 right-5 z-[60] w-13 h-13 rounded-full bg-gradient-to-tr from-[#2563EB] to-[#0EA5E9] text-white flex items-center justify-center shadow-xl"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      <aside
        className={cn(
          "lg:w-64 lg:min-h-screen lg:sticky lg:top-0 border-b lg:border-b-0 lg:border-r border-slate-900/[0.08] bg-[#FFFFFF]/70 backdrop-blur-xl",
          "fixed lg:static inset-0 z-50 lg:z-auto transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="p-space-md flex flex-col h-full lg:h-screen">
          <div className="flex items-center justify-between gap-space-xs mb-space-md">
            <Link href="/" className="flex items-center gap-space-xs">
              <span className="font-headline-md text-headline-md font-black tracking-tight uppercase text-slate-900">
                Aureline
              </span>
              <span className="font-label-technical text-[9px] uppercase tracking-widest text-[#0EA5E9] px-2 py-0.5 rounded-full bg-slate-900/[0.06] border border-slate-900/[0.1]">
                Admin
              </span>
            </Link>
            <Link
              href="/"
              className="lg:hidden text-slate-600 hover:text-slate-900"
              aria-label="Back to storefront"
            >
              <ExternalLink className="size-4" />
            </Link>
          </div>

          <nav className="flex flex-col gap-1 flex-1" aria-label="Admin sections">
            {SECTIONS.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(section) ? "page" : undefined}
                className={cn(
                  "flex items-center gap-space-xs px-space-sm py-2.5 rounded-2xl font-label-lg text-label-lg transition-all",
                  isActive(section)
                    ? "bg-slate-900/[0.08] text-slate-900 border border-slate-900/[0.1]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-900/[0.05] border border-transparent",
                )}
              >
                <section.icon className="size-4 flex-shrink-0" />
                {section.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-slate-900/[0.08] pt-space-sm mt-space-sm">
            <div className="px-space-sm mb-space-xs">
              <p className="font-label-md text-label-md text-slate-900 truncate">{user.name}</p>
              <p className="font-label-technical text-[9px] uppercase tracking-widest text-slate-500 truncate">
                {user.role} · {user.email}
              </p>
            </div>
            <div className="flex gap-space-xs">
              <Link
                href="/"
                className="flex-1 inline-flex items-center justify-center gap-1 h-9 rounded-full bg-slate-900/[0.05] border border-slate-900/[0.1] font-label-md text-label-md text-slate-700 hover:bg-slate-900/[0.08] transition-all"
              >
                <ExternalLink className="size-3.5" /> Store
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex-1 inline-flex items-center justify-center gap-1 h-9 rounded-full bg-slate-900/[0.04] border border-slate-900/[0.1] font-label-md text-label-md text-[#BE123C] hover:bg-[#E11D48]/30 transition-all"
              >
                <LogOut className="size-3.5" /> Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={() => setOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
        />
      ) : null}
    </>
  );
}
