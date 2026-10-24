import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { APP_NAME, APP_URL } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} — Custom T-Shirt & Merch Printing India`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Design custom T-shirts, oversized tees, hoodies, polos, kids tees and tote bags online. Single-piece DTF printing, zero minimum order, transparent pricing and Pan-India express dispatch.",
  keywords: [
    "custom t-shirt printing India",
    "print on demand India",
    "DTF printing",
    "custom hoodie printing",
    "single piece t-shirt printing",
    "merch printing",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: APP_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} — Custom T-Shirt & Merch Printing India`,
    description:
      "Design it. Print one. Or five thousand. Zero minimum order custom apparel printing with instant online design studio.",
  },
  twitter: { card: "summary_large_image", creator: "@aureline" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jakarta.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="bg-[#08080a] text-on-surface font-body-md antialiased selection:bg-primary-container selection:text-on-primary overflow-x-hidden relative">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-black"
        >
          Skip to content
        </a>
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "rgba(19,19,21,0.95)",
              border: "1px solid rgba(255,255,255,0.14)",
              color: "#e5e1e4",
              backdropFilter: "blur(20px)",
              borderRadius: "1rem",
            },
          }}
        />
      </body>
    </html>
  );
}
