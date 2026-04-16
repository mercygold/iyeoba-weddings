import { MainNav } from "@/components/main-nav";
import { requireAdminProfile } from "@/lib/auth";
import { updateVendorReviewAction } from "@/app/admin/vendors/actions";
import { getAdminVendorSubmissions } from "@/lib/vendor-admin";

type SearchParams = Promise<{ message?: string }>;

const statusOptions = [
  "draft",
  "pending_review",
  "approved",
  "needs_changes",
  "suspended",
  "archived",
];

export default async function AdminVendorsPage(props: {
  searchParams: SearchParams;
}) {
  await requireAdminProfile("/admin/vendors");
  const searchParams = await props.searchParams;
  const vendors = await getAdminVendorSubmissions();
  const reviewQueue = vendors.filter((vendor) =>
    ["pending_review", "needs_changes"].includes(vendor.status || ""),
  );
  const approved = vendors.filter((vendor) => vendor.status === "approved");
  const suspended = vendors.filter((vendor) => vendor.status === "suspended");
  const archived = vendors.filter((vendor) => vendor.status === "archived");
  const drafts = vendors.filter((vendor) => vendor.status === "draft");

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fdfbfd_0%,#ffffff_52%,#ffffff_100%)]">
      <MainNav />
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8 md:px-10 lg:px-12">
        <section className="surface-card rounded-[2rem] p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
            Admin
          </p>
          <h1 className="font-display mt-3 text-4xl text-[color:var(--color-ink)]">
            Vendor review
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[color:var(--color-muted)]">
            Review submitted vendor profiles, inspect uploads, and update
            publication status before listings appear in the marketplace.
          </p>
          {searchParams.message ? (
            <p className="surface-soft mt-4 rounded-[1.25rem] px-4 py-3 text-sm text-[color:var(--color-brand-primary)]">
              {searchParams.message}
            </p>
          ) : null}
        </section>

        <section className="grid gap-6">
          <SectionHeader
            title="In review"
            description="Submitted profiles that are awaiting moderation or have been sent back for changes."
            count={reviewQueue.length}
          />
          <VendorList vendors={reviewQueue} emptyMessage="No vendor profiles are waiting for review right now." />

          <SectionHeader
            title="Approved"
            description="Published vendors currently visible in the marketplace."
            count={approved.length}
          />
          <VendorList vendors={approved} emptyMessage="No approved vendors yet." />

          <SectionHeader
            title="Suspended"
            description="Listings temporarily hidden from the public without deleting the vendor record."
            count={suspended.length}
          />
          <VendorList vendors={suspended} emptyMessage="No suspended vendors." />

          <SectionHeader
            title="Archived"
            description="Listings kept for history and audit, but removed from public discovery."
            count={archived.length}
          />
          <VendorList vendors={archived} emptyMessage="No archived vendors." />

          {drafts.length ? (
            <>
              <div className="flex items-center justify-between pt-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
                    Draft profiles
                  </p>
                  <p className="mt-2 text-sm text-[color:var(--color-muted)]">
                    Saved by vendors but not yet submitted for review.
                  </p>
                </div>
                <p className="rounded-full bg-[rgba(106,62,124,0.08)] px-4 py-2 text-sm font-semibold text-[color:var(--color-brand-primary)]">
                  {drafts.length} drafts
                </p>
              </div>
              {drafts.map((vendor) => (
                <article key={vendor.id} className="surface-card rounded-[2rem] p-7">
                  <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
                    <div className="max-w-3xl">
                      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-brand-gold)]">
                        {vendor.category}
                      </p>
                      <h2 className="font-display mt-2 text-3xl text-[color:var(--color-ink)]">
                        {vendor.businessName}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-[color:var(--color-muted)]">
                        {vendor.description || "No business description submitted yet."}
                      </p>
                    </div>

                    <div className="surface-soft rounded-[1.5rem] px-5 py-4 text-sm text-[color:var(--color-muted)]">
                      This profile is still a vendor draft and has not entered the review queue.
                    </div>
                  </div>
                </article>
              ))}
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-soft rounded-[1.5rem] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-[color:var(--color-ink)]">
        {value}
      </p>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  count,
}: {
  title: string;
  description: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
          {title}
        </p>
        <p className="mt-2 text-sm text-[color:var(--color-muted)]">{description}</p>
      </div>
      <p className="rounded-full bg-[rgba(106,62,124,0.08)] px-4 py-2 text-sm font-semibold text-[color:var(--color-brand-primary)]">
        {count}
      </p>
    </div>
  );
}

function VendorList({
  vendors,
  emptyMessage,
}: {
  vendors: Awaited<ReturnType<typeof getAdminVendorSubmissions>>;
  emptyMessage: string;
}) {
  return vendors.length ? (
    vendors.map((vendor) => (
      <article key={vendor.id} className="surface-card rounded-[2rem] p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--color-brand-gold)]">
              {vendor.customCategory || vendor.category}
            </p>
            <h2 className="font-display mt-2 text-3xl text-[color:var(--color-ink)]">
              {vendor.businessName}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[color:var(--color-muted)]">
              {vendor.description || "No business description submitted yet."}
            </p>
          </div>

          <form action={updateVendorReviewAction} className="grid gap-3 lg:min-w-[320px]">
            <input type="hidden" name="vendorId" value={vendor.id} />
            <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
              Review status
              <select
                name="status"
                defaultValue={vendor.status || "pending_review"}
                className="field-input rounded-[1.25rem]"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
              Admin notes
              <textarea
                name="adminNotes"
                defaultValue={vendor.adminNotes || ""}
                rows={4}
                placeholder="Internal notes for moderation context"
                className="field-input min-h-[112px] rounded-[1.25rem]"
              />
            </label>
            <button type="submit" className="btn-primary">
              Save review
            </button>
          </form>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Info label="Owner" value={vendor.ownerName || "Not provided"} />
          <Info label="Email" value={vendor.email || "Not provided"} />
          <Info label="Phone" value={vendor.phone || "Not provided"} />
          <Info label="Location" value={vendor.location} />
          <Info label="Country / region" value={vendor.countryRegion || "Not provided"} />
          <Info label="Culture" value={vendor.cultureSpecialization || "Not provided"} />
          <Info label="Experience" value={vendor.yearsExperience || "Not provided"} />
          <Info label="Starting price" value={vendor.priceRange || "Not provided"} />
          <Info label="Status" value={vendor.status || "pending"} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-brand-primary)]">
              Portfolio images
            </h3>
            {vendor.portfolioImages.length ? (
              <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {vendor.portfolioImages.map((imageUrl) => (
                  <div key={imageUrl} className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem]">
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
              <p className="mt-3 text-sm text-[color:var(--color-muted)]">
                No portfolio images uploaded yet.
              </p>
            )}
          </section>

          <section className="surface-soft rounded-[1.75rem] p-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--color-brand-primary)]">
              Verification documents
            </h3>
            <div className="mt-4 space-y-4 text-sm text-[color:var(--color-muted)]">
              <p>
                Government ID:{" "}
                {vendor.governmentIdSignedUrl ? (
                  <a
                    href={vendor.governmentIdSignedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[color:var(--color-brand-primary)] underline"
                  >
                    View uploaded file
                  </a>
                ) : (
                  "Not uploaded"
                )}
              </p>
              {vendor.registeredBusiness ? (
                <p>
                  CAC / business registration:{" "}
                  {vendor.cacCertificateSignedUrl ? (
                    <a
                      href={vendor.cacCertificateSignedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-[color:var(--color-brand-primary)] underline"
                    >
                      View uploaded file
                    </a>
                  ) : (
                    "Not uploaded"
                  )}
                </p>
              ) : null}
              <p>
                Services:{" "}
                {vendor.servicesOffered.length
                  ? vendor.servicesOffered.join(", ")
                  : "Not provided"}
              </p>
              <p>
                Social link:{" "}
                {vendor.primarySocialLink ? (
                  <a
                    href={vendor.primarySocialLink}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-[color:var(--color-brand-primary)] underline"
                  >
                    Open link
                  </a>
                ) : (
                  "Not provided"
                )}
              </p>
            </div>
          </section>
        </div>
      </article>
    ))
  ) : (
    <div className="surface-card rounded-[2rem] p-7 text-sm text-[color:var(--color-muted)]">
      {emptyMessage}
    </div>
  );
}
