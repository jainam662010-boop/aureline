import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

/** GitHub-Pages static export mode (builds with STATIC_EXPORT=1). */
const isStaticExport = process.env.STATIC_EXPORT === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,  ...(isStaticExport
    ? {
        output: "export",
        trailingSlash: true,
        ...(basePath ? { basePath } : {}),
        images: { unoptimized: true, dangerouslyAllowSVG: true },
      }
    : {}),
  ...(!isStaticExport
    ? {
        images: {
          remotePatterns: [
            { protocol: "https", hostname: "res.cloudinary.com" },
            { protocol: "https", hostname: "images.unsplash.com" },
          ],
          // Local placeholder SVGs are served from /public
          dangerouslyAllowSVG: true,
          contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
        },
        experimental: {
          serverActions: {
            bodySizeLimit: "12mb",
          },
        },
      }
    : {}),
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // react-konva's entry unconditionally `require("canvas")" for SSR
      // (node-canvas), which we neither use nor want to compile. The design
      // studio is browser-only, so stub the module out of the server build
      // instead of forcing a native dependency install.
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = { ...config.resolve.fallback, canvas: false };
    }

    // Static-export module swaps (actions → browser shims, catalog/commerce →
    // committed snapshot) are applied through tsconfig "paths" patched by
    // scripts/build-pages.mjs — tsconfig paths resolve with higher priority
    // than webpack aliases in the Next build, so patching them is reliable.
    return config;
  },
};

export default nextConfig;
