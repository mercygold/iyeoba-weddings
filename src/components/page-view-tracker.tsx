"use client";

import { useEffect } from "react";

import { trackClientEvent } from "@/lib/analytics-client";

export function PageViewTracker({
  eventName,
  source,
  vendorSlug,
  path,
}: {
  eventName: string;
  source?: string;
  vendorSlug?: string;
  path?: string;
}) {
  useEffect(() => {
    trackClientEvent({
      eventName,
      source,
      vendorSlug,
      path: path ?? window.location.pathname,
    });
  }, [eventName, path, source, vendorSlug]);

  return null;
}
