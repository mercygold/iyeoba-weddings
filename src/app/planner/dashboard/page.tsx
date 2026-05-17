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
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { PlannerBudgetFields } from "@/components/planner-budget-fields";

import { PlannerConversationCenter } from "@/components/planner-conversation-center";
import {
  GuestListSection,
  PlannerProgressSection,
  WeddingBudgetSection,
} from "@/components/planner-dashboard-inline-tools";
import { StartInquiryForm } from "@/components/start-inquiry-form";
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
type PlannerGuest = {
  id: string;
  name: string;
  phone: string;
  email: string;
  guestGroup: string;
  inviteStatus: string;
  notes: string;
  createdAt: string | null;
  updatedAt: string | null;
};
type PlannerGuestInvite = {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestGroup: string;
  coupleName: string;
  weddingDate: string;
  weddingTime: string;
  venue: string;
  customMessage: string;
  inviteStatus: string;
  rsvpStatus: string;
  rsvpToken: string;
  sentAt: string | null;
  createdAt: string | null;
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

  const editWeddingId =
    typeof searchParams.editWedding === "string" ? searchParams.editWedding : null;
  const showAddWeddingForm = searchParams.addWedding === "1";
  const [
    { weddingEvents, loadError: weddingEventsLoadError },
    savedVendors,
    inquiries,
  ] = await Promise.all([
    getWeddingEvents(ownerId),
    getPlannerSavedVendors(ownerId),
    getPlannerInquiries(ownerId),
  ]);
  const requestedWeddingId =
    typeof searchParams.wedding === "string" ? searchParams.wedding : null;
  const selectedWedding =
    weddingEvents.find((event) => event.id === requestedWeddingId) ??
    weddingEvents[0] ??
    null;
  const selectedWeddingId = selectedWedding?.id ?? null;
  const [progressItems, plannerBudget, guests, guestInvites] =
    await Promise.all([
      getPlannerProgressItems(ownerId, selectedWeddingId),
      getPlannerBudget(ownerId, selectedWeddingId),
      getPlannerGuests(ownerId, selectedWeddingId),
      getPlannerGuestInvites(ownerId, selectedWeddingId),
    ]);
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

  return (
    <div className="relative min-h-screen max-w-full overflow-x-hidden bg-[linear-gradient(180deg,#FAF9F7_0%,#ffffff_46%,#ffffff_100%)]">
      <div className="wedding-floral-accent-gold absolute -right-16 top-32 h-56 w-56 opacity-[0.12]" />
      <div className="wedding-floral-accent-gold absolute -left-20 bottom-16 h-52 w-52 opacity-[0.1]" />
      <FlashQueryCleaner />
      <CommunicationRealtimeSync role="planner" plannerUserId={ownerId} />
      <MainNav />
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-5 overflow-x-hidden px-4 py-5 sm:gap-8 sm:px-6 md:px-10 lg:px-12 lg:py-12">
        <section className="surface-card w-full max-w-full overflow-x-hidden rounded-[1.5rem] p-5 sm:rounded-[2rem] sm:p-7">
          <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-start sm:justify-between">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand-primary)]">
              Wedding Overview
            </p>
            <Link href="/planner/dashboard?addWedding=1" className="btn-primary w-full px-4 py-2 text-sm sm:w-auto">
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
            <div className="mt-5 grid w-full max-w-full grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {weddingEvents.map((event) => {
                const isEditing = editWeddingId === event.id;
                return (
                  <article key={event.id} className="surface-soft w-full min-w-0 max-w-full rounded-[1.35rem] p-5">
                    <div className="grid gap-3 sm:flex sm:items-start sm:justify-between">
                      <h2 className="font-display min-w-0 break-words text-2xl leading-tight text-[color:var(--color-ink)]">
                        {event.eventName || `${event.culture} ${event.weddingType}`.trim() || "Wedding event"}
                      </h2>
                      <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3 sm:items-center">
                        <Link
                          href={buildDashboardWeddingHref({
                            weddingId: event.id,
                            editWeddingId: event.id,
                          })}
                          className="btn-secondary w-full px-3 py-2 text-xs"
                        >
                          Edit
                        </Link>
                        <Link
                          href={buildDashboardWeddingHref({ weddingId: event.id })}
                          className={
                            selectedWeddingId === event.id
                              ? "btn-primary w-full px-3 py-2 text-xs"
                              : "btn-secondary w-full px-3 py-2 text-xs"
                          }
                        >
                          {selectedWeddingId === event.id ? "Selected" : "Use"}
                        </Link>
                        <form action={deleteWeddingEventAction} className="w-full">
                          <input type="hidden" name="weddingId" value={event.id} />
                          <input type="hidden" name="nextPath" value="/planner/dashboard" />
                          <ConfirmSubmitButton
                            type="submit"
                            confirmMessage="Delete this wedding event? This action cannot be undone."
                            pendingLabel="Deleting..."
                            className="btn-secondary w-full px-3 py-2 text-xs"
                          >
                            Delete
                          </ConfirmSubmitButton>
                        </form>
                      </div>
                    </div>

                    {isEditing ? (
                      <form action={saveWeddingEventAction} className="mt-4 grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="weddingId" value={event.id} />
                        <input
                          type="hidden"
                          name="nextPath"
                          value={buildDashboardWeddingHref({ weddingId: event.id })}
                        />
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
                        <div className="grid gap-2 sm:col-span-2 sm:flex sm:flex-wrap">
                          <PendingSubmitButton pendingLabel="Saving..." className="btn-primary w-full px-4 py-2 text-sm sm:w-auto">
                            Save
                          </PendingSubmitButton>
                          <Link href="/planner/dashboard" className="btn-secondary w-full px-4 py-2 text-sm sm:w-auto">
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
              <div className="grid gap-2 sm:col-span-2 sm:flex sm:flex-wrap">
                <PendingSubmitButton pendingLabel="Saving..." className="btn-primary w-full px-4 py-2 text-sm sm:w-auto">
                  Save wedding event
                </PendingSubmitButton>
                <Link href="/planner/dashboard" className="btn-secondary w-full px-4 py-2 text-sm sm:w-auto">
                  Cancel
                </Link>
              </div>
            </form>
          ) : null}
        </section>

        {message ? (
          <p role="status" className="surface-soft rounded-[1.25rem] px-4 py-3 text-sm text-[color:var(--color-brand-primary)]">
            {message}
          </p>
        ) : null}
        {feedbackError ? (
          <p role="alert" className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {feedbackError}
          </p>
        ) : null}

        <WeddingBudgetSection
          key={`budget-${selectedWeddingId ?? "general"}`}
          initialBudget={plannerBudget}
          weddingId={selectedWeddingId}
          weddingTitle={getWeddingEventTitle(selectedWedding)}
        />

        <PlannerProgressSection
          key={`progress-${selectedWeddingId ?? "general"}`}
          initialItems={progressItems}
          catalog={progressCatalog}
          weddingId={selectedWeddingId}
          weddingTitle={getWeddingEventTitle(selectedWedding)}
        />

        <GuestListSection
          key={`guests-${selectedWeddingId ?? "general"}`}
          initialGuests={guests}
          initialInvites={guestInvites}
          weddingId={selectedWeddingId}
          weddingTitle={getWeddingEventTitle(selectedWedding)}
          wedding={
            selectedWedding
              ? {
                  title: getWeddingEventTitle(selectedWedding) || "Wedding event",
                  weddingType: selectedWedding.weddingType,
                  location: selectedWedding.location,
                  weddingDate: null,
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
              <div className="mt-5 grid w-full max-w-full grid-cols-1 gap-3 sm:gap-4">
                {savedVendors.map((saved) => {
                  const conversation = conversationsByVendor.get(saved.vendor.id) ?? null;
                  const compareActive = compareIds.includes(saved.vendor.id);
                  const toggleCompareHref = buildCompareHref(
                    saved.vendor.id,
                    compareIds,
                    compareActive,
                    threadVendorId,
                  );
                  const threadHref = buildPlannerThreadHref(saved.vendor.id, compareIds);

                  return (
                    <div key={saved.id} className="surface-soft w-full min-w-0 max-w-full rounded-[1.5rem] p-5">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                        <div className="min-w-0">
                          <h3 className="font-display break-words text-2xl leading-tight text-[color:var(--color-ink)]">
                            {saved.vendor.businessName}
                          </h3>
                          <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                            {saved.vendor.category} · {saved.vendor.location}
                          </p>
                          <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                            Starting price: {saved.vendor.priceRange || "Contact vendor"}
                          </p>
                          <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                            Inquiry status: {conversation ? formatInquiryCardStatus(conversation.threadStatus) : "Not started"}
                          </p>
                        </div>
                        <VendorProfileAvatarLink
                          href={`/vendors/${saved.vendor.slug}`}
                          businessName={saved.vendor.businessName}
                          imageUrl={saved.vendor.imageUrl}
                          sizeClassName="h-[64px] w-[64px] sm:h-[78px] sm:w-[78px]"
                        />
                      </div>
                      <div className="relative z-20 mt-4 grid gap-2 sm:flex sm:flex-wrap">
                        <Link href={`/vendors/${saved.vendor.slug}`} className="btn-secondary w-full px-3 py-2 text-sm sm:w-auto">
                          View Profile
                        </Link>
                        <StartInquiryForm
                          action={createVendorInquiryAction}
                          vendorId={saved.vendor.id}
                          vendorSlug={saved.vendor.slug}
                          nextPath={threadHref}
                          serverError={
                            feedbackError && threadVendorId === saved.vendor.id
                              ? feedbackError
                              : null
                          }
                        />
                        {buildWhatsAppLink(
                          saved.vendor.whatsapp,
                          saved.vendor.businessName,
                        ) ? (
                          <a
                            href={buildWhatsAppLink(saved.vendor.whatsapp, saved.vendor.businessName)!}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary w-full px-3 py-2 text-sm sm:w-auto"
                          >
                            Contact on WhatsApp
                          </a>
                        ) : null}
                        <Link href={toggleCompareHref} className="btn-secondary w-full px-3 py-2 text-sm sm:w-auto">
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

function formatInquiryCardStatus(value: PlannerInquiry["threadStatus"]) {
  if (value === "open" || value === "contacted") {
    return "Started";
  }
  return formatStatus(value);
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

function buildPlannerThreadHref(vendorId: string, compareIds: string[]) {
  const params = new URLSearchParams();
  params.set("thread", vendorId);
  if (compareIds.length) {
    params.set("compare", compareIds.join(","));
  }
  return `/planner/dashboard?${params.toString()}`;
}

function buildDashboardWeddingHref({
  weddingId,
  editWeddingId,
}: {
  weddingId: string;
  editWeddingId?: string;
}) {
  const params = new URLSearchParams();
  params.set("wedding", weddingId);
  if (editWeddingId) {
    params.set("editWedding", editWeddingId);
  }
  return `/planner/dashboard?${params.toString()}`;
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

    const existingIsArchived = existing.threadStatus === "archived";
    const inquiryIsArchived = inquiry.threadStatus === "archived";
    const shouldUseInquiry =
      existingIsArchived !== inquiryIsArchived
        ? !inquiryIsArchived
        : toTime(inquiry.createdAt) < toTime(existing.createdAt);

    map.set(inquiry.vendor.id, {
      id: shouldUseInquiry ? inquiry.id : existing.id,
      threadStatus: shouldUseInquiry ? inquiry.threadStatus : existing.threadStatus,
      messages: merged,
      createdAt: shouldUseInquiry ? inquiry.createdAt : existing.createdAt,
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
  createdAt: string | null;
};

async function getWeddingEvents(
  userId: string,
): Promise<{ weddingEvents: WeddingEvent[]; loadError: boolean }> {
  const supabase = await createSupabaseServerClient();
  const selectAttempts = [
    "id, event_name, culture, wedding_type, location, guest_count, budget_range, budget_currency, created_at",
    "id, event_name, culture, wedding_type, location, guest_count, budget_range, created_at",
    "id, title, culture, wedding_type, location, guest_count, budget_range, created_at",
    "id, title, culture, wedding_type, location, guest_count, budget, created_at",
    "id, culture, wedding_type, location, guest_count, budget_range, created_at",
    "id, culture, wedding_type, location, guest_count, created_at",
  ] as const;

  let weddings: Array<Record<string, unknown>> | null = null;
  let finalError: {
    code?: string | null;
    message?: string | null;
    details?: string | null;
    hint?: string | null;
  } | null = null;

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
      finalError = null;
      break;
    }

    const serialized = {
      code: result.error.code ?? null,
      message: result.error.message ?? null,
      details: result.error.details ?? null,
      hint: result.error.hint ?? null,
    };
    finalError = serialized;

    if (!isWeddingSchemaDriftError(result.error)) {
      break;
    }
  }

  if (finalError) {
    return {
      weddingEvents: [],
      loadError: true,
    };
  }

  const rows = Array.isArray(weddings) ? weddings : [];
  return {
    loadError: false,
    weddingEvents: rows
    .filter((row) => Boolean(row?.id))
      .map((row) => ({
      id: String(row.id),
      eventName: normalizeWeddingEventName(row["event_name"], row["title"]),
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
  const blueprint = await getPlannerBlueprintForWedding(
    supabase,
    userId,
    weddingId,
    "id, wedding_id, checklist_json",
  );

  if (!Array.isArray(blueprint?.checklist_json)) {
    return [];
  }

  return blueprint.checklist_json
    .filter(
      (item): item is { key?: string; label?: string; status?: string } =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      key: String(item.key ?? ""),
      label: String(item.label ?? ""),
      status: normalizePlannerProgressStatus(item.status),
    }))
    .filter((item) => item.key && item.label);
}

async function getPlannerBudget(
  userId: string,
  weddingId: string | null,
): Promise<PlannerBudget | null> {
  const supabase = await createSupabaseServerClient();
  const blueprint = await getPlannerBlueprintForWedding(
    supabase,
    userId,
    weddingId,
    "id, wedding_id, budget_json",
  );

  return normalizePlannerBudget(blueprint?.budget_json);
}

async function getPlannerBlueprintForWedding(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  weddingId: string | null,
  select: string,
) {
  const blueprints = supabase.from("blueprints") as any;

  if (weddingId) {
    const scoped = await blueprints
      .select(select)
      .eq("user_id", userId)
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!scoped.error && scoped.data?.[0]) {
      return scoped.data[0] as Record<string, unknown>;
    }
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

  if (fallback.error) {
    console.warn("Planner dashboard blueprint load failed", {
      userId,
      weddingId,
      code: fallback.error.code ?? null,
      message: fallback.error.message ?? null,
      details: fallback.error.details ?? null,
      hint: fallback.error.hint ?? null,
    });
    return null;
  }

  return (fallback.data?.[0] as Record<string, unknown> | undefined) ?? null;
}

async function getPlannerGuests(
  userId: string,
  weddingId: string | null,
): Promise<PlannerGuest[]> {
  if (!weddingId) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("guests")
    .select("id, name, phone, email, guest_group, invite_status, notes, created_at, updated_at")
    .eq("user_id", userId)
    .eq("wedding_id", weddingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Planner dashboard guest list load failed", {
      userId,
      weddingId,
      code: error.code ?? null,
      message: error.message ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
    });
    return [];
  }

  return (data ?? []).map((guest) => ({
    id: guest.id,
    name: guest.name,
    phone: guest.phone ?? "",
    email: guest.email ?? "",
    guestGroup: guest.guest_group ?? "Other",
    inviteStatus: guest.invite_status ?? "Not invited",
    notes: guest.notes ?? "",
    createdAt: guest.created_at ?? null,
    updatedAt: guest.updated_at ?? null,
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
  const { data, error } = await supabase
    .from("guest_invites")
    .select("id, guest_name, guest_email, guest_phone, guest_group, couple_name, wedding_date, wedding_time, venue, custom_message, invite_status, rsvp_status, rsvp_token, sent_at, created_at, updated_at")
    .eq("planner_user_id", userId)
    .eq("wedding_id", weddingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Planner dashboard guest invite load failed", {
      userId,
      weddingId,
      code: error.code ?? null,
      message: error.message ?? null,
      details: error.details ?? null,
      hint: error.hint ?? null,
    });
    return [];
  }

  return (data ?? []).map((invite) => ({
    id: invite.id,
    guestName: invite.guest_name ?? "",
    guestEmail: invite.guest_email ?? "",
    guestPhone: invite.guest_phone ?? "",
    guestGroup: invite.guest_group ?? "Other",
    coupleName: invite.couple_name ?? "",
    weddingDate: invite.wedding_date ?? "",
    weddingTime: invite.wedding_time ?? "",
    venue: invite.venue ?? "",
    customMessage: invite.custom_message ?? "",
    inviteStatus: invite.invite_status ?? "draft",
    rsvpStatus: invite.rsvp_status ?? "pending",
    rsvpToken: invite.rsvp_token ?? "",
    sentAt: invite.sent_at ?? null,
    createdAt: invite.created_at ?? null,
    updatedAt: invite.updated_at ?? null,
  }));
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

function getWeddingEventTitle(event: WeddingEvent | null) {
  if (!event) {
    return null;
  }

  return (
    normalizeWeddingEventName(event.eventName) ||
    `${event.culture} ${event.weddingType}`.trim() ||
    "Wedding event"
  );
}

function normalizeWeddingEventName(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed && !isPlaceholderWeddingTitle(trimmed)) {
      return trimmed;
    }
  }

  return "";
}

function isPlaceholderWeddingTitle(value: string) {
  return ["wedding plan", "general planning"].includes(value.trim().toLowerCase());
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
