import Link from "next/link";

import { MainNav } from "@/components/main-nav";
import { PageViewTracker } from "@/components/page-view-tracker";
import {
  getAllSubcategoryOptions,
  normalizeVendorCategory,
} from "@/lib/vendor-categories";
import {
  getSharedCategoryOptions,
  getSharedCultureOptions,
  getSharedLocationOptions,
} from "@/lib/vendor-filter-options";
import { getVendorDirectory } from "@/lib/vendors";
import { VendorCard } from "@/components/vendor-card";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function VendorsPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const source = readSingle(searchParams.source);
  const rawCategory = readSingle(searchParams.category);
  const normalizedQueryCategory = rawCategory
    ? normalizeVendorCategory(rawCategory, null)
    : null;
  const category = normalizedQueryCategory?.category ?? rawCategory;
  const subcategory =
    readSingle(searchParams.subcategory) ??
    (normalizedQueryCategory?.category !== "Others"
      ? normalizedQueryCategory?.subcategory ?? undefined
      : undefined);
  const culture = readSingle(searchParams.culture);
  const location = readSingle(searchParams.location);
  const allVendors = await getVendorDirectory();
  const vendors = allVendors.filter((vendor) => {
    const categoryMatch = category
      ? vendor.category.toLowerCase() === category.toLowerCase()
      : true;
    const subcategoryMatch = subcategory
      ? (vendor.customCategory ?? "").toLowerCase() === subcategory.toLowerCase()
      : true;
    const cultureMatch = culture
      ? vendor.cultureSpecialization.toLowerCase().includes(culture.toLowerCase())
      : true;
    const locationMatch = location
      ? vendor.location.toLowerCase().includes(location.toLowerCase())
      : true;

    return categoryMatch && subcategoryMatch && cultureMatch && locationMatch;
  });
  const categoryOptions = getSharedCategoryOptions(category);
  const subcategoryOptions = buildSubcategoryOptions(
    getAllSubcategoryOptions(),
    subcategory,
  );
  const cultureOptions = getSharedCultureOptions(culture);
  const locationOptions = getSharedLocationOptions(location);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#FAF9F7_0%,#ffffff_38%,#ffffff_100%)]">
      <MainNav />
      {source === "tiktok" ? (
        <PageViewTracker
          eventName="tiktok_vendors_page_visit"
          source="tiktok"
          path="/vendors"
        />
      ) : null}
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8 md:px-10 lg:px-12 lg:py-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-[rgba(91,44,131,0.08)] bg-[rgba(255,255,255,0.9)] p-4 shadow-[0_20px_55px_-42px_rgba(31,31,31,0.22)] backdrop-blur-sm md:p-6">
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-16"
            style={{ backgroundImage: "url('/images/wedding-diaspora-bg.jpg')" }}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(250,249,247,0.9)_0%,rgba(255,255,255,0.88)_100%)]" />
          <div className="wedding-floral-texture absolute inset-0" />
          <div className="relative grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="surface-card space-y-4 rounded-[2rem] p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
              Trusted vendor discovery
            </p>
            <h1 className="font-display text-5xl leading-none text-[color:var(--color-ink)]">
              Browse approved vendors across key wedding categories.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[color:var(--color-muted)]">
              Explore the marketplace by category, culture, and location. Public
              browsing stays focused on discovery, trust, and vendor fit.
            </p>
            {source === "tiktok" ? (
              <p className="surface-soft rounded-[1.25rem] px-4 py-3 text-sm text-[color:var(--color-brand-primary)]">
                You arrived from TikTok.
                {category ? ` Showing ${category}` : " Showing curated vendor"}
                {culture ? ` for ${culture}` : ""} discovery with inquiry-ready
                profiles and stronger visual fit.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Link href="/auth/sign-up?role=vendor" className="btn-secondary">
                List your business
              </Link>
              <Link href="/auth/sign-in?next=/planner/dashboard" className="btn-primary">
                Sign in for Planner
              </Link>
            </div>
          </div>

          <section className="surface-soft rounded-[2rem] p-6">
            <form className="grid gap-4 md:grid-cols-2">
              <SelectField
                name="category"
                label="Category"
                defaultValue={category}
                options={categoryOptions}
                allLabel="All categories"
              />
              <SelectField
                name="subcategory"
                label="Subcategory"
                defaultValue={subcategory}
                options={subcategoryOptions}
                allLabel="All subcategories"
              />
              <SelectField
                name="culture"
                label="Culture"
                defaultValue={culture}
                options={cultureOptions}
                allLabel="All cultures"
              />
              <SelectField
                name="location"
                label="Location"
                defaultValue={location}
                options={locationOptions}
                allLabel="All locations"
              />
              <button
                type="submit"
                className="btn-primary self-end"
              >
                Filter vendors
              </button>
            </form>
          </section>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <TrustCard title="Approved profiles" body="Public listings emphasize verified, review-ready business information." />
          <TrustCard title="Category-first browsing" body="Discover vendors by the services that matter most for your event." />
          <TrustCard title="Private Planner support" body="Signed-in planners can save vendors and track inquiries privately." />
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {vendors.map((vendor) => (
            <VendorCard key={vendor.slug} vendor={vendor} />
          ))}
        </section>
      </main>
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  allLabel,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  allLabel: string;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="field-input"
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

function readSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildSubcategoryOptions(
  values: Array<{ category: string; value: string; label: string }>,
  selected?: string,
) {
  const map = new Map<string, string>();
  for (const option of values) {
    if (!map.has(option.value)) {
      map.set(option.value, option.label);
    }
  }

  if (selected && !map.has(selected)) {
    map.set(selected, selected);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, label]) => ({ value, label }));
}

function TrustCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="surface-card rounded-[1.5rem] p-5">
      <p className="font-display text-2xl text-[color:var(--color-ink)]">{title}</p>
      <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
        {body}
      </p>
    </div>
  );
}
