import Link from "next/link";

import { FlashQueryCleaner } from "@/components/flash-query-cleaner";
import { MainNav } from "@/components/main-nav";
import { VendorDashboardForm } from "@/components/vendor-dashboard-form";
import {
  replyToInquiryAction,
  updateInquiryStatusAction,
} from "@/app/vendor/dashboard/actions";
import { requireVendorProfile } from "@/lib/auth";
import {
  buildEmailLink,
  buildWhatsAppMessageLink,
  getVendorInquiries,
} from "@/lib/inquiries";
import { getVendorByUserId } from "@/lib/vendors";

type SearchParams = Promise<{ message?: string; error?: string; edit?: string }>;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VendorDashboardPage(props: {
  searchParams: SearchParams;
}) {
  const profile = await requireVendorProfile("/vendor/dashboard");
  const searchParams = await props.searchParams;
  const vendor = await getVendorByUserId(profile.id);
  const inquiries = await getVendorInquiries(profile.id);
  const openInquiries = inquiries.filter((inquiry) => inquiry.threadStatus !== "archived");
  const archivedInquiries = inquiries.filter(
    (inquiry) => inquiry.threadStatus === "archived",
  );
  const status = vendor?.status || "draft";
  console.log("Vendor dashboard status view", {
    userId: profile.id,
    vendorId: vendor?.id ?? null,
    status,
    approved: vendor?.approved ?? false,
    visibleFromStatus: status === "approved",
  });
  const showOnboarding =
    !vendor ||
    searchParams.edit === "1" ||
    status === "draft" ||
    status === "needs_changes";
  const feedbackMessage = searchParams.message;
  const feedbackError = feedbackMessage
    ? undefined
    : sanitizeVendorFacingError(searchParams.error);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fdfbfd_0%,#ffffff_42%,#ffffff_100%)]">
      <FlashQueryCleaner />
      <MainNav />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8 md:px-10 lg:px-12 lg:py-12">
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="surface-card rounded-[2rem] p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
              Vendor Dashboard
            </p>
            <h1 className="font-display mt-4 text-5xl leading-none text-[color:var(--color-ink)]">
              {showOnboarding
                ? "Complete your business registration."
                : `Welcome back, ${vendor?.businessName || profile.full_name || "vendor"}.`}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[color:var(--color-muted)]">
              {showOnboarding
                ? "Use this dashboard to complete your business registration, upload your work, and prepare your listing for review."
                : "Your business profile is saved. Review your current status, monitor publication progress, and manage your listing details from here."}
            </p>
            {feedbackMessage ? (
              <p className="surface-soft mt-5 rounded-[1.25rem] px-4 py-3 text-sm text-[color:var(--color-brand-primary)]">
                {feedbackMessage}
              </p>
            ) : null}
            {feedbackError ? (
              <p className="mt-5 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {feedbackError}
              </p>
            ) : null}
            {vendor && status === "needs_changes" ? (
              <p className="mt-5 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Your profile needs updates before it can be approved. Review the requested changes and resubmit when ready.
              </p>
            ) : null}
            {vendor && status === "suspended" ? (
              <p className="mt-5 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Your listing is currently suspended and is not visible to the public.
              </p>
            ) : null}
          </div>

          <aside className="rounded-[2rem] bg-[color:var(--color-brand-primary)] p-8 text-white">
            <p className="text-sm uppercase tracking-[0.24em] text-white/70">
              Status
            </p>
            <div className="mt-6 grid gap-4">
              <SideTile label="Profile status" value={formatStatus(status)} />
              <SideTile
                label="Approval"
                value={status === "approved" ? "Approved" : status === "pending_review" ? "Awaiting review" : status === "needs_changes" ? "Needs changes" : status === "suspended" ? "Suspended" : status === "archived" ? "Archived" : "Not submitted"}
              />
              <SideTile
                label="Marketplace listing"
                value={status === "approved" ? "Published" : status === "pending_review" ? "Queued for review" : status === "needs_changes" ? "Private until resubmitted" : status === "suspended" ? "Hidden from public view" : status === "archived" ? "Archived from marketplace" : "Private draft"}
              />
              <SideTile
                label="Lead inbox"
                value={status === "approved" ? `${openInquiries.length} active inquiries` : "Available after approval"}
              />
              <SideTile label="Next step" value={getNextStep(status)} />
            </div>
          </aside>
        </section>

        {showOnboarding ? (
          <section className="surface-card rounded-[2rem] p-8">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
                Business registration form
              </p>
              <h2 className="font-display text-4xl text-[color:var(--color-ink)]">
                Tell couples who you are and what you offer.
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-[color:var(--color-muted)]">
                Save your progress as a draft, then submit your completed profile
                for review when you are ready to be considered for publication.
              </p>
            </div>

            <VendorDashboardForm
              vendor={vendor}
              profile={{
                id: profile.id,
                full_name: profile.full_name,
                email: profile.email,
                phone: profile.phone,
              }}
            />
          </section>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="surface-card rounded-[2rem] p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
                Business summary
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <MetricCard label="Business name" value={vendor.businessName} />
                <MetricCard label="Category" value={vendor.category} />
                <MetricCard label="Country / region" value={vendor.countryRegion || "Not shared"} />
                <MetricCard label="Location" value={vendor.location} />
                <MetricCard
                  label="Starting price"
                  value={vendor.priceRange || "Contact vendor"}
                />
                <MetricLinkCard
                  label="Social link"
                  href={vendor.primarySocialLink}
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/vendors" className="btn-secondary">
                  View marketplace
                </Link>
                <Link href="/vendor/dashboard?edit=1" className="btn-primary">
                  Edit profile
                </Link>
              </div>
            </div>

            <div className="surface-card rounded-[2rem] p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
                Publication details
              </p>
              <div className="mt-6 grid gap-4">
                <MetricCard label="Review status" value={formatStatus(status)} />
                <MetricCard
                  label="Portfolio images"
                  value={String(vendor.portfolioImageUrls?.length || 0)}
                />
                <MetricCard
                  label="Verification"
                  value={vendor.governmentIdUrl ? "Document received" : "Awaiting document"}
                />
                <MetricCard
                  label="Admin note"
                  value={vendor.adminNotes || "No moderation note at the moment."}
                />
              </div>
            </div>
          </section>
        )}

        {!showOnboarding ? (
          <section className="surface-card rounded-[2rem] p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
                  Inquiry inbox
                </p>
                <h2 className="font-display mt-3 text-3xl text-[color:var(--color-ink)]">
                  Planner inquiries
                </h2>
              </div>
              <p className="rounded-full bg-[rgba(106,62,124,0.08)] px-4 py-2 text-sm font-semibold text-[color:var(--color-brand-primary)]">
                {inquiries.length} inquiries
              </p>
            </div>
            {inquiries.length ? (
              <div className="mt-6 grid gap-4">
                <div className="grid gap-6">
                  <InquirySection title="Open inquiries" inquiries={openInquiries} />
                  <InquirySection title="Archived inquiries" inquiries={archivedInquiries} />
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm leading-7 text-[color:var(--color-muted)]">
                Planner inquiries will appear here after couples save your listing and start reaching out.
              </p>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}

function sanitizeVendorFacingError(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase();
  if (
    normalized.includes("supabase") ||
    normalized.includes("service-role") ||
    normalized.includes("storage bucket")
  ) {
    return "We could not complete this action right now. Please try again shortly.";
  }

  return value;
}

function formatStatus(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getNextStep(status: string) {
  if (status === "approved") {
    return "Your listing is live";
  }
  if (status === "pending_review") {
    return "Wait for review";
  }
  if (status === "needs_changes") {
    return "Update profile and resubmit";
  }
  if (status === "suspended") {
    return "Contact support or review admin note";
  }
  if (status === "archived") {
    return "Archived from public discovery";
  }
  return "Complete your draft";
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

function SideTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] bg-white/10 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/70">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function InquirySection({
  title,
  inquiries,
}: {
  title: string;
  inquiries: Awaited<ReturnType<typeof getVendorInquiries>>;
}) {
  if (!inquiries.length) {
    return (
      <div>
        <h3 className="text-base font-semibold text-[color:var(--color-ink)]">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
          No inquiries in this section yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-base font-semibold text-[color:var(--color-ink)]">{title}</h3>
      <div className="mt-4 grid gap-4">
        {inquiries.map((inquiry) => (
          <div key={inquiry.id} className="surface-soft rounded-[1.5rem] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-[color:var(--color-ink)]">
                  {inquiry.plannerName || inquiry.plannerEmail || "Planner inquiry"}
                </p>
                <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                  {formatDateTime(inquiry.createdAt) ?? "Date not available"}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-brand-primary)]">
                {formatStatus(inquiry.threadStatus)}
              </span>
            </div>
            {inquiry.weddingSummary ? (
              <p className="mt-3 text-sm text-[color:var(--color-muted)]">
                Wedding: {inquiry.weddingSummary}
              </p>
            ) : null}
            <p className="mt-3 text-sm text-[color:var(--color-muted)]">
              Contact path: {inquiry.contactMethod || "Marketplace inquiry"}
            </p>
            <div className="mt-4 grid gap-3">
              {inquiry.messages.map((message) => (
                <div key={message.id} className="rounded-[1.25rem] bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                      {message.senderLabel}
                    </p>
                    {formatDateTime(message.createdAt) ? (
                      <p className="text-xs text-[color:var(--color-muted)]">
                        {formatDateTime(message.createdAt)}
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--color-muted)]">
                    {message.body}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3">
              <form action={replyToInquiryAction} className="grid gap-3">
                <input type="hidden" name="inquiryId" value={inquiry.id} />
                <textarea
                  name="message"
                  rows={3}
                  placeholder="Send a reply before moving the conversation to WhatsApp or email."
                  className="field-input min-h-[90px] rounded-[1.25rem] text-sm"
                />
                <button type="submit" className="btn-primary px-4 py-2">
                  Reply
                </button>
              </form>
              <div className="flex flex-wrap gap-3">
                {buildWhatsAppMessageLink(
                  inquiry.plannerPhone,
                  `Hello, thanks for your inquiry on Iyeoba Weddings. I am following up on your request${inquiry.weddingSummary ? ` for ${inquiry.weddingSummary}` : ""}.`,
                ) ? (
                  <a
                    href={buildWhatsAppMessageLink(
                      inquiry.plannerPhone,
                      `Hello, thanks for your inquiry on Iyeoba Weddings. I am following up on your request${inquiry.weddingSummary ? ` for ${inquiry.weddingSummary}` : ""}.`,
                    )!}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary px-4 py-2"
                  >
                    WhatsApp
                  </a>
                ) : null}
                {buildEmailLink(inquiry.plannerEmail, "Iyeoba Weddings inquiry") ? (
                  <a
                    href={buildEmailLink(
                      inquiry.plannerEmail,
                      "Iyeoba Weddings inquiry",
                    )!}
                    className="btn-secondary px-4 py-2"
                  >
                    Email
                  </a>
                ) : null}
                <form action={updateInquiryStatusAction} className="flex flex-wrap gap-3">
                  <input type="hidden" name="inquiryId" value={inquiry.id} />
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
                  <button type="submit" className="btn-primary px-4 py-2">
                    Update status
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
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

function MetricLinkCard({
  label,
  href,
}: {
  label: string;
  href?: string | null;
}) {
  return (
    <div className="surface-soft rounded-[1.5rem] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
        {label}
      </p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block truncate text-lg font-semibold text-[color:var(--color-brand-primary)] underline decoration-[rgba(106,62,124,0.25)] underline-offset-4"
          title={href}
        >
          View social profile
        </a>
      ) : (
        <p className="mt-2 text-lg font-semibold text-[color:var(--color-ink)]">
          Not shared
        </p>
      )}
    </div>
  );
}
