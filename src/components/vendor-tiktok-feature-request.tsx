"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";

import type { submitTikTokFeatureRequestAction } from "@/app/vendor/dashboard/actions";

type TikTokFeatureRequestProps = {
  action: typeof submitTikTokFeatureRequestAction;
  businessName: string;
  category: string;
  socialLink: string;
  latestStatusLabel?: string | null;
  latestStatusDetail?: string | null;
  latestAdminNotes?: string | null;
  canSubmit: boolean;
};

export function VendorTikTokFeatureRequest({
  action,
  businessName,
  category,
  socialLink,
  latestStatusLabel,
  latestStatusDetail,
  latestAdminNotes,
  canSubmit,
}: TikTokFeatureRequestProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        {latestStatusLabel ? (
          <div className="surface-soft rounded-[1.25rem] px-4 py-3 text-sm text-[color:var(--color-ink)]">
            <span className="font-semibold">Latest request:</span>{" "}
            {latestStatusLabel}
            {latestStatusDetail ? (
              <span className="text-[color:var(--color-muted)]">
                {" "}
                — {latestStatusDetail}
              </span>
            ) : null}
          </div>
        ) : null}
        {canSubmit ? (
          <button
            type="button"
            className="btn-primary w-fit"
            onClick={() => setIsOpen(true)}
          >
            Request TikTok Feature
          </button>
        ) : null}
      </div>

      {latestAdminNotes ? (
        <p className="mt-3 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {latestAdminNotes}
        </p>
      ) : null}

      {isOpen && mounted
        ? createPortal(
            <div className="fixed inset-0 z-[2147483646]" role="presentation">
          <button
            type="button"
            aria-label="Close TikTok feature request"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-[2px]"
          />
          <div className="fixed inset-0 z-[2147483647] flex items-center justify-center overflow-hidden px-4 py-4 sm:py-6">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="tiktok-feature-title"
              className="flex h-[85dvh] max-h-[85dvh] w-full max-w-[840px] flex-col overflow-hidden rounded-[1.75rem] border border-[rgba(201,161,91,0.22)] bg-white shadow-[0_32px_90px_-28px_rgba(31,31,31,0.72)]"
            >
              <form action={action} className="flex h-full min-h-0 flex-col">
                <div className="shrink-0 border-b border-[rgba(106,62,124,0.12)] bg-white px-5 py-4 sm:px-7">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand-primary)]">
                        TikTok feature request
                      </p>
                      <h2
                        id="tiktok-feature-title"
                        className="font-display mt-2 text-2xl text-[color:var(--color-ink)]"
                      >
                        Send your content for review
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="rounded-full border border-[rgba(106,62,124,0.16)] px-3 py-1.5 text-sm font-semibold text-[color:var(--color-brand-primary)]"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#fff_0%,#FAF9F7_100%)] px-5 py-5 sm:px-7">
                  <div className="grid gap-4">
                    <label className="grid gap-2 text-sm font-semibold text-[color:var(--color-ink)]">
                      Business / Brand Name
                      <input
                        name="businessName"
                        defaultValue={businessName}
                        readOnly
                        className="field-input rounded-[1.1rem] bg-[rgba(250,249,247,0.84)] text-sm"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-[color:var(--color-ink)]">
                      Category
                      <input
                        name="category"
                        defaultValue={category}
                        readOnly
                        className="field-input rounded-[1.1rem] bg-[rgba(250,249,247,0.84)] text-sm"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-[color:var(--color-ink)]">
                      TikTok or Instagram handle/link *
                      <input
                        name="socialLink"
                        defaultValue={socialLink}
                        required
                        placeholder="@yourbrand or https://..."
                        className="field-input rounded-[1.1rem] text-sm"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-[color:var(--color-ink)]">
                      Content link *
                      <input
                        name="contentLink"
                        required
                        placeholder="TikTok, Instagram, Google Drive, Dropbox, YouTube, or portfolio link"
                        className="field-input rounded-[1.1rem] text-sm"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-[color:var(--color-ink)]">
                      Caption or feature note
                      <textarea
                        name="caption"
                        rows={4}
                        placeholder="Tell us what you want highlighted, e.g. bridal makeup, decor setup, aso-oke collection, cake design, event planning, etc."
                        className="field-input min-h-[112px] rounded-[1.1rem] text-sm"
                      />
                    </label>

                    <label className="flex gap-3 rounded-[1.1rem] border border-[rgba(106,62,124,0.12)] bg-[rgba(250,249,247,0.72)] px-4 py-3 text-sm leading-6 text-[color:var(--color-ink)]">
                      <input
                        type="checkbox"
                        name="permissionConfirmed"
                        value="yes"
                        required
                        className="mt-1 h-4 w-4 accent-[color:var(--color-brand-primary)]"
                      />
                      <span>
                        I confirm I own or have permission to use this content and allow Iyeoba Weddings to feature it on our social channels.
                      </span>
                    </label>
                  </div>
                </div>

                <TikTokFeatureRequestFooter onCancel={() => setIsOpen(false)} />
              </form>
            </div>
          </div>
        </div>,
            document.body,
          )
        : null}
    </>
  );
}

function TikTokFeatureRequestFooter({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();

  return (
    <div className="sticky bottom-0 z-10 flex shrink-0 flex-col-reverse gap-2 border-t border-[rgba(106,62,124,0.12)] bg-white px-5 py-4 shadow-[0_-18px_34px_-32px_rgba(31,31,31,0.55)] sm:flex-row sm:justify-end sm:px-7">
      <button
        type="button"
        onClick={onCancel}
        className="btn-secondary min-h-11 px-5 py-2 text-sm"
        disabled={pending}
      >
        Cancel
      </button>
      <button
        type="submit"
        className="btn-primary min-h-11 px-5 py-2 text-sm"
        disabled={pending}
      >
        {pending ? "Sending..." : "Send Request"}
      </button>
    </div>
  );
}
