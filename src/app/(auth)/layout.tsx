import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F4F7FB]">
      {/* Brand side */}
      <aside className="hidden lg:flex flex-col justify-between p-space-xl relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full opacity-30 blur-[120px]"
          style={{ background: "conic-gradient(from 90deg, #2563EB, #0EA5E9, #7C3AED, #0891B2, #2563EB)" }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-0 noise-grid opacity-50" aria-hidden />

        <Link href="/" className="relative flex items-center gap-space-xs">
          <span className="font-headline-lg text-headline-lg font-black tracking-tight uppercase text-slate-900">
            {APP_NAME.split(" ")[0]}
          </span>
          <span className="font-label-technical text-label-technical uppercase tracking-widest text-[#0EA5E9] px-2 py-0.5 rounded-full bg-slate-900/[0.06] border border-slate-900/[0.1] backdrop-blur-md">
            Atelier
          </span>
        </Link>

        <div className="relative">
          <span className="pill-tech">Members get more</span>
          <h2 className="mt-space-sm font-headline-xl text-headline-xl font-bold tracking-tight text-slate-900 max-w-md">
            Save designs, reorder in one tap, track production live.
          </h2>
          <ul className="mt-space-md flex flex-col gap-space-sm max-w-md">
            {[
              "Reopen and edit any design you've saved, forever",
              "One-tap reorder with the same artwork and sizing",
              "Live timeline: artwork review → production → delivery",
              "Saved addresses and faster checkout",
            ].map((item) => (
              <li key={item} className="flex items-start gap-space-xs font-body-md text-body-md text-slate-600">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#2563EB] to-[#0EA5E9] flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative font-label-technical text-label-technical uppercase tracking-widest text-slate-400">
          DTF · 300 DPI · Zero minimum · Pan-India
        </p>
      </aside>

      {/* Form side */}
      <main className="flex items-center justify-center p-space-lg relative">
        <div className="absolute inset-0 lg:hidden pointer-events-none" aria-hidden>
          <div
            className="absolute -top-32 right-0 h-80 w-80 rounded-full opacity-25 blur-[100px]"
            style={{ background: "conic-gradient(from 0deg, #0EA5E9, #7C3AED, #0EA5E9)" }}
          />
        </div>
        <div className="relative w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
