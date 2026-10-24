import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";

/**
 * /design — the studio always needs a blank to design on, so send visitors to
 * the catalog first. Deep links keep working: /design/[productId].
 */
export default function DesignIndexPage() {
  if (process.env.STATIC_EXPORT === "1") {
    // Static export cannot run server redirects, so render a real page.
    return (
      <div className="max-w-2xl mx-auto py-space-xl text-center">
        <div className="glass-panel p-space-lg flex flex-col items-center gap-space-md">
          <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#FF3B30] to-[#00E0F2] font-black">
            Pick a blank first
          </span>
          <h1 className="font-headline-xl text-headline-xl font-bold text-white">Open the Design Studio</h1>
          <p className="font-body-md text-body-md text-white/60 max-w-md">
            The studio needs a garment to draw on. Pick any blank from the catalog and hit “Start designing”.
          </p>
          <Link href="/products" className="btn-gradient px-space-lg py-space-sm group">
            Browse blanks <ArrowRight className="size-4 inline group-hover:translate-x-1 transition-transform" aria-hidden />
          </Link>
        </div>
      </div>
    );
  }
  redirect("/products?intent=design");
}
