"use client";

type ClientAnalyticsEvent = {
  eventName: string;
  source?: string;
  path?: string;
  vendorSlug?: string;
  role?: string;
  payload?: Record<string, unknown>;
};

export function trackClientEvent(event: ClientAnalyticsEvent) {
  const body = JSON.stringify(event);

  if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/track", blob);
    return;
  }

  void fetch("/api/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  });
}
