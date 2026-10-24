# Aureline Atelier — Custom DTF Print-on-Demand Platform

A production-ready print-on-demand store for custom apparel (DTF printing, India): full catalog, a Konva-based design studio, DB-driven pricing, Razorpay checkout, order tracking with email updates, bulk-order enquiries, and a role-based admin dashboard.

Built with **Next.js (App Router) + TypeScript (strict) + Tailwind + Prisma + NextAuth + Razorpay**. The UI preserves the dark glassmorphic design system: gradient accents (`#FF3B30 → #FF0D7B → #8026F2 → #00E0F2`), frosted-glass panels, a viewport-wide mouse-tracing spotlight, and Plus Jakarta Sans / Inter / JetBrains Mono. Icons are bundled `lucide-react` components rather than the Material Symbols webfont, so they always render.

The storefront is **request-based**: the final CTA is **Request now**, checkout captures a **WhatsApp number**, and the customer is messaged on WhatsApp the moment an admin accepts the request (see *Order workflow*).

---

## Quick start

```bash
npm install
cp .env.example .env          # then edit values (see below)
npx prisma generate           # generate the Prisma client
npx prisma migrate deploy     # apply prisma/migrations (creates dev.db on SQLite)
npm run db:seed               # catalog, placements, tiers, coupons, admin user
npm run dev                   # http://localhost:3000
```

Seed admin login (from `.env`, defaults):

- **Email:** `admin@aureline.in` → **Password:** `Admin@12345` → `/admin`

> Always change `SEED_ADMIN_PASSWORD` (and `AUTH_SECRET`) before deploying anywhere shared.

### Database: SQLite locally, PostgreSQL in production

The schema ships configured for **SQLite** (`provider = "sqlite"`, `DATABASE_URL="file:./dev.db"`) so the whole app runs locally with zero services. For production (Vercel/Neon/Supabase), switch the provider:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"          // was "sqlite"
  url      = env("DATABASE_URL")   // use the pooler URL on serverless
  directUrl = env("DIRECT_URL")    // migrations run against the direct URL
}
```

Then set `DATABASE_URL`/`DIRECT_URL` to your Postgres URLs and:

```bash
npx prisma migrate dev --name init_postgres   # regenerate the migration for Postgres
# or, if you keep the committed migration and manage the schema yourself:
npx prisma db push
```

The code itself is provider-agnostic (no raw SQL, no SQLite-only features). The only Postgres nicety omitted is Prisma's `mode: "insensitive"` string filter — search falls back to plain `contains`, which is case-insensitive for ASCII in SQLite; add `mode: "insensitive"` back if you move to Postgres and want case-insensitive matching for non-ASCII text.

---

## Environment variables (`.env`)

| Key | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL`, `DIRECT_URL` | ✅ | Prisma connection (`file:./dev.db` locally) |
| `AUTH_SECRET` / `NEXTAUTH_SECRET` | ✅ | NextAuth JWT signing (same value for both) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Absolute URLs (emails, invoices, webhook callbacks) |
| `NEXT_PUBLIC_APP_NAME` | ✅ | Brand name in emails/UI |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | seed | Admin account created by `npm run db:seed` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | prod | Live/test payments — **absent ⇒ demo checkout** (order created, no charge) |
| `RAZORPAY_WEBHOOK_SECRET` | recommended | Webhook signature verification (`/api/payments/webhook`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Google sign-in (omitted ⇒ hidden from the UI) |
| `CLOUDINARY_URL` | prod | Artwork uploads — **absent ⇒ local `/public/uploads`** (dev only; ephemeral on serverless) |
| `RESEND_API_KEY` / `EMAIL_FROM` | optional | Transactional email — **absent ⇒ console fallback** |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` | optional | WhatsApp Cloud API notify when a request is accepted — **absent ⇒ console log + `wa.me` deep link + one-click admin button** |
| `DEFAULT_GST_RATE`, `DEFAULT_SHIPPING_FEE`, `FREE_SHIPPING_THRESHOLD` | optional | Initial pricing defaults (admins override these live in `/admin/settings`) |
| `PRINT_RATE_PER_SQ_IN`, `PRINT_MINIMUM_CHARGE` | optional | Initial per-square-inch print pricing (defaults ₹1.35/in², ₹99 floor) |

Every optional integration degrades gracefully — the app is fully usable in development with only the required keys.

---

## Routes

### Storefront `(shop)`
| Route | Description |
| --- | --- |
| `/` | Hero, arch runway, stats band, marquee, studio demo, lifestyle photo strip, print showcase gallery, testimonials, FAQ |
| `/products` | Catalog with filters (`?q=`, `?category=`, `?fabric=`, `?size=`, `?color=`) |
| `/products/[slug]` | Detail: colour/size pickers, live price, print-area info, add-to-cart / start designing |
| `/design/[productId]` | Full-screen design studio (no shop chrome) |
| `/cart` | Server-re-priced cart, coupon apply/remove, transparent breakdown |
| `/checkout` | RHF+Zod form, saved addresses, delivery options, Razorpay or demo mode |
| `/orders`, `/orders/[id]` | Order list + detail: status timeline, items, invoice, reorder |
| `/account` | Profile, password, addresses, saved designs (`?tab=…`) |
| `/bulk-orders` | Volume pricing + enquiry form with live slab calculator |
| `/track` | Public tracking by order number or email (no login) |

### Auth `(auth)` — `/login`, `/register`, `/forgot-password`, `/reset-password`

### Admin `(admin)` — role-gated (`ADMIN`/`STAFF`)
`/admin` (dashboard, revenue chart, low stock, recent orders) · `/admin/orders` (filters, detail panel: status transitions, tracking, notes, customer email) · `/admin/products` (inline price/status/flags, per-variant stock steppers) · `/admin/coupons` · `/admin/enquiries` · `/admin/settings` (live pricing inputs + placement/tier reference tables)

### API
| Endpoint | Description |
| --- | --- |
| `GET/POST /api/auth/[...nextauth]` | NextAuth (credentials + optional Google) |
| `POST /api/payments/webhook` | Razorpay webhook (HMAC-SHA256 signature verified on the raw body) |
| `POST /api/newsletter` | Rate-limited newsletter capture |
| `GET /api/invoice/[orderId]` | Print-ready HTML tax invoice (CGST/SGST split, HSN 610910); owner/ADMIN only |

---

## Design studio

- **Front/back sides** rendered as per-side groups inside a single Konva stage (inactive side hidden).
- **Layers:** text (Google Fonts injected at runtime), uploaded images, clipart — drag, resize, rotate with a transformer, snapping guides, delete/duplicate.
- **Undo/redo** history (60 steps), keyboard shortcuts (`Ctrl/Cmd+Z`, `Shift+Ctrl+Z`, `Delete`, `Ctrl+D`), `Ctrl+scroll` zoom, zoom/pan controls.
- **Center-based coordinates:** layer `x/y` is the layer centre; nodes render with `offsetX/offsetY = width/2`, so rotation and transformer bounds stay symmetric. `clampLayer` keeps centres within `[w/2, canvas.width − w/2]`.
- **Canvas scale:** 30 px/inch for editing; export multiplies by 10 ⇒ **300 DPI print-ready PNGs** (`stage.toDataURL({ pixelRatio })`), with a DPI warning per layer if the source image is too small.
- **Live mockup:** debounced (250 ms) exported thumbnail per side composited over the vector garment mockup. The print is rendered through an SVG `foreignObject` clipped to the garment silhouette, so artwork never bleeds onto sleeves or background, and the 2× export keeps the panel crisp on retina screens.
- **Persistence:** design JSON + thumbnail saved server-side (`saveDesign`), resumed via `/design/[productId]?design=<id>`.

## Pricing engine

`base price + print cost (actual artwork area × ₹/in², floored at the minimum) + (− quantity tier%) − coupon + shipping + GST`

All inputs are DB-driven and edited live in `/admin/settings`:

- `PrintPlacement` (key, side, inches, `baseCost`, `surcharge`, mockup overlay %)
- `QuantityDiscount` tiers (`minQty/maxQty/percentOff`, applied to print charges)
- `Coupon` (percentage / fixed / free-shipping, min order, cap, usage limits, window)
- `Setting` rows: `defaultGstRate`, `defaultShippingFee`, `freeShippingThreshold`, `printRatePerSqIn`, `printMinimum`
- Shipping resolved from `ShippingZone` + `ShippingRate` by PIN prefix + method

**Per-square-inch printing.** `src/lib/print-area.ts` computes the union bounding box (rotation-aware) of every layer on the printed side, clips it to the placement, and converts it to square inches. The price is `max(printMinimum, areaSqIn × printRatePerSqIn)`; catalogue quick-adds with no design use the placement's full rectangle. Set the rate to `0` to fall back to flat placement fees. The studio shows the live area, ₹/in², and when the minimum kicked in.

Math lives in `src/lib/pricing.ts`; DB resolution in `src/lib/commerce.ts`. The **server re-prices every cart line and the whole cart on read** — the client store is a cache only, never a source of truth. Money columns are Prisma `Decimal`; always convert through `num()` from `src/lib/utils.ts`.

## Order workflow

```
PENDING_PAYMENT → PAYMENT_CONFIRMED → ARTWORK_REVIEW → IN_PRODUCTION
→ QUALITY_CHECK → PACKED → SHIPPED → DELIVERED
        ↘ CANCELLED · REFUND_REQUESTED · REFUNDED
```

- **Checkout** is a **request**, not a charge: the CTA reads *Request now*, the form captures a **WhatsApp number** (`Order.whatsappPhone`, falling back to the mobile number), and the order is created in `PENDING_PAYMENT`. With Razorpay keys present the gateway order is registered too, so payment happens after acceptance; with keys absent `demoMode: true` allows immediate confirmation for local testing.
- **Request acceptance = WhatsApp ping.** The moment a request leaves `PENDING_PAYMENT` (admin moves it forward, or a payment confirms it), the server sends the customer a WhatsApp acceptance message. `src/lib/whatsapp.ts` uses the Meta WhatsApp Cloud API when `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` are set, and otherwise logs to the console and writes an internal order note containing a ready-to-send `wa.me` link. The admin order panel also has a one-click *WhatsApp request accepted* button that opens the same pre-filled thread, so acceptance always reaches the customer even with zero API keys.
- **Webhook** (`/api/payments/webhook`) is the authoritative fallback: `payment.captured` moves the order forward even if the buyer closes the tab mid-verification.
- Admin advances status from the order panel (forward-only guard; exceptions: cancel/refund), attaches courier + tracking, adds internal/customer notes, and can re-send the status email.
- Customers watch it live at `/orders/[id]` or anonymously at `/track`.

## Access control

- **`src/middleware.ts`** gates `/account`, `/orders` (any token) and `/admin` (token + role re-checked server-side) with `withAuth`; `/admin` redirects non-staff to `/login?callbackUrl=…`.
- Every admin **server action** calls `requireAdmin()` independently (defence in depth — a stale JWT can't mutate anything).
- Ownership checks: invoices, order detail, design and address mutations all verify `userId` against the session.

## Security & ops notes

- All inputs validated with **Zod** (server actions + API routes); responses use one envelope: `{ ok, data | error, code?, fields? }`.
- **Rate limiting** (`src/lib/rate-limit.ts`, in-memory) on auth, uploads, contact/bulk enquiries, newsletter. Documented as approximate on serverless — swap for Upstash/Redis if you need strict limits.
- Passwords hashed with **bcryptjs**; password-reset tokens are single-use with 1-hour expiry.
- **Uploads:** `validateUpload` (type + 10 MB cap) → Cloudinary when configured, else `/public/uploads`; artwork upload is per-user rate-limited.
- **Emails:** Resend when configured, otherwise a clearly-labelled console fallback so dev flows are observable.

## Scripts

```bash
npm run dev           # Next dev server
npm run build         # prisma generate && next build
npm run start         # production server
npm run build:static  # GitHub-Pages static export into ./out (see below)
npm run typecheck     # tsc --noEmit
npm run lint          # next lint
npm run db:migrate    # prisma migrate dev (needs Postgres or use db:deploy on SQLite)
npm run db:deploy     # prisma migrate deploy (works with SQLite dev.db)
npm run db:seed       # idempotent seed (categories, products, placements, tiers,
                      #   coupons, shipping, admin user)
npm run db:studio     # prisma studio
```

### Dev helper scripts

```bash
node_modules\.bin\tsx.cmd scripts\counts.ts        # row counts (sanity-check a seed)
node_modules\.bin\tsx.cmd scripts\first-product.ts # print product ids + slugs
node_modules\.bin\tsx.cmd scripts\verify-auth.ts   # verify seeded admin can log in
powershell -File scripts\to-sqlite.ps1             # switch schema to SQLite (already applied)
powershell -File scripts\from-sqlite.ps1           # revert to Postgres before deploying
```

### Don't remove the `next.config.mjs` webpack block

`react-konva`'s entry point unconditionally does `require("canvas")` (node-canvas)
when it loads on the server. Because the studio is a client component, Next still
SSRs its initial HTML — which made every page importing it fail with
`Module not found: Can't resolve 'canvas'`. The config stubs `canvas` out of the
**server** build only:

```js
webpack: (config, { isServer }) => {
  if (isServer) config.resolve.fallback = { ...config.resolve.fallback, canvas: false };
  return config;
}
```

Deleting this (or installing node-canvas instead) is the one change that will
break `next build`. The studio itself only runs in the browser.

### Seed data

`prisma/seed.ts` is idempotent (upserts on natural keys): 6 categories, **6 products** with fabric/gsm/fit copy, 218 variants across colourways/sizes, front/back print placements, quantity tiers, shipping zones/rates, pricing settings, 3 launch coupons, and the admin user.

Try these codes in the cart coupon box (also listed under **Admin → Coupons**): `WELCOME100` (₹100 off over ₹499, once per user), `DROP15` (15% off over ₹1,499, capped at ₹800), `FREESHIP` (waives shipping).

## Deployment (GitHub Pages — static demo)

GitHub Pages can't run the database, auth, payments or uploads, but this app has
a **static export mode** that ships a fully browsable demo: catalog, product
pages, the whole design studio (editing + in-browser artwork), a
localStorage-backed cart, coupon demo codes, and demo-mode notices on the
backend-only pages (checkout, orders, account, admin).

```bash
npm run build:static             # outputs the site to ./out (adds .nojekyll)
npm run build:static  \
  # with NEXT_PUBLIC_BASE_PATH=/repo-name for project pages
npx serve out                    # preview locally
```

How the one-codebase static export works (`scripts/build-pages.mjs`):

1. Sets `STATIC_EXPORT=1` and `NEXT_PUBLIC_STATIC_EXPORT=1` (the runtime flag
   branches in components/next.config see these and take their static path).
2. Temporarily patches `export const dynamic = "force-dynamic"` →
   `"force-static"` in route files and swaps the server data layer
   (`@/lib/catalog`, `@/lib/commerce`) and all `@/actions/*` for the committed
   shims in `src/lib/static-*.ts` / `src/static/actions/*` by injecting those
   tsconfig `paths` mappings. Both patches are **restored on exit** — the source
   tree on disk is never left modified.
3. Runs `next build` with `output: "export"` (set automatically when
   `STATIC_EXPORT=1`) → `./out`, and writes `.nojekyll` so GitHub Pages serves
   the `_next` folder.

Automated deploys live in `.github/workflows/gh-pages.yml`: on every push to
`main` it rebuilds the static export and publishes it via
`actions/configure-pages` + `actions/deploy-pages` (the base path is read from
the Pages config, so both `<user>.github.io` routes and project sites work).

Limitations to set expectations: login/register, real checkout/orders, saved
designs, admin, and file uploads call the real backend in production but are
stubbed in the static build — visitors see a friendly "demo mode" explanation
instead. The cart works (localStorage only) and prices/coupons are computed with
the same engine as production, against a committed catalog snapshot.

## Deployment (Vercel)

1. Postgres (Neon/Supabase/Vercel Postgres) → set `DATABASE_URL` (pooler) + `DIRECT_URL`, switch `provider = "postgresql"`, run `npx prisma migrate deploy`.
2. Set all required env vars; add Razorpay + Cloudinary + Resend keys for full functionality.
3. Point the Razorpay webhook at `https://<domain>/api/payments/webhook` with the same `RAZORPAY_WEBHOOK_SECRET`.
4. `next build` — every DB-backed page is `export const dynamic = "force-dynamic"`, so nothing is statically baked at build time.

## Project layout

```
prisma/           schema.prisma · migrations/ · seed.ts · dev.db (local)
src/
  app/            (shop) · (auth) · (admin) · design/[productId] · api/*
  actions/        auth · cart · checkout/orders · design · account · bulk · admin · upload
  components/     ui/ · layout/ · shared/ · editor/ · cart/ · checkout/ · orders/ ·
                  account/ · admin/ · bulk/ · product/ · sections/
  lib/            prisma · auth · pricing · commerce · cart · catalog · razorpay ·
                  mail · upload · rate-limit · response · constants · garment · utils
                  (static export twins in static-catalog/static-commerce)
  stores/         cart (Zustand client cache)
  static/         actions shims for STATIC_EXPORT builds (cart with localStorage,
                  orders/design/upload/auth/account/bulk/admin stubs)
  middleware.ts   route protection
```

## Design decisions (summary)

- **Route groups** `(shop)`/`(auth)`/`(admin)` give each area its own chrome; the studio is intentionally outside the shop group (full-screen, no header/footer).
- **Vector garment mockups** (not photos): self-drawn silhouettes in `src/lib/garment.ts`, colour-aware, shared by catalog, cart, editor preview and exports — so previews match prints exactly and the repo carries no third-party imagery.
- **SQLite by default** so `npm install && npm run db:seed && npm run dev` works on a clean machine; the provider switch for Postgres is a one-line schema edit (documented above).
- **Guest carts** keyed by the `aureline_sid` cookie; carts merge into the user's row on sign-in.
- **Demo checkout**: with Razorpay keys absent, checkout returns `demoMode: true` and the order jumps to `/orders/[id]?demo=1` — the whole funnel is testable without money.
- **Invoice as server-rendered HTML** (`/api/invoice/[id]`) — browser print-to-PDF needs no PDF library and stays consistent with the tax rules.
- Konva pinned to `konva@9.3.18` / `react-konva@19.0.7` (React 19 peer range).
