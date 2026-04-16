import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import {
  createVendorInquiryAction,
  saveVendorForPlannerAction,
  updatePlannerInquiryStatusAction,
} from "@/app/planner/actions";
import { CommunicationRealtimeSync } from "@/components/communication-realtime-sync";
import { FlashQueryCleaner } from "@/components/flash-query-cleaner";
import { MainNav } from "@/components/main-nav";
import { VendorProfileAvatarLink } from "@/components/vendor-profile-avatar-link";
import { requirePlannerProfile } from "@/lib/auth";
import {
  buildEmailLink,
  buildWhatsAppLink,
  type PlannerInquiry,
  getPlannerInquiries,
  getPlannerSavedVendors,
} from "@/lib/inquiries";
import { getPlannerInputFromSearchParams } from "@/lib/planner";
import { getVendorDirectory } from "@/lib/vendors";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function PlannerDashboardPage(props: {
  searchParams: SearchParams;
}) {
  noStore();
  const profile = await requirePlannerProfile("/planner/dashboard");
  const searchParams = await props.searchParams;
  const plannerInput = getPlannerInputFromSearchParams(searchParams);
  const savedVendors = await getPlannerSavedVendors(profile.id);
  const inquiries = await getPlannerInquiries(profile.id);
  const conversations = buildConversations(inquiries);
  const selectedThreadVendorId =
    typeof searchParams.thread === "string"
      ? searchParams.thread
      : conversations[0]?.vendor.id ?? null;
  const selectedConversation =
    conversations.find(
      (conversation) => conversation.vendor.id === selectedThreadVendorId,
    ) ?? conversations[0] ?? null;
  const vendors = await getVendorDirectory({
    culture: plannerInput.culture,
    location: plannerInput.location,
  });
  const suggestedVendors = vendors.slice(0, 3);

  const message =
    typeof searchParams.message === "string" ? searchParams.message : undefined;
  const error =
    typeof searchParams.error === "string" ? searchParams.error : undefined;
  const feedbackError = message ? undefined : error;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6effa_0%,#fcf8ff_18%,#ffffff_48%,#ffffff_100%)]">
      <CommunicationRealtimeSync role="planner" plannerUserId={profile.id} />
      <FlashQueryCleaner />
      <MainNav />
      <main className="mx-auto flex max-w-[1300px] flex-col gap-6 px-6 py-8 md:px-10 lg:px-12 lg:py-10">
        <header className="surface-card rounded-[2rem] p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[color:var(--color-brand-primary)]">
            Planner Dashboard V2
          </p>
          <h1 className="font-display mt-3 text-5xl leading-none text-[color:var(--color-ink)]">
            Planning command center
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-muted)]">
            One conversation per vendor, clear planning progress, and practical
            vendor recommendations in one private workspace.
          </p>
          {message ? (
            <p className="surface-soft mt-4 rounded-[1.25rem] px-4 py-3 text-sm text-[color:var(--color-brand-primary)]">
              {message}
            </p>
          ) : null}
          {feedbackError ? (
            <p className="mt-4 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {feedbackError}
            </p>
          ) : null}
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.28fr_0.32fr_0.4fr]">
          <PlanningProgressPanel
            savedVendors={savedVendors.map((item) => item.vendor)}
            conversations={conversations}
          />

          <ConversationsPanel conversations={conversations} selectedVendorId={selectedThreadVendorId} />

          <ThreadPanel
            conversation={selectedConversation}
            suggestedVendors={suggestedVendors}
          />
        </section>
      </main>
    </div>
  );
}

function PlanningProgressPanel({
  savedVendors,
  conversations,
}: {
  savedVendors: Array<{
    id: string;
    category: string;
  }>;
  conversations: Conversation[];
}) {
  const savedCategories = new Set(savedVendors.map((vendor) => vendor.category.toLowerCase()));
  const engagedCategories = new Set(
    conversations.map((conversation) => conversation.vendor.category.toLowerCase()),
  );

  const rows = [
    "Venue",
    "Catering",
    "Photography & Video",
    "Decor & Floral",
    "Fashion & Attire",
    "Entertainment",
    "Guest Logistics",
  ].map((name) => {
    const key = name.toLowerCase();
    const hasConversation = [...engagedCategories].some((category) =>
      category.includes(key.split(" ")[0]),
    );
    const hasSaved = [...savedCategories].some((category) =>
      category.includes(key.split(" ")[0]),
    );
    const status: "not_started" | "in_progress" | "completed" = hasConversation
      ? "completed"
      : hasSaved
        ? "in_progress"
        : "not_started";
    return { name, status };
  });

  const score = rows.reduce((total, row) => {
    if (row.status === "completed") return total + 1;
    if (row.status === "in_progress") return total + 0.5;
    return total;
  }, 0);
  const progressPercent = Math.round((score / rows.length) * 100);

  return (
    <section className="surface-card rounded-[2rem] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand-primary)]">
        Planning Progress
      </p>
      <div className="mt-4">
        <div className="flex items-end justify-between gap-3">
          <p className="font-display text-4xl text-[color:var(--color-ink)]">
            {progressPercent}%
          </p>
          <p className="text-sm text-[color:var(--color-muted)]">Master battery</p>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[rgba(106,62,124,0.12)]">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#6A3E7C_0%,#C9A15B_100%)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      <div className="mt-6 grid gap-3">
        {rows.map((row) => (
          <div
            key={row.name}
            className="flex items-center justify-between rounded-[1.2rem] border border-[rgba(106,62,124,0.08)] bg-white/80 px-4 py-3"
          >
            <p className="text-sm font-medium text-[color:var(--color-ink)]">{row.name}</p>
            <StatusPill status={row.status} />
          </div>
        ))}
      </div>
    </section>
  );
}

function ConversationsPanel({
  conversations,
  selectedVendorId,
}: {
  conversations: Conversation[];
  selectedVendorId: string | null;
}) {
  return (
    <section className="surface-card rounded-[2rem] p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand-primary)]">
          Conversations
        </p>
        <span className="rounded-full bg-[rgba(106,62,124,0.1)] px-3 py-1 text-xs font-semibold text-[color:var(--color-brand-primary)]">
          {conversations.length}
        </span>
      </div>
      {conversations.length ? (
        <div className="mt-4 grid gap-3">
          {conversations.map((conversation) => {
            const active = conversation.vendor.id === selectedVendorId;
            return (
              <Link
                key={conversation.vendor.id}
                href={`/planner/dashboard?thread=${encodeURIComponent(conversation.vendor.id)}`}
                className={`rounded-[1.3rem] border px-4 py-3 transition ${
                  active
                    ? "border-[color:var(--color-brand-primary)] bg-[rgba(106,62,124,0.08)]"
                    : "border-[rgba(106,62,124,0.1)] bg-white hover:border-[rgba(106,62,124,0.28)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <VendorProfileAvatarLink
                    href={`/vendors/${conversation.vendor.slug}`}
                    businessName={conversation.vendor.businessName}
                    imageUrl={conversation.vendor.imageUrl}
                    sizeClassName="h-12 w-12"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[color:var(--color-ink)]">
                      {conversation.vendor.businessName}
                    </p>
                    <p className="truncate text-xs text-[color:var(--color-muted)]">
                      {conversation.lastMessagePreview}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 text-sm leading-7 text-[color:var(--color-muted)]">
          Start your first vendor conversation from a recommended vendor card.
        </p>
      )}
    </section>
  );
}

function ThreadPanel({
  conversation,
  suggestedVendors,
}: {
  conversation: Conversation | null;
  suggestedVendors: Awaited<ReturnType<typeof getVendorDirectory>>;
}) {
  return (
    <section className="surface-card rounded-[2rem] p-6">
      <div className="grid gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand-primary)]">
            Conversation Thread
          </p>
          {conversation ? (
            <div className="mt-3">
              <h2 className="font-display text-3xl text-[color:var(--color-ink)]">
                {conversation.vendor.businessName}
              </h2>
              <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                {conversation.vendor.category} · {conversation.vendor.location}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[color:var(--color-muted)]">
              Pick a conversation to view messages.
            </p>
          )}
        </div>

        {conversation ? (
          <>
            <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {conversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.senderRole === "planner" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-[1.25rem] px-4 py-3 ${
                      message.senderRole === "planner"
                        ? "bg-[color:var(--color-brand-primary)] text-white"
                        : "bg-[rgba(106,62,124,0.08)] text-[color:var(--color-ink)]"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">
                      {message.senderLabel}
                    </p>
                    <p className="mt-1 text-sm leading-6">{message.body}</p>
                    {formatDateTime(message.createdAt) ? (
                      <p className="mt-1 text-[11px] opacity-75">
                        {formatDateTime(message.createdAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <form action={createVendorInquiryAction} className="grid gap-3">
              <input type="hidden" name="vendorId" value={conversation.vendor.id} />
              <input type="hidden" name="vendorSlug" value={conversation.vendor.slug} />
              <input type="hidden" name="contactMethod" value="planner_v2_thread" />
              <input type="hidden" name="nextPath" value="/planner/dashboard" />
              <textarea
                name="message"
                rows={3}
                placeholder="Send a message in this vendor conversation."
                className="field-input min-h-[90px] rounded-[1.2rem] text-sm"
              />
              <div className="flex flex-wrap gap-3">
                <button type="submit" className="btn-primary px-4 py-2">
                  Send message
                </button>
                {buildWhatsAppLink(
                  conversation.vendor.whatsapp,
                  conversation.vendor.businessName,
                ) ? (
                  <a
                    href={buildWhatsAppLink(
                      conversation.vendor.whatsapp,
                      conversation.vendor.businessName,
                    )!}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary px-4 py-2"
                  >
                    WhatsApp
                  </a>
                ) : null}
                {buildEmailLink(
                  conversation.vendor.contactEmail,
                  conversation.vendor.businessName,
                ) ? (
                  <a
                    href={buildEmailLink(
                      conversation.vendor.contactEmail,
                      conversation.vendor.businessName,
                    )!}
                    className="btn-secondary px-4 py-2"
                  >
                    Email
                  </a>
                ) : null}
              </div>
            </form>
            <form action={updatePlannerInquiryStatusAction} className="flex flex-wrap gap-3">
              <input type="hidden" name="inquiryId" value={conversation.latestInquiryId} />
              <input type="hidden" name="nextPath" value="/planner/dashboard" />
              <select
                name="status"
                defaultValue={conversation.threadStatus}
                className="field-input rounded-[1.2rem] px-4 py-2 text-sm"
              >
                <option value="open">Open</option>
                <option value="contacted">Contacted</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
              <button type="submit" className="btn-secondary px-4 py-2">
                Update status
              </button>
            </form>
          </>
        ) : (
          <div className="grid gap-3">
            {suggestedVendors.slice(0, 3).map((vendor) => (
              <div
                key={vendor.slug}
                className="rounded-[1.2rem] border border-[rgba(106,62,124,0.1)] bg-white px-4 py-3"
              >
                <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                  {vendor.businessName}
                </p>
                <p className="text-xs text-[color:var(--color-muted)]">
                  {vendor.category} · {vendor.location}
                </p>
                <form action={saveVendorForPlannerAction} className="mt-2">
                  <input type="hidden" name="vendorId" value={vendor.id} />
                  <input type="hidden" name="nextPath" value="/planner/dashboard" />
                  <button type="submit" className="btn-secondary px-3 py-1.5 text-sm">
                    Save vendor
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-[1.2rem] border border-[rgba(201,161,91,0.32)] bg-[rgba(201,161,91,0.12)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-brand-primary)]">
            Insights
          </p>
          <p className="mt-2 text-sm leading-7 text-[color:var(--color-muted)]">
            Keep one focused thread per vendor. Compare response quality, pricing
            clarity, and timeline fit before you lock commitments.
          </p>
        </div>
      </div>
    </section>
  );
}

type Conversation = {
  vendor: PlannerInquiry["vendor"];
  messages: PlannerInquiry["messages"];
  threadStatus: PlannerInquiry["threadStatus"];
  latestInquiryId: string;
  lastMessagePreview: string;
  lastMessageAt: string | null;
};

function buildConversations(inquiries: PlannerInquiry[]): Conversation[] {
  const grouped = new Map<string, Conversation>();

  for (const inquiry of inquiries) {
    const key = inquiry.vendor.id;
    const existing = grouped.get(key);
    const mergedMessages = [...(existing?.messages ?? []), ...inquiry.messages]
      .filter((message, index, array) =>
        array.findIndex((item) => item.id === message.id) === index,
      )
      .sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt));
    const lastMessage = mergedMessages.at(-1);
    const statusRank = getStatusRank(inquiry.threadStatus);
    const currentStatusRank = getStatusRank(existing?.threadStatus ?? "open");

    grouped.set(key, {
      vendor: inquiry.vendor,
      messages: mergedMessages,
      threadStatus:
        existing && currentStatusRank > statusRank
          ? existing.threadStatus
          : inquiry.threadStatus,
      latestInquiryId:
        !existing || toTime(inquiry.createdAt) >= toTime(existing.lastMessageAt)
          ? inquiry.id
          : existing.latestInquiryId,
      lastMessagePreview:
        (lastMessage?.body || "Conversation started.").slice(0, 120),
      lastMessageAt: lastMessage?.createdAt ?? inquiry.createdAt ?? null,
    });
  }

  return [...grouped.values()].sort(
    (a, b) => toTime(b.lastMessageAt) - toTime(a.lastMessageAt),
  );
}

function StatusPill({
  status,
}: {
  status: "not_started" | "in_progress" | "completed";
}) {
  const styles =
    status === "completed"
      ? "bg-emerald-100 text-emerald-700"
      : status === "in_progress"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-700";
  const label =
    status === "completed"
      ? "Completed"
      : status === "in_progress"
        ? "In progress"
        : "Not started";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${styles}`}>
      {label}
    </span>
  );
}

function getStatusRank(status: PlannerInquiry["threadStatus"]) {
  if (status === "archived") return 4;
  if (status === "closed") return 3;
  if (status === "contacted") return 2;
  return 1;
}

function toTime(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
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
