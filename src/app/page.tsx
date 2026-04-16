import Link from "next/link";

import { MainNav } from "@/components/main-nav";
import { TikTokFeed } from "@/components/tiktok-feed";
import { getHomepageTikTokVideos } from "@/lib/tiktok";
import { VENDOR_CATEGORY_GROUPS } from "@/lib/vendor-categories";
import {
  getSharedCategoryOptions,
  getSharedCultureOptions,
  getSharedLocationOptions,
} from "@/lib/vendor-filter-options";
import { VendorCard } from "@/components/vendor-card";
import { getFeaturedVendors } from "@/lib/vendors";

const trustPoints = [
  "Approved vendor profiles",
  "Verification markers for trusted businesses",
  "Marketplace built for Nigerian weddings and diaspora users",
];

export default async function Home() {
  const featuredVendors = await getFeaturedVendors();
  const featuredTikToks = await getHomepageTikTokVideos();
  const vendorRailItems = ensureMinimumItems(featuredVendors, 10);
  const tikTokRailItems = ensureMinimumItems(featuredTikToks, 10);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(106,62,124,0.08),_transparent_34%),linear-gradient(180deg,#ffffff_0%,#fcf9fe_42%,#ffffff_100%)]">
      <MainNav />
      <section className="relative overflow-hidden px-6 pb-14 pt-1 md:px-10 md:pb-18 lg:px-12 lg:pb-20 lg:pt-2">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[linear-gradient(180deg,#ffffff_0%,rgba(252,249,254,0.92)_18%,rgba(233,221,240,0.42)_52%,transparent_78%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-6 h-[420px] bg-[radial-gradient(circle_at_top,rgba(233,221,240,0.68),transparent_60%)]" />
        <div className="pointer-events-none absolute left-1/2 top-10 h-48 w-48 -translate-x-1/2 rounded-full bg-[rgba(201,161,91,0.06)] blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-[17rem] h-36 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,0.82))]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-11">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 pt-3 text-center md:pt-5">
            <p className="w-fit rounded-full border border-[rgba(106,62,124,0.1)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
              Premium wedding marketplace
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-[color:var(--color-ink)] sm:text-5xl lg:text-6xl">
              Plan Your Nigerian Wedding Anywhere in the World
            </h1>
            <p className="max-w-3xl text-base leading-8 text-[color:var(--color-muted)] sm:text-lg">
              Discover trusted Nigerian wedding vendors across Nigeria and the
              diaspora, and start planning your wedding with confidence.
            </p>
            <p className="max-w-3xl text-sm leading-7 text-[color:var(--color-muted)]">
              Browse verified vendors by category, location, and cultural fit,
              then use the planner privately after sign-in.
            </p>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row">
              <Link href="/vendors" className="btn-primary">
                Find Vendors
              </Link>
              <Link href="/auth/sign-up?role=vendor" className="btn-secondary">
                List Your Business
              </Link>
            </div>
          </div>

          <div className="mx-auto w-full max-w-5xl rounded-[2rem] border border-[rgba(106,62,124,0.08)] bg-white/96 p-5 shadow-[0_28px_70px_-42px_rgba(106,62,124,0.24)] backdrop-blur-sm md:p-6">
            <form action="/vendors" method="get" className="space-y-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
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
                <button
                  type="submit"
                  className="btn-primary min-w-[160px]"
                >
                  Find Vendors
                </button>
              </div>

              <div className="grid gap-3 border-t border-[rgba(106,62,124,0.08)] pt-4 text-sm text-[color:var(--color-muted)] md:grid-cols-3">
                {trustPoints.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-[1.25rem] border border-[rgba(106,62,124,0.06)] bg-[rgba(233,221,240,0.55)] px-4 py-3"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-brand-gold)]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </form>
          </div>
        </div>
      </section>

      <main className="mx-auto flex max-w-6xl flex-col gap-18 px-6 pb-12 md:px-10 lg:px-12 lg:pb-16">
        <section id="categories" className="space-y-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
              Browse categories
            </p>
            <h2 className="font-display mt-2 text-4xl text-[color:var(--color-ink)]">
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
                <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-brand-gold)]">
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

        <section className="space-y-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
                Approved vendors
              </p>
              <h2 className="font-display mt-2 text-4xl text-[color:var(--color-ink)]">
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
        </section>

        <section className="relative overflow-hidden rounded-[2rem] border border-[rgba(106,62,124,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(248,241,252,0.84)_100%)] p-6 shadow-[0_28px_70px_-48px_rgba(106,62,124,0.25)] md:p-8">
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-[rgba(201,161,91,0.08)] blur-3xl" />
          <div className="relative">
            <TikTokFeed
              videos={tikTokRailItems}
              title="Trending on TikTok"
              subtitle="Move from wedding inspiration into trusted vendor discovery with category-linked content from Iyeoba Weddings."
              source="homepage_tiktok"
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-[rgba(106,62,124,0.08)] bg-white p-8 shadow-[0_18px_44px_-38px_rgba(106,62,124,0.18)]">
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

          <div className="rounded-[2rem] border border-[rgba(106,62,124,0.08)] bg-[linear-gradient(180deg,rgba(233,221,240,0.78)_0%,rgba(255,255,255,0.92)_100%)] p-8 shadow-[0_18px_44px_-38px_rgba(106,62,124,0.18)]">
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
    <label className="grid flex-1 gap-2 rounded-[1.5rem] border border-[rgba(106,62,124,0.05)] bg-[color:var(--color-surface)] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <select
        name={name}
        className="rounded-xl border border-[color:var(--color-brand-light)] bg-white px-4 py-3 text-base text-[color:var(--color-ink)] outline-none transition focus:border-[color:var(--color-brand-primary)] focus:shadow-[0_0_0_4px_rgba(233,221,240,0.45)]"
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
