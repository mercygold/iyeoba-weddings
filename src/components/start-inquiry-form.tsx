"use client";

import { useState, type MouseEvent } from "react";
import { useFormStatus } from "react-dom";

type StartInquiryFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  vendorId: string;
  vendorSlug: string;
  nextPath: string;
  serverError?: string | null;
  buttonClassName?: string;
};

export function StartInquiryForm({
  action,
  vendorId,
  vendorSlug,
  nextPath,
  serverError = null,
  buttonClassName = "btn-primary px-3 py-1.5 text-sm",
}: StartInquiryFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [hideServerError, setHideServerError] = useState(false);
  const visibleError = error ?? (hideServerError ? null : serverError);

  return (
    <form
      action={action}
      data-vendor-id={vendorId}
      onSubmit={(event) => {
        setError(null);
        setHideServerError(true);
        if (!vendorId) {
          event.preventDefault();
          setError("Vendor record was not found.");
        }
      }}
    >
      <input type="hidden" name="vendorId" value={vendorId} />
      <input type="hidden" name="vendorSlug" value={vendorSlug} />
      <input type="hidden" name="contactMethod" value="planner_saved_vendor" />
      <input type="hidden" name="nextPath" value={nextPath} />
      <input type="hidden" name="message" value="" />
      <StartInquirySubmitButton
        vendorId={vendorId}
        className={buttonClassName}
        onStart={(startedVendorId) => {
          setError(null);
          setHideServerError(true);
          if (!startedVendorId) {
            setError("Vendor record was not found.");
          }
        }}
      />
      {visibleError ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-red-700">
          {visibleError}
        </p>
      ) : null}
    </form>
  );
}

function StartInquirySubmitButton({
  vendorId,
  className,
  onStart,
}: {
  vendorId: string;
  className: string;
  onStart: (vendorId: string) => void;
}) {
  const { pending } = useFormStatus();

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onStart(vendorId);
    if (!vendorId) {
      event.preventDefault();
    }
  }

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      data-vendor-id={vendorId}
      onClick={handleClick}
      className={className}
    >
      {pending ? "Starting..." : "Start Inquiry"}
    </button>
  );
}
