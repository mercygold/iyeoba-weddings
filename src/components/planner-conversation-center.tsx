"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";

import { DashboardCollapsibleSection } from "@/components/dashboard-collapsible-section";
import { PendingSubmitButton } from "@/components/pending-submit-button";
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
  attachments: MessageAttachment[];
};

type MessageAttachment = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  signedUrl: string | null;
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

  const sortedConversations = useMemo(
    () =>
      [...conversations].sort((a, b) => {
        const aLast = getLastMessageTime(a.messages, a.createdAt);
        const bLast = getLastMessageTime(b.messages, b.createdAt);
        return bLast - aLast;
      }),
    [conversations],
  );
  const hasActiveConversation = Boolean(
    initialVendorId &&
      conversations.some((conversation) => conversation.vendor.id === initialVendorId),
  );

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      if (
        initialVendorId &&
        conversations.some((conversation) => conversation.vendor.id === initialVendorId)
      ) {
        setSelectedVendorId(initialVendorId);
        return;
      }

      if (
        selectedVendorId &&
        conversations.some((conversation) => conversation.vendor.id === selectedVendorId)
      ) {
        return;
      }

      setSelectedVendorId(sortedConversations[0]?.vendor.id ?? null);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [conversations, initialVendorId, selectedVendorId, sortedConversations]);

  return (
    <DashboardCollapsibleSection
      eyebrow="Conversations"
      title="Planner and vendor chat"
      defaultOpen={hasActiveConversation || sortedConversations.length > 0}
      priorityOpen={hasActiveConversation}
      storageKey="iyeoba:planner-dashboard:conversations"
    >
      {!sortedConversations.length ? (
        <p className="mt-4 text-sm leading-7 text-[color:var(--color-muted)]">
          No conversations yet.
        </p>
      ) : (
        <div className="mt-4 grid min-h-[320px] gap-3 sm:mt-5 sm:gap-4 lg:min-h-[560px] lg:grid-cols-[320px_1fr]">
          <div
            className={`min-h-0 ${selectedConversation ? "hidden lg:block" : "block"}`}
          >
            <div className="h-full max-h-[62dvh] overflow-y-auto rounded-[1.3rem] border border-[rgba(106,62,124,0.1)] bg-white p-2 lg:max-h-none">
              {sortedConversations.map((conversation) => {
                const lastMessage = getLastMessage(conversation.messages);
                const isActive = selectedVendorId === conversation.vendor.id;

                return (
                  <button
                    key={conversation.vendor.id}
                    type="button"
                    onClick={() => setSelectedVendorId(conversation.vendor.id)}
                    className={`min-h-11 w-full touch-manipulation rounded-[1rem] px-3 py-3 text-left transition-all duration-200 ${
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
                    className="btn-secondary min-h-11 px-3 py-2 text-xs lg:hidden"
                  >
                    Back
                  </button>
                </div>

                <div className="relative isolate min-h-[260px] max-h-[58dvh] flex-1 overflow-hidden overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 lg:max-h-none before:pointer-events-none before:absolute before:inset-0 before:z-0 before:bg-[url('/floral-texture.png')] before:bg-[length:420px_420px] before:bg-repeat before:opacity-[0.18] after:pointer-events-none after:absolute after:inset-0 after:z-0 after:bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0.62))]">
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
                            <MessageAttachments attachments={item.attachments} />
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
                  <form
                    action={createVendorInquiryAction}
                    className="grid gap-2.5 sm:gap-3"
                  >
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
                    <AttachmentPicker />
                    <div className="grid gap-2 sm:grid-cols-[auto_auto_auto] sm:items-center">
                      <PendingSubmitButton pendingLabel="Sending..." className="btn-primary min-h-11 w-full px-4 py-2 text-sm sm:w-auto">
                        Send Message
                      </PendingSubmitButton>
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
                          className="btn-secondary flex min-h-11 items-center justify-center px-4 py-2 text-sm"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                      <Link
                        href={`/vendors/${selectedVendor.slug}`}
                        className="btn-secondary flex min-h-11 items-center justify-center px-4 py-2 text-sm"
                      >
                        View Profile
                      </Link>
                    </div>
                  </form>

                  <form
                    action={updatePlannerInquiryStatusAction}
                    className="mt-3 grid gap-2 rounded-[1.25rem] border border-[rgba(106,62,124,0.1)] bg-[rgba(250,249,247,0.72)] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <input type="hidden" name="inquiryId" value={selectedConversation.id} />
                    <input type="hidden" name="nextPath" value={selectedNextPath} />
                    <select
                      name="status"
                      defaultValue={selectedConversation.threadStatus}
                      className="field-input min-h-11 rounded-[999px] px-4 py-2 text-sm"
                    >
                      <option value="open">Open</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                      <option value="archived">Archived</option>
                    </select>
                    <PendingSubmitButton pendingLabel="Updating..." className="btn-primary min-h-11 w-full px-5 py-2 text-sm sm:w-auto">
                      Update Status
                    </PendingSubmitButton>
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
    </DashboardCollapsibleSection>
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

function AttachmentPicker() {
  const inputId = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-[1.1rem] border border-[rgba(106,62,124,0.12)] bg-[rgba(250,249,247,0.78)] p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={inputId}
          className="inline-flex cursor-pointer items-center rounded-full border border-[color:var(--color-brand-accent)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--color-brand-primary)] shadow-sm transition hover:bg-[rgba(201,161,91,0.1)]"
        >
          Attach file
        </label>
        <input
          id={inputId}
          name="attachments"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          multiple
          className="sr-only"
          onChange={(event) => {
            const selected = Array.from(event.target.files ?? []);
            const validation = validateSelectedFiles(selected);
            setError(validation);
            setFiles(validation ? [] : selected);
            if (validation) {
              event.target.value = "";
            }
          }}
        />
        <span className="text-xs font-semibold text-[color:var(--color-muted)]">
          JPG, PNG, WEBP, or PDF. Up to 3 files.
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-[color:var(--color-muted)]">
        Only share files needed for wedding planning. Verification documents should be uploaded through the verification section, not chat.
      </p>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {files.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {files.map((file) => (
            <span
              key={`${file.name}-${file.size}`}
              className="rounded-full bg-[rgba(106,62,124,0.08)] px-3 py-1 text-xs text-[color:var(--color-ink)]"
            >
              {file.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MessageAttachments({
  attachments,
}: {
  attachments: MessageAttachment[];
}) {
  if (!attachments?.length) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2">
      {attachments.map((attachment) => {
        const isImage = attachment.fileType.startsWith("image/");
        return (
          <a
            key={attachment.id}
            href={attachment.signedUrl ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-[1rem] border border-black/10 bg-white/70 text-[color:var(--color-ink)]"
          >
            {isImage && attachment.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attachment.signedUrl}
                alt={attachment.fileName}
                className="max-h-44 w-full object-cover"
              />
            ) : (
              <div className="px-3 py-2 text-xs font-semibold">
                {attachment.fileName}
              </div>
            )}
          </a>
        );
      })}
    </div>
  );
}

function validateSelectedFiles(files: File[]) {
  if (files.length > 3) {
    return "You can attach up to 3 files per message.";
  }

  const allowedTypes = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ]);
  for (const file of files) {
    if (!allowedTypes.has(file.type)) {
      return "Attachments must be JPG, PNG, WEBP, or PDF files.";
    }
    if (file.size > 10 * 1024 * 1024) {
      return "Each attachment must be 10MB or smaller.";
    }
  }

  return null;
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
