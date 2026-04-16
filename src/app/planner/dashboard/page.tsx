import Link from "next/link";

import {
  createVendorInquiryAction,
  saveVendorForPlannerAction,
  updatePlannerInquiryStatusAction,
} from "@/app/planner/actions";
import { MainNav } from "@/components/main-nav";
import { PlannerAssistantModules } from "@/components/planner-assistant-modules";
import { VendorProfileAvatarLink } from "@/components/vendor-profile-avatar-link";
import { requirePlannerProfile } from "@/lib/auth";
import {
  buildEmailLink,
  buildWhatsAppLink,
  getPlannerInquiries,
  getPlannerSavedVendors,
} from "@/lib/inquiries";
import { buildPlannerDashboard, getPlannerInputFromSearchParams } from "@/lib/planner";
import { getVendorDirectory, getVendorsBySlugs } from "@/lib/vendors";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function PlannerDashboardPage(props: {
  searchParams: SearchParams;
}) {
  const profile = await requirePlannerProfile("/planner/dashboard");

  const searchParams = await props.searchParams;
  const plannerInput = getPlannerInputFromSearchParams(searchParams);
  const planner = buildPlannerDashboard(plannerInput, searchParams);
  const vendors = await getVendorDirectory({
    culture: plannerInput.culture,
    location: plannerInput.location,
  });
  const suggestedVendors = vendors.slice(0, 3);
  const dbSavedVendors = await getPlannerSavedVendors(profile.id);
  const legacySavedVendors = await getVendorsBySlugs(planner.savedVendorSlugs);
  const savedVendors = [
    ...dbSavedVendors,
    ...legacySavedVendors
      .filter((vendor) => vendor.id)
      .map((vendor) => ({
        id: `legacy-${vendor.id}`,
        createdAt: new Date(0).toISOString(),
        vendor: {
          id: vendor.id!,
          slug: vendor.slug,
          businessName: vendor.businessName,
          category: vendor.category,
          location: vendor.location,
          whatsapp: vendor.whatsapp || null,
          contactEmail: vendor.contactEmail || null,
          imageUrl: vendor.imageUrl,
        },
      })),
  ].filter(
    (item, index, array) =>
      array.findIndex((entry) => entry.vendor.id === item.vendor.id) === index,
  );
  const inquiries = await getPlannerInquiries(profile.id);
  const message =
    typeof searchParams.message === "string" ? searchParams.message : undefined;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : undefined;
  const feedbackError = message ? undefined : error;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6effa_0%,#fcf8ff_18%,#ffffff_48%,#ffffff_100%)]">
      <MainNav />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-8 md:px-10 lg:px-12 lg:py-12">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="surface-card rounded-[2.25rem] p-9 shadow-[0_30px_86px_-42px_rgba(106,62,124,0.22)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_34px_92px_-40px_rgba(106,62,124,0.28)]">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[color:var(--color-brand-primary)]/90">
              Planner
            </p>
            <h1 className="font-display mt-4 text-[3.2rem] leading-[0.98] text-[color:var(--color-ink)]">
              My Weddings
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[color:var(--color-muted)]">
              {planner.title}. {planner.summary}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Culture" value={plannerInput.culture} />
              <MetricCard label="Wedding type" value={plannerInput.weddingType} />
              <MetricCard label="Location" value={plannerInput.location} />
              <MetricCard label="Guest count" value={String(plannerInput.guestCount)} />
            </div>
          </div>

          <aside className="rounded-[2.25rem] bg-[linear-gradient(165deg,#744487_0%,#6A3E7C_62%,#5D356D_100%)] p-9 text-white shadow-[0_26px_72px_-38px_rgba(106,62,124,0.5)]">
            <p className="text-sm uppercase tracking-[0.28em] text-white/75">
              Overview
            </p>
            <div className="mt-6 grid gap-4">
              <SideTile label="Budget range" value={plannerInput.budgetRange} />
              <SideTile label="Suggested categories" value={`${planner.vendorCategories.length} categories`} />
              <SideTile label="Saved vendors" value={`${savedVendors.length} saved`} />
              <SideTile label="Inquiries" value={`${inquiries.length} in progress`} />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/planner/setup" className="btn-secondary bg-white">
                Edit Planner
              </Link>
              <Link
                href={`/vendors?culture=${encodeURIComponent(plannerInput.culture)}&location=${encodeURIComponent(plannerInput.location)}`}
                className="btn-ghost-light"
              >
                Browse vendors
              </Link>
            </div>
          </aside>
        </section>

        {message ? (
          <p className="surface-soft rounded-[1.25rem] px-4 py-3 text-sm text-[color:var(--color-brand-primary)]">
            {message}
          </p>
        ) : null}
        {feedbackError ? (
          <p className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {feedbackError}
          </p>
        ) : null}

        <PlannerAssistantModules
          weddingType={plannerInput.weddingType}
          guestCount={plannerInput.guestCount}
          location={plannerInput.location}
        />

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Panel title="Suggested vendor categories" eyebrow="Discover vendors next">
            <div className="grid gap-3">
              {planner.vendorCategories.map((category) => (
                <Link
                  key={category}
                  href={`/vendors?category=${encodeURIComponent(category)}&culture=${encodeURIComponent(plannerInput.culture)}&location=${encodeURIComponent(plannerInput.location)}`}
                  className="surface-card line-clamp-2 break-words rounded-[1.25rem] px-4 py-4 text-sm font-semibold text-[color:var(--color-brand-primary)] transition hover:border-[color:var(--color-brand-primary)]"
                >
                  {category}
                </Link>
              ))}
            </div>
          </Panel>

          <Panel title="Recommended vendors" eyebrow="Marketplace support">
            <div className="grid gap-4">
              {suggestedVendors.map((vendor) => (
                  <div
                    key={vendor.slug}
                    className="surface-card rounded-[1.75rem] p-6 shadow-[0_18px_46px_-34px_rgba(106,62,124,0.26)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_56px_-32px_rgba(106,62,124,0.3)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-brand-gold)]">
                        {vendor.category}
                      </p>
                      <h3 className="font-display mt-2 text-2xl text-[color:var(--color-ink)]">
                        {vendor.businessName}
                      </h3>
                      <p className="mt-2 text-sm text-[color:var(--color-muted)]">
                        {vendor.location} · {vendor.priceRange}
                      </p>
                    </div>
                    {vendor.verified ? (
                      <span className="surface-soft rounded-full px-3 py-1 text-xs font-semibold text-[color:var(--color-brand-primary)]">
                        Verified
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)]">
                    {vendor.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <VendorProfileAvatarLink
                      href={`/vendors/${vendor.slug}`}
                      businessName={vendor.businessName}
                      imageUrl={vendor.imageUrl}
                      sizeClassName="h-[88px] w-[88px]"
                    />
                    <form action={saveVendorForPlannerAction}>
                      <input type="hidden" name="vendorId" value={vendor.id} />
                      <input type="hidden" name="nextPath" value="/planner/dashboard" />
                      <button type="submit" className="btn-secondary px-4 py-2">
                        Save Vendor
                      </button>
                    </form>
                    <InquiryComposer
                      vendorId={vendor.id}
                      vendorSlug={vendor.slug}
                      contactMethod="planner_dashboard"
                    />
                    {buildWhatsAppLink(vendor.whatsapp, vendor.businessName) ? (
                      <a
                        href={buildWhatsAppLink(vendor.whatsapp, vendor.businessName)!}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary px-4 py-2"
                      >
                        Contact on WhatsApp
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Panel title="Saved vendors" eyebrow="Shortlist">
            {savedVendors.length ? (
              <div className="grid gap-4">
                {savedVendors.map((vendor) => (
                  <div key={vendor.id} className="surface-soft rounded-[1.75rem] p-5 shadow-[0_16px_42px_-36px_rgba(106,62,124,0.3)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_52px_-34px_rgba(106,62,124,0.34)]">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-display text-2xl text-[color:var(--color-ink)]">
                          {vendor.vendor.businessName}
                        </h3>
                        <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                          {vendor.vendor.category} · {vendor.vendor.location}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <VendorProfileAvatarLink
                          href={`/vendors/${vendor.vendor.slug}`}
                          businessName={vendor.vendor.businessName}
                          imageUrl={vendor.vendor.imageUrl}
                          sizeClassName="h-[84px] w-[84px]"
                        />
                        <InquiryComposer
                          vendorId={vendor.vendor.id}
                          vendorSlug={vendor.vendor.slug}
                          contactMethod="planner_saved_vendor"
                        />
                        {buildWhatsAppLink(
                          vendor.vendor.whatsapp,
                          vendor.vendor.businessName,
                        ) ? (
                          <a
                            href={buildWhatsAppLink(
                              vendor.vendor.whatsapp,
                              vendor.vendor.businessName,
                            )!}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary px-4 py-2"
                          >
                            Contact on WhatsApp
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                body="Save vendors from the recommended list or the directory to keep your shortlist inside Planner."
                href={`/vendors?culture=${encodeURIComponent(plannerInput.culture)}&location=${encodeURIComponent(plannerInput.location)}`}
                label="Browse vendors"
              />
            )}
          </Panel>

          <Panel title="Inquiry requests" eyebrow="Lead request section">
            {inquiries.length ? (
              <div className="grid gap-4">
                {inquiries.map((inquiry) => (
                  <div
                    key={inquiry.id}
                    className="surface-soft flex flex-col gap-5 rounded-[1.75rem] p-5 shadow-[0_16px_44px_-36px_rgba(106,62,124,0.32)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_58px_-34px_rgba(106,62,124,0.36)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-2xl text-[color:var(--color-ink)]">
                          {inquiry.vendor.businessName}
                        </h3>
                        <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                          {inquiry.vendor.category} · {inquiry.vendor.location}
                        </p>
                        <p className="mt-2 text-sm text-[color:var(--color-muted)]">
                          Sent {formatDateTime(inquiry.createdAt) ?? "Date not available"}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-brand-primary)]">
                        {formatLeadStatus(inquiry.threadStatus)}
                      </span>
                    </div>
                    <div className="grid gap-3">
                      {inquiry.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.senderRole === "planner"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[92%] rounded-[1.5rem] px-5 py-3.5 ${
                              message.senderRole === "planner"
                                ? "bg-[#744487] text-white"
                                : "bg-white text-[color:var(--color-ink)]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p
                                className={`text-sm font-semibold ${
                                  message.senderRole === "planner"
                                    ? "text-white/90"
                                    : "text-[color:var(--color-ink)]"
                                }`}
                              >
                                {message.senderLabel}
                              </p>
                              {formatDateTime(message.createdAt) ? (
                                <p
                                  className={`text-xs ${
                                    message.senderRole === "planner"
                                      ? "text-white/70"
                                      : "text-[color:var(--color-muted)]"
                                  }`}
                                >
                                  {formatDateTime(message.createdAt)}
                                </p>
                              ) : null}
                            </div>
                            <p
                              className={`mt-2 text-sm leading-7 ${
                                message.senderRole === "planner"
                                  ? "text-white"
                                  : "text-[color:var(--color-muted)]"
                              }`}
                            >
                              {message.body}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <VendorProfileAvatarLink
                        href={`/vendors/${inquiry.vendor.slug}`}
                        businessName={inquiry.vendor.businessName}
                        imageUrl={inquiry.vendor.imageUrl}
                        sizeClassName="h-[84px] w-[84px]"
                      />
                      {buildWhatsAppLink(
                        inquiry.vendor.whatsapp,
                        inquiry.vendor.businessName,
                      ) ? (
                        <a
                          href={buildWhatsAppLink(
                            inquiry.vendor.whatsapp,
                            inquiry.vendor.businessName,
                          )!}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary px-4 py-2"
                        >
                          Contact on WhatsApp
                        </a>
                      ) : null}
                      {buildEmailLink(
                        inquiry.vendor.contactEmail,
                        inquiry.vendor.businessName,
                      ) ? (
                        <a
                          href={buildEmailLink(
                            inquiry.vendor.contactEmail,
                            inquiry.vendor.businessName,
                          )!}
                          className="btn-secondary px-4 py-2"
                        >
                          Email
                        </a>
                      ) : null}
                      <form action={updatePlannerInquiryStatusAction} className="flex flex-wrap gap-3">
                        <input type="hidden" name="inquiryId" value={inquiry.id} />
                        <input type="hidden" name="nextPath" value="/planner/dashboard" />
                        <select
                          name="status"
                          defaultValue={inquiry.threadStatus}
                          className="field-input rounded-[1.25rem] px-4 py-2 text-sm"
                        >
                          <option value="open">Open</option>
                          <option value="contacted">Contacted</option>
                          <option value="closed">Closed</option>
                          <option value="archived">Archived</option>
                        </select>
                        <button type="submit" className="btn-secondary px-4 py-2">
                          Update Status
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                body="Start a lightweight inquiry from recommended vendors once your plan is clear enough to reach out."
                href={`/vendors?culture=${encodeURIComponent(plannerInput.culture)}&location=${encodeURIComponent(plannerInput.location)}`}
                label="Find vendors"
              />
            )}
          </Panel>
        </section>
      </main>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-soft rounded-[1.6rem] p-5 shadow-[0_14px_36px_-34px_rgba(106,62,124,0.35)]">
      <p className="text-xs uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[color:var(--color-ink)]">
        {value}
      </p>
    </div>
  );
}

function SideTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.6rem] border border-white/12 bg-white/12 p-4 backdrop-blur-[2px]">
      <p className="text-xs uppercase tracking-[0.2em] text-white/75">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="surface-card rounded-[2.2rem] p-8 shadow-[0_24px_64px_-42px_rgba(106,62,124,0.22)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_30px_76px_-40px_rgba(106,62,124,0.28)]">
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[color:var(--color-brand-primary)]/90">
        {eyebrow}
      </p>
      <h2 className="font-display mt-3 text-[2.15rem] leading-tight text-[color:var(--color-ink)]">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({
  body,
  href,
  label,
}: {
  body: string;
  href: string;
  label: string;
}) {
  return (
    <div className="surface-soft rounded-[1.5rem] p-5">
      <p className="text-sm leading-7 text-[color:var(--color-muted)]">{body}</p>
      <Link
        href={href}
        className="btn-primary mt-4 px-4 py-2"
      >
        {label}
      </Link>
    </div>
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatLeadStatus(value: string) {
  return value.replace(/_/g, " ");
}

function InquiryComposer({
  vendorId,
  vendorSlug,
  contactMethod,
}: {
  vendorId: string;
  vendorSlug: string;
  contactMethod: string;
}) {
  return (
    <form action={createVendorInquiryAction} className="grid gap-3">
      <input type="hidden" name="vendorId" value={vendorId} />
      <input type="hidden" name="vendorSlug" value={vendorSlug} />
      <input type="hidden" name="contactMethod" value={contactMethod} />
      <input type="hidden" name="nextPath" value="/planner/dashboard" />
      <textarea
        name="message"
        rows={3}
        placeholder="Start with a short note about your date, guest size, or what you need."
        className="field-input min-h-[90px] rounded-[1.25rem] text-sm"
      />
      <button type="submit" className="btn-secondary px-4 py-2">
        Start Inquiry
      </button>
    </form>
  );
}
