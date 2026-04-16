"use client";

import { useEffect } from "react";

import { trackClientEvent } from "@/lib/analytics-client";

export function ReferralHero({
  sourceParam,
}: {
  sourceParam?: string;
}) {
  useEffect(() => {
    const fromReferrer =
      typeof document !== "undefined" &&
      document.referrer.toLowerCase().includes("tiktok.com");

    if (sourceParam === "tiktok" || fromReferrer) {
      trackClientEvent({
        eventName: "tiktok_landing_view",
        source: "tiktok",
        path: "/from-tiktok",
        payload: {
          referrer: typeof document !== "undefined" ? document.referrer : "",
        },
      });
    }
  }, [sourceParam]);

  return (
    <div className="surface-soft rounded-[1.5rem] px-4 py-3 text-sm font-medium text-[color:var(--color-brand-primary)]">
      {sourceParam === "tiktok"
        ? "TikTok referral detected. Explore vendors inspired by the videos you just watched."
        : "Designed for TikTok traffic: browse trusted vendors, then continue privately in Planner if you sign in."}
    </div>
  );
}
