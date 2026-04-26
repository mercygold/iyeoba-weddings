"use client";

import { useState } from "react";
import Link from "next/link";

import { VendorProfileAvatarLink } from "@/components/vendor-profile-avatar-link";

type PlannerConversationCenterProps = {
  conversations: PlannerConversationItem[];
  compareIds: string[];
  initialVendorId?: string | null;
  createVendorInquiryAction: (formData: FormData) => void;
  updatePlannerInquiryStatusAction: (formData: FormData) => void;
};

type PlannerConversationItem = {
  id: string;
  threadStatus: "open" | "contacted" | "closed" | "archived";
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
  messages: InquiryMessage[];
};

type InquiryMessage = {
  id: string;
  senderRole: "planner" | "vendor" | "admin";
  senderLabel: string;
  body: string;
  createdAt: string | null;
};

export function PlannerConversationCenter({
  conversations,
  compareIds,
  initialVendorId = null,
  createVendorInquiryAction,
  updatePlannerInquiryStatusAction,
}: PlannerConversationCenterProps) {
  const firstConversationVendorId = conversations[0]?.vendor.id ?? null;
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(
    initialVendorId ?? firstConversationVendorId,
  );

  const selectedConversation =
    conversations.find((conversation) => conversation.vendor.id === selectedVendorId) ??
    null;

  const selectedVendor = selectedConversation?.vendor ?? null;
  const selectedNextPath = selectedVendor
    ? buildPlannerThreadPath(selectedVendor.id, compareIds)
    : "/planner/dashboard";

  const sortedConversations = [...conversations].sort((a, b) => {
    const aLast = getLastMessageTime(a.messages, a.createdAt);
    const bLast = getLastMessageTime(b.messages, b.createdAt);
    return bLast - aLast;
  });

  return (
    <article className="surface-card rounded-[2rem] p-4 sm:p-7">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand-primary)]">
        Conversations
      </p>
      <h2 className="font-display mt-2 text-2xl text-[color:var(--color-ink)] sm:text-3xl">
        Planner and vendor chat
      </h2>

      {!sortedConversations.length ? (
        <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)]">
          No conversations yet.
        </p>
      ) : (
        <div className="mt-4 grid min-h-[360px] gap-3 sm:mt-5 sm:gap-4 lg:min-h-[560px] lg:grid-cols-[320px_1fr]">
          <div
            className={`min-h-0 ${selectedConversation ? "hidden lg:block" : "block"}`}
          >
            <div className="h-full max-h-[360px] overflow-y-auto rounded-[1.3rem] border border-[rgba(106,62,124,0.1)] bg-white p-2 lg:max-h-none">
              {sortedConversations.map((conversation) => {
                const lastMessage = getLastMessage(conversation.messages);
                const isActive = selectedVendorId === conversation.vendor.id;

                return (
                  <button
                    key={conversation.vendor.id}
                    type="button"
                    onClick={() => setSelectedVendorId(conversation.vendor.id)}
                    className={`w-full rounded-[1rem] px-3 py-3 text-left transition-all duration-200 ${
                      isActive
                        ? "bg-[rgba(106,62,124,0.12)]"
                        : "hover:bg-[rgba(106,62,124,0.06)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-semibold text-[color:var(--color-ink)]">
                        {conversation.vendor.businessName}
                      </p>
                      <span className="shrink-0 text-[11px] text-[color:var(--color-muted)]">
                        {formatDateTime(lastMessage?.createdAt ?? conversation.createdAt) ??
                          ""}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-[color:var(--color-muted)]">
                      {lastMessage?.body || "Start the conversation."}
                    </p>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-brand-primary)]">
                      {formatStatus(conversation.threadStatus)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className={`min-h-0 ${selectedConversation ? "flex" : "hidden lg:flex"} flex-col rounded-[1.3rem] border border-[rgba(106,62,124,0.1)] bg-white`}
          >
            {selectedConversation && selectedVendor ? (
              <>
                <div className="flex items-start justify-between gap-3 border-b border-[rgba(106,62,124,0.12)] px-4 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <VendorProfileAvatarLink
                      href={`/vendors/${selectedVendor.slug}`}
                      businessName={selectedVendor.businessName}
                      imageUrl={selectedVendor.imageUrl}
                      sizeClassName="h-[60px] w-[60px] sm:h-[72px] sm:w-[72px]"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[color:var(--color-ink)]">
                        {selectedVendor.businessName}
                      </p>
                      <p className="truncate text-xs text-[color:var(--color-muted)]">
                        {selectedVendor.category} · {selectedVendor.location}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedVendorId(null)}
                    className="btn-secondary px-3 py-1.5 text-xs lg:hidden"
                  >
                    Back
                  </button>
                </div>

                <div className="relative isolate min-h-0 flex-1 overflow-hidden overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 before:pointer-events-none before:absolute before:inset-0 before:z-0 before:bg-[url('/floral-texture.png')] before:bg-[length:420px_420px] before:bg-repeat before:opacity-[0.18] after:pointer-events-none after:absolute after:inset-0 after:z-0 after:bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0.62))]">
                  {selectedConversation.messages.length ? (
                    <div className="relative z-10 space-y-3">
                      {selectedConversation.messages.map((item) => (
                        <div
                          key={item.id}
                          className={`flex ${item.senderRole === "planner" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[94%] rounded-[1.25rem] px-3 py-2.5 sm:max-w-[92%] sm:px-4 sm:py-3 ${
                              item.senderRole === "planner"
                                ? "bg-[color:var(--color-brand-primary)] text-white"
                                : "bg-[rgba(106,62,124,0.08)] text-[color:var(--color-ink)]"
                            }`}
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">
                              {item.senderLabel}
                            </p>
                            <p className="mt-1 text-[0.84rem] leading-5 sm:text-sm sm:leading-6">{item.body}</p>
                            {formatDateTime(item.createdAt) ? (
                              <p className="mt-1 text-[11px] opacity-75">
                                {formatDateTime(item.createdAt)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="relative z-10 text-sm text-[color:var(--color-muted)]">
                      Start the conversation.
                    </p>
                  )}
                </div>

                <div className="border-t border-[rgba(106,62,124,0.12)] px-4 py-4">
                  <form action={createVendorInquiryAction} className="grid gap-2.5 sm:gap-3">
                    <input type="hidden" name="vendorId" value={selectedVendor.id} />
                    <input type="hidden" name="vendorSlug" value={selectedVendor.slug} />
                    <input type="hidden" name="contactMethod" value="planner_thread" />
                    <input type="hidden" name="nextPath" value={selectedNextPath} />
                    <textarea
                      name="message"
                      rows={3}
                      placeholder="Write your message to this vendor."
                      className="field-input min-h-[88px] rounded-[1.1rem] text-sm"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button type="submit" className="btn-primary w-full px-4 py-2 sm:w-auto">
                        Send Message
                      </button>
                      {buildWhatsAppLink(
                        selectedVendor.whatsapp,
                        selectedVendor.businessName,
                      ) ? (
                        <a
                          href={buildWhatsAppLink(
                            selectedVendor.whatsapp,
                            selectedVendor.businessName,
                          )!}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary w-full px-4 py-2 sm:w-auto"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                      <Link
                        href={`/vendors/${selectedVendor.slug}`}
                        className="btn-secondary w-full px-4 py-2 sm:w-auto"
                      >
                        View Profile
                      </Link>
                    </div>
                  </form>

                  <form
                    action={updatePlannerInquiryStatusAction}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    <input type="hidden" name="inquiryId" value={selectedConversation.id} />
                    <input type="hidden" name="nextPath" value={selectedNextPath} />
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
                    <button type="submit" className="btn-secondary w-full px-3 py-1.5 text-sm sm:w-auto">
                      Update Status
                    </button>
                  </form>
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
      )}
    </article>
  );
}

function buildPlannerThreadPath(vendorId: string, compareIds: string[]) {
  const params = new URLSearchParams();
  params.set("thread", vendorId);
  if (compareIds.length) {
    params.set("compare", compareIds.join(","));
  }
  return `/planner/dashboard?${params.toString()}`;
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

function getLastMessage(messages: InquiryMessage[]) {
  if (!messages.length) {
    return null;
  }
  return [...messages].sort((a, b) => toTime(a.createdAt) - toTime(b.createdAt)).at(-1) ?? null;
}

function getLastMessageTime(messages: InquiryMessage[], fallback: string) {
  const last = getLastMessage(messages);
  return toTime(last?.createdAt ?? fallback);
}

function toTime(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildWhatsAppLink(phone: string | null | undefined, businessName: string) {
  if (!phone) {
    return null;
  }

  const normalized = phone.replace(/[^\d+]/g, "");
  if (!normalized) {
    return null;
  }

  const text = encodeURIComponent(
    `Hello ${businessName}, I found your profile on Iyeoba Weddings and would like to ask about availability.`,
  );
  return `https://wa.me/${normalized.replace(/^\+/, "")}?text=${text}`;
}
