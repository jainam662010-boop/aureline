"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Session } from "next-auth";
import { ShoppingBag, Search, LayoutDashboard, LogOut, User as UserIcon, Package, Heart, Camera, Menu, X } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";

interface HeaderClientProps {
  session: Session | null;
  cartCount: number;
  isAdmin: boolean;
}

const INSTAGRAM_URL = "https://www.instagram.com/aureline.tm/";
const INSTAGRAM_HANDLE = "@aureline.tm";

const NAV_LINKS: { href: string; label: string; external?: boolean }[] = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Blanks Studio" },
  { href: "/track", label: "Track" },
  { href: INSTAGRAM_URL, label: INSTAGRAM_HANDLE, external: true },
];

export function HeaderClient({ session, cartCount, isAdmin }: HeaderClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);

  // Static demo builds have no server header re-renders, so the cart badge
  // subscribes to the localStorage cart's change events instead. The storage
  // key only exists in static builds, so this is a no-op in production.
  const [liveCount, setLiveCount] = React.useState<number | null>(null);
  React.useEffect(() => {
    const handler = (e: Event) => setLiveCount(((e as CustomEvent).detail?.count as number | undefined) ?? 0);
    try {
      const raw = window.localStorage.getItem("aur-static-cart");
      if (raw) {
        const parsed = JSON.parse(raw) as { items?: { quantity?: number }[] };
        const count = (parsed.items ?? []).reduce((s, i) => s + (i.quantity ?? 0), 0);
        if (count > 0) setLiveCount(count);
      }
    } catch {
      /* ignore */
    }
    window.addEventListener("aureline:static-cart", handler);
    return () => window.removeEventListener("aureline:static-cart", handler);
  }, []);
  const shownCartCount = liveCount ?? cartCount;

  // Close any open dropdown when the route changes.
  React.useEffect(() => {
    setMenuOpen(false);
    setNavOpen(false);
  }, [pathname]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
    setNavOpen(false);
  };

  const renderNavLink = (link: (typeof NAV_LINKS)[number], onNavigate?: () => void) => {
    const active = pathname === link.href;
    const className = cn(
      "px-space-md min-h-11 rounded-full font-label-lg text-label-lg transition-all inline-flex items-center gap-1.5",
      active
        ? "bg-white/[0.12] text-white border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
        : "text-secondary hover:text-white hover:bg-white/[0.08] border border-transparent",
    );
    if (link.external) {
      return (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          onClick={onNavigate}
        >
          <Camera className="size-4" aria-hidden />
          {link.label}
        </a>
      );
    }
    return (
      <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={className} onClick={onNavigate}>
        {link.label}
      </Link>
    );
  };

  return (
    <div className="flex items-center gap-space-sm">
      <nav className="hidden xl:flex items-center gap-space-xs bg-white/[0.04] p-1.5 rounded-full border border-white/[0.08] backdrop-blur-xl">
        {NAV_LINKS.map((link) => renderNavLink(link))}
      </nav>

      <div className="relative xl:hidden">
        <button
          type="button"
          onClick={() => setNavOpen((v) => !v)}
          aria-expanded={navOpen}
          aria-label={navOpen ? "Close navigation menu" : "Open navigation menu"}
          className="size-11 rounded-full bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.1] text-on-surface flex items-center justify-center transition-all backdrop-blur-md"
        >
          {navOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>

        {navOpen ? (
          <>
            <button className="fixed inset-0 z-40 cursor-default" aria-label="Close navigation menu" onClick={() => setNavOpen(false)} />
            <nav
              aria-label="Primary"
              className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-2rem))] z-50 glass-panel border-white/[0.16] bg-[#131315]/95 p-space-xs flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            >
              <form onSubmit={submitSearch} className="flex items-center bg-white/[0.05] border border-white/[0.1] px-space-sm py-2 rounded-full mb-space-xs focus-within:ring-2 focus-within:ring-[#FF3B30]">
                <Search className="text-secondary mr-space-xs size-[16px]" aria-hidden />
                <label htmlFor="mobile-search" className="sr-only">
                  Search blanks
                </label>
                <input
                  id="mobile-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="bg-transparent border-0 outline-none w-full text-on-surface placeholder:text-secondary text-body-sm font-body-sm"
                  placeholder="Search blanks, GSM, mesh..."
                  type="search"
                />
              </form>
              {NAV_LINKS.map((link) => renderNavLink(link, () => setNavOpen(false)))}
            </nav>
          </>
        ) : null}
      </div>

      <form onSubmit={submitSearch} className="hidden md:flex items-center bg-white/[0.04] border border-white/[0.1] px-space-md py-space-sm rounded-full w-48 lg:w-60 focus-within:ring-2 focus-within:ring-[#FF3B30] backdrop-blur-md transition-all">
        <Search className="text-secondary text-[18px] mr-space-xs size-[18px]" aria-hidden />
        <label htmlFor="header-search" className="sr-only">
          Search blanks
        </label>
        <input
          id="header-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-transparent border-0 outline-none w-full text-on-surface placeholder:text-secondary text-body-sm font-body-sm"
          placeholder="Search blanks, GSM, mesh..."
          type="search"
        />
      </form>

      <Link
        href="/cart"
        aria-label={`Cart, ${shownCartCount} items`}
        className="relative size-11 rounded-full bg-white/[0.05] border border-white/[0.1] hover:bg-white/[0.1] text-on-surface flex items-center justify-center transition-all backdrop-blur-md group"
      >
        <ShoppingBag className="size-5 group-hover:scale-110 transition-transform" aria-hidden />
        {shownCartCount > 0 ? (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-tr from-[#FF3B30] to-[#FF0D7B] text-white flex items-center justify-center font-label-technical text-[9px] font-bold shadow-[0_0_14px_rgba(255,13,123,0.8)]">
            {shownCartCount > 99 ? "99+" : shownCartCount}
          </span>
        ) : null}
      </Link>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Account menu"
          className="size-11 rounded-full bg-gradient-to-tr from-[#8026F2] to-[#FF0D7B] p-[1px] flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(128,38,242,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3B30]"
        >
          <span className="w-full h-full rounded-full bg-[#121216] flex items-center justify-center text-primary font-label-technical text-[11px] font-bold">
            {session?.user?.image ? (
              <Image src={session.user.image} alt="" width={32} height={32} className="rounded-full" unoptimized />
            ) : (
              getInitials(session?.user?.name ?? session?.user?.email)
            )}
          </span>
        </button>

        {menuOpen ? (
          <>
            <button className="fixed inset-0 z-40 cursor-default" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
            <div role="menu" className="absolute right-0 mt-2 w-56 z-50 glass-panel border-white/[0.16] bg-[#131315]/95 p-space-xs shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              {session ? (
                <>
                  <div className="px-space-sm py-space-xs">
                    <p className="font-label-lg text-label-lg text-white truncate">{session.user.name ?? "Account"}</p>
                    <p className="font-body-sm text-body-sm text-white/50 truncate">{session.user.email}</p>
                  </div>
                  <MenuLink href="/account" icon={<UserIcon className="size-4" />} onClick={() => setMenuOpen(false)}>
                    Profile
                  </MenuLink>
                  <MenuLink href="/orders" icon={<Package className="size-4" />} onClick={() => setMenuOpen(false)}>
                    Orders
                  </MenuLink>
                  <MenuLink href="/account?tab=designs" icon={<Heart className="size-4" />} onClick={() => setMenuOpen(false)}>
                    Saved designs
                  </MenuLink>
                  {isAdmin ? (
                    <MenuLink href="/admin" icon={<LayoutDashboard className="size-4" />} onClick={() => setMenuOpen(false)}>
                      Admin dashboard
                    </MenuLink>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full flex items-center gap-space-xs px-space-sm min-h-11 rounded-xl font-label-md text-label-md text-[#ff9d95] hover:bg-[#93000a]/25 transition-colors"
                  >
                    <LogOut className="size-4" /> Sign out
                  </button>
                </>
              ) : (
                <>
                  <MenuLink href="/login" icon={<UserIcon className="size-4" />} onClick={() => setMenuOpen(false)}>
                    Sign in
                  </MenuLink>
                  <MenuLink href="/register" icon={<UserIcon className="size-4" />} onClick={() => setMenuOpen(false)}>
                    Create account
                  </MenuLink>
                </>
              )}
            </div>
          </>
        ) : null}
      </div>

      <Link href="/products" className="hidden lg:flex items-center gap-space-xs px-space-lg py-space-sm rounded-full bg-gradient-to-r from-[#FF3B30] via-[#FF0D7B] to-[#8026F2] text-white font-label-lg text-label-lg shadow-[0_0_28px_rgba(255,13,123,0.5)] hover:shadow-[0_0_36px_rgba(0,224,242,0.6)] hover:brightness-110 active:scale-95 transition-all">
        Launch Studio
      </Link>
    </div>
  );
}

function MenuLink({
  href,
  children,
  icon,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="w-full flex items-center gap-space-xs px-space-sm min-h-11 rounded-xl font-label-md text-label-md text-white/80 hover:bg-white/[0.08] hover:text-white transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}
