import Link from "next/link";

import { MainNav } from "@/components/main-nav";
import { TikTokSection } from "@/components/TikTokSection";
import { getCurrentProfile } from "@/lib/auth";
import { getPlannerSavedVendors } from "@/lib/inquiries";
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
  const profile = await getCurrentProfile();
  const featuredVendors = await getFeaturedVendors();
  const vendorRailItems = ensureMinimumItems(featuredVendors, 10);
  const savedVendorIds =
    profile?.role === "planner"
      ? new Set((await getPlannerSavedVendors(profile.id)).map((item) => item.vendor.id))
      : new Set<string>();
  const { latestTikToks, topTikToks } = getHomepageTikTokSectionData();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(91,44,131,0.08),_transparent_34%),linear-gradient(180deg,#FAF9F7_0%,#ffffff_42%,#ffffff_100%)]">
      <MainNav />
      <section className="relative h-[560px] overflow-hidden px-4 pb-4 pt-0.5 sm:h-[620px] sm:px-6 sm:pb-10 md:h-[700px] md:px-10 md:pb-12 lg:h-[760px] lg:px-12 lg:pb-14 lg:pt-1.5">
        <div
          className="pointer-events-none absolute inset-0 bg-cover opacity-[0.84]"
          style={{ backgroundImage: "url('/images/wedding-romance-bg.jpg')", backgroundPosition: "center 20%" }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(31,31,31,0.12)_0%,rgba(31,31,31,0.02)_34%,rgba(31,31,31,0.06)_100%)]" />
        <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end">
          <h1 className="mx-auto mb-1 max-w-4xl rounded-[1rem] bg-[linear-gradient(180deg,rgba(74,34,104,0.22)_0%,rgba(74,34,104,0.1)_64%,rgba(74,34,104,0)_100%)] px-3 py-1 text-center text-[1.28rem] font-semibold leading-tight tracking-[-0.03em] text-white/95 drop-shadow-[0_4px_20px_rgba(74,34,104,0.45)] sm:mb-3 sm:px-5 sm:py-2 sm:text-3xl md:mb-4 md:text-5xl">
            Plan Your Nigerian Wedding Anywhere in the World
          </h1>
          <div className="mx-auto w-full max-w-5xl rounded-[1.1rem] border border-[rgba(106,62,124,0.1)] bg-white/86 p-2 shadow-[0_20px_50px_-40px_rgba(106,62,124,0.24)] backdrop-blur-[1px] sm:rounded-[1.4rem] sm:p-3.5 md:p-4">
            <form action="/vendors" method="get" className="space-y-1.5 sm:space-y-2">
              <p className="px-0.5 text-center text-[0.72rem] leading-4 text-[color:var(--color-brand-primary-dark)] sm:hidden">
                Search by category, location, and cultural fit.
              </p>
              <div className="grid gap-1.5 md:grid-cols-3 md:items-end md:gap-2">
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
              <div className="grid gap-1.5 sm:flex sm:flex-row sm:items-center sm:justify-between sm:gap-2.5">
                <p className="order-1 hidden text-center text-[0.78rem] leading-5 text-[color:var(--color-brand-primary-dark)] sm:order-2 sm:block sm:max-w-2xl sm:px-3 sm:text-[0.86rem]">
                  Discover trusted Nigerian wedding vendors across Nigeria and the diaspora. Browse by category, location, and cultural fit.
                </p>
                <button type="submit" className="btn-primary order-2 w-full min-w-[145px] px-4 py-2 text-sm sm:order-1 sm:w-auto sm:py-2.5">
                  Find Vendors
                </button>
                <Link
                  href="/auth/sign-up?role=vendor"
                  className="order-3 w-full whitespace-nowrap rounded-full border border-[#C9A15B] bg-white px-4 py-1.5 text-center text-[0.82rem] font-semibold !text-[#5B2C83] transition-all duration-200 ease-in-out hover:border-[#5B2C83] hover:bg-[#5B2C83] hover:!text-white sm:w-auto sm:min-w-[175px] sm:py-2.5 sm:text-sm"
                >
                  List Your Business
                </Link>
              </div>

              <div className="hidden gap-1.5 border-t border-[rgba(106,62,124,0.08)] pt-2 text-sm text-[color:var(--color-muted)] sm:grid sm:grid-cols-2 md:grid-cols-3">
                {trustPoints.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-1.5 rounded-[0.9rem] border border-[rgba(106,62,124,0.06)] bg-[rgba(233,221,240,0.55)] px-2 py-1.5"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-brand-gold)]" />
                    <span className="text-[0.7rem] leading-[1.1rem] sm:text-[0.74rem] sm:leading-5">{item}</span>
                  </div>
                ))}
              </div>
            </form>
          </div>
        </div>
      </section>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-12 sm:gap-12 sm:px-6 md:gap-18 md:px-10 lg:px-12 lg:pb-16">
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
                <VendorCard
                  vendor={vendor}
                  mode="homepage"
                  isSaved={vendor.id ? savedVendorIds.has(vendor.id) : false}
                  nextPath="/"
                />
              </div>
            ))}
          </div>
          </div>
        </section>

        <section id="categories" className="space-y-6 sm:space-y-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
              Browse categories
            </p>
            <h2 className="font-display mt-2 text-2xl leading-tight text-[color:var(--color-ink)] sm:text-4xl">
              Explore trusted wedding vendors by category
            </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[color:var(--color-muted)]">
              Start with the vendor type you need most, then refine by location,
              culture, and trust markers inside the marketplace.
            </p>
          </div>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {VENDOR_CATEGORY_GROUPS.map((category) => (
              <Link
                key={category.category}
                href={`/vendors?category=${encodeURIComponent(category.category)}`}
                className="group rounded-[1.5rem] border border-[rgba(106,62,124,0.09)] bg-white/92 p-4 shadow-[0_18px_44px_-38px_rgba(106,62,124,0.28)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(91,44,131,0.4)] hover:shadow-[0_24px_54px_-34px_rgba(106,62,124,0.2)] sm:rounded-[1.65rem] sm:p-5"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[rgba(106,62,124,0.08)] bg-[rgba(233,221,240,0.62)] text-[color:var(--color-brand-primary)] transition-colors duration-200 group-hover:bg-[rgba(208,183,224,0.74)]">
                    <CategoryIcon category={category.category} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display line-clamp-2 break-words text-xl text-[#5B2C83] transition-colors duration-200 group-hover:text-[#4A2268] sm:text-2xl">
                  {category.category}
                    </h3>
                    <p className="mt-2 line-clamp-3 break-words text-sm leading-6 text-[color:var(--color-muted)] sm:leading-7">
                  {category.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="relative overflow-hidden rounded-[2rem] border border-[rgba(91,44,131,0.09)] bg-[rgba(255,255,255,0.92)] p-6 shadow-[0_22px_56px_-40px_rgba(31,31,31,0.22)] backdrop-blur-sm md:p-8">
          <div className="wedding-floral-texture absolute inset-0" />
          <div className="relative grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
                Nigerian wedding culture
              </p>
              <h2 className="font-display text-3xl text-[color:var(--color-ink)] sm:text-4xl">
                Celebrate elegance with vendors who understand tradition.
              </h2>
              <p className="text-base leading-8 text-[color:var(--color-muted)]">
                From engagement ceremonies to the wedding day, discover
                planners, photographers, decorators, and fashion vendors who
                reflect Nigerian wedding styles, heritage, and modern luxury.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/vendors"
                  className="btn-primary"
                >
                  Explore Nigerian Vendors
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

        <TikTokSection
          latestTikToks={latestTikToks}
          topTikToks={topTikToks}
          title="Trending on TikTok"
          subtitle="Explore real Nigerian wedding ideas, styles, vendors, and cultural inspiration from Iyeoba Weddings."
        />

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
    <label className="grid flex-1 gap-1 rounded-[0.9rem] border border-[rgba(106,62,124,0.05)] bg-[color:var(--color-surface)] p-1.5 sm:gap-1.5 sm:rounded-[1rem] sm:p-2.5">
      <p className="text-[0.63rem] uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <select
        name={name}
        className="rounded-lg border border-[color:var(--color-brand-light)] bg-white px-2.5 py-1.5 text-[0.88rem] text-[color:var(--color-ink)] outline-none transition focus:border-[color:var(--color-brand-primary)] focus:shadow-[0_0_0_4px_rgba(233,221,240,0.45)] sm:px-3 sm:py-2 sm:text-sm"
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

function CategoryIcon({ category }: { category: string }) {
  const baseClassName = "h-6 w-6";
  const commonProps = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
    className: baseClassName,
    "aria-hidden": true,
  };

  switch (category) {
    case "Entertainment":
      return (
        <svg {...commonProps}>
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M12 15v6" />
          <path d="M8 21h8" />
        </svg>
      );
    case "Photography & Video":
      return (
        <svg {...commonProps}>
          <rect x="3" y="6" width="18" height="14" rx="3" />
          <circle cx="12" cy="13" r="4" />
          <path d="M8 6l1.2-2h5.6L16 6" />
        </svg>
      );
    case "Beauty & Grooming":
      return (
        <svg {...commonProps}>
          <path d="M12 3l2.2 4.4L19 9.2l-3.6 3.5.8 4.8L12 15.4 7.8 17.5l.8-4.8L5 9.2l4.8-1.8L12 3z" />
        </svg>
      );
    case "Fashion & Attire":
      return (
        <svg {...commonProps}>
          <path d="M5 7l3-3h8l3 3-2 3h-2v10H9V10H7L5 7z" />
        </svg>
      );
    case "Catering & Desserts":
      return (
        <svg {...commonProps}>
          <path d="M7 4v7" />
          <path d="M9 4v7" />
          <path d="M11 4v7" />
          <path d="M9 11v9" />
          <path d="M16 4c1.7 1.6 1.7 4.4 0 6v10" />
        </svg>
      );
    case "Decor & Floral":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="2" />
          <path d="M12 5c2.2 0 4 1.8 4 4-2.2 0-4-1.8-4-4z" />
          <path d="M19 12c0 2.2-1.8 4-4 4 0-2.2 1.8-4 4-4z" />
          <path d="M12 19c-2.2 0-4-1.8-4-4 2.2 0 4 1.8 4 4z" />
          <path d="M5 12c0-2.2 1.8-4 4-4 0 2.2-1.8 4-4 4z" />
        </svg>
      );
    case "Rentals & Setup":
      return (
        <svg {...commonProps}>
          <rect x="4" y="6" width="16" height="10" rx="2" />
          <path d="M7 16v3" />
          <path d="M17 16v3" />
          <path d="M8 10h8" />
        </svg>
      );
    case "Souvenirs":
      return (
        <svg {...commonProps}>
          <rect x="3.5" y="8" width="17" height="12" rx="2" />
          <path d="M12 8v12" />
          <path d="M3.5 12h17" />
          <path d="M8 8V6a2 2 0 114 0v2" />
          <path d="M12 8V6a2 2 0 114 0v2" />
        </svg>
      );
    case "Drinks & Bar":
      return (
        <svg {...commonProps}>
          <path d="M5 5h14l-5 7v6l-4 2v-8L5 5z" />
        </svg>
      );
    case "Printing & Branding":
      return (
        <svg {...commonProps}>
          <path d="M4 20h6l10-10-6-6L4 14v6z" />
          <path d="M13 5l6 6" />
        </svg>
      );
    case "Logistics & Transport":
      return (
        <svg {...commonProps}>
          <path d="M3 7h12v9H3z" />
          <path d="M15 10h3l3 3v3h-6z" />
          <circle cx="7" cy="18" r="1.8" />
          <circle cx="18" cy="18" r="1.8" />
        </svg>
      );
    case "Hospitality":
      return (
        <svg {...commonProps}>
          <path d="M4 13h16v7H4z" />
          <path d="M6 13V9a2 2 0 012-2h3a2 2 0 012 2v4" />
          <path d="M14 13V8a2 2 0 012-2h2a2 2 0 012 2v5" />
        </svg>
      );
    default:
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="M9 12h6" />
          <path d="M12 9v6" />
        </svg>
      );
  }
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
