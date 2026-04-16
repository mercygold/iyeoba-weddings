import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AnalyticsEvent = {
  eventName: string;
  source?: string;
  path?: string;
  vendorSlug?: string;
  role?: string;
  payload?: Record<string, unknown>;
};

export async function trackServerEvent(event: AnalyticsEvent) {
  const row = {
    source: event.source ?? null,
    event: event.eventName,
    page: event.path ?? null,
  };

  const verboseRow = {
    event_name: event.eventName,
    source: event.source ?? null,
    path: event.path ?? null,
    vendor_slug: event.vendorSlug ?? null,
    role: event.role ?? null,
    payload: event.payload ?? {},
  };

  const adminClient = createSupabaseAdminClient();

  if (!adminClient) {
    console.info("tracking_event", row);
    return;
  }

  await adminClient.from("tracking").insert(row);
  await adminClient.from("analytics_events").insert(verboseRow);
}
