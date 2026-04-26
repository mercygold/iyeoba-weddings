"use client";

import { useState } from "react";

type VendorConversationCenterProps = {
  inquiries: VendorInquiry[];
  initialInquiryId?: string | null;
  replyToInquiryAction: (formData: FormData) => void;
  updateInquiryStatusAction: (formData: FormData) => void;
};

type InquiryMessage = {
  id: string;
  senderRole: "planner" | "vendor" | "admin";
  senderLabel: string;
  body: string;
  createdAt: string | null;
};

type VendorInquiry = {
  id: string;
  createdAt: string;
  threadStatus: "open" | "contacted" | "closed" | "archived";
  plannerName: string | null;
  plannerEmail: string | null;
  plannerPhone: string | null;
  weddingSummary: string | null;
  messages: InquiryMessage[];
};

export function VendorConversationCenter({
  inquiries,
  initialInquiryId = null,
  replyToInquiryAction,
  updateInquiryStatusAction,
}: VendorConversationCenterProps) {
  const sortedInquiries = [...inquiries].sort((a, b) => {
    const aLast = getLastMessageTime(a);
    const bLast = getLastMessageTime(b);
    return bLast - aLast;
  });

  const firstInquiryId = sortedInquiries[0]?.id ?? null;
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(
    initialInquiryId ?? firstInquiryId,
  );

  const selectedInquiry =
    sortedInquiries.find((inquiry) => inquiry.id === selectedInquiryId) ?? null;
  const selectedNextPath = selectedInquiry
    ? `/vendor/dashboard?thread=${encodeURIComponent(selectedInquiry.id)}`
    : "/vendor/dashboard";

  if (!sortedInquiries.length) {
    return (
      <section className="surface-card rounded-[2rem] p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
              Inquiry inbox
            </p>
            <h2 className="font-display mt-3 text-2xl text-[color:var(--color-ink)] sm:text-3xl">
              Planner inquiries
            </h2>
          </div>
        </div>
        <p className="mt-6 text-sm leading-7 text-[color:var(--color-muted)]">
          No conversations yet.
        </p>
      </section>
    );
  }

  return (
    <section className="surface-card rounded-[2rem] p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
            Inquiry inbox
          </p>
          <h2 className="font-display mt-3 text-2xl text-[color:var(--color-ink)] sm:text-3xl">
            Planner conversations
          </h2>
        </div>
        <p className="rounded-full bg-[rgba(106,62,124,0.08)] px-4 py-2 text-sm font-semibold text-[color:var(--color-brand-primary)]">
          {sortedInquiries.length} conversations
        </p>
      </div>

      <div className="mt-6 grid min-h-[480px] gap-4 lg:min-h-[560px] lg:grid-cols-[320px_1fr]">
        <div
          className={`min-h-0 ${selectedInquiry ? "hidden lg:block" : "block"}`}
        >
          <div className="h-full overflow-y-auto rounded-[1.3rem] border border-[rgba(106,62,124,0.1)] bg-white p-2">
            {sortedInquiries.map((inquiry) => {
              const lastMessage = getLastMessage(inquiry);
              const isActive = selectedInquiryId === inquiry.id;
              const displayName =
                inquiry.plannerName || inquiry.plannerEmail || "Planner inquiry";
              return (
                <button
                  key={inquiry.id}
                  type="button"
                  onClick={() => setSelectedInquiryId(inquiry.id)}
                  className={`w-full rounded-[1rem] px-3 py-3 text-left transition-all duration-200 ${
                    isActive
                      ? "bg-[rgba(106,62,124,0.12)]"
                      : "hover:bg-[rgba(106,62,124,0.06)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-[color:var(--color-ink)]">
                      {displayName}
                    </p>
                    <span className="shrink-0 text-[11px] text-[color:var(--color-muted)]">
                      {formatDateTime(lastMessage?.createdAt ?? inquiry.createdAt) ?? ""}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-[color:var(--color-muted)]">
                    {lastMessage?.body || "Start the conversation."}
                  </p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-brand-primary)]">
                    {formatStatus(inquiry.threadStatus)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={`min-h-0 ${selectedInquiry ? "flex" : "hidden lg:flex"} flex-col rounded-[1.3rem] border border-[rgba(106,62,124,0.1)] bg-white`}
        >
          {selectedInquiry ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-[rgba(106,62,124,0.12)] px-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold text-[color:var(--color-ink)]">
                    {selectedInquiry.plannerName ||
                      selectedInquiry.plannerEmail ||
                      "Planner inquiry"}
                  </p>
                  <p className="mt-1 truncate text-xs text-[color:var(--color-muted)]">
                    {selectedInquiry.weddingSummary || "Wedding details not provided"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInquiryId(null)}
                  className="btn-secondary px-3 py-1.5 text-xs lg:hidden"
                >
                  Back
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {selectedInquiry.messages.length ? (
                  <div className="space-y-3">
                    {selectedInquiry.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderRole === "vendor" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[92%] rounded-[1.25rem] px-4 py-3 ${
                            message.senderRole === "vendor"
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
                ) : (
                  <p className="text-sm text-[color:var(--color-muted)]">
                    Start the conversation.
                  </p>
                )}
              </div>

              <div className="border-t border-[rgba(106,62,124,0.12)] px-4 py-4">
                <form action={replyToInquiryAction} className="grid gap-3">
                  <input type="hidden" name="inquiryId" value={selectedInquiry.id} />
                  <input type="hidden" name="nextPath" value={selectedNextPath} />
                  <textarea
                    name="message"
                    rows={3}
                    placeholder="Send a reply before moving the conversation to WhatsApp or email."
                    className="field-input min-h-[90px] rounded-[1.25rem] text-sm"
                  />
                  <button type="submit" className="btn-primary w-full px-4 py-2 sm:w-auto">
                    Reply
                  </button>
                </form>

                <div className="mt-3 flex flex-wrap gap-3">
                  {buildWhatsAppMessageLink(
                    selectedInquiry.plannerPhone,
                    `Hello, thanks for your inquiry on Iyeoba Weddings. I am following up on your request${selectedInquiry.weddingSummary ? ` for ${selectedInquiry.weddingSummary}` : ""}.`,
                  ) ? (
                    <a
                      href={buildWhatsAppMessageLink(
                        selectedInquiry.plannerPhone,
                        `Hello, thanks for your inquiry on Iyeoba Weddings. I am following up on your request${selectedInquiry.weddingSummary ? ` for ${selectedInquiry.weddingSummary}` : ""}.`,
                      )!}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary w-full px-4 py-2 sm:w-auto"
                    >
                      WhatsApp
                    </a>
                  ) : null}
                  {buildEmailLink(
                    selectedInquiry.plannerEmail,
                    "Iyeoba Weddings inquiry",
                  ) ? (
                    <a
                      href={buildEmailLink(
                        selectedInquiry.plannerEmail,
                        "Iyeoba Weddings inquiry",
                      )!}
                      className="btn-secondary w-full px-4 py-2 sm:w-auto"
                    >
                      Email
                    </a>
                  ) : null}

                  <form
                    action={updateInquiryStatusAction}
                    className="flex flex-wrap gap-3"
                  >
                    <input type="hidden" name="inquiryId" value={selectedInquiry.id} />
                    <input type="hidden" name="nextPath" value={selectedNextPath} />
                    <select
                      name="status"
                      defaultValue={selectedInquiry.threadStatus}
                      className="field-input rounded-[1.25rem] px-4 py-2 text-sm"
                    >
                      <option value="open">Open</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                      <option value="archived">Archived</option>
                    </select>
                    <button type="submit" className="btn-primary w-full px-4 py-2 sm:w-auto">
                      Update status
                    </button>
                  </form>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center px-6">
              <p className="text-sm text-[color:var(--color-muted)]">
                Select a conversation to view messages.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
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
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatStatus(value: string) {
  return value.replace(/_/g, " ");
}

function getLastMessage(inquiry: VendorInquiry) {
  if (!inquiry.messages.length) {
    return null;
  }

  return [...inquiry.messages].sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt)).at(-1) ?? null;
}

function getLastMessageTime(inquiry: VendorInquiry) {
  return toTime(getLastMessage(inquiry)?.createdAt ?? inquiry.createdAt);
}

function toTime(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildWhatsAppMessageLink(
  phone: string | null | undefined,
  text: string,
) {
  if (!phone) {
    return null;
  }

  const normalized = phone.replace(/[^\d+]/g, "");
  if (!normalized) {
    return null;
  }

  return `https://wa.me/${normalized.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`;
}

function buildEmailLink(
  email: string | null | undefined,
  businessName: string,
) {
  if (!email) {
    return null;
  }

  const subject = encodeURIComponent(`Wedding inquiry for ${businessName}`);
  const body = encodeURIComponent(
    `Hello ${businessName}, I found your profile on Iyeoba Weddings and would like to ask about availability.`,
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}
