import { MainNav } from "@/components/main-nav";
import { PageViewTracker } from "@/components/page-view-tracker";
import { ReferralHero } from "@/components/referral-hero";
import { TikTokFeed } from "@/components/tiktok-feed";
import { TrackedLink } from "@/components/tracked-link";
import { normalizeMarketplaceCategory } from "@/lib/tiktok-shared";
import { getLandingTikTokVideos } from "@/lib/tiktok";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const quickCategories = [
  "Photographers",
  "Makeup Artists",
  "Decorators",
  "Asoebi Vendors",
];

export default async function FromTikTokPage(props: {
  searchParams: SearchParams;
}) {
  const searchParams = await props.searchParams;
  const source = readSingle(searchParams.source);
  const videos = await getLandingTikTokVideos();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(106,62,124,0.12),_transparent_34%),linear-gradient(180deg,#ffffff_0%,#fdfbfd_45%,#ffffff_100%)]">
      <MainNav />
      <PageViewTracker eventName="from_tiktok_page_view" source="tiktok" />
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-8 md:px-10 lg:px-12 lg:py-12">
        <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="surface-card space-y-6 rounded-[2rem] bg-white/92 p-7 shadow-[0_30px_80px_-40px_rgba(106,62,124,0.24)]">
            <p className="surface-soft w-fit rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
              TikTok to marketplace
            </p>
            <h1 className="font-display max-w-3xl text-5xl leading-none text-[color:var(--color-ink)] sm:text-6xl">
              Find vendors behind the looks, decor, and moments you saved.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[color:var(--color-muted)]">
              Iyeoba turns wedding inspiration into vendor discovery. Browse
              trusted Yoruba-focused and diaspora-ready vendors without losing
              the premium mood that brought you here.
            </p>
            <ReferralHero sourceParam={source} />
            <div className="grid gap-4 sm:grid-cols-3">
              <ValueTile label="Marketplace first" value="Approved vendors" />
              <ValueTile label="TikTok fit" value="Category-matched routes" />
              <ValueTile label="Next step" value="Inquiry-ready profiles" />
            </div>
            <div className="flex flex-wrap gap-3">
              {quickCategories.map((category) => (
                <TrackedLink
                  key={category}
                  href={`/vendors?category=${encodeURIComponent(normalizeMarketplaceCategory(category))}&culture=Yoruba&source=tiktok&intent=discover`}
                  eventName="from_tiktok_category_click"
                  source="tiktok"
                  payload={{ category: normalizeMarketplaceCategory(category) }}
                  className="btn-secondary px-4 py-2"
                >
                  {category}
                </TrackedLink>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <TrackedLink
                href="/vendors?source=tiktok&intent=discover"
                eventName="from_tiktok_primary_cta_click"
                source="tiktok"
                className="btn-primary"
              >
                Browse Trusted Vendors
              </TrackedLink>
              <TrackedLink
                href="/auth/sign-up?role=vendor&source=tiktok"
                eventName="from_tiktok_vendor_signup_cta_click"
                source="tiktok"
                className="btn-secondary"
              >
                List Your Business
              </TrackedLink>
            </div>
            <p className="text-sm leading-7 text-[color:var(--color-muted)]">
              Planner remains available after sign-in, but the primary action
              here is vendor discovery.
            </p>
          </div>

          <div className="surface-card rounded-[2rem] p-4 sm:p-6">
            <div className="surface-soft rounded-[1.75rem] p-4 sm:p-5">
              <TikTokFeed
                videos={videos}
                title="Viral wedding inspiration"
                subtitle="Scroll vertically on mobile, then jump straight into matching vendor categories and inquiry-ready profiles."
                stickyCta
                source="from_tiktok_feed"
                ctaLabel="Find Vendors Like This"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <Panel
            title="See the look"
            body="Start with the TikTok video that created the intent."
          />
          <Panel
            title="Open the right category"
            body="Each CTA routes into a more intentional filtered vendor path."
          />
          <Panel
            title="Move toward inquiry"
            body="Vendor profiles are the next step, with social proof and clear actions."
          />
        </section>
      </main>
    </div>
  );
}

function readSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function ValueTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-soft rounded-[1.5rem] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[color:var(--color-ink)]">
        {value}
      </p>
    </div>
  );
}

function Panel({ title, body }: { title: string; body: string }) {
  return (
    <div className="surface-card rounded-[1.75rem] p-6">
      <h2 className="font-display text-3xl text-[color:var(--color-ink)]">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
        {body}
      </p>
    </div>
  );
}
