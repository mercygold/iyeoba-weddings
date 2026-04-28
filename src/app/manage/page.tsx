import Link from "next/link";

import {
  addManageVendorNoteAction,
  approveVendorAction,
  rejectVendorAction,
  setVendorPendingAction,
} from "@/app/manage/actions";
import { MainNav } from "@/components/main-nav";
import { requireAdmin } from "@/lib/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  tab?: string;
  vendor?: string;
  message?: string;
  q?: string;
  sort?: string;
}>;

type ManageTab = "all" | "pending" | "approved" | "rejected" | "notes" | "users";
type VendorSort = "newest" | "oldest" | "updated";
type ManageAdminNote = {
  id: string;
  note: string;
  createdAt: string | null;
  vendorName: string | null;
  adminName: string | null;
  adminEmail: string | null;
};
type ManageUserSummary = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  createdAt: string | null;
  emailConfirmedAt: string | null;
  confirmationStatus: "confirmed" | "unconfirmed";
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ManagePage(props: { searchParams: SearchParams }) {
  await requireAdmin("/manage");

  const searchParams = await props.searchParams;
  const tab = normalizeTab(searchParams.tab);
  const query = String(searchParams.q ?? "").trim();
  const sort = normalizeSort(searchParams.sort);
  const vendors = await getManageVendors();
  const filteredVendors = filterAndSortVendors(vendors, { query, sort });
  const expandedVendorId = typeof searchParams.vendor === "string" ? searchParams.vendor : null;
  const manageNextPath = buildManageNextPath(tab, expandedVendorId, query, sort);
  const message = typeof searchParams.message === "string" ? searchParams.message : "";
  const notes = await getAdminNotes();
  const users = await getManageUsers();

  const pendingVendors = filteredVendors.filter((vendor) => vendor.status === "pending_review");
  const approvedVendors = filteredVendors.filter((vendor) => vendor.status === "approved");
  const rejectedVendors = filteredVendors.filter((vendor) =>
    ["needs_changes", "rejected", "suspended", "archived"].includes(vendor.status ?? ""),
  );
  const allVendors = filteredVendors;

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

        <section className="grid gap-4 md:grid-cols-5">
          <TabCard
            href={buildManageTabHref("all", query, sort)}
            label="All Vendors"
            count={allVendors.length}
            active={tab === "all"}
          />
          <TabCard
            href={buildManageTabHref("pending", query, sort)}
            label="Pending Vendors"
            count={pendingVendors.length}
            active={tab === "pending"}
          />
          <TabCard
            href={buildManageTabHref("approved", query, sort)}
            label="Approved Vendors"
            count={approvedVendors.length}
            active={tab === "approved"}
          />
          <TabCard
            href={buildManageTabHref("rejected", query, sort)}
            label="Rejected Vendors"
            count={rejectedVendors.length}
            active={tab === "rejected"}
          />
          <TabCard
            href={buildManageTabHref("notes", query, sort)}
            label="Admin Notes"
            count={notes.length}
            active={tab === "notes"}
          />
        </section>
        <section className="grid gap-4 md:grid-cols-5">
          <TabCard
            href={buildManageTabHref("users", query, sort)}
            label="Users"
            count={users.length}
            active={tab === "users"}
          />
          <div className="md:col-span-4 surface-card rounded-[1.4rem] p-4">
            <form className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
              <input type="hidden" name="tab" value={tab} />
              {expandedVendorId ? (
                <input type="hidden" name="vendor" value={expandedVendorId} />
              ) : null}
              <label className="grid gap-1 text-sm font-medium text-[color:var(--color-ink)]">
                Search vendor business name
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="Search by business name"
                  className="field-input rounded-[1rem]"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-[color:var(--color-ink)]">
                Sort
                <select name="sort" defaultValue={sort} className="field-input rounded-[1rem]">
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="updated">Recently updated</option>
                </select>
              </label>
              <button type="submit" className="btn-primary whitespace-nowrap">
                Apply
              </button>
            </form>
          </div>
        </section>

        {tab === "all" ? (
          <VendorSection
            title="All Vendors"
            description="Full vendor operations queue across all statuses."
            vendors={allVendors}
            expandedVendorId={expandedVendorId}
            nextPath={manageNextPath}
            query={query}
            sort={sort}
            activeTab={tab}
          />
        ) : null}

        {tab === "pending" ? (
          <VendorSection
            title="Pending Vendors"
            description="Profiles waiting for moderation and approval decisions."
            vendors={pendingVendors}
            expandedVendorId={expandedVendorId}
            nextPath={manageNextPath}
            query={query}
            sort={sort}
            activeTab={tab}
          />
        ) : null}

        {tab === "approved" ? (
          <VendorSection
            title="Approved Vendors"
            description="Profiles that are currently live and publicly visible."
            vendors={approvedVendors}
            expandedVendorId={expandedVendorId}
            nextPath={manageNextPath}
            query={query}
            sort={sort}
            activeTab={tab}
          />
        ) : null}

        {tab === "rejected" ? (
          <VendorSection
            title="Rejected Vendors"
            description="Profiles returned for changes or declined from the active review queue."
            vendors={rejectedVendors}
            expandedVendorId={expandedVendorId}
            nextPath={manageNextPath}
            query={query}
            sort={sort}
            activeTab={tab}
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

        {tab === "users" ? (
          <section className="surface-card rounded-[2rem] p-6 sm:p-8">
            <h2 className="font-display text-2xl text-[color:var(--color-ink)] sm:text-3xl">
              User Accounts
            </h2>
            <p className="mt-2 text-sm text-[color:var(--color-muted)]">
              Admin-only visibility for account confirmation and contact details.
            </p>

            {users.length ? (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="surface-soft align-top">
                        <td className="rounded-l-[0.9rem] px-3 py-3">
                          <p className="font-medium text-[color:var(--color-ink)]">{user.email}</p>
                          <p className="text-xs text-[color:var(--color-muted)]">
                            {user.fullName || "No name"}
                          </p>
                        </td>
                        <td className="px-3 py-3 text-[color:var(--color-ink)]">{user.phone || "Not provided"}</td>
                        <td className="px-3 py-3">
                          <span className="rounded-full bg-[rgba(106,62,124,0.12)] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[color:var(--color-brand-primary)]">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1">
                            <ConfirmationBadge status={user.confirmationStatus} />
                            <span className="text-xs text-[color:var(--color-muted)]">
                              {user.emailConfirmedAt ? formatDate(user.emailConfirmedAt) : "No confirmation timestamp"}
                            </span>
                          </div>
                        </td>
                        <td className="rounded-r-[0.9rem] px-3 py-3 text-[color:var(--color-muted)]">
                          {formatDate(user.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--color-muted)]">
                No user records available.
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
  nextPath,
  query,
  sort,
  activeTab,
}: {
  title: string;
  description: string;
  vendors: AdminVendorSubmission[];
  expandedVendorId: string | null;
  nextPath: string;
  query: string;
  sort: VendorSort;
  activeTab: ManageTab;
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
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-[color:var(--color-muted)]">
                      <span className="rounded-full bg-[rgba(106,62,124,0.08)] px-2.5 py-1">
                        Owner: {vendor.ownerName || "Not provided"}
                      </span>
                      <span className="rounded-full bg-[rgba(106,62,124,0.08)] px-2.5 py-1">
                        Updated: {formatDate(vendor.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={vendor.status} />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={buildManageVendorHref({
                      tab: activeTab,
                      vendorId: vendor.id,
                      query,
                      sort,
                    })}
                    className="btn-secondary px-3 py-1.5 text-sm"
                  >
                    View Details
                  </Link>
                  <form action={approveVendorAction}>
                    <input type="hidden" name="vendorId" value={vendor.id} />
                    <input type="hidden" name="nextPath" value={nextPath} />
                    <button type="submit" className="btn-primary px-3 py-1.5 text-sm">Approve</button>
                  </form>
                  <form action={rejectVendorAction}>
                    <input type="hidden" name="vendorId" value={vendor.id} />
                    <input type="hidden" name="nextPath" value={nextPath} />
                    <button type="submit" className="btn-secondary px-3 py-1.5 text-sm">Reject</button>
                  </form>
                  <form action={setVendorPendingAction}>
                    <input type="hidden" name="vendorId" value={vendor.id} />
                    <input type="hidden" name="nextPath" value={nextPath} />
                    <button type="submit" className="btn-secondary px-3 py-1.5 text-sm">Mark Pending</button>
                  </form>
                </div>

                {isExpanded ? (
                  <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="grid gap-4 md:grid-cols-2">
                      <Info label="Business name" value={vendor.businessName} />
                      <Info label="Owner name" value={vendor.ownerName || "Not provided"} />
                      <Info label="Category" value={vendor.customCategory || vendor.category} />
                      <Info label="Location" value={vendor.location} />
                      <Info label="Pricing" value={vendor.priceRange || "Not provided"} />
                      <Info label="Email" value={vendor.email || "Not provided"} />
                      <Info label="Phone" value={vendor.phone || "Not provided"} />
                      <Info label="Social" value={vendor.primarySocialLink || "Not provided"} />
                      <Info label="Website" value={vendor.website || "Not provided"} />
                      <Info label="Last updated" value={formatDate(vendor.updatedAt)} />
                      <Info label="Notes" value={vendor.adminNotes || "No notes added"} />
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
                      <input type="hidden" name="nextPath" value={nextPath} />
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
  const label =
    normalized === "approved"
      ? "Approved"
      : normalized === "pending_review"
        ? "Pending"
        : "Rejected";
  const tone =
    label === "Approved"
      ? "bg-emerald-100 text-emerald-700"
      : label === "Pending"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-700";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${tone}`}>
      {label}
    </span>
  );
}

function ConfirmationBadge({ status }: { status: "confirmed" | "unconfirmed" }) {
  const tone =
    status === "confirmed"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700";
  return (
    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${tone}`}>
      {status}
    </span>
  );
}

function normalizeTab(tab: string | undefined): ManageTab {
  if (tab === "all" || tab === "pending" || tab === "approved" || tab === "rejected" || tab === "notes" || tab === "users") return tab;
  return "all";
}

function normalizeSort(value: string | undefined): VendorSort {
  if (value === "oldest" || value === "updated") {
    return value;
  }
  return "newest";
}

function buildManageNextPath(
  tab: ManageTab,
  expandedVendorId: string | null,
  query: string,
  sort: VendorSort,
) {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (query) {
    params.set("q", query);
  }
  params.set("sort", sort);
  if (expandedVendorId) {
    params.set("vendor", expandedVendorId);
  }
  return `/manage?${params.toString()}`;
}

function buildManageTabHref(tab: ManageTab, query: string, sort: VendorSort) {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (query) {
    params.set("q", query);
  }
  params.set("sort", sort);
  return `/manage?${params.toString()}`;
}

function buildManageVendorHref({
  tab,
  vendorId,
  query,
  sort,
}: {
  tab: ManageTab;
  vendorId: string;
  query: string;
  sort: VendorSort;
}) {
  const params = new URLSearchParams();
  params.set("tab", tab);
  params.set("vendor", vendorId);
  if (query) {
    params.set("q", query);
  }
  params.set("sort", sort);
  return `/manage?${params.toString()}`;
}

function filterAndSortVendors(
  vendors: AdminVendorSubmission[],
  options: { query: string; sort: VendorSort },
) {
  const query = options.query.toLowerCase();
  const filtered = query
    ? vendors.filter((vendor) =>
        vendor.businessName.toLowerCase().includes(query),
      )
    : vendors;

  return [...filtered].sort((left, right) => {
    if (options.sort === "oldest") {
      return toMs(left.createdAt) - toMs(right.createdAt);
    }
    if (options.sort === "updated") {
      return (
        toMs(right.updatedAt ?? right.createdAt) -
        toMs(left.updatedAt ?? left.createdAt)
      );
    }
    return toMs(right.createdAt) - toMs(left.createdAt);
  });
}

function toMs(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

type AdminVendorSubmission = {
  id: string;
  userId: string | null;
  businessName: string;
  ownerName: string | null;
  email: string | null;
  phone: string | null;
  category: string;
  customCategory: string | null;
  location: string;
  priceRange: string | null;
  status: string | null;
  primarySocialLink: string | null;
  website: string | null;
  adminNotes: string | null;
  governmentIdSignedUrl: string | null;
  cacCertificateSignedUrl: string | null;
  portfolioImages: string[];
  createdAt: string;
  updatedAt: string | null;
};

async function getManageVendors(): Promise<AdminVendorSubmission[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("vendors")
    .select(`
      id,
      user_id,
      business_name,
      owner_name,
      category,
      custom_category,
      location,
      price_range,
      status,
      primary_social_link,
      website,
      admin_notes,
      government_id_url,
      cac_certificate_url,
      created_at,
      updated_at,
      users(email, phone),
      vendor_portfolio(image_url, sort_order)
    `)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return Promise.all(
    data.map(async (item) => {
      const relatedUser = Array.isArray(item.users) ? item.users[0] : item.users;
      const portfolioImages =
        item.vendor_portfolio
          ?.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((entry) => entry.image_url) ?? [];

      let governmentIdSignedUrl: string | null = null;
      let cacCertificateSignedUrl: string | null = null;
      if (item.government_id_url) {
        const signed = await supabase.storage
          .from("vendor-documents")
          .createSignedUrl(item.government_id_url, 60 * 60);
        governmentIdSignedUrl = signed.data?.signedUrl ?? null;
      }
      if (item.cac_certificate_url) {
        const signed = await supabase.storage
          .from("vendor-documents")
          .createSignedUrl(item.cac_certificate_url, 60 * 60);
        cacCertificateSignedUrl = signed.data?.signedUrl ?? null;
      }

      return {
        id: item.id,
        userId: item.user_id ?? null,
        businessName: item.business_name,
        ownerName: item.owner_name ?? null,
        email: relatedUser?.email ?? null,
        phone: relatedUser?.phone ?? null,
        category: item.category,
        customCategory: item.custom_category ?? null,
        location: item.location,
        priceRange: item.price_range ?? null,
        status: item.status ?? null,
        primarySocialLink: item.primary_social_link ?? null,
        website: item.website ?? null,
        adminNotes: item.admin_notes ?? null,
        governmentIdSignedUrl,
        cacCertificateSignedUrl,
        portfolioImages,
        createdAt: item.created_at,
        updatedAt: item.updated_at ?? null,
      } satisfies AdminVendorSubmission;
    }),
  );
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

async function getManageUsers(): Promise<ManageUserSummary[]> {
  const adminClient = createSupabaseAdminClient();
  if (!adminClient) {
    console.error("[manage:getManageUsers] missing service-role admin client");
    return [];
  }

  const [{ data: publicUsers, error: publicUsersError }, { data: authUsers, error: authUsersError }] =
    await Promise.all([
      adminClient
        .from("users")
        .select("id, email, full_name, phone, role, created_at")
        .order("created_at", { ascending: false }),
      adminClient
        .schema("auth")
        .from("users")
        .select("id, email_confirmed_at"),
    ]);

  if (publicUsersError) {
    console.error("[manage:getManageUsers] failed to fetch public.users", publicUsersError);
    return [];
  }

  if (authUsersError) {
    console.error("[manage:getManageUsers] failed to fetch auth.users", authUsersError);
  }

  const confirmationByUserId = new Map<string, string | null>(
    (authUsers ?? []).map((row) => [row.id, row.email_confirmed_at ?? null]),
  );

  return (publicUsers ?? []).map((row) => {
    const emailConfirmedAt = confirmationByUserId.get(row.id) ?? null;
    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name ?? null,
      phone: row.phone ?? null,
      role: row.role,
      createdAt: row.created_at ?? null,
      emailConfirmedAt,
      confirmationStatus: emailConfirmedAt ? "confirmed" : "unconfirmed",
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
