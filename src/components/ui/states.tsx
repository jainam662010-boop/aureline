import * as React from "react";
import { Loader2, PackageSearch, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} />;
}

export function LoadingOverlay({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-space-sm text-slate-600"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-8 animate-spin text-[#0EA5E9]" aria-hidden />
      <span className="font-label-technical text-label-technical uppercase tracking-widest">{label}</span>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass-panel flex flex-col items-center justify-center gap-space-sm px-space-lg py-margin-lg text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-slate-900/[0.05] text-[#0EA5E9]">
        {icon ?? <PackageSearch className="size-7" aria-hidden />}
      </div>
      <h3 className="font-headline-md text-headline-md font-semibold text-slate-900">{title}</h3>
      {description ? <p className="max-w-md font-body-md text-body-md text-slate-600">{description}</p> : null}
      {action ? <div className="mt-space-sm">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="glass-panel border-[#E11D48]/50 flex flex-col items-center justify-center gap-space-sm px-space-lg py-margin-lg text-center"
      role="alert"
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-[#E11D48]/25 text-[#F43F5E]">
        <TriangleAlert className="size-7" aria-hidden />
      </div>
      <h3 className="font-headline-md text-headline-md font-semibold text-slate-900">{title}</h3>
      {description ? <p className="max-w-md font-body-md text-body-md text-slate-600">{description}</p> : null}
      {action ? <div className="mt-space-sm">{action}</div> : null}
    </div>
  );
}
