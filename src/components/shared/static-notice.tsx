import Link from "next/link";
import { CloudOff, ArrowRight, Info } from "lucide-react";

/**
 * Shown on pages whose functionality requires the real backend when the app is
 * exported STATICALLY for GitHub Pages (no database / auth / payments there).
 */
export function StaticNotice({
  eyebrow = "Static demo build",
  title,
  description,
  linkHref = "/products",
  linkLabel = "Continue browsing",
  tip,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  linkHref?: string;
  linkLabel?: string;
  tip?: string;
}) {
  return (
    <div className="max-w-2xl mx-auto py-space-xl">
      <div className="glass-panel p-space-lg flex flex-col items-center text-center gap-space-md relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-[#7C3AED] to-[#0891B2] blur-[90px] opacity-30 rounded-full pointer-events-none" />
        <span className="w-14 h-14 rounded-2xl bg-slate-900/[0.05] border border-slate-900/[0.1] flex items-center justify-center">
          <CloudOff className="size-6 text-[#0891B2]" aria-hidden />
        </span>
        <div className="flex flex-col gap-space-xs">
          <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#0891B2] font-black">
            {eyebrow}
          </span>
          <h2 className="font-headline-lg text-headline-lg font-bold text-slate-900">{title}</h2>
          <p className="font-body-md text-body-md text-slate-600">{description}</p>
        </div>
        {tip ? (
          <p className="glass-panel-sm px-space-md py-space-sm font-body-sm text-body-sm text-slate-600 flex items-start gap-space-xs text-left">
            <Info className="size-4 mt-0.5 flex-shrink-0 text-[#D97706]" aria-hidden />
            <span>{tip}</span>
          </p>
        ) : null}
        <Link href={linkHref} className="btn-gradient px-space-lg py-space-sm group">
          {linkLabel}
          <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
