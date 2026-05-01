"use client";

import { useState } from "react";

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

  return (
    <>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        {latestStatusLabel ? (
          <div className="surface-soft rounded-[1.25rem] px-4 py-3 text-sm text-[color:var(--color-ink)]">
            <span className="font-semibold">Latest request:</span>{" "}
            {latestStatusLabel}
            {latestStatusDetail ? (
              <span className="text-[color:var(--color-muted)]"> — {latestStatusDetail}</span>
            ) : null}
          </div>
        ) : null}
        {canSubmit ? (
          <button type="button" className="btn-primary w-fit" onClick={() => setIsOpen(true)}>
            Request TikTok Feature
          </button>
        ) : null}
      </div>

      {latestAdminNotes ? (
        <p className="mt-3 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {latestAdminNotes}
        </p>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/35 px-4 py-6 sm:items-center sm:justify-center">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-[0_24px_70px_-30px_rgba(31,31,31,0.55)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--color-brand-primary)]">
                  TikTok Feature Request
                </p>
                <h3 className="font-display mt-2 text-2xl text-[color:var(--color-ink)]">
                  Submit content for review.
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close TikTok feature request form"
                className="rounded-full px-3 py-1 text-2xl leading-none text-[color:var(--color-muted)] hover:bg-[color:var(--color-soft)]"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>

            <form action={action} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
                Business / Brand Name
                <input
                  name="businessName"
                  defaultValue={businessName}
                  readOnly
                  className="field-input rounded-2xl bg-[color:var(--color-soft)]"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
                Category
                <input
                  name="category"
                  defaultValue={category}
                  readOnly
                  className="field-input rounded-2xl bg-[color:var(--color-soft)]"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
                TikTok or Instagram handle/link
                <input
                  name="socialLink"
                  defaultValue={socialLink}
                  required
                  placeholder="@yourbrand or https://..."
                  className="field-input rounded-2xl"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
                Content link
                <input
                  name="contentLink"
                  required
                  placeholder="TikTok, Instagram, Google Drive, Dropbox, YouTube, or portfolio link"
                  className="field-input rounded-2xl"
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
                Caption or feature note
                <textarea
                  name="caption"
                  rows={4}
                  placeholder="Tell us what you want highlighted, e.g. bridal makeup, decor setup, aso-oke collection, cake design, event planning, etc."
                  className="field-input min-h-[112px] rounded-2xl"
                />
              </label>

              <label className="flex items-start gap-3 rounded-[1.25rem] border border-[rgba(106,62,124,0.14)] p-4 text-sm leading-6 text-[color:var(--color-ink)]">
                <input
                  type="checkbox"
                  name="permissionConfirmed"
                  value="yes"
                  required
                  className="mt-1"
                />
                <span>
                  I confirm I own or have permission to use this content and allow Iyeoba Weddings to feature it on our social channels.
                </span>
              </label>

              <div className="flex flex-wrap gap-3">
                <button type="submit" className="btn-primary">
                  Submit Feature Request
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
