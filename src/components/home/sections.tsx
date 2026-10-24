import Link from "next/link";
import { Star, ChevronDown, Camera, ArrowRight, Users, PackageCheck, BadgeCheck, Truck } from "lucide-react";
import { APP_NAME, MARQUEE_ITEMS } from "@/lib/constants";
import { GarmentMockup, type GarmentType } from "@/components/shared/garment-mockup";

export function Marquee() {
  return (
    <div className="w-full overflow-hidden py-4 border-y border-white/[0.08] backdrop-blur-xl bg-white/[0.02]">
      <div className="animate-marquee whitespace-nowrap flex items-center gap-space-lg text-white/70 font-label-technical text-label-technical uppercase tracking-widest">
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
          <span key={i} className="flex items-center gap-space-lg">
            {item}
            <span className={["text-[#FF0D7B]", "text-[#8026F2]", "text-[#00E0F2]", "text-[#FF8C26]", "text-[#FF3B30]"][i % 5]}>
              ★
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Pick a blank, open the studio",
      body: "Choose from heavyweight tees, oversized drops, hoodies, polos, kids cuts and 16 oz canvas totes. The studio loads the exact printable area for the garment.",
      tag: "STEP 01 · DESIGN",
      accent: "text-[#FF3B30]",
    },
    {
      n: "02",
      title: "Upload, type, place, preview",
      body: "Add text or drop your PNG/SVG artwork, resize, rotate and layer it with snap guides. Switch garment colours and front/back instantly with a live mockup.",
      tag: "STEP 02 · PREVIEW",
      accent: "text-[#FF0D7B]",
    },
    {
      n: "03",
      title: "Order one — or five thousand",
      body: "Transparent per-piece pricing with volume tiers and GST. Pay securely, our team reviews the artwork within 12 hours, then it goes to print and ships Pan-India.",
      tag: "STEP 03 · PRODUCE",
      accent: "text-[#00E0F2]",
    },
  ];

  return (
    <section id="how-it-works" className="w-full bg-[#0a0a0d] py-space-xl relative">
      <div className="max-w-7xl mx-auto px-gutter lg:px-gutter-lg">
        <div className="text-center max-w-2xl mx-auto mb-space-xl">
          <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#FF0D7B] to-[#00E0F2] font-black">
            Streamlined fulfillment
          </span>
          <h2 className="font-headline-xl text-headline-xl text-white font-bold tracking-tight mt-space-xs">
            How {APP_NAME} works
          </h2>
          <p className="font-body-md text-body-md text-white/60 mt-space-sm">
            Three steps from idea to doorstep. No design skills, no minimums, no surprise fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {steps.map((step) => (
            <div
              key={step.n}
              className="glass-panel glass-card-hover p-space-lg flex flex-col gap-space-sm relative"
            >
              <span className="font-display-hero text-headline-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white/25 to-white/5">
                {step.n}
              </span>
              <h3 className="font-headline-md text-headline-md font-bold text-white">{step.title}</h3>
              <p className="font-body-sm text-body-sm text-white/60">{step.body}</p>
              <span className={`font-label-technical text-label-technical uppercase tracking-widest mt-auto font-bold ${step.accent}`}>
                {step.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StatsBand() {
  const stats = [
    { Icon: Users, color: "#FF3B30", value: "1,200+", label: "Happy customers" },
    { Icon: PackageCheck, color: "#FF0D7B", value: "6,500+", label: "Pieces printed" },
    { Icon: BadgeCheck, color: "#8026F2", value: "4.9★", label: "Studio rating" },
    { Icon: Truck, color: "#00E0F2", value: "48h", label: "Avg. dispatch time" },
  ];

  return (
    <section className="w-full bg-[#08080a] py-space-lg relative">
      <div className="max-w-7xl mx-auto px-gutter lg:px-gutter-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
          {stats.map((s) => (
            <div
              key={s.label}
              className="glass-panel glass-card-hover p-space-md flex flex-col items-center text-center gap-space-xs"
            >
              <s.Icon
                className="size-5"
                aria-hidden
                style={{ color: s.color, filter: `drop-shadow(0 0 8px ${s.color})` }}
              />
              <span className="font-headline-xl text-headline-xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 tabular-nums">
                {s.value}
              </span>
              <span className="font-label-technical text-label-technical uppercase tracking-widest text-white/50">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Showcase gallery — real artwork printed on our blanks (MoonPrint-style).
   Each photo is rendered as a print inside the garment's placement box, and
   the mockup's fabric-shading layer falls ON TOP of the print.
   ------------------------------------------------------------------------ */
interface ShowcaseEntry {
  src: string;
  alt: string;
  garment: GarmentType;
  color: string;
  placement: { topPct: number; leftPct: number; widthPct: number; heightPct: number };
  title: string;
  story: string;
  blank: string;
}

const SHOWCASE_BASE: ShowcaseEntry[] = [
  {
    src: "/showcase/black-hole.jpg",
    alt: "Black hole artwork printed on an oversized tee",
    garment: "oversized",
    color: "#111111",
    placement: { topPct: 26, leftPct: 26, widthPct: 48, heightPct: 46 },
    title: "Event horizon · 12″ front",
    story: "Customer artwork · Vintage Washed Oversized",
    blank: "/products/vintage-washed-oversized",
  },
  {
    src: "/showcase/ghibli-sunflowers.jpg",
    alt: "Sunflower field illustration printed on a hoodie",
    garment: "hoodie",
    color: "#3D4035",
    placement: { topPct: 28, leftPct: 27, widthPct: 46, heightPct: 38 },
    title: "Sunflower study · chest print",
    story: "Customer artwork · French Terry Hoodie",
    blank: "/products/french-terry-hoodie",
  },
  {
    src: "/showcase/drift-car.jpg",
    alt: "Anime drift car illustration printed on a heavyweight tee",
    garment: "tee",
    color: "#F4F4F4",
    placement: { topPct: 27, leftPct: 26, widthPct: 48, heightPct: 46 },
    title: "Tunnel drift · full front",
    story: "Customer artwork · Heavyweight Box Tee",
    blank: "/products/heavyweight-box-tee",
  },
  {
    src: "/showcase/dev-icons.jpg",
    alt: "Developer icon set printed on a canvas tote",
    garment: "tote",
    color: "#E6DEC8",
    placement: { topPct: 40, leftPct: 26, widthPct: 48, heightPct: 42 },
    title: "Dev icons · tote face",
    story: "Customer artwork · Raw Canvas Merch Tote",
    blank: "/products/raw-canvas-merch-tote",
  },
];

// Respect the static-export basePath so photos resolve on GitHub Pages.
const SHOWCASE: ShowcaseEntry[] = SHOWCASE_BASE.map((item) => ({
  ...item,
  src: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${item.src}`,
}));

export function ShowcaseGallery() {
  return (
    <section id="showcase" className="w-full bg-[#0a0a0d] py-space-xl relative">
      <div className="absolute top-1/4 -left-1/4 w-[500px] h-[500px] bg-[#8026F2]/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="max-w-7xl mx-auto px-gutter lg:px-gutter-lg relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-xl gap-space-md">
          <div>
            <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#8026F2] to-[#00E0F2] block mb-space-xs font-black">
              Off the curing line
            </span>
            <h2 className="font-headline-xl text-headline-xl text-white font-bold tracking-tight">
              Fresh off the press
            </h2>
            <p className="font-body-md text-body-md text-white/60 mt-space-sm max-w-xl">
              Real customer artwork, printed in-house on our blanks. Every piece below started as a single-piece order —
              no minimums, no compromises.
            </p>
          </div>
          <Link href="/products" className="btn-glass px-space-lg py-space-sm self-start md:self-auto group">
            Print yours
            <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" aria-hidden />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {SHOWCASE.map((item, i) => (
            <figure
              key={item.src}
              className="glass-panel glass-card-hover p-space-md flex flex-col gap-space-sm group animate-fade-up"
              style={{ animationDelay: `${90 * i}ms` }}
            >
              <Link href={item.blank} className="relative rounded-2xl bg-white/[0.02] overflow-hidden transition-transform duration-500 group-hover:scale-[1.02]">
                <GarmentMockup
                  type={item.garment}
                  color={item.color}
                  glow
                  className="w-full"
                  overlay={
                    <img
                      src={item.src}
                      alt={item.alt}
                      loading="lazy"
                      draggable={false}
                      className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
                    />
                  }
                  overlayBox={{
                    topPct: item.placement.topPct,
                    leftPct: item.placement.leftPct,
                    widthPct: item.placement.widthPct,
                    heightPct: item.placement.heightPct,
                  }}
                />
              </Link>
              <figcaption className="flex flex-col gap-1">
                <span className="font-label-lg text-label-lg text-white font-bold">{item.title}</span>
                <span className="font-body-sm text-body-sm text-white/50">{item.story}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  const items = [
    {
      name: "Ishita Rao",
      role: "Founder, indie label",
      quote:
        "Ordered a single sample hoodie at 11pm and had the cured print in hand four days later. The colour density on black fleece genuinely beats my previous vendor's ten-piece minimum.",
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
        "The studio let me place a 14-inch back print exactly where I wanted, and the price breakdown was transparent down to the GST line. No surprises at checkout.",
      rating: 5,
    },
    {
      name: "Rahul Mehta",
      role: "Startup founder",
      quote:
        "We ordered custom hoodies for our team of 15. The print quality blew us away and they shipped in just two days. Will definitely order again.",
      rating: 5,
    },
    {
      name: "Priya Sharma",
      role: "College fest committee",
      quote:
        "Ran 200 tees for our fest merch stall in three size runs. Quality felt premium, the ordering flow was dead simple, and dispatch beat our deadline.",
      rating: 5,
    },
    {
      name: "Sneha Deshmukh",
      role: "Gifting & weddings",
      quote:
        "Made personalised tote bags for my sister's wedding guests — everyone asked where we got them. The design app was genuinely easy to use.",
      rating: 5,
    },
    {
      name: "Arjun Khanna",
      role: "Streetwear label",
      quote:
        "As a small brand I test every drop with one sample before committing to a run. DTF quality here is on par with the international vendors I used to pay 3× more.",
      rating: 5,
    },
  ];

  return (
    <section className="w-full bg-[#08080a] py-space-xl relative">
      <div className="max-w-7xl mx-auto px-gutter lg:px-gutter-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-xl gap-space-md">
          <div>
            <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#FF3B30] to-[#FF0D7B] block mb-space-xs font-black">
              Field reports
            </span>
            <h2 className="font-headline-xl text-headline-xl text-white font-bold tracking-tight">
              Trusted by creators who ship
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {items.map((t) => (
            <figure key={t.name} className="glass-panel glass-card-hover p-space-lg flex flex-col gap-space-sm">
              <div className="flex items-center gap-1 text-[#FF3B30]" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="size-4 fill-current" aria-hidden />
                ))}
              </div>
              <blockquote className="font-body-md text-body-md text-white/80 leading-relaxed flex-1">
                “{t.quote}”
              </blockquote>
              <figcaption className="flex items-center gap-space-sm pt-space-sm border-t border-white/[0.06]">
                <span className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#8026F2] to-[#FF0D7B] flex items-center justify-center font-label-technical text-label-technical text-white">
                  {t.name.split(" ").map((p) => p[0]).join("")}
                </span>
                <span className="flex flex-col">
                  <span className="font-label-lg text-label-lg text-white">{t.name}</span>
                  <span className="font-body-sm text-body-sm text-white/50">{t.role}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FaqSection({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <section id="faq" className="w-full bg-[#0a0a0d] py-space-xl relative">
      <div className="max-w-4xl mx-auto px-gutter lg:px-gutter-lg">
        <div className="text-center mb-space-xl">
          <span className="font-label-technical text-label-technical uppercase tracking-widest text-[#00E0F2] font-black">
            Support matrix
          </span>
          <h2 className="font-headline-xl text-headline-xl text-white font-bold tracking-tight mt-space-xs">
            Frequently asked
          </h2>
        </div>

        <div className="flex flex-col gap-space-sm" id="faq-list">
          {faqs.map((faq, i) => (
            <details
              key={faq.q}
              className="glass-panel-sm group open:border-[#FF0D7B]/40 transition-colors"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-space-md py-space-md font-label-lg text-label-lg text-white [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-space-sm">
                  <span className="font-label-technical text-label-technical text-[#FF0D7B]">{String(i + 1).padStart(2, "0")}</span>
                  {faq.q}
                </span>
                <ChevronDown className="size-5 text-secondary transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="px-space-md pb-space-md font-body-md text-body-md text-white/65">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BottomCta() {
  return (
    <section className="w-full bg-[#08080a] py-space-xl relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-gutter text-center relative z-10">
        <div className="glass-panel glass-card-hover p-space-xl rounded-[2.5rem] shadow-[0_16px_50px_rgba(255,13,123,0.25)] relative overflow-hidden">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-[#FF3B30] to-[#FF0D7B] blur-[100px] opacity-40 rounded-full pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-[#8026F2] to-[#00E0F2] blur-[100px] opacity-40 rounded-full pointer-events-none" />
          <span className="font-label-technical text-label-technical uppercase tracking-widest text-[#00E0F2] font-black block mb-space-xs">
            Ready for production?
          </span>
          <h2 className="font-headline-xl text-headline-xl font-extrabold text-white mb-space-sm max-w-xl mx-auto">
            Launch your next drop with zero inventory risk.
          </h2>
          <p className="font-body-md text-body-md text-white/70 max-w-lg mx-auto mb-space-lg">
            Upload your graphics into the studio, get an instant transparent quote, order a single sample, then scale to
            the full run on the same rails.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-space-md relative z-10">
            <Link href="/products" className="btn-gradient px-space-xl py-space-md font-bold">
              Launch the Customizer
            </Link>
            <a
              href="https://www.instagram.com/aureline.tm/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glass px-space-xl py-space-md font-semibold"
            >
              <Camera className="size-[18px] text-[#FF0D7B]" aria-hidden />
              Follow @aureline.tm
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
