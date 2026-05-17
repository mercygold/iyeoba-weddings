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
  const vendorIdError = getVendorIdError(vendorId);

  return (
    <form
      action={action}
      data-vendor-id={vendorId}
      onSubmit={(event) => {
        setError(null);
        setHideServerError(true);
        if (vendorIdError) {
          event.preventDefault();
          setError(vendorIdError);
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
          const nextError = getVendorIdError(startedVendorId);
          if (nextError) {
            setError(nextError);
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
    if (getVendorIdError(vendorId)) {
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
      className={`${className} min-h-11 touch-manipulation`}
    >
      {pending ? "Starting..." : "Start Inquiry"}
    </button>
  );
}

function getVendorIdError(vendorId: string) {
  if (!vendorId) {
    return "Vendor record was not found.";
  }

  if (!isUuid(vendorId)) {
    return "Vendor record was not found.";
  }

  return null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
