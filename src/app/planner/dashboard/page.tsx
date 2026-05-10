import Link from "next/link";

import {
  createVendorInquiryAction,
  deleteWeddingEventAction,
  saveWeddingEventAction,
  updatePlannerInquiryStatusAction,
} from "@/app/planner/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { CommunicationRealtimeSync } from "@/components/communication-realtime-sync";
import { DashboardCollapsibleSection } from "@/components/dashboard-collapsible-section";
import { FlashQueryCleaner } from "@/components/flash-query-cleaner";
import { MainNav } from "@/components/main-nav";
import { PlannerBudgetFields } from "@/components/planner-budget-fields";
import { PlannerInspirationFeed } from "@/components/planner-inspiration-feed";
import { PlannerConversationCenter } from "@/components/planner-conversation-center";
import {
  GuestListSection,
  PlannerProgressSection,
  WeddingBudgetSection,
  type PlannerGuest,
  type PlannerGuestInvite,
} from "@/components/planner-dashboard-inline-tools";
import { VendorProfileAvatarLink } from "@/components/vendor-profile-avatar-link";
import { requirePlannerProfile } from "@/lib/auth";
import {
  buildWhatsAppLink,
  type PlannerInquiry,
  getPlannerInquiries,
  getPlannerSavedVendors,
} from "@/lib/inquiries";
import { cultures, weddingTypes } from "@/lib/planner";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getHomepageTikTokSectionData } from "@/lib/tiktok";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ProgressStatus = "not_done" | "ongoing" | "done";
type ProgressItem = {
  key: string;
  label: string;
  status: ProgressStatus;
};
type PlannerBudgetCategory = {
  id: string;
  name: string;
  amount: number | null;
  percentage: number | null;
  percentageMin: number | null;
  percentageMax: number | null;
  amountMin: number | null;
  amountMax: number | null;
  note: string;
  source: "ai" | "manual";
};
type PlannerBudget = {
  currency: "NGN" | "USD" | "GBP" | "EUR" | "UNKNOWN";
  totalBudget: number | null;
  allocatedAmount: number | null;
  remainingAmount: number | null;
  bufferPercentage: number | null;
  categories: PlannerBudgetCategory[];
  notes: string[];
  source: "ai" | "manual";
  updatedAt: string | null;
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
  const supabase = await createSupabaseServerClient();
  const ownerId = await resolvePlannerOwnerIdForDashboard(supabase, profile.id);

  const message =
    typeof searchParams.message === "string" ? searchParams.message : undefined;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : undefined;
  const feedbackError = message ? undefined : error;

  const { weddingEvents, loadError: weddingEventsLoadError } = await getWeddingEvents(ownerId);
  const requestedWeddingId =
    typeof searchParams.weddingId === "string" ? searchParams.weddingId : null;
  const selectedWeddingId =
    requestedWeddingId && weddingEvents.some((event) => event.id === requestedWeddingId)
      ? requestedWeddingId
      : weddingEvents[0]?.id ?? null;
  const selectedWeddingEvent =
    weddingEvents.find((event) => event.id === selectedWeddingId) ?? null;
  const editWeddingId =
    typeof searchParams.editWedding === "string" ? searchParams.editWedding : null;
  const showAddWeddingForm = searchParams.addWedding === "1";
  const progressItems = await getPlannerProgressItems(ownerId, selectedWeddingId);
  const plannerBudget = await getPlannerBudget(ownerId, selectedWeddingId);
  const plannerGuests = await getPlannerGuests(ownerId, selectedWeddingId);
  const plannerGuestInvites = await getPlannerGuestInvites(ownerId, selectedWeddingId);

  const savedVendors = await getPlannerSavedVendors(ownerId);

  const inquiries = await getPlannerInquiries(ownerId);
  const conversationsByVendor = buildConversationsByVendor(inquiries);
  const inquiryVendorMap = new Map(
    inquiries.map((inquiry) => [inquiry.vendor.id, inquiry.vendor]),
  );

  const threadVendorId =
    typeof searchParams.thread === "string" ? searchParams.thread : null;
  const plannerConversations = buildPlannerConversationItems(
    conversationsByVendor,
    savedVendors,
    inquiryVendorMap,
  );

  const compareIds = parseCompareIds(searchParams.compare);
  const compareVendors = savedVendors
    .map((item) => item.vendor)
    .filter((vendor) => compareIds.includes(vendor.id));
  const { latestTikToks, topTikToks } = getHomepageTikTokSectionData();
  const inspirationItems = [...latestTikToks, ...topTikToks].slice(0, 8);
  console.log("Planner dashboard data source summary", {
    plannerUserId: profile.id,
    authOwnerId: ownerId,
    ownerIdMismatch: ownerId !== profile.id,
    readSources: {
      weddingOverview: "weddings",
      progressItems: "blueprints.checklist_json",
      selectedWeddingId,
      savedVendors: "saved_vendors",
      inquiries: "leads + lead_messages",
    },
    counts: {
      progressItems: progressItems.length,
      guests: plannerGuests.length,
      guestInvites: plannerGuestInvites.length,
      savedVendors: savedVendors.length,
      inquiries: inquiries.length,
      conversationsByVendor: conversationsByVendor.size,
    },
    ids: {
      savedVendorIds: savedVendors.map((item) => item.vendor.id),
      inquiryVendorIds: inquiries.map((item) => item.vendor.id),
      conversationVendorIds: [...conversationsByVendor.keys()],
      selectedThreadVendorId: threadVendorId,
      selectedConversationId:
        (threadVendorId && conversationsByVendor.get(threadVendorId)?.id) ?? null,
    },
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#FAF9F7_0%,#ffffff_46%,#ffffff_100%)]">
      <div className="wedding-floral-accent-gold absolute -right-16 top-32 h-56 w-56 opacity-[0.12]" />
      <div className="wedding-floral-accent-gold absolute -left-20 bottom-16 h-52 w-52 opacity-[0.1]" />
      <FlashQueryCleaner />
      <CommunicationRealtimeSync role="planner" plannerUserId={ownerId} />
      <MainNav />
      <main className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 md:px-10 lg:px-12 lg:py-12">
        <section className="surface-card rounded-[2rem] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand-primary)]">
              Wedding Overview
            </p>
            <Link href="/planner/dashboard?addWedding=1" className="btn-primary px-4 py-2 text-sm">
              Add wedding event
            </Link>
          </div>
          {weddingEventsLoadError ? (
            <div className="mt-4 rounded-[1.35rem] border border-red-200 bg-red-50 p-5 sm:p-6">
              <h2 className="font-display text-2xl text-red-700 sm:text-3xl">
                We could not load your wedding events right now
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-red-700/90 sm:text-base">
                Try refreshing this page. Your saved events were not loaded from the database in this request.
              </p>
            </div>
          ) : weddingEvents.length ? (
            <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(106,62,124,0.28)_transparent] md:grid md:overflow-visible md:pb-0 md:[scrollbar-width:auto] md:[scrollbar-color:auto]">
              {weddingEvents.map((event) => {
                const isEditing = editWeddingId === event.id;
                return (
                  <article key={event.id} className="surface-soft min-w-[88%] snap-start rounded-[1.35rem] p-4 sm:min-w-0 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-display text-2xl text-[color:var(--color-ink)]">
                        {event.eventName || `${event.culture} ${event.weddingType}`.trim() || "Wedding event"}
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/planner/dashboard?editWedding=${encodeURIComponent(event.id)}`}
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          Edit
                        </Link>
                        <Link
                          href={`/planner/dashboard?weddingId=${encodeURIComponent(event.id)}`}
                          className={event.id === selectedWeddingId ? "btn-primary px-3 py-1.5 text-xs" : "btn-secondary px-3 py-1.5 text-xs"}
                        >
                          {event.id === selectedWeddingId ? "Selected" : "Use"}
                        </Link>
                        <form action={deleteWeddingEventAction}>
                          <input type="hidden" name="weddingId" value={event.id} />
                          <input type="hidden" name="nextPath" value="/planner/dashboard" />
                          <ConfirmSubmitButton
                            type="submit"
                            confirmMessage="Delete this wedding event? This action cannot be undone."
                            className="btn-secondary px-3 py-1.5 text-xs"
                          >
                            Delete
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </div>

                    {isEditing ? (
                      <form action={saveWeddingEventAction} className="mt-4 grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="weddingId" value={event.id} />
                        <input type="hidden" name="nextPath" value="/planner/dashboard" />
                        <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)] sm:col-span-2">
                          Event title
                          <input
                            name="eventName"
                            defaultValue={event.eventName}
                            placeholder="Edo Traditional wedding"
                            className="field-input rounded-[1rem]"
                          />
                        </label>
                        <SelectInput name="culture" label="Culture" options={cultures} defaultValue={event.culture} />
                        <SelectInput
                          name="weddingType"
                          label="Wedding type"
                          options={weddingTypes}
                          defaultValue={event.weddingType}
                        />
                        <PlannerBudgetFields
                          defaultLocation={event.location}
                          defaultBudgetCurrency={event.budgetCurrency}
                          defaultBudgetRange={event.budgetRange}
                          locationFieldClassName="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]"
                          currencyFieldClassName="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]"
                          budgetFieldClassName="sm:col-span-2 grid gap-2 text-sm font-medium text-[color:var(--color-ink)]"
                        />
                        <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
                          Guest count
                          <input
                            type="number"
                            min={1}
                            name="guestCount"
                            required
                            defaultValue={String(event.guestCount)}
                            className="field-input rounded-[1rem]"
                          />
                        </label>
                        <div className="sm:col-span-2 flex flex-wrap gap-2">
                          <button type="submit" className="btn-primary px-4 py-2 text-sm">
                            Save
                          </button>
                          <Link href="/planner/dashboard" className="btn-secondary px-4 py-2 text-sm">
                            Cancel
                          </Link>
                        </div>
                      </form>
                    ) : (
                      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                        <MetricCard label="Culture" value={event.culture} />
                        <MetricCard label="Wedding type" value={event.weddingType} />
                        <MetricCard label="Location" value={event.location} />
                        <MetricCard label="Guest count" value={String(event.guestCount)} />
                        <MetricCard
                          label="Budget"
                          value={`${event.budgetCurrency} · ${event.budgetRange}`}
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 surface-soft rounded-[1.35rem] p-5 sm:p-6">
              <h2 className="font-display text-2xl text-[color:var(--color-ink)] sm:text-3xl">
                Set up your first wedding event
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[color:var(--color-muted)] sm:text-base">
                Add your culture, wedding type, location, guest count, and budget to personalize your planner.
              </p>
            </div>
          )}
          {showAddWeddingForm ? (
            <form action={saveWeddingEventAction} className="mt-4 surface-soft grid gap-3 rounded-[1.35rem] p-4 sm:grid-cols-2 sm:p-5">
              <input type="hidden" name="nextPath" value="/planner/dashboard" />
              <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)] sm:col-span-2">
                Event title
                <input
                  name="eventName"
                  placeholder="White wedding"
                  className="field-input rounded-[1rem]"
                />
              </label>
              <SelectInput name="culture" label="Culture" options={cultures} />
              <SelectInput name="weddingType" label="Wedding type" options={weddingTypes} />
              <PlannerBudgetFields
                locationFieldClassName="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]"
                currencyFieldClassName="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]"
                budgetFieldClassName="sm:col-span-2 grid gap-2 text-sm font-medium text-[color:var(--color-ink)]"
              />
              <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
                Guest count
                <input
                  type="number"
                  min={1}
                  name="guestCount"
                  required
                  placeholder="e.g. 250"
                  className="field-input rounded-[1rem]"
                />
              </label>
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <button type="submit" className="btn-primary px-4 py-2 text-sm">
                  Save wedding event
                </button>
                <Link href="/planner/dashboard" className="btn-secondary px-4 py-2 text-sm">
                  Cancel
                </Link>
              </div>
            </form>
          ) : null}
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

        <PlannerInspirationFeed items={inspirationItems} />

        {selectedWeddingEvent ? (
          <p className="surface-soft rounded-[1.25rem] px-4 py-3 text-sm text-[color:var(--color-brand-primary)]">
            Showing planner tools for {selectedWeddingEvent.eventName || `${selectedWeddingEvent.culture} ${selectedWeddingEvent.weddingType}`.trim()}.
          </p>
        ) : null}

        <WeddingBudgetSection
          key={`budget-${selectedWeddingId ?? "general"}`}
          initialBudget={plannerBudget}
          weddingId={selectedWeddingId}
        />

        <PlannerProgressSection
          key={`progress-${selectedWeddingId ?? "general"}`}
          initialItems={progressItems}
          catalog={progressCatalog}
          weddingId={selectedWeddingId}
        />

        <GuestListSection
          key={`guests-${selectedWeddingId ?? "general"}`}
          initialGuests={plannerGuests}
          initialInvites={plannerGuestInvites}
          weddingId={selectedWeddingId}
          wedding={
            selectedWeddingEvent
              ? {
                  title:
                    selectedWeddingEvent.eventName ||
                    `${selectedWeddingEvent.culture} ${selectedWeddingEvent.weddingType}`.trim() ||
                    "Wedding event",
                  weddingType: selectedWeddingEvent.weddingType,
                  location: selectedWeddingEvent.location,
                  weddingDate: selectedWeddingEvent.weddingDate,
                }
              : null
          }
        />

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <DashboardCollapsibleSection
            eyebrow="Saved Vendors"
            title="Your shortlist"
            subtitle="Review saved vendors, compare options, and start inquiries."
            defaultOpen={false}
            storageKey="iyeoba:planner-dashboard:saved-vendors"
            className="p-5"
          >
            {savedVendors.length ? (
              <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(106,62,124,0.28)_transparent] sm:grid sm:overflow-visible sm:pb-0 sm:[scrollbar-width:auto] sm:[scrollbar-color:auto] sm:gap-4">
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
                    <div key={saved.id} className="surface-soft min-w-[88%] snap-start rounded-[1.5rem] p-4 sm:min-w-0 sm:p-5">
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
                          sizeClassName="h-[64px] w-[64px] sm:h-[78px] sm:w-[78px]"
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
                            <input
                              type="hidden"
                              name="nextPath"
                              value={`/planner/dashboard?thread=${encodeURIComponent(saved.vendor.id)}`}
                            />
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
          </DashboardCollapsibleSection>

          <PlannerConversationCenter
            conversations={plannerConversations}
            compareIds={compareIds}
            initialVendorId={threadVendorId}
            createVendorInquiryAction={createVendorInquiryAction}
            updatePlannerInquiryStatusAction={updatePlannerInquiryStatusAction}
          />
        </section>

        <section className="surface-card rounded-[2rem] p-5 sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand-primary)]">
            Compare Vendors
          </p>
          <h2 className="font-display mt-2 text-2xl text-[color:var(--color-ink)] sm:text-3xl">
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
                    const responseStatus = conversationsByVendor.get(vendor.id)?.threadStatus ?? "open";
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

function buildPlannerConversationItems(
  conversationsByVendor: Map<
    string,
    {
      id: string;
      threadStatus: PlannerInquiry["threadStatus"];
      messages: PlannerInquiry["messages"];
      createdAt: string;
    }
  >,
  savedVendors: {
    vendor: {
      id: string;
      slug: string;
      businessName: string;
      category: string;
      location: string;
      whatsapp: string | null;
      contactEmail: string | null;
      imageUrl: string;
    };
  }[],
  inquiryVendorMap: Map<
    string,
    {
      id: string;
      slug: string;
      businessName: string;
      category: string;
      location: string;
      whatsapp: string | null;
      contactEmail: string | null;
      imageUrl: string;
    }
  >,
) {
  const savedVendorMap = new Map(savedVendors.map((item) => [item.vendor.id, item.vendor]));

  return [...conversationsByVendor.entries()]
    .map(([vendorId, conversation]) => {
      const vendor =
        savedVendorMap.get(vendorId) ?? inquiryVendorMap.get(vendorId) ?? null;

      if (!vendor) {
        return null;
      }

      return {
        id: conversation.id,
        threadStatus: conversation.threadStatus,
        createdAt: conversation.createdAt,
        vendor,
        messages: conversation.messages,
      };
    })
    .filter(Boolean) as {
    id: string;
    threadStatus: PlannerInquiry["threadStatus"];
    createdAt: string;
    vendor: {
      id: string;
      slug: string;
      businessName: string;
      category: string;
      location: string;
      whatsapp: string | null;
      contactEmail: string | null;
      imageUrl: string;
    };
    messages: PlannerInquiry["messages"];
  }[];
}

function toTime(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

type WeddingEvent = {
  id: string;
  eventName: string;
  culture: string;
  weddingType: string;
  location: string;
  guestCount: number;
  budgetCurrency: string;
  budgetRange: string;
  weddingDate: string | null;
  createdAt: string | null;
};

async function getWeddingEvents(
  userId: string,
): Promise<{ weddingEvents: WeddingEvent[]; loadError: boolean }> {
  const supabase = await createSupabaseServerClient();
  const selectAttempts = [
    "id, event_name, culture, wedding_type, location, guest_count, budget_range, budget_currency, wedding_date, created_at",
    "id, event_name, culture, wedding_type, location, guest_count, budget_range, wedding_date, created_at",
    "id, event_name, culture, wedding_type, location, guest_count, budget_range, created_at",
    "id, title, culture, wedding_type, location, guest_count, budget_range, created_at",
    "id, title, culture, wedding_type, location, guest_count, budget, created_at",
    "id, culture, wedding_type, location, guest_count, budget_range, created_at",
    "id, culture, wedding_type, location, guest_count, created_at",
  ] as const;

  let weddings: Array<Record<string, unknown>> | null = null;
  let usedSelect: string | null = null;
  let finalError: {
    code?: string | null;
    message?: string | null;
    details?: string | null;
    hint?: string | null;
  } | null = null;
  const errors: Array<{
    select: string;
    error: {
      code?: string | null;
      message?: string | null;
      details?: string | null;
      hint?: string | null;
    };
  }> = [];

  for (const select of selectAttempts) {
    const result = await supabase
      .from("weddings")
      .select(select)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!result.error) {
      weddings = Array.isArray(result.data)
        ? (result.data as Array<Record<string, unknown>>)
        : [];
      usedSelect = select;
      finalError = null;
      break;
    }

    const serialized = {
      code: result.error.code ?? null,
      message: result.error.message ?? null,
      details: result.error.details ?? null,
      hint: result.error.hint ?? null,
    };
    errors.push({ select, error: serialized });
    finalError = serialized;

    if (!isWeddingSchemaDriftError(result.error)) {
      break;
    }
  }

  console.log("Planner wedding overview read", {
    table: "weddings",
    plannerUserId: userId,
    dataCount: weddings?.length ?? 0,
    usedSelect,
    errors,
    error: finalError,
  });

  if (finalError) {
    return {
      weddingEvents: [],
      loadError: true,
    };
  }

  const rows = Array.isArray(weddings) ? weddings : [];
  console.log("weddings:", rows);
  return {
    loadError: false,
    weddingEvents: rows
    .filter((row) => Boolean(row?.id))
      .map((row) => ({
      id: String(row.id),
      eventName:
        typeof row["event_name"] === "string"
          ? String(row["event_name"]).trim()
          : typeof row["title"] === "string"
            ? String(row["title"]).trim()
          : "",
      culture: typeof row["culture"] === "string" ? String(row["culture"]).trim() || "Not set" : "Not set",
      weddingType:
        typeof row["wedding_type"] === "string"
          ? String(row["wedding_type"]).trim() || "Not set"
          : "Not set",
      location: typeof row["location"] === "string" ? String(row["location"]).trim() || "Not set" : "Not set",
      guestCount:
        typeof row["guest_count"] === "number"
          ? Number(row["guest_count"])
          : typeof row["guest_count"] === "string"
            ? Number(row["guest_count"]) || 0
            : 0,
      budgetCurrency:
        typeof row["budget_currency"] === "string" &&
        String(row["budget_currency"]).trim()
          ? String(row["budget_currency"]).trim().toUpperCase()
          : "NGN",
      budgetRange:
        typeof row["budget_range"] === "string"
          ? String(row["budget_range"]).trim() || "Not set"
          : typeof row["budget"] === "string"
            ? String(row["budget"]).trim() || "Not set"
            : "Not set",
      weddingDate: typeof row["wedding_date"] === "string" ? String(row["wedding_date"]) : null,
      createdAt: typeof row["created_at"] === "string" ? String(row["created_at"]) : null,
    })),
  };
}

function isWeddingSchemaDriftError(error: {
  code?: string | null;
  message?: string | null;
}) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST204" ||
    (message.includes("column") &&
      (message.includes("does not exist") || message.includes("could not find")))
  );
}

async function getPlannerProgressItems(
  userId: string,
  weddingId: string | null,
): Promise<ProgressItem[]> {
  const supabase = await createSupabaseServerClient();
  const { blueprint: data, error } = await getBlueprintForWedding({
    supabase,
    userId,
    weddingId,
    includeFallback: true,
    select: "id, wedding_id, checklist_json",
  });

  console.log("Planner progress read source", {
    table: "blueprints",
    plannerUserId: userId,
    selectedWeddingId: weddingId,
    hasBlueprintRow: Boolean(data?.id),
    error: error
      ? {
          code: error.code ?? null,
          message: error.message ?? null,
          details: error.details ?? null,
          hint: error.hint ?? null,
        }
      : null,
  });

  if (error) {
    return [];
  }

  if (!data?.id) {
    console.log("checklist:", []);
    return [];
  }

  if (!Array.isArray(data?.checklist_json)) {
    console.log("checklist:", []);
    return [];
  }

  const loaded = (data.checklist_json as unknown[])
    .filter(
      (item): item is { key?: string; label?: string; status?: string } =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      key: String(item.key ?? ""),
      label: String(item.label ?? ""),
      status: normalizePlannerProgressStatus(item.status),
    }))
    .filter((item) => item.key && item.label) as ProgressItem[];

  console.log("checklist:", loaded);
  return loaded;
}

async function getPlannerBudget(
  userId: string,
  weddingId: string | null,
): Promise<PlannerBudget | null> {
  const supabase = await createSupabaseServerClient();
  const { blueprint: row, error } = await getBlueprintForWedding({
    supabase,
    userId,
    weddingId,
    includeFallback: true,
    select: "id, wedding_id, budget_json",
  });

  if (error) {
    console.warn("Planner budget read failed", {
      table: "blueprints",
      plannerUserId: userId,
      code: error.code ?? null,
      message: error.message ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
    });
    return null;
  }

  const rawBudget = row?.budget_json;
  const budgetJsonExists = Boolean(
    rawBudget && typeof rawBudget === "object" && !Array.isArray(rawBudget),
  );
  const budgetJsonCategoriesCount =
    budgetJsonExists &&
    Array.isArray((rawBudget as { categories?: unknown }).categories)
      ? (rawBudget as { categories: unknown[] }).categories.length
      : 0;

  console.info("Planner dashboard budget read source", {
    table: "blueprints",
    plannerUserId: userId,
    selectedWeddingId: weddingId,
    dashboardLoadedBlueprintId: row?.id ?? null,
    dashboardBudgetJsonExists: budgetJsonExists,
    budgetJsonCategoriesCount,
  });

  return normalizePlannerBudget(row?.budget_json);
}

async function getPlannerGuests(
  userId: string,
  weddingId: string | null,
): Promise<PlannerGuest[]> {
  if (!weddingId) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const guestsTable = supabase.from("guests") as any;
  const { data, error } = await guestsTable
    .select("id, name, phone, email, guest_group, invite_status, notes, created_at, updated_at")
    .eq("user_id", userId)
    .eq("wedding_id", weddingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Planner guests read failed", {
      table: "guests",
      plannerUserId: userId,
      weddingId,
      code: error.code ?? null,
      message: error.message ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
    });
    return [];
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((guest) => ({
    id: String(guest.id),
    name: stringValue(guest.name),
    phone: stringValue(guest.phone),
    email: stringValue(guest.email),
    guestGroup: stringValue(guest.guest_group) || "Other",
    inviteStatus: stringValue(guest.invite_status) || "Not invited",
    notes: stringValue(guest.notes),
    createdAt: stringValue(guest.created_at) || null,
    updatedAt: stringValue(guest.updated_at) || null,
  }));
}

async function getPlannerGuestInvites(
  userId: string,
  weddingId: string | null,
): Promise<PlannerGuestInvite[]> {
  if (!weddingId) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const guestInvitesTable = supabase.from("guest_invites") as any;
  const { data, error } = await guestInvitesTable
    .select("id, guest_name, guest_email, guest_phone, guest_group, couple_name, wedding_date, wedding_time, venue, custom_message, invite_status, rsvp_status, rsvp_token, sent_at, created_at, updated_at")
    .eq("planner_user_id", userId)
    .eq("wedding_id", weddingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Planner guest invites read failed", {
      table: "guest_invites",
      plannerUserId: userId,
      weddingId,
      code: error.code ?? null,
      message: error.message ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
    });
    return [];
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((invite) => ({
    id: String(invite.id),
    guestName: stringValue(invite.guest_name),
    guestEmail: stringValue(invite.guest_email),
    guestPhone: stringValue(invite.guest_phone),
    guestGroup: stringValue(invite.guest_group) || "Other",
    coupleName: stringValue(invite.couple_name),
    weddingDate: stringValue(invite.wedding_date),
    weddingTime: stringValue(invite.wedding_time),
    venue: stringValue(invite.venue),
    customMessage: stringValue(invite.custom_message),
    inviteStatus: stringValue(invite.invite_status) || "draft",
    rsvpStatus: stringValue(invite.rsvp_status) || "pending",
    rsvpToken: stringValue(invite.rsvp_token),
    sentAt: stringValue(invite.sent_at) || null,
    createdAt: stringValue(invite.created_at) || null,
    updatedAt: stringValue(invite.updated_at) || null,
  }));
}

async function getBlueprintForWedding({
  supabase,
  userId,
  weddingId,
  includeFallback,
  select,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  weddingId: string | null;
  includeFallback: boolean;
  select: string;
}) {
  const blueprints = supabase.from("blueprints") as any;

  if (weddingId) {
    const scoped = await blueprints
      .select(select)
      .eq("user_id", userId)
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (scoped.error || scoped.data?.[0]) {
      return { blueprint: scoped.data?.[0] ?? null, error: scoped.error };
    }
  }

  if (!includeFallback) {
    return { blueprint: null, error: null };
  }

  let fallbackQuery = blueprints
    .select(select)
    .eq("user_id", userId);
  if (weddingId) {
    fallbackQuery = fallbackQuery.is("wedding_id", null);
  }
  const fallback = await fallbackQuery
    .order("created_at", { ascending: false })
    .limit(1);

  return { blueprint: fallback.data?.[0] ?? null, error: fallback.error };
}

function normalizePlannerBudget(value: unknown): PlannerBudget | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const categories = Array.isArray(record.categories)
    ? record.categories
        .filter(
          (category): category is Record<string, unknown> =>
            Boolean(category && typeof category === "object" && !Array.isArray(category)),
        )
        .map((category) => ({
          id: String(category.id ?? toPlannerBudgetKey(String(category.name ?? ""))),
          name: String(category.name ?? ""),
          amount: toNullableNumber(category.amount),
          percentage: toNullableNumber(category.percentage),
          percentageMin: toNullableNumber(category.percentageMin),
          percentageMax: toNullableNumber(category.percentageMax),
          amountMin: toNullableNumber(category.amountMin),
          amountMax: toNullableNumber(category.amountMax),
          note: String(category.note ?? ""),
          source: category.source === "manual" ? "manual" as const : "ai" as const,
        }))
        .filter((category) => category.id && category.name)
    : [];

  const notes = Array.isArray(record.notes)
    ? record.notes.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      )
    : [];

  if (!categories.length && !notes.length && toNullableNumber(record.totalBudget) === null) {
    return null;
  }

  const totalBudget = toNullableNumber(record.totalBudget);
  const allocatedAmount = categories.reduce(
    (total, category) => total + (category.amount ?? 0),
    0,
  );

  return {
    currency: normalizePlannerBudgetCurrency(record.currency),
    totalBudget,
    allocatedAmount,
    remainingAmount: totalBudget === null ? null : totalBudget - allocatedAmount,
    bufferPercentage: toNullableNumber(record.bufferPercentage),
    categories: categories.map((category) => ({
      ...category,
      percentage:
        totalBudget && category.amount !== null
          ? Math.round((category.amount / totalBudget) * 1000) / 10
          : category.percentage,
    })),
    notes,
    source: record.source === "manual" ? "manual" : "ai",
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : null,
  };
}

function toNullableNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePlannerBudgetCurrency(value: unknown): PlannerBudget["currency"] {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized === "NGN" || normalized.includes("₦")) return "NGN";
  if (normalized === "USD" || normalized.includes("$")) return "USD";
  if (normalized === "GBP" || normalized.includes("£")) return "GBP";
  if (normalized === "EUR" || normalized.includes("€")) return "EUR";
  return "UNKNOWN";
}

function toPlannerBudgetKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizePlannerProgressStatus(value: unknown): ProgressStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "done" || normalized === "completed") {
    return "done";
  }
  if (normalized === "ongoing" || normalized === "in_progress") {
    return "ongoing";
  }
  return "not_done";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function SelectInput({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: string[];
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
      {label}
      <select
        name={name}
        required
        className="field-input rounded-[1rem]"
        defaultValue={defaultValue || ""}
      >
        <option value="" disabled>
          Select {label.toLowerCase()}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

async function resolvePlannerOwnerIdForDashboard(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  fallbackId: string,
) {
  const { data, error } = await supabase.auth.getUser();
  const authUserId = data.user?.id ?? null;

  if (error) {
    console.error("Planner dashboard auth owner resolution failed", {
      fallbackId,
      error: {
        message: error.message ?? null,
      },
    });
    return fallbackId;
  }

  return authUserId || fallbackId;
}
