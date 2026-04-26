import Link from "next/link";
import { redirect } from "next/navigation";

import { addManageVendorNoteAction, updateManageVendorStatusAction } from "@/app/manage/actions";
import { MainNav } from "@/components/main-nav";
import { getCurrentProfile } from "@/lib/auth";
import { type AdminVendorSubmission, getAdminVendorSubmissions } from "@/lib/vendor-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  tab?: string;
  vendor?: string;
  message?: string;
}>;

type ManageTab = "pending" | "approved" | "rejected" | "notes";
type ManageAdminNote = {
  id: string;
  note: string;
  createdAt: string | null;
  vendorName: string | null;
  adminName: string | null;
  adminEmail: string | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ManagePage(props: { searchParams: SearchParams }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/auth/sign-in?next=%2Fmanage");
  }

  if (profile.role !== "admin") {
    redirect("/?error=Access%20denied");
  }

  const searchParams = await props.searchParams;
  const tab = normalizeTab(searchParams.tab);
  const vendors = await getAdminVendorSubmissions();
  const expandedVendorId = typeof searchParams.vendor === "string" ? searchParams.vendor : null;
  const message = typeof searchParams.message === "string" ? searchParams.message : "";
  const notes = await getAdminNotes();

  const pendingVendors = vendors.filter((vendor) => vendor.status === "pending_review");
  const approvedVendors = vendors.filter((vendor) => vendor.status === "approved");
  const rejectedVendors = vendors.filter((vendor) =>
    ["needs_changes", "rejected", "suspended", "archived"].includes(vendor.status ?? ""),
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fdfbfd_0%,#ffffff_52%,#ffffff_100%)]">
      <MainNav />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:px-10 lg:px-12">
        <section className="surface-card rounded-[2rem] p-6 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
            Internal management
          </p>
          <h1 className="font-display mt-3 text-3xl text-[color:var(--color-ink)] sm:text-4xl">
            Vendor application management
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-muted)] sm:text-base">
            Review applications, update vendor status, inspect uploaded verification files, and leave internal notes for vendor follow-up.
          </p>
          {message ? (
            <p className="surface-soft mt-4 rounded-[1.25rem] px-4 py-3 text-sm text-[color:var(--color-brand-primary)]">
              {message}
            </p>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <TabCard
            href="/manage?tab=pending"
            label="Pending Vendors"
            count={pendingVendors.length}
            active={tab === "pending"}
          />
          <TabCard
            href="/manage?tab=approved"
            label="Approved Vendors"
            count={approvedVendors.length}
            active={tab === "approved"}
          />
          <TabCard
            href="/manage?tab=rejected"
            label="Rejected Vendors"
            count={rejectedVendors.length}
            active={tab === "rejected"}
          />
          <TabCard
            href="/manage?tab=notes"
            label="Admin Notes"
            count={notes.length}
            active={tab === "notes"}
          />
        </section>

        {tab === "pending" ? (
          <VendorSection
            title="Pending Vendors"
            description="Profiles waiting for moderation and approval decisions."
            vendors={pendingVendors}
            expandedVendorId={expandedVendorId}
          />
        ) : null}

        {tab === "approved" ? (
          <VendorSection
            title="Approved Vendors"
            description="Profiles that are currently live and publicly visible."
            vendors={approvedVendors}
            expandedVendorId={expandedVendorId}
          />
        ) : null}

        {tab === "rejected" ? (
          <VendorSection
            title="Rejected Vendors"
            description="Profiles returned for changes or declined from the active review queue."
            vendors={rejectedVendors}
            expandedVendorId={expandedVendorId}
          />
        ) : null}

        {tab === "notes" ? (
          <section className="surface-card rounded-[2rem] p-6 sm:p-8">
            <h2 className="font-display text-2xl text-[color:var(--color-ink)] sm:text-3xl">
              Admin Notes / Messages
            </h2>
            <p className="mt-2 text-sm text-[color:var(--color-muted)]">
              Internal notes tied to vendor moderation history.
            </p>

            {notes.length ? (
              <div className="mt-5 grid gap-3">
                {notes.map((note) => (
                  <article key={note.id} className="surface-soft rounded-[1.35rem] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                        {note.vendorName || "Vendor"}
                      </p>
                      <p className="text-xs text-[color:var(--color-muted)]">
                        {formatDate(note.createdAt)}
                      </p>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-[0.1em] text-[color:var(--color-brand-primary)]">
                      By {note.adminName || note.adminEmail || "Admin"}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-[color:var(--color-ink)]">
                      {note.note}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--color-muted)]">
                No admin notes yet.
              </p>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}

function TabCard({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-[1.4rem] border p-4 transition ${
        active
          ? "border-[color:var(--color-brand-primary)] bg-[rgba(106,62,124,0.12)]"
          : "border-[rgba(106,62,124,0.12)] bg-white hover:border-[color:var(--color-brand-primary)]"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--color-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[color:var(--color-ink)]">{count}</p>
    </Link>
  );
}

function VendorSection({
  title,
  description,
  vendors,
  expandedVendorId,
}: {
  title: string;
  description: string;
  vendors: AdminVendorSubmission[];
  expandedVendorId: string | null;
}) {
  return (
    <section className="surface-card rounded-[2rem] p-6 sm:p-8">
      <h2 className="font-display text-2xl text-[color:var(--color-ink)] sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm text-[color:var(--color-muted)]">{description}</p>

      {vendors.length ? (
        <div className="mt-5 grid gap-4">
          {vendors.map((vendor) => {
            const isExpanded = expandedVendorId === vendor.id;
            return (
              <article key={vendor.id} className="surface-soft rounded-[1.5rem] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--color-brand-primary)]">
                      {vendor.customCategory || vendor.category}
                    </p>
                    <h3 className="font-display mt-2 text-2xl text-[color:var(--color-ink)]">
                      {vendor.businessName}
                    </h3>
                    <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                      {vendor.location} · submitted {formatDate(vendor.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={vendor.status} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/manage?tab=${tabForStatus(vendor.status)}&vendor=${encodeURIComponent(vendor.id)}`} className="btn-secondary px-3 py-1.5 text-sm">
                    View Details
                  </Link>
                  <form action={updateManageVendorStatusAction}>
                    <input type="hidden" name="vendorId" value={vendor.id} />
                    <input type="hidden" name="status" value="approved" />
                    <button type="submit" className="btn-primary px-3 py-1.5 text-sm">Approve</button>
                  </form>
                  <form action={updateManageVendorStatusAction}>
                    <input type="hidden" name="vendorId" value={vendor.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <button type="submit" className="btn-secondary px-3 py-1.5 text-sm">Reject</button>
                  </form>
                  <form action={updateManageVendorStatusAction}>
                    <input type="hidden" name="vendorId" value={vendor.id} />
                    <input type="hidden" name="status" value="pending_review" />
                    <button type="submit" className="btn-secondary px-3 py-1.5 text-sm">Mark Pending</button>
                  </form>
                </div>

                {isExpanded ? (
                  <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Info label="Business name" value={vendor.businessName} />
                      <Info label="Category" value={vendor.customCategory || vendor.category} />
                      <Info label="Location" value={vendor.location} />
                      <Info label="Pricing" value={vendor.priceRange || "Not provided"} />
                      <Info label="Email" value={vendor.email || "Not provided"} />
                      <Info label="Phone" value={vendor.phone || "Not provided"} />
                      <Info label="Social" value={vendor.primarySocialLink || "Not provided"} />
                      <Info label="Website" value={vendor.website || "Not provided"} />
                    </div>

                    <div className="surface-card rounded-[1.35rem] p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--color-brand-primary)]">
                        Verification files
                      </p>
                      <div className="mt-3 space-y-3 text-sm">
                        <p>
                          Government ID:{" "}
                          {vendor.governmentIdSignedUrl ? (
                            <a
                              href={vendor.governmentIdSignedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-[color:var(--color-brand-primary)] underline"
                            >
                              View file
                            </a>
                          ) : (
                            "Not uploaded"
                          )}
                        </p>
                        <p>
                          CAC / registration:{" "}
                          {vendor.cacCertificateSignedUrl ? (
                            <a
                              href={vendor.cacCertificateSignedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-[color:var(--color-brand-primary)] underline"
                            >
                              View file
                            </a>
                          ) : (
                            "Not uploaded"
                          )}
                        </p>
                      </div>
                    </div>

                    {vendor.portfolioImages.length ? (
                      <div className="md:col-span-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--color-brand-primary)]">
                          Portfolio images
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {vendor.portfolioImages.map((imageUrl) => (
                            <div key={imageUrl} className="overflow-hidden rounded-[1.2rem] border border-[rgba(106,62,124,0.1)]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={imageUrl} alt={`${vendor.businessName} portfolio`} className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <form action={addManageVendorNoteAction} className="md:col-span-2 grid gap-3">
                      <input type="hidden" name="vendorId" value={vendor.id} />
                      <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
                        Add internal note/message
                        <textarea
                          name="note"
                          rows={3}
                          placeholder="Add moderation guidance or internal follow-up notes."
                          className="field-input min-h-[96px] rounded-[1rem]"
                        />
                      </label>
                      <button type="submit" className="btn-primary w-full sm:w-auto">
                        Add Note
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[color:var(--color-muted)]">No vendors in this section yet.</p>
      )}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card rounded-[1.2rem] p-4">
      <p className="text-xs uppercase tracking-[0.12em] text-[color:var(--color-muted)]">{label}</p>
      <p className="mt-2 text-sm text-[color:var(--color-ink)]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const normalized = status ?? "pending_review";
  const label = normalized === "needs_changes" ? "rejected" : normalized;
  const tone =
    label === "approved"
      ? "bg-emerald-100 text-emerald-700"
      : label === "pending_review"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-700";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${tone}`}>
      {label}
    </span>
  );
}

function tabForStatus(status: string | null) {
  if (status === "approved") return "approved";
  if (status === "pending_review") return "pending";
  return "rejected";
}

function normalizeTab(tab: string | undefined): ManageTab {
  if (tab === "approved" || tab === "rejected" || tab === "notes") return tab;
  return "pending";
}

async function getAdminNotes(): Promise<ManageAdminNote[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("admin_notes")
    .select("id, note, created_at, vendor:vendors(business_name), admin:users(full_name, email)")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const vendor = Array.isArray(row.vendor) ? row.vendor[0] : row.vendor;
    const admin = Array.isArray(row.admin) ? row.admin[0] : row.admin;
    return {
      id: row.id,
      note: row.note,
      createdAt: row.created_at,
      vendorName: vendor?.business_name ?? null,
      adminName: admin?.full_name ?? null,
      adminEmail: admin?.email ?? null,
    };
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
