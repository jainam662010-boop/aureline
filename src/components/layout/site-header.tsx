import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { getCartCount } from "@/actions/cart";
import { HeaderClient } from "@/components/layout/header-client";
import { APP_NAME } from "@/lib/constants";

/**
 * Server header: session + live cart count are fetched per-request so the badge
 * is always accurate (server actions invalidate it after every cart mutation).
 */
export async function SiteHeader() {
  const isStatic = process.env.STATIC_EXPORT === "1";
  const [session, cartCount] = isStatic
    ? [null, 0]
    : await Promise.all([
        getServerSession(authOptions),
        getCartCount().catch(() => 0),
      ]);

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "STAFF";

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="backdrop-blur-2xl bg-[#0a0a0d]/75 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-gutter lg:px-gutter-lg h-20 flex items-center justify-between gap-space-sm">
          <Link href="/" className="flex items-center gap-space-xs flex-shrink-0 group" aria-label={`${APP_NAME} home`}>
            <span className="font-headline-lg text-headline-lg font-black tracking-tight uppercase text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#FF3B30] group-hover:to-[#FF0D7B] transition-all">
              {APP_NAME.split(" ")[0]}
            </span>
            <span className="hidden sm:inline font-label-technical text-label-technical uppercase tracking-widest text-[#FF0D7B] px-2 py-0.5 rounded-full bg-white/[0.08] border border-white/10 backdrop-blur-md">
              Atelier
            </span>
          </Link>

          <HeaderClient session={session} cartCount={cartCount} isAdmin={isAdmin} />
        </div>
      </div>
    </header>
  );
}