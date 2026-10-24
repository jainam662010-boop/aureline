export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Aureline Atelier";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const CURRENCY = "INR";

/** Allowed artwork uploads. */
export const ALLOWED_IMAGE_MIME = ["image/jpeg", "image/png", "image/svg+xml", "image/webp"] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

/** Warn when the source image can't hold 300 DPI at the placed size. */
export const MIN_PRINT_DPI = 150;
export const TARGET_PRINT_DPI = 300;

export const PRODUCT_SIZES = {
  adult: ["S", "M", "L", "XL", "XXL", "3XL"],
  kids: ["2-3Y", "3-4Y", "5-6Y", "7-8Y", "9-10Y"],
  oneSize: ["FREE"],
} as const;

/** Preset garment palette for variant creation. */
export const COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: "Onyx Black", hex: "#111111" },
  { name: "Chalk White", hex: "#F4F4F4" },
  { name: "Graphite", hex: "#3A3A3C" },
  { name: "Sandstone", hex: "#B8A88F" },
  { name: "Terracotta", hex: "#9E4A32" },
  { name: "Forest", hex: "#3D4035" },
  { name: "Steel Blue", hex: "#3B424C" },
  { name: "Vintage Grey", hex: "#827D74" },
  { name: "Burgundy", hex: "#6E2233" },
  { name: "Natural Canvas", hex: "#E6DEC8" },
];

/** Google fonts available inside the design studio. */
export const EDITOR_FONTS = [
  { value: "Inter", label: "Inter" },
  { value: "Plus Jakarta Sans", label: "Jakarta" },
  { value: "JetBrains Mono", label: "Mono" },
  { value: "Anton", label: "Anton" },
  { value: "Bebas Neue", label: "Bebas" },
  { value: "Oswald", label: "Oswald" },
  { value: "Archivo Black", label: "Archivo" },
  { value: "Space Grotesk", label: "Space" },
  { value: "Poppins", label: "Poppins" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Playfair Display", label: "Playfair" },
  { value: "Permanent Marker", label: "Marker" },
] as const;

export const EDITOR_FONT_FAMILIES = EDITOR_FONTS.map((f) => f.value).join("&family=");

/** Clipart library — self-contained SVG path data (viewBox 0 0 100 100). */
export const CLIPART: { key: string; label: string; path: string; fillRule?: "evenodd" | "nonzero" }[] = [
  { key: "bolt", label: "Bolt", path: "M58 4 22 56h22l-8 40 40-56H54z" },
  { key: "star", label: "Star", path: "M50 6l12 28 30 2-23 20 7 30-26-16-26 16 7-30L8 36l30-2z" },
  { key: "heart", label: "Heart", path: "M50 88C24 70 10 55 10 37 10 23 21 12 34 12c8 0 14 4 16 9 2-5 8-9 16-9 13 0 24 11 24 25 0 18-14 33-40 51z" },
  { key: "diamond", label: "Diamond", path: "M50 6 92 50 50 94 8 50z" },
  { key: "flame", label: "Flame", path: "M50 6c6 18-8 24-8 38 0 8 5 14 12 14s12-6 12-14c0-4-1-8-3-12 10 6 17 16 17 28 0 16-13 30-30 30S20 76 20 60c0-22 20-32 30-54z" },
  { key: "crown", label: "Crown", path: "M12 30l18 16 20-26 20 26 18-16-8 52H20zM20 88h60v8H20z" },
  { key: "orbit", label: "Orbit", path: "M50 14a36 36 0 1 0 0 72 36 36 0 0 0 0-72zm0 12a24 24 0 1 1 0 48 24 24 0 0 1 0-48z", fillRule: "evenodd" },
  { key: "triangle", label: "Triangle", path: "M50 10 92 84H8z" },
  { key: "skull", label: "Skull", path: "M50 8c22 0 38 15 38 36 0 12-5 20-12 26v14H24V70c-7-6-12-14-12-26C12 23 28 8 50 8zm-14 34a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm28 0a10 10 0 1 1 0 20 10 10 0 0 1 0-20zM44 74h12v10H44z" },
  { key: "wave", label: "Wave", path: "M6 62c10-20 22-20 32 0s22 20 32 0 22-20 24-8v34H6z" },
  { key: "lightning-bolt-ring", label: "Hex", path: "M50 6l38 22v44L50 94 12 72V28zM50 20 24 35v30l26 15 26-15V35z", fillRule: "evenodd" },
  { key: "asterisk", label: "Asterisk", path: "M44 6h12v30l21-15 6 10-21 15 21 15-6 10-21-15v30H44V61L23 76l-6-10 21-15-21-15 6-10 21 15z" },
];

export const MARQUEE_ITEMS = [
  "⚡ 48H EXPRESS CURING LINE PAN-INDIA",
  "0 MOQ DIRECT PRODUCTION",
  "300 DPI HYPER-DENSITY MATRIX",
  "COLD-PEEL MATTE CARRIER 75μ PET",
  "OEKOTEX ECO-PASSPORT CERTIFIED",
  "100% COMBED COMPACT COTTON",
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Is there a minimum order quantity?",
    a: "Zero. Every blank in the studio can be ordered as a single piece — sample your design before committing to a full drop.",
  },
  {
    q: "What file types can I upload for printing?",
    a: "PNG, JPG, WEBP and SVG. For crisp DTF output we recommend transparent PNG at 300 DPI at final print size, or vector SVG. The editor warns you automatically if your artwork is too low resolution.",
  },
  {
    q: "How long does production and delivery take?",
    a: "Artwork is reviewed within 12 hours, printed and cured in 24–48 hours, then handed to express air partners. Most metros receive parcels in 2–4 working days after dispatch.",
  },
  {
    q: "How should I wash printed garments?",
    a: "Machine wash cold, inside out, on a gentle cycle. Do not iron directly on the print. Our 5-layer DTF transfers are tested beyond 60 wash cycles without cracking.",
  },
  {
    q: "Can you print my own branded merchandise in bulk?",
    a: "Yes — DM us on Instagram @aureline.tm with your quantity, deadline and artwork. You'll get a dedicated quote, mockups and production slot, with the same no-MOQ flexibility for samples.",
  },
  {
    q: "Which payment methods do you support?",
    a: "UPI, RuPay/Visa/Mastercard credit and debit cards, netbanking and wallets — all processed securely through Razorpay. We never store card details.",
  },
];

export const TESTIMONIALS = [
  {
    name: "Ishita Rao",
    role: "Founder, indie label",
    quote:
      "Ordered a single sample hoodie at 11pm, had the cured print in hand four days later. The colour density on black fleece is genuinely better than my previous vendor's ten-piece minimum.",
    rating: 5,
  },
  {
    name: "Kabir Menon",
    role: "Tour merch, band crew",
    quote:
      "We ran 220 tees across two designs for a three-city tour. Artwork review caught a resolution issue before printing and saved the whole batch. Zero cracks after the tour.",
    rating: 5,
  },
  {
    name: "Ananya Bose",
    role: "Illustrator",
    quote:
      "The studio editor let me place a 14-inch back print exactly where I wanted, and the price breakdown was transparent down to the GST line. No surprises at checkout.",
    rating: 5,
  },
];
