import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { MouseSpotlight } from "@/components/layout/mouse-spotlight";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MouseSpotlight />
      <SiteHeader />
      <main id="main" className="w-full pt-16 sm:pt-20 bg-[#08080a] min-h-screen relative">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
