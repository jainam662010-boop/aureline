import Link from "next/link";
import { Camera } from "lucide-react";
import { APP_NAME, MARQUEE_ITEMS } from "@/lib/constants";
import { NewsletterForm } from "@/components/layout/newsletter-form";

const INSTAGRAM_URL = "https://www.instagram.com/aureline.tm/";

export function SiteFooter() {
  return (
    <footer className="w-full bg-[#060608] py-space-xl border-t border-white/[0.08] relative">
      <div className="max-w-7xl mx-auto px-gutter lg:px-gutter-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-space-xl mb-space-xl">
          <div className="lg:col-span-2 flex flex-col gap-space-md">
            <div className="flex items-center gap-space-xs">
              <span className="font-headline-lg text-headline-lg font-black tracking-tight uppercase text-white">
                {APP_NAME.split(" ")[0]}
              </span>
              <span className="font-label-technical text-label-technical uppercase tracking-widest text-[#FF0D7B] px-space-xs py-0.5 rounded-full bg-white/[0.08] border border-white/10 backdrop-blur-md">
                Atelier
              </span>
            </div>
            <p className="font-body-md text-body-md text-white/60 max-w-sm">
              Engineering high-density Direct-to-Film transfers on museum-grade combed cotton blanks. Designed in New
              Delhi for streetwear labels, touring crews and independent creators.
            </p>
            <div className="flex flex-wrap items-center gap-space-xs">
              <span className="font-label-technical text-label-technical uppercase tracking-widest text-white/40">
                SPECS:
              </span>
              <span className="chip">300 DPI CMYK+W</span>
              <span className="chip">OEKOTEX ECO-PASSPORT</span>
              <span className="chip text-[#00E0F2]">STRETCH 98%</span>
            </div>
          </div>

          <div className="flex flex-col gap-space-sm">
            <span className="font-label-technical text-label-technical uppercase tracking-widest text-[#FF3B30] font-bold">
              Blanks Repertory
            </span>
            <ul className="flex flex-col gap-space-xs font-body-sm text-body-sm text-white/60">
              <li><Link className="hover:text-white transition-colors" href="/products?category=tees">Heavyweight Box Tee (240 GSM)</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/products?category=oversized">Vintage Washed Oversized (280 GSM)</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/products?category=hoodies">French Terry Hoodie (450 GSM)</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/products?category=polos">Structured Polo (240 GSM)</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/products?category=totes">Raw Canvas Merch Tote (16 OZ)</Link></li>
            </ul>
          </div>

          <div className="flex flex-col gap-space-sm">
            <span className="font-label-technical text-label-technical uppercase tracking-widest text-[#FF0D7B] font-bold">
              Client Services
            </span>
            <ul className="flex flex-col gap-space-xs font-body-sm text-body-sm text-white/60">
              <li><Link className="hover:text-white transition-colors" href="/design">Open the design studio</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/account?tab=designs">Saved designs</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/#faq">Production lead times</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/#how-it-works">Print placement matrix</Link></li>
              <li><Link className="hover:text-white transition-colors" href="/cart">Your cart</Link></li>
              <li>
                <a className="hover:text-white transition-colors inline-flex items-center gap-1.5" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                  <Camera className="size-4" aria-hidden />
                  Instagram @aureline.tm
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-space-sm">
            <span className="font-label-technical text-label-technical uppercase tracking-widest text-[#00E0F2] font-bold">
              Atelier Dispatch
            </span>
            <p className="font-body-sm text-body-sm text-white/60">
              Private drop runs, early blank silhouettes and DTF production guides.
            </p>
            <NewsletterForm />
          </div>
        </div>

        <div className="pt-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md border-t border-white/[0.05]">
          <div className="flex flex-wrap items-center justify-center gap-space-md text-white/50 font-label-technical text-label-technical uppercase tracking-widest">
            <span>© {new Date().getFullYear()} {APP_NAME} DTF Lab. All rights reserved.</span>
            <span>Pan-India dispatch hubs: DEL · BLR · BOM</span>
          </div>
          <div className="flex items-center gap-space-xs backdrop-blur-xl bg-white/[0.03] border border-white/10 px-space-md py-1.5 rounded-full">
            <span className="font-label-technical text-label-technical uppercase tracking-widest text-white/40 mr-space-xs">
              Verified rails:
            </span>
            <span className="font-label-technical text-label-technical text-white px-space-xs">UPI 2.0</span>
            <span className="text-white/20">·</span>
            <span className="font-label-technical text-label-technical text-white px-space-xs">RuPay</span>
            <span className="text-white/20">·</span>
            <span className="font-label-technical text-label-technical text-white px-space-xs">Visa</span>
            <span className="text-white/20">·</span>
            <span className="font-label-technical text-label-technical text-white px-space-xs">Razorpay Secure</span>
          </div>
        </div>
      </div>
      <div className="w-full overflow-hidden py-3 mt-space-lg border-t border-white/[0.05]" aria-hidden>
        <div className="animate-marquee whitespace-nowrap flex items-center gap-space-lg text-white/40 font-label-technical text-label-technical uppercase tracking-widest">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span key={i} className="flex items-center gap-space-lg">
              {item}
              <span className="text-[#FF0D7B]">★</span>
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
