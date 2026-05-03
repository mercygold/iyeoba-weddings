"use client";

import { useId, useState } from "react";

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
  attachments: MessageAttachment[];
};

type MessageAttachment = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  signedUrl: string | null;
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

              <div className="relative isolate min-h-0 flex-1 overflow-hidden overflow-y-auto px-4 py-4 before:pointer-events-none before:absolute before:inset-0 before:z-0 before:bg-[url('/floral-texture.png')] before:bg-[length:420px_420px] before:bg-repeat before:opacity-[0.18] after:pointer-events-none after:absolute after:inset-0 after:z-0 after:bg-[linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0.62))]">
                {selectedInquiry.messages.length ? (
                  <div className="relative z-10 space-y-3">
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
                          <MessageAttachments attachments={message.attachments} />
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
                  <p className="relative z-10 text-sm text-[color:var(--color-muted)]">
                    Start the conversation.
                  </p>
                )}
              </div>

              <div className="border-t border-[rgba(106,62,124,0.12)] px-4 py-4">
                <form
                  action={replyToInquiryAction}
                  className="grid gap-3"
                >
                  <input type="hidden" name="inquiryId" value={selectedInquiry.id} />
                  <input type="hidden" name="nextPath" value={selectedNextPath} />
                  <textarea
                    name="message"
                    rows={3}
                    placeholder="Send a reply before moving the conversation to WhatsApp or email."
                    className="field-input min-h-[90px] rounded-[1.25rem] text-sm"
                  />
                  <AttachmentPicker />
                  <button type="submit" className="btn-primary w-full px-4 py-2 sm:w-auto">
                    Reply
                  </button>
                </form>

                <div className="mt-3 grid gap-3 rounded-[1.25rem] border border-[rgba(106,62,124,0.1)] bg-[rgba(250,249,247,0.72)] p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
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
                        className="btn-secondary flex min-h-11 items-center justify-center px-4 py-2 text-sm"
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
                        className="btn-secondary flex min-h-11 items-center justify-center px-4 py-2 text-sm"
                      >
                        Email
                      </a>
                    ) : null}
                  </div>

                  <form
                    action={updateInquiryStatusAction}
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <input type="hidden" name="inquiryId" value={selectedInquiry.id} />
                    <input type="hidden" name="nextPath" value={selectedNextPath} />
                    <select
                      name="status"
                      defaultValue={selectedInquiry.threadStatus}
                      className="field-input min-h-11 rounded-[999px] px-4 py-2 text-sm"
                    >
                      <option value="open">Open</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                      <option value="archived">Archived</option>
                    </select>
                    <button type="submit" className="btn-primary min-h-11 w-full px-5 py-2 text-sm sm:w-auto">
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
