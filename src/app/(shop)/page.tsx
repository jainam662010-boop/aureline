import Link from "next/link";
import { ArrowRight, LayoutGrid, Zap, Infinity as InfinityIcon, BadgeCheck, Layers, CheckCircle2 } from "lucide-react";
import { KineticIntro } from "@/components/home/kinetic-intro";
import { Marquee, HowItWorks, Testimonials, FaqSection, BottomCta, StatsBand, ShowcaseGallery } from "@/components/home/sections";
import { StudioDemo } from "@/components/home/studio-demo";
import { LifestyleGallery } from "@/components/home/lifestyle-gallery";
import { ProductCard } from "@/components/product/product-card";
import { GarmentMockup, garmentTypeFromCategory } from "@/components/shared/garment-mockup";
import { getFeaturedProducts, listCategories } from "@/lib/catalog";
import { FAQS } from "@/lib/constants";
import { formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TRUST = [
  { Icon: Zap, color: "#2563EB", label: "48h Pan-India express dispatch" },
  { Icon: InfinityIcon, color: "#0EA5E9", label: "0 minimum order quantity" },
  { Icon: BadgeCheck, color: "#7C3AED", label: "60+ wash cure guarantee" },
  { Icon: Layers, color: "#0891B2", label: "100% combed compact cotton" },
];

export default async function HomePage() {
  const [featured, categories] = await Promise.all([getFeaturedProducts(8), listCategories()]);

  const archProducts = featured.slice(0, 5);
  while (archProducts.length < 5) {
    archProducts.push(archProducts[archProducts.length % Math.max(archProducts.length, 1)] ?? featured[0]!);
  }

  return (
    <>
      <KineticIntro />

      {/* HERO */}
      <section className="relative w-full overflow-hidden min-h-[88vh] sm:min-h-[92vh] flex flex-col justify-center pt-space-xl pb-space-xl">
        <div className="absolute -top-40 left-1/4 w-[550px] h-[550px] bg-gradient-to-br from-[#2563EB]/15 via-[#0EA5E9]/10 to-transparent blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-gradient-to-tl from-[#7C3AED]/15 via-[#0891B2]/10 to-transparent blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-20 left-10 w-[450px] h-[450px] bg-gradient-to-tr from-[#D97706]/10 via-[#2563EB]/12 to-transparent blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F4F7FB]/60 via-transparent to-[#F4F7FB] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-gutter lg:px-gutter-lg flex flex-col items-center text-center relative z-10">
          <div className="inline-flex items-center gap-space-xs backdrop-blur-2xl bg-slate-900/[0.04] border border-slate-900/[0.1] px-4 py-1.5 rounded-full shadow-[0_4px_24px_rgba(37,99,235,0.18)] mb-space-lg group hover:border-slate-900/[0.1] transition-all">
            <span className="relative flex h-2.5 w-2.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0EA5E9] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2563EB]" />
            </span>
            <span className="font-label-technical text-label-technical uppercase tracking-widest text-slate-900/90">
              Atelier batch live
            </span>
            <span className="text-slate-500 text-[10px]">/</span>
            <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#0EA5E9] to-[#0891B2] font-extrabold">
              Direct-to-film 300 DPI cured
            </span>
          </div>

          <h1 className="font-display-hero text-display-hero text-slate-900 max-w-5xl tracking-tight leading-[1.04] mb-space-md drop-shadow-[0_4px_20px_rgba(15,23,42,0.18)] animate-bounce-in [animation-delay:180ms]">
            Architectural cuts. Heavyweight blanks. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#2563EB] via-[#0EA5E9] via-[#7C3AED] to-[#0891B2] animate-gradient-flow font-black inline-block drop-shadow-[0_0_35px_rgba(14,165,233,0.35)]">
              Zero minimum.
            </span>
          </h1>

          <p className="font-body-lg text-body-lg text-slate-800 max-w-2xl mx-auto mb-space-xl leading-relaxed backdrop-blur-sm animate-pop-in [animation-delay:520ms]">
            Engineered for creators, independent streetwear labels and individuals. 240–450 GSM French Terry and compact
            cotton with ultra-dense 5-layer DTF precision. From 1 piece to 5,000.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-space-md mb-space-xl">
            <Link href="/products" className="btn-gradient px-space-xl py-space-md group">
              <span className="font-bold tracking-wide">Open the design studio</span>
              <ArrowRight className="size-[18px] group-hover:translate-x-1 transition-transform" aria-hidden />
            </Link>
            <Link href="#blanks-repertoire" className="btn-glass px-space-xl py-space-md group">
              <LayoutGrid className="size-[18px] text-[#0891B2] group-hover:rotate-6 transition-transform" aria-hidden />
              <span className="tracking-wide">Explore blanks catalog</span>
            </Link>
          </div>

          <div className="w-full max-w-4xl backdrop-blur-2xl bg-slate-900/[0.035] border border-slate-900/[0.08] px-space-lg py-space-sm rounded-3xl sm:rounded-full flex flex-wrap items-center justify-center md:justify-between gap-space-sm mb-space-xl text-slate-800 shadow-[0_8px_32px_0_rgba(15,23,42,0.12)]">
            {TRUST.map((t, i) => (
              <span key={t.label} className="flex items-center gap-space-xs">
                {i > 0 ? <span className="hidden md:inline text-slate-300 mr-1">·</span> : null}
                <span className="flex items-center gap-space-xs font-label-technical text-label-technical uppercase tracking-wider text-slate-900 text-center">
                  <t.Icon
                    className="size-4 flex-shrink-0"
                    aria-hidden
                    style={{ color: t.color, filter: `drop-shadow(0 0 6px ${t.color})` }}
                  />
                  {t.label}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Arched runway */}
        <div className="relative w-full max-w-7xl mx-auto px-gutter lg:px-gutter-lg mt-space-sm">
          <div className="relative backdrop-blur-3xl bg-slate-900/[0.02] border border-slate-900/[0.08] p-space-md sm:p-space-lg rounded-[2.5rem] shadow-[0_12px_48px_0_rgba(15,23,42,0.14)]">
            <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-[#2563EB]/50 via-[#7C3AED]/50 to-transparent" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-space-md items-end pt-space-xs">
              {archProducts.slice(0, 5).map((product, i) => {
                const center = i === 2;
                const color = product.colors[0]?.hex ?? "#111111";
                const garment = garmentTypeFromCategory(product.category.slug);
                return (
                  <Link
                    key={`${product.id}-${i}`}
                    href={`/products/${product.slug}`}
                    className={`group relative flex flex-col items-center transition-all duration-500 hover:-translate-y-3 ${
                      center ? "col-span-2 md:col-span-1 animate-float-slow" : ""
                    }`}
                  >
                    <div
                      className={`w-full overflow-hidden backdrop-blur-xl bg-slate-900/[0.03] border relative arch-frame shadow-[0_12px_32px_rgba(15,23,42,0.14)] transition-all ${
                        center
                          ? "h-[300px] sm:h-[430px] lg:h-[500px] border-2 border-[#0EA5E9]/40 shadow-[0_0_50px_rgba(14,165,233,0.35)] group-hover:border-[#0891B2]/70"
                          : "h-48 sm:h-80 lg:h-96 border-slate-900/[0.1] group-hover:shadow-[0_12px_35px_rgba(37,99,235,0.35)]"
                      }`}
                    >
                      <div className="absolute inset-0 flex items-end justify-center p-space-md pt-10 transition-transform duration-500 group-hover:scale-105">
                        <GarmentMockup type={garment} color={color} className="h-full w-auto" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#EAF2FB] via-transparent to-transparent opacity-80 pointer-events-none" />
                      <span className="absolute top-8 left-1/2 -translate-x-1/2 font-label-technical text-label-technical uppercase tracking-widest text-white backdrop-blur-xl bg-slate-900/40 border border-slate-900/[0.1] px-3 py-1 rounded-full shadow-lg">
                        {product.gsm} GSM
                      </span>
                      {center ? (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 backdrop-blur-2xl bg-white/90 border border-slate-900/10 p-space-sm rounded-3xl flex flex-col items-center text-center shadow-[0_16px_36px_rgba(15,23,42,0.16)] group-hover:border-[#0EA5E9]/60 transition-all">
                          <span className="font-label-technical text-label-technical uppercase tracking-widest text-[#0891B2]">
                            Hero blank
                          </span>
                          <div className="flex items-center gap-space-xs">
                            <span className="font-label-lg text-label-lg font-bold text-slate-900">
                              From {formatINR(product.basePrice)}
                            </span>
                          </div>
                          <span className="font-label-technical text-[9px] uppercase tracking-wider text-[#2563EB] mt-0.5 font-bold">
                            {product.fabric.split(",")[0]}
                          </span>
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-space-sm text-center">
                      <span
                        className={`font-label-technical text-label-technical uppercase tracking-widest block ${
                          center ? "text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] font-extrabold" : "text-slate-500"
                        }`}
                      >
                        {center ? "Hero blank" : `Silhouette 0${i + 1}`}
                      </span>
                      <span className={`text-slate-900 font-semibold ${center ? "font-headline-md text-headline-md" : "font-label-lg text-label-lg"}`}>
                        {product.name}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <Marquee />
      <StatsBand />
      <StudioDemo />
      <LifestyleGallery />
      <ShowcaseGallery />

      {/* FEATURED PRODUCTS */}
      <section id="blanks-repertoire" className="w-full bg-[#F4F7FB] py-space-xl relative">
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-[#0EA5E9]/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-gutter lg:px-gutter-lg relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-xl gap-space-md">
            <div>
              <span className="font-label-technical text-label-technical uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#0EA5E9] block mb-space-xs font-black">
                Museum-grade blanks
              </span>
              <h2 className="font-headline-xl text-headline-xl text-slate-900 font-bold tracking-tight">
                Curated heavyweight canvas
              </h2>
            </div>
            <Link href="/products" className="btn-glass px-space-lg py-space-sm self-start md:self-auto group">
              View all products
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" aria-hidden />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {featured.slice(0, 4).map((product, i) => (
              <div
                key={product.id}
                className="animate-fade-up"
                style={{ animationDelay: `${80 * i}ms` }}
              >
                <ProductCard product={product} priority={i < 2} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* POPULAR CATEGORIES */}
      <section className="w-full bg-[#FFFFFF] py-space-xl relative">
        <div className="max-w-7xl mx-auto px-gutter lg:px-gutter-lg">
          <div className="text-center max-w-2xl mx-auto mb-space-xl">
            <span className="font-label-technical text-label-technical uppercase tracking-widest text-[#0891B2] font-black">
              Popular categories
            </span>
            <h2 className="font-headline-xl text-headline-xl text-slate-900 font-bold tracking-tight mt-space-xs">
              Every silhouette, one studio
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-space-md">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="glass-panel glass-card-hover p-space-md flex flex-col items-center gap-space-sm group"
              >
                <div className="w-full h-32 flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                  <GarmentMockup type={garmentTypeFromCategory(category.slug)} color="#26262A" className="h-full w-auto" />
                </div>
                <span className="font-label-lg text-label-lg text-slate-900 text-center">{category.name}</span>
                <span className="font-label-technical text-label-technical text-slate-500">
                  {category._count.products} styles
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* DTF QUALITY */}
      <section className="w-full bg-[#F4F7FB] py-space-xl relative border-y border-slate-900/[0.05]">
        <div className="max-w-7xl mx-auto px-gutter lg:px-gutter-lg">
          <div className="glass-panel glass-card-hover p-space-lg lg:p-space-xl mb-space-xl shadow-[0_8px_32px_0_rgba(37,99,235,0.14)]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center">
              <div className="lg:col-span-5 flex flex-col gap-space-sm">
                <span className="font-label-technical text-label-technical uppercase tracking-widest text-[#0891B2] font-black">
                  5-layer film architecture
                </span>
                <h3 className="font-headline-xl text-headline-xl text-slate-900 font-bold leading-tight">
                  Why our DTF transfers outperform silk screen for small runs
                </h3>
                <p className="font-body-md text-body-md text-slate-700">
                  We eliminated the rough, rubbery plastic feel of cheap transfers. A specialised polyamide adhesive
                  layer flexes synchronously with heavy cotton weave fibres.
                </p>
                <ul className="flex flex-col gap-space-xs mt-space-sm">
                  {[
                    "Zero screen setup fees — perfect for 1 to 500 test batches",
                    "True CMYK+White gradients without half-tone dots",
                    "Tested beyond 60 domestic machine wash cycles",
                  ].map((point) => (
                    <li key={point} className="flex items-center gap-space-xs font-body-sm text-body-sm text-slate-900">
                      <CheckCircle2 className="size-[18px] text-[#2563EB] flex-shrink-0" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="lg:col-span-7 backdrop-blur-xl bg-white/80 border border-slate-900/10 p-space-md rounded-2xl flex flex-col gap-space-sm shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]">
                <span className="font-label-technical text-label-technical uppercase tracking-widest text-slate-500">
                  Cross-section DTF print anatomy
                </span>
                <div className="space-y-2 font-label-md text-label-md">
                  {[
                    { text: "01. Release film (cold peel matte carrier)", meta: "75μ PET", cls: "from-[#2563EB]/20 border-[#2563EB] text-[#2563EB]" },
                    { text: "02. Micro-pigment CMYK layer", meta: "1200 DPI", cls: "bg-slate-900/[0.05] border-[#0EA5E9] text-slate-900" },
                    { text: "03. High opacity titanium white base", meta: "100% barrier", cls: "bg-slate-900/[0.06] border-[#7C3AED] text-slate-900 font-bold" },
                    { text: "04. Soft polyamide elastic hot-melt adhesive", meta: "Anti-crack", cls: "bg-slate-900/[0.04] border-[#0891B2] text-slate-900" },
                    { text: "05. Heavy combed compact cotton weave", meta: "280–450 GSM", cls: "bg-slate-900/[0.02] border-slate-900/[0.1] text-slate-600" },
                  ].map((layer) => (
                    <div key={layer.text} className={`bg-gradient-to-r ${layer.cls} to-transparent border-l-2 p-space-sm rounded-r-xl flex items-center justify-between`}>
                      <span>{layer.text}</span>
                      <span className="font-label-technical text-[9px] uppercase tracking-wider">{layer.meta}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HowItWorks />
      <Testimonials />
      <FaqSection faqs={FAQS} />
      <BottomCta />
    </>
  );
}
