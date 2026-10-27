"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Status pill row + search box; every change writes to the URL query string. */
export function OrderFilters({ statuses, active, query }: { statuses: string[]; active: string; query: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [term, setTerm] = React.useState(query);
  const [busy, setBusy] = React.useState(false);

  const apply = (next: { status?: string; q?: string; page?: string }) => {
    const params = new URLSearchParams(searchParams.toString());
    const status = next.status ?? active;
    const q = next.q ?? query;
    if (status === "ALL") params.delete("status");
    else params.set("status", status);
    if (q) params.set("q", q);
    else params.delete("q");
    params.delete("page");
    setBusy(true);
    router.push(`/admin/orders?${params.toString()}`);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    apply({ q: term.trim() });
  };

  return (
    <div className="flex flex-col gap-space-sm">
      <form onSubmit={submitSearch} className="relative max-w-sm">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-500 pointer-events-none" />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Order #, email or name"
          aria-label="Search orders"
          className="h-10 pl-11 rounded-full text-body-sm"
        />
        {busy ? <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-slate-500 animate-spin" /> : null}
      </form>

      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1" role="group" aria-label="Filter by status">
        {statuses.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => apply({ status })}
            aria-pressed={active === status}
            className={cn(
              "px-3 py-1.5 rounded-full font-label-technical text-[10px] uppercase tracking-widest whitespace-nowrap border transition-all",
              active === status
                ? "border-[#0EA5E9]/60 bg-[#0EA5E9]/15 text-[#0284C7]"
                : "border-slate-900/[0.1] bg-slate-900/[0.03] text-slate-500 hover:text-slate-900 hover:border-slate-900/[0.1]",
            )}
          >
            {status === "ALL" ? "All" : status.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </div>
  );
}
