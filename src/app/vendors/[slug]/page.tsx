import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createVendorInquiryAction,
  saveVendorForPlannerAction,
} from "@/app/planner/actions";
import { MainNav } from "@/components/main-nav";
import { PageViewTracker } from "@/components/page-view-tracker";
import { TrackedLink } from "@/components/tracked-link";
import { buildEmailLink, buildWhatsAppLink } from "@/lib/inquiries";
import { TikTokFeed } from "@/components/tiktok-feed";
import { getVendorTikTokVideos } from "@/lib/tiktok";
import { getVendorBySlug } from "@/lib/vendors";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ message?: string; error?: string }>;

export default async function VendorProfilePage(props: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const vendor = await getVendorBySlug(slug);
  const vendorTikToks = await getVendorTikTokVideos(slug);

  if (!vendor) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fdfbfd_0%,#ffffff_42%,#ffffff_100%)]">
      <MainNav />
      <PageViewTracker
        eventName="vendor_profile_view"
        path={`/vendors/${vendor.slug}`}
        vendorSlug={vendor.slug}
      />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8 md:px-10 lg:px-12 lg:py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/vendors"
            className="w-fit text-sm font-semibold text-[color:var(--color-brand-primary)] underline decoration-[color:var(--color-brand-light)] underline-offset-4"
          >
            Back to vendors
          </Link>
          <form action={saveVendorForPlannerAction}>
            <input type="hidden" name="vendorId" value={vendor.id} />
            <input type="hidden" name="nextPath" value={`/vendors/${vendor.slug}`} />
            <button type="submit" className="btn-secondary px-4 py-2">
              Save to Planner
            </button>
          </form>
        </div>

        {searchParams.message ? (
          <p className="surface-soft rounded-[1.25rem] px-4 py-3 text-sm text-[color:var(--color-brand-primary)]">
            {searchParams.message}
          </p>
        ) : null}
        {searchParams.error ? (
          <p className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {searchParams.error}
          </p>
        ) : null}

        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="surface-card space-y-6 rounded-[2rem] p-7">
            <div className="relative overflow-hidden rounded-[1.75rem]">
              <div className="relative aspect-[16/9]">
                <Image
                  src={vendor.imageUrl}
                  alt={`${vendor.businessName} placeholder gallery image`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(33,18,39,0.02)_0%,rgba(33,18,39,0.4)_100%)]" />
              </div>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--color-brand-gold)]">
                  {vendor.category}
                </p>
                <h1 className="font-display mt-2 text-5xl leading-none text-[color:var(--color-ink)]">
                  {vendor.businessName}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-8 text-[color:var(--color-muted)]">
                  {vendor.description}
                </p>
              </div>
              {vendor.verified ? (
                <span className="surface-soft rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--color-brand-primary)]">
                  Verified vendor
                </span>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <InfoCard label="Location" value={vendor.location} />
              <InfoCard label="Culture" value={vendor.cultureSpecialization} />
              <InfoCard label="Starting price" value={vendor.priceRange} />
              <InfoCard label="Availability" value={vendor.availabilityStatus} />
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-3xl text-[color:var(--color-ink)]">
                Services offered
              </h2>
              <div className="flex flex-wrap gap-3">
                {vendor.servicesOffered.map((service: string) => (
                  <span
                    key={service}
                    className="surface-soft rounded-full px-4 py-2 text-sm font-medium text-[color:var(--color-brand-primary)]"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-3xl text-[color:var(--color-ink)]">
                Why this vendor fits
              </h2>
              <p className="text-base leading-8 text-[color:var(--color-muted)]">
                {vendor.valueStatement}
              </p>
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-3xl text-[color:var(--color-ink)]">
                Gallery preview
              </h2>
              {vendor.portfolioImageUrls?.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {vendor.portfolioImageUrls.map((imageUrl: string) => (
                    <div
                      key={imageUrl}
                      className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={`${vendor.businessName} portfolio image`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {vendor.portfolio.map((item) => (
                    <div
                      key={item}
                      className="surface-soft rounded-[1.5rem] p-5"
                    >
                      <div className="flex h-44 items-end rounded-[1.25rem] bg-[linear-gradient(160deg,#6A3E7C_0%,#8c5a9d_75%,#C9A15B_100%)] p-4 text-sm font-medium text-white shadow-inner">
                        {item}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-5 rounded-[2rem] bg-[color:var(--color-brand-primary)] p-7 text-white">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-white/70">
                Vendor contact
              </p>
              <h2 className="font-display mt-2 text-3xl">
                Introduce this vendor after planning starts.
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/80">
                Save this vendor into your Planner workspace, then reach out
                once your wedding priorities are clear and your shortlist is in
                place.
              </p>
            </div>

            <ContactCard label="Instagram" value={vendor.instagram} />
            <ContactCard label="WhatsApp" value={vendor.whatsapp} />
            <ContactCard label="Email" value={vendor.contactEmail || "Not shared"} />
            <ContactCard label="Website" value={vendor.website} />

            <form action={createVendorInquiryAction} className="grid gap-3">
              <input type="hidden" name="vendorId" value={vendor.id} />
              <input type="hidden" name="vendorSlug" value={vendor.slug} />
              <input type="hidden" name="nextPath" value={`/vendors/${vendor.slug}`} />
              <input type="hidden" name="contactMethod" value="vendor_profile" />
              <label className="grid gap-2 text-sm font-medium text-white">
                Optional note
                <textarea
                  name="message"
                  rows={4}
                  placeholder="Share your wedding date, location, or what you need help with."
                  className="rounded-[1.25rem] border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/50"
                />
              </label>
              <button type="submit" className="btn-secondary bg-white">
                Start inquiry
              </button>
            </form>

            <div className="flex flex-col gap-3">
              <TrackedLink
                href={`/planner/dashboard`}
                eventName="vendor_save_click"
                vendorSlug={vendor.slug}
                className="btn-ghost-light"
              >
                Open Planner
              </TrackedLink>
              {buildWhatsAppLink(vendor.whatsapp, vendor.businessName) ? (
                <a
                  href={buildWhatsAppLink(vendor.whatsapp, vendor.businessName)!}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost-light text-center"
                >
                  Contact on WhatsApp
                </a>
              ) : null}
              {buildEmailLink(vendor.contactEmail, vendor.businessName) ? (
                <a
                  href={buildEmailLink(vendor.contactEmail, vendor.businessName)!}
                  className="btn-ghost-light text-center"
                >
                  Send email
                </a>
              ) : null}
            </div>
          </aside>
        </section>

        {vendorTikToks.length ? (
          <section className="surface-card rounded-[2rem] p-8">
            <TikTokFeed
              videos={vendorTikToks}
              title="Featured on TikTok"
              subtitle="These clips add social proof through views, likes, and engagement badges tied to this vendor."
              source="vendor_profile_tiktok"
            />
          </section>
        ) : null}
      </main>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-soft rounded-[1.5rem] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-medium text-[color:var(--color-ink)]">
        {value}
      </p>
    </div>
  );
}

function ContactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-3 rounded-[1.5rem] bg-white/10 p-5">
      <p className="text-sm font-semibold text-white/75">{label}</p>
      <p className="text-base text-white">{value}</p>
    </div>
  );
}
