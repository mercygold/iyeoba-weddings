import Link from "next/link";

import {
  createVendorInquiryAction,
  savePlannerProgressItemAction,
  updatePlannerInquiryStatusAction,
} from "@/app/planner/actions";
import { FlashQueryCleaner } from "@/components/flash-query-cleaner";
import { MainNav } from "@/components/main-nav";
import { VendorProfileAvatarLink } from "@/components/vendor-profile-avatar-link";
import { requirePlannerProfile } from "@/lib/auth";
import {
  buildWhatsAppLink,
  type PlannerInquiry,
  getPlannerInquiries,
  getPlannerSavedVendors,
} from "@/lib/inquiries";
import { getPlannerInputFromSearchParams } from "@/lib/planner";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getVendorsBySlugs } from "@/lib/vendors";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProgressStatus = "not_started" | "in_progress" | "completed";
type ProgressItem = {
  key: string;
  label: string;
  status: ProgressStatus;
};

const progressCatalog = [
  "Venue",
  "Decor",
  "Catering",
  "Drinks",
  "MC",
  "Alaga",
  "Photography",
  "Videography",
  "DJ",
  "Live Band",
  "Bridal Wear",
  "Makeup",
  "Cake",
  "Transportation",
];

export default async function PlannerDashboardPage(props: {
  searchParams: SearchParams;
}) {
  const profile = await requirePlannerProfile("/planner/dashboard");
  const searchParams = await props.searchParams;
  const plannerInput = getPlannerInputFromSearchParams(searchParams);

  const message =
    typeof searchParams.message === "string" ? searchParams.message : undefined;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : undefined;
  const feedbackError = message ? undefined : error;

  const weddingOverview = await getWeddingOverview(profile.id, plannerInput);
  const progressItems = await getPlannerProgressItems(profile.id);

  const dbSavedVendors = await getPlannerSavedVendors(profile.id);
  const legacySavedVendors = await getVendorsBySlugs(
    typeof searchParams.saved === "string"
      ? [searchParams.saved]
      : Array.isArray(searchParams.saved)
        ? searchParams.saved
        : [],
  );
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
          priceRange: vendor.priceRange ?? "Contact vendor",
        },
      })),
  ].filter(
    (item, index, array) =>
      array.findIndex((entry) => entry.vendor.id === item.vendor.id) === index,
  );

  const inquiries = await getPlannerInquiries(profile.id);
  const conversationsByVendor = buildConversationsByVendor(inquiries);

  const threadVendorId =
    typeof searchParams.thread === "string" ? searchParams.thread : null;
  const selectedVendor =
    savedVendors.find((item) => item.vendor.id === threadVendorId)?.vendor ?? null;
  const selectedConversation = threadVendorId
    ? conversationsByVendor.get(threadVendorId) ?? null
    : null;

  const compareIds = parseCompareIds(searchParams.compare);
  const compareVendors = savedVendors
    .map((item) => item.vendor)
    .filter((vendor) => compareIds.includes(vendor.id));

  const availableProgressItems = progressCatalog.filter(
    (label) => !progressItems.some((item) => item.label.toLowerCase() === label.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6effa_0%,#fcf8ff_18%,#ffffff_48%,#ffffff_100%)]">
      <FlashQueryCleaner />
      <MainNav />
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 md:px-10 lg:px-12 lg:py-12">
        <section className="surface-card rounded-[2rem] p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand-primary)]">
            Wedding Overview
          </p>
          <h1 className="font-display mt-3 text-4xl text-[color:var(--color-ink)]">
            {weddingOverview.culture} {weddingOverview.weddingType}
          </h1>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Culture" value={weddingOverview.culture} />
            <MetricCard label="Wedding type" value={weddingOverview.weddingType} />
            <MetricCard label="Location" value={weddingOverview.location} />
            <MetricCard label="Guest count" value={String(weddingOverview.guestCount)} />
            <MetricCard label="Budget" value={weddingOverview.budgetRange} />
          </div>
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

        <section className="surface-card rounded-[2rem] p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand-primary)]">
                Planning Progress
              </p>
              <h2 className="font-display mt-2 text-3xl text-[color:var(--color-ink)]">
                Track your planning items
              </h2>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
              <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">
                {progressItems.filter((item) => item.status === "not_started").length} not started
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                {progressItems.filter((item) => item.status === "in_progress").length} in progress
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                {progressItems.filter((item) => item.status === "completed").length} completed
              </span>
            </div>
          </div>

          <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[rgba(106,62,124,0.12)]">
            <div
              className="h-full rounded-full bg-[color:var(--color-brand-primary)]"
              style={{
                width: `${Math.round((progressItems.filter((item) => item.status === "completed").length / Math.max(progressItems.length, 1)) * 100)}%`,
              }}
            />
          </div>

          <div className="mt-6 grid gap-3">
            {progressItems.map((item) => (
              <form key={item.key} action={savePlannerProgressItemAction} className="surface-soft flex flex-wrap items-center justify-between gap-3 rounded-[1.3rem] px-4 py-3">
                <input type="hidden" name="nextPath" value="/planner/dashboard" />
                <input type="hidden" name="itemKey" value={item.key} />
                <input type="hidden" name="itemLabel" value={item.label} />
                <p className="text-sm font-medium text-[color:var(--color-ink)]">{item.label}</p>
                <div className="flex items-center gap-2">
                  <select
                    name="status"
                    defaultValue={item.status}
                    className="field-input rounded-[999px] px-3 py-1.5 text-xs font-semibold"
                  >
                    <option value="not_started">Not started</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button type="submit" className="btn-secondary px-3 py-1.5 text-sm">
                    Save
                  </button>
                </div>
              </form>
            ))}
          </div>

          <form action={savePlannerProgressItemAction} className="mt-5 flex flex-wrap items-end gap-3">
            <input type="hidden" name="nextPath" value="/planner/dashboard" />
            <div className="min-w-[220px] flex-1">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                Add planning item
              </label>
              <select
                name="itemLabel"
                className="field-input mt-2 rounded-[1rem] px-3 py-2 text-sm"
                defaultValue={availableProgressItems[0] ?? ""}
              >
                {availableProgressItems.length ? (
                  availableProgressItems.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))
                ) : (
                  <option value="">All catalog items added</option>
                )}
              </select>
            </div>
            <div className="min-w-[220px] flex-1">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                Or add custom item
              </label>
              <input
                name="customItemLabel"
                type="text"
                placeholder="e.g. Traditional intro outfit"
                className="field-input mt-2 rounded-[1rem] px-3 py-2 text-sm"
              />
            </div>
            <input type="hidden" name="itemKey" value="" />
            <input type="hidden" name="status" value="not_started" />
            <button
              type="submit"
              disabled={!availableProgressItems.length}
              className="btn-primary px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add Item
            </button>
          </form>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="surface-card rounded-[2rem] p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand-primary)]">
              Saved Vendors
            </p>
            <h2 className="font-display mt-2 text-3xl text-[color:var(--color-ink)]">
              Your shortlist
            </h2>
            {savedVendors.length ? (
              <div className="mt-5 grid gap-4">
                {savedVendors.map((saved) => {
                  const conversation = conversationsByVendor.get(saved.vendor.id) ?? null;
                  const compareActive = compareIds.includes(saved.vendor.id);
                  const toggleCompareHref = buildCompareHref(
                    saved.vendor.id,
                    compareIds,
                    compareActive,
                    threadVendorId,
                  );

                  return (
                    <div key={saved.id} className="surface-soft rounded-[1.5rem] p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display text-2xl text-[color:var(--color-ink)]">
                            {saved.vendor.businessName}
                          </h3>
                          <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                            {saved.vendor.category} · {saved.vendor.location}
                          </p>
                          <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                            Starting price: {saved.vendor.priceRange || "Contact vendor"}
                          </p>
                          <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                            Inquiry status: {conversation ? formatStatus(conversation.threadStatus) : "Not started"}
                          </p>
                        </div>
                        <VendorProfileAvatarLink
                          href={`/vendors/${saved.vendor.slug}`}
                          businessName={saved.vendor.businessName}
                          imageUrl={saved.vendor.imageUrl}
                          sizeClassName="h-[78px] w-[78px]"
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={`/vendors/${saved.vendor.slug}`} className="btn-secondary px-3 py-1.5 text-sm">
                          View Profile
                        </Link>
                        {conversation ? (
                          <Link href={`/planner/dashboard?thread=${encodeURIComponent(saved.vendor.id)}`} className="btn-primary px-3 py-1.5 text-sm">
                            Open Conversation
                          </Link>
                        ) : (
                          <form action={createVendorInquiryAction}>
                            <input type="hidden" name="vendorId" value={saved.vendor.id} />
                            <input type="hidden" name="vendorSlug" value={saved.vendor.slug} />
                            <input type="hidden" name="contactMethod" value="planner_saved_vendor" />
                            <input type="hidden" name="nextPath" value="/planner/dashboard" />
                            <input type="hidden" name="message" value="" />
                            <button type="submit" className="btn-primary px-3 py-1.5 text-sm">
                              Start Inquiry
                            </button>
                          </form>
                        )}
                        {buildWhatsAppLink(
                          saved.vendor.whatsapp,
                          saved.vendor.businessName,
                        ) ? (
                          <a
                            href={buildWhatsAppLink(saved.vendor.whatsapp, saved.vendor.businessName)!}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary px-3 py-1.5 text-sm"
                          >
                            Contact on WhatsApp
                          </a>
                        ) : null}
                        <Link href={toggleCompareHref} className="btn-secondary px-3 py-1.5 text-sm">
                          {compareActive ? "Remove from Compare" : "Add to Compare"}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)]">
                Save vendors first to manage conversations and comparisons here.
              </p>
            )}
          </article>

          <article className="surface-card rounded-[2rem] p-7" id="conversation-thread">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand-primary)]">
              Conversation Thread
            </p>
            <h2 className="font-display mt-2 text-3xl text-[color:var(--color-ink)]">
              {selectedVendor?.businessName || "Select a saved vendor"}
            </h2>
            {selectedVendor ? (
              <>
                <p className="mt-2 text-sm text-[color:var(--color-muted)]">
                  {selectedVendor.category} · {selectedVendor.location}
                </p>
                <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                  {selectedConversation?.messages.length ? (
                    selectedConversation.messages.map((item) => (
                      <div
                        key={item.id}
                        className={`flex ${item.senderRole === "planner" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[90%] rounded-[1.25rem] px-4 py-3 ${
                            item.senderRole === "planner"
                              ? "bg-[color:var(--color-brand-primary)] text-white"
                              : "bg-[rgba(106,62,124,0.08)] text-[color:var(--color-ink)]"
                          }`}
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">
                            {item.senderLabel}
                          </p>
                          <p className="mt-1 text-sm leading-6">{item.body}</p>
                          {formatDateTime(item.createdAt) ? (
                            <p className="mt-1 text-[11px] opacity-75">
                              {formatDateTime(item.createdAt)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[color:var(--color-muted)]">
                      No messages yet. Send your first note to this vendor.
                    </p>
                  )}
                </div>

                <form action={createVendorInquiryAction} className="mt-4 grid gap-3">
                  <input type="hidden" name="vendorId" value={selectedVendor.id} />
                  <input type="hidden" name="vendorSlug" value={selectedVendor.slug} />
                  <input type="hidden" name="contactMethod" value="planner_thread" />
                  <input type="hidden" name="nextPath" value={`/planner/dashboard?thread=${encodeURIComponent(selectedVendor.id)}&compare=${encodeURIComponent(compareIds.join(","))}`} />
                  <textarea
                    name="message"
                    rows={3}
                    placeholder="Write your message to this vendor."
                    className="field-input min-h-[92px] rounded-[1.1rem] text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button type="submit" className="btn-primary px-4 py-2">
                      Send Message
                    </button>
                    {buildWhatsAppLink(selectedVendor.whatsapp, selectedVendor.businessName) ? (
                      <a
                        href={buildWhatsAppLink(selectedVendor.whatsapp, selectedVendor.businessName)!}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary px-4 py-2"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                  </div>
                </form>
                {selectedConversation ? (
                  <form action={updatePlannerInquiryStatusAction} className="mt-3 flex flex-wrap gap-2">
                    <input type="hidden" name="inquiryId" value={selectedConversation.id} />
                    <input type="hidden" name="nextPath" value={`/planner/dashboard?thread=${encodeURIComponent(selectedVendor.id)}&compare=${encodeURIComponent(compareIds.join(","))}`} />
                    <select
                      name="status"
                      defaultValue={selectedConversation.threadStatus}
                      className="field-input rounded-[999px] px-3 py-1.5 text-sm"
                    >
                      <option value="open">Open</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                      <option value="archived">Archived</option>
                    </select>
                    <button type="submit" className="btn-secondary px-3 py-1.5 text-sm">
                      Update Status
                    </button>
                  </form>
                ) : null}
              </>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)]">
                Open a saved vendor to view or continue your conversation thread.
              </p>
            )}
          </article>
        </section>

        <section className="surface-card rounded-[2rem] p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand-primary)]">
            Compare Vendors
          </p>
          <h2 className="font-display mt-2 text-3xl text-[color:var(--color-ink)]">
            Side-by-side shortlist
          </h2>
          {compareVendors.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full divide-y divide-[rgba(106,62,124,0.12)] text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
                    <th className="px-3 py-2">Vendor</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2">Starting Price</th>
                    <th className="px-3 py-2">Response Status</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(106,62,124,0.1)]">
                  {compareVendors.map((vendor) => {
                    const responseStatus = conversationsByVendor.get(vendor.id)?.threadStatus ?? "not_started";
                    return (
                      <tr key={vendor.id}>
                        <td className="px-3 py-3 font-semibold text-[color:var(--color-ink)]">{vendor.businessName}</td>
                        <td className="px-3 py-3 text-[color:var(--color-muted)]">{vendor.category}</td>
                        <td className="px-3 py-3 text-[color:var(--color-muted)]">{vendor.location}</td>
                        <td className="px-3 py-3 text-[color:var(--color-muted)]">{vendor.priceRange || "Contact vendor"}</td>
                        <td className="px-3 py-3 text-[color:var(--color-muted)]">{formatStatus(responseStatus)}</td>
                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value=""
                            readOnly
                            placeholder="Notes placeholder"
                            className="field-input w-full rounded-[0.8rem] px-3 py-2 text-xs"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)]">
              Add vendors to compare from your saved vendor cards.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-soft rounded-[1.2rem] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-[color:var(--color-ink)]">
        {value}
      </p>
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

function formatStatus(value: string) {
  return value.replace(/_/g, " ");
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseCompareIds(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildCompareHref(
  vendorId: string,
  compareIds: string[],
  isActive: boolean,
  threadVendorId: string | null,
) {
  const next = isActive
    ? compareIds.filter((id) => id !== vendorId)
    : [...new Set([...compareIds, vendorId])];
  const params = new URLSearchParams();
  if (threadVendorId) {
    params.set("thread", threadVendorId);
  }
  if (next.length) {
    params.set("compare", next.join(","));
  }
  return `/planner/dashboard${params.size ? `?${params.toString()}` : ""}`;
}

function buildConversationsByVendor(inquiries: PlannerInquiry[]) {
  const map = new Map<
    string,
    {
      id: string;
      threadStatus: PlannerInquiry["threadStatus"];
      messages: PlannerInquiry["messages"];
      createdAt: string;
    }
  >();

  for (const inquiry of inquiries) {
    const existing = map.get(inquiry.vendor.id);
    if (!existing) {
      map.set(inquiry.vendor.id, {
        id: inquiry.id,
        threadStatus: inquiry.threadStatus,
        messages: inquiry.messages,
        createdAt: inquiry.createdAt,
      });
      continue;
    }

    const merged = [...existing.messages, ...inquiry.messages]
      .filter((message, index, array) =>
        array.findIndex((entry) => entry.id === message.id) === index,
      )
      .sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt));

    const pickInquiry =
      toTime(inquiry.createdAt) >= toTime(existing.createdAt) ? inquiry.id : existing.id;

    map.set(inquiry.vendor.id, {
      id: pickInquiry,
      threadStatus: existing.threadStatus === "archived" ? "archived" : inquiry.threadStatus,
      messages: merged,
      createdAt: toTime(inquiry.createdAt) >= toTime(existing.createdAt) ? inquiry.createdAt : existing.createdAt,
    });
  }

  return map;
}

function toTime(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

async function getWeddingOverview(
  userId: string,
  fallback: {
    culture: string;
    weddingType: string;
    location: string;
    guestCount: number;
    budgetRange: string;
  },
) {
  const supabase = await createSupabaseServerClient();
  const { data: weddings } = await supabase
    .from("weddings")
    .select("culture, wedding_type, location, guest_count, budget_range")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const data = Array.isArray(weddings) ? weddings[0] ?? null : null;

  return {
    culture: data?.culture ?? fallback.culture,
    weddingType: data?.wedding_type ?? fallback.weddingType,
    location: data?.location ?? fallback.location,
    guestCount:
      typeof data?.guest_count === "number"
        ? data.guest_count
        : fallback.guestCount,
    budgetRange: data?.budget_range ?? fallback.budgetRange,
  };
}

async function getPlannerProgressItems(userId: string): Promise<ProgressItem[]> {
  const defaults: ProgressItem[] = progressCatalog.map((label) => ({
    key: slugify(label),
    label,
    status: "not_started",
  }));

  const supabase = await createSupabaseServerClient();
  const { data: blueprints, error } = await supabase
    .from("blueprints")
    .select("checklist_json")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const data = Array.isArray(blueprints) ? blueprints[0] ?? null : null;

  if (error || !Array.isArray(data?.checklist_json)) {
    return defaults;
  }

  const loaded = data.checklist_json
    .filter(
      (item): item is { key?: string; label?: string; status?: string } =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      key: String(item.key ?? ""),
      label: String(item.label ?? ""),
      status:
        item.status === "completed" || item.status === "in_progress"
          ? item.status
          : "not_started",
    }))
    .filter((item) => item.key && item.label) as ProgressItem[];

  if (!loaded.length) {
    return defaults;
  }

  return loaded;
}
