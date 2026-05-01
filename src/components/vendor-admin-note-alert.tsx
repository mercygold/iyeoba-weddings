"use client";

import { useEffect, useState } from "react";

type VendorAdminNoteAlertProps = {
  noteId: string;
  note: string;
  vendorId: string;
};

export function VendorAdminNoteAlert({
  noteId,
  note,
  vendorId,
}: VendorAdminNoteAlertProps) {
  const storageKey = `iyeoba-admin-note-dismissed:${vendorId}:${noteId}`;
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  if (dismissed) {
    return null;
  }

  return (
    <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-amber-950">Message from Iyeoba Admin</p>
          <p className="mt-1">{note}</p>
        </div>
        <button
          type="button"
          className="rounded-full px-2 py-1 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-100"
          onClick={() => {
            window.localStorage.setItem(storageKey, "1");
            setDismissed(true);
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
