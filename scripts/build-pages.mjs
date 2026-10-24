/**
 * Builds the GitHub-Pages static export (see .github/workflows/gh-pages.yml).
 *
 * What it does:
 *   1. Sets the static-export environment flags (STATIC_EXPORT etc.).
 *   2. Temporarily patches `export const dynamic = "force-dynamic"` declarations
 *      to "force-static" — Next.js only accepts literal segment configs, so the
 *      dynamic app and the static export need different values (the patch is
 *      restored afterwards, untouched on disk).
 *   3. Runs `next build`, which prerenders the whole app into ./out thanks to
 *      `output: "export"` in next.config.mjs (and swaps the server data layer
 *      and actions for the committed static shims via webpack aliases).
 *   4. Adds a .nojekyll marker so GitHub Pages serves the `_next` folder as-is.
 *
 * Local usage:
 *   npm run build:static
 *   NEXT_PUBLIC_BASE_PATH=/your-repo npm run build:static   (project pages)
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");

process.env.STATIC_EXPORT = "1";
process.env.NEXT_PUBLIC_STATIC_EXPORT = "1";
process.env.NEXT_TELEMETRY_DISABLED = "1";
if (process.env.NEXT_PUBLIC_BASE_PATH === "/") delete process.env.NEXT_PUBLIC_BASE_PATH;

/* -------------------------------------------------- dynamic-export patch -- */

const DYNAMIC_LINE = 'export const dynamic = "force-dynamic";';
const STATIC_LINE = 'export const dynamic = "force-static";';

// Module swaps for the static export: tsconfig "paths" entries placed BEFORE
// the generic "@/*" pattern win resolution in the Next build (webpack aliases
// lose to the tsconfig-paths plugin, so patching this file is deterministic).
const STATIC_PATHS = {
  "@/actions/cart": ["./src/static/actions/cart.ts"],
  "@/actions/orders": ["./src/static/actions/orders.ts"],
  "@/actions/design": ["./src/static/actions/design.ts"],
  "@/actions/upload": ["./src/static/actions/misc.ts"],
  "@/actions/auth": ["./src/static/actions/misc.ts"],
  "@/actions/account": ["./src/static/actions/misc.ts"],
  "@/actions/bulk": ["./src/static/actions/misc.ts"],
  "@/actions/admin": ["./src/static/actions/misc.ts"],
  "@/lib/catalog": ["./src/lib/static-catalog.ts"],
  "@/lib/commerce": ["./src/lib/static-commerce.ts"],
};

function collectAppFiles(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectAppFiles(full, acc);
    else if (/\.(tsx|ts)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

const patched = [];
function applyPatch() {
  const appDir = path.join(projectRoot, "src", "app");
  for (const file of collectAppFiles(appDir)) {
    const content = readFileSync(file, "utf8");
    if (!content.includes(DYNAMIC_LINE)) continue;
    writeFileSync(file, content.split(DYNAMIC_LINE).join(STATIC_LINE));
    patched.push({ file, type: "route", content });
  }

  const tsconfigFile = path.join(projectRoot, "tsconfig.json");
  const tsconfig = JSON.parse(readFileSync(tsconfigFile, "utf8"));
  patched.push({ file: tsconfigFile, type: "tsconfig", content: readFileSync(tsconfigFile, "utf8") });
  tsconfig.compilerOptions = tsconfig.compilerOptions ?? {};
  tsconfig.compilerOptions.paths = { ...STATIC_PATHS, ...tsconfig.compilerOptions.paths };
  writeFileSync(tsconfigFile, JSON.stringify(tsconfig, null, 2));

  if (patched.length > 0) {
    console.log(`› patched ${patched.filter((p) => p.type === "route").length} route file(s) + tsconfig for static export`);
  }
}

function restorePatch() {
  for (const { file, content } of patched) {
    try {
      writeFileSync(file, content);
    } catch (error) {
      console.error(`✗ failed to restore ${file}`, error);
    }
  }
}

/* --------------------------------------------------------------- next bin -- */

const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
if (!existsSync(nextBin)) {
  console.error("next binary not found — run `npm install` first.");
  process.exit(1);
}

/* ------------------------------------------------------------------- run -- */

let exitCode = 1;
try {
  applyPatch();
  const result = spawnSync(process.execPath, [nextBin, "build"], {
    stdio: "inherit",
    cwd: projectRoot,
    env: process.env,
  });
  exitCode = result.status ?? 1;
} finally {
  restorePatch();
  if (exitCode === 0 && existsSync(path.join(projectRoot, "out"))) {
    writeFileSync(path.join(projectRoot, "out", ".nojekyll"), "");
    console.log("\n✔ Static export ready in ./out (added .nojekyll)");
  }
}

process.exit(exitCode);
