import Link from "next/link";

import { MainNav } from "@/components/main-nav";
import { TikTokSection } from "@/components/TikTokSection";
import { VENDOR_CATEGORY_GROUPS } from "@/lib/vendor-categories";
import {
  getSharedCategoryOptions,
  getSharedCultureOptions,
  getSharedLocationOptions,
} from "@/lib/vendor-filter-options";
import { getHomepageTikTokSectionData } from "@/lib/tiktok";
import { VendorCard } from "@/components/vendor-card";
import { getFeaturedVendors } from "@/lib/vendors";

const trustPoints = [
  "Approved vendor profiles",
  "Verification markers for trusted businesses",
  "Marketplace built for Nigerian weddings and diaspora users",
];

export default async function Home() {
  const featuredVendors = await getFeaturedVendors();
  const vendorRailItems = ensureMinimumItems(featuredVendors, 10);
  const { latestTikToks, topTikToks } = getHomepageTikTokSectionData();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(91,44,131,0.08),_transparent_34%),linear-gradient(180deg,#FAF9F7_0%,#ffffff_42%,#ffffff_100%)]">
      <MainNav />
      <section className="relative h-[560px] overflow-hidden px-4 pb-7 pt-1 sm:h-[620px] sm:px-6 sm:pb-10 md:h-[700px] md:px-10 md:pb-12 lg:h-[760px] lg:px-12 lg:pb-14 lg:pt-1.5">
        <div
          className="pointer-events-none absolute inset-0 bg-cover opacity-[0.84]"
          style={{ backgroundImage: "url('/images/wedding-romance-bg.jpg')", backgroundPosition: "center top" }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(31,31,31,0.12)_0%,rgba(31,31,31,0.02)_34%,rgba(31,31,31,0.06)_100%)]" />
        <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end">
          <h1 className="mx-auto mb-2 max-w-4xl rounded-[1.1rem] bg-[linear-gradient(180deg,rgba(74,34,104,0.3)_0%,rgba(74,34,104,0.14)_64%,rgba(74,34,104,0)_100%)] px-3 py-1.5 text-center text-2xl font-semibold tracking-[-0.03em] text-white/95 drop-shadow-[0_4px_20px_rgba(74,34,104,0.45)] sm:mb-3 sm:px-5 sm:py-2 sm:text-3xl md:mb-4 md:text-5xl">
            Plan Your Nigerian Wedding Anywhere in the World
          </h1>
          <div className="mx-auto w-full max-w-5xl rounded-[1.4rem] border border-[rgba(106,62,124,0.1)] bg-white/88 p-3 shadow-[0_20px_50px_-40px_rgba(106,62,124,0.24)] backdrop-blur-[1px] sm:p-3.5 md:p-4">
            <form action="/vendors" method="get" className="space-y-2.5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end">
                <SearchField
                  label="Category"
                  name="category"
                  options={getSharedCategoryOptions()}
                  allLabel="All categories"
                />
                <SearchField
                  label="Location"
                  name="location"
                  options={getSharedLocationOptions()}
                  allLabel="All locations"
                />
                <SearchField
                  label="Culture"
                  name="culture"
                  options={getSharedCultureOptions()}
                  allLabel="All cultures"
                />
              </div>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <button type="submit" className="btn-primary min-w-[145px] px-4 py-2.5 text-sm">
                  Find Vendors
                </button>
                <p className="max-w-2xl text-center text-[0.8rem] leading-5 text-[color:var(--color-brand-primary-dark)] sm:px-3 sm:text-[0.86rem]">
                  Discover trusted Nigerian wedding vendors across Nigeria and the diaspora. Browse by category, location, and cultural fit.
                </p>
                <Link
                  href="/auth/sign-up?role=vendor"
                  className="whitespace-nowrap rounded-full border border-[#C9A15B] bg-white px-4 py-2.5 text-sm font-semibold !text-[#5B2C83] transition-all duration-200 ease-in-out hover:border-[#5B2C83] hover:bg-[#5B2C83] hover:!text-white sm:min-w-[175px]"
                >
                  List Your Business
                </Link>
              </div>

              <div className="grid gap-1.5 border-t border-[rgba(106,62,124,0.08)] pt-2 text-sm text-[color:var(--color-muted)] sm:grid-cols-2 md:grid-cols-3">
                {trustPoints.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-1.5 rounded-[0.9rem] border border-[rgba(106,62,124,0.06)] bg-[rgba(233,221,240,0.55)] px-2.5 py-1.5"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-brand-gold)]" />
                    <span className="text-[0.74rem] leading-5">{item}</span>
                  </div>
                ))}
              </div>
            </form>
          </div>
        </div>
      </section>

      <main className="mx-auto flex max-w-6xl flex-col gap-14 px-4 pb-12 sm:px-6 md:gap-18 md:px-10 lg:px-12 lg:pb-16">
        <section id="categories" className="space-y-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
              Browse categories
            </p>
            <h2 className="font-display mt-2 text-3xl text-[color:var(--color-ink)] sm:text-4xl">
              Explore trusted wedding vendors by category
            </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[color:var(--color-muted)]">
              Start with the vendor type you need most, then refine by location,
              culture, and trust markers inside the marketplace.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {VENDOR_CATEGORY_GROUPS.map((category) => (
              <Link
                key={category.category}
                href={`/vendors?category=${encodeURIComponent(category.category)}`}
                className="rounded-[1.65rem] border border-[rgba(106,62,124,0.09)] bg-white/92 p-5 shadow-[0_18px_44px_-38px_rgba(106,62,124,0.28)] transition hover:-translate-y-0.5 hover:border-[color:var(--color-brand-primary)] hover:shadow-[0_24px_54px_-34px_rgba(106,62,124,0.2)]"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-brand-primary)]">
                  Vendor category
                </p>
                <h3 className="font-display mt-3 line-clamp-2 break-words text-2xl text-[color:var(--color-ink)]">
                  {category.category}
                </h3>
                <p className="mt-3 line-clamp-3 break-words text-sm leading-7 text-[color:var(--color-muted)]">
                  {category.description}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="relative space-y-7 overflow-hidden rounded-[2rem] border border-[rgba(91,44,131,0.08)] bg-[rgba(255,255,255,0.85)] p-5 shadow-[0_20px_55px_-44px_rgba(31,31,31,0.22)] backdrop-blur-sm md:p-6">
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-18"
            style={{ backgroundImage: "url('/images/wedding-diaspora-bg.jpg')" }}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(250,249,247,0.9)_0%,rgba(255,255,255,0.88)_100%)]" />
          <div className="wedding-floral-texture absolute inset-0" />
          <div className="relative">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
                Approved vendors
              </p>
              <h2 className="font-display mt-2 text-3xl text-[color:var(--color-ink)] sm:text-4xl">
                Browse approved vendors with confidence
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--color-muted)]">
                Demo-ready vendor profiles now reflect category-appropriate visuals,
                clear service positioning, and trust-first marketplace cues.
              </p>
            </div>
            <Link
              href="/vendors"
              className="text-sm font-semibold text-[color:var(--color-brand-primary)] underline decoration-[color:var(--color-brand-light)] underline-offset-4"
            >
              View all vendors
            </Link>
          </div>

          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(106,62,124,0.28)_transparent]">
            {vendorRailItems.map((vendor, index) => (
              <div
                key={`${vendor.slug}-${index}`}
                className="min-w-full snap-start sm:min-w-[48%] lg:min-w-[31%]"
              >
                <VendorCard vendor={vendor} mode="homepage" />
              </div>
            ))}
          </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[2rem] border border-[rgba(91,44,131,0.09)] bg-[rgba(255,255,255,0.92)] p-6 shadow-[0_22px_56px_-40px_rgba(31,31,31,0.22)] backdrop-blur-sm md:p-8">
          <div className="wedding-floral-texture absolute inset-0" />
          <div className="relative grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
                Yoruba wedding culture
              </p>
              <h2 className="font-display text-3xl text-[color:var(--color-ink)] sm:text-4xl">
                Celebrate Yoruba elegance with vendors who understand tradition.
              </h2>
              <p className="text-base leading-8 text-[color:var(--color-muted)]">
                From engagement ceremonies to the main wedding day, discover
                planners, photographers, decor teams, and fashion vendors who
                reflect Yoruba style, heritage, and modern luxury.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/vendors?culture=Yoruba%20weddings"
                  className="btn-primary"
                >
                  Explore Yoruba Vendors
                </Link>
                <Link href="/vendors" className="btn-secondary">
                  Browse all cultures
                </Link>
              </div>
            </div>
            <div
              role="img"
              aria-label="Yoruba wedding celebration with traditional fashion and decor"
              className="relative min-h-[320px] overflow-hidden rounded-[1.6rem] border border-[rgba(91,44,131,0.1)] bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('/images/yoruba-wedding-bg.jpg'), url('/images/yoruba-wedding-bg.png')",
              }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(31,31,31,0.04)_0%,rgba(31,31,31,0.5)_100%)]" />
              <p className="absolute bottom-4 left-4 rounded-full border border-white/34 bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
                Culture-first vendor discovery
              </p>
            </div>
          </div>
        </section>

        <TikTokSection latestTikToks={latestTikToks} topTikToks={topTikToks} />

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-[rgba(91,44,131,0.09)] bg-[rgba(255,255,255,0.92)] p-8 shadow-[0_18px_44px_-38px_rgba(31,31,31,0.2)] backdrop-blur-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
              Trust and verification
            </p>
            <h2 className="font-display mt-3 text-4xl text-[color:var(--color-ink)]">
              Marketplace trust matters more than volume.
            </h2>
            <p className="mt-4 text-base leading-8 text-[color:var(--color-muted)]">
              Iyeoba highlights approved vendor profiles, trust markers, and
              clear business details so discovery feels more intentional and less
              noisy than a generic directory.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <MiniMetric label="Approved profiles" value="Curated" />
              <MiniMetric label="Trust markers" value="Visible" />
              <MiniMetric label="Vendor clarity" value="Category, price, fit" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-[rgba(91,44,131,0.09)] bg-[linear-gradient(180deg,rgba(231,217,240,0.72)_0%,rgba(255,255,255,0.92)_100%)] p-8 shadow-[0_18px_44px_-38px_rgba(31,31,31,0.2)] backdrop-blur-sm">
            <div className="wedding-floral-accent-gold absolute -right-8 -bottom-8 h-36 w-36" />
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
              Planner, privately
            </p>
            <h2 className="font-display mt-3 text-4xl text-[color:var(--color-ink)]">
              Planner is a private companion, not the public homepage story.
            </h2>
            <p className="mt-4 text-base leading-8 text-[color:var(--color-muted)]">
              After sign-in, planner users can track My Weddings, checklist
              items, saved vendors, and inquiries in a lightweight private
              workspace. It supports the marketplace rather than replacing it.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/auth/sign-up?role=planner"
                className="btn-primary"
              >
                Create planner account
              </Link>
              <Link href="/auth/sign-up?role=vendor" className="btn-secondary">
                List your business
              </Link>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[2rem] border border-[rgba(91,44,131,0.09)] bg-[rgba(255,255,255,0.76)] p-8 shadow-[0_20px_55px_-42px_rgba(31,31,31,0.24)] backdrop-blur-sm">
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.9]"
            style={{ backgroundImage: "url('/images/wedding-diaspora-bg.jpg')" }}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.4)_0%,rgba(250,249,247,0.46)_100%)]" />
          <div className="wedding-floral-accent-gold absolute -left-10 bottom-0 h-40 w-40" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--color-brand-primary)]">
                Iyeoba Weddings
              </p>
              <h3 className="font-display mt-2 text-3xl text-[color:var(--color-ink)]">
                Plan your Nigerian wedding anywhere in the world.
              </h3>
            </div>
            <Link href="/vendors" className="btn-primary w-fit">
              Continue to Vendor Discovery
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function SearchField({
  label,
  name,
  options,
  allLabel,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  allLabel: string;
}) {
  return (
    <label className="grid flex-1 gap-1.5 rounded-[1rem] border border-[rgba(106,62,124,0.05)] bg-[color:var(--color-surface)] p-2.5">
      <p className="text-[0.63rem] uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <select
        name={name}
        className="rounded-lg border border-[color:var(--color-brand-light)] bg-white px-3 py-2 text-sm text-[color:var(--color-ink)] outline-none transition focus:border-[color:var(--color-brand-primary)] focus:shadow-[0_0_0_4px_rgba(233,221,240,0.45)]"
        defaultValue=""
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-[rgba(106,62,124,0.08)] bg-[rgba(255,255,255,0.72)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[color:var(--color-ink)]">
        {value}
      </p>
    </div>
  );
}

function ensureMinimumItems<U extends readonly unknown[]>(
  items: U,
  minimum: number,
): Array<U[number]> {
  if (!items.length || items.length >= minimum) {
    return [...items] as Array<U[number]>;
  }

  const filled = [...items] as Array<U[number]>;
  let index = 0;
  while (filled.length < minimum) {
    filled.push(items[index % items.length]);
    index += 1;
  }

  return filled;
}
