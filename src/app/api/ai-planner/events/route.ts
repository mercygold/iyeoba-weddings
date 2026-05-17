import { NextResponse } from "next/server";

import { resolvePlannerOwnerIdForSupabase } from "@/lib/planner-owner";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: authResult, error: authError } = await supabase.auth.getUser();
  const user = authResult.user;

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: "Sign in to load your events." },
      { status: 401 },
    );
  }

  const ownerId = await resolvePlannerOwnerIdForSupabase(supabase, user.id);
  const result = await loadWeddingEvents(ownerId);

  if (result.loadError) {
    return NextResponse.json(
      { ok: false, error: "Could not load your events" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, events: result.events });
}

async function loadWeddingEvents(userId: string) {
  const supabase = await createSupabaseServerClient();
  const selectAttempts = [
    "id, event_name, title, wedding_type, culture, location, guest_count, budget_range, wedding_date, created_at",
    "id, event_name, wedding_type, culture, location, guest_count, budget_range, wedding_date, created_at",
    "id, title, wedding_type, culture, location, guest_count, budget_range, wedding_date, created_at",
    "id, event_name, wedding_type, culture, location, guest_count, budget_range, created_at",
    "id, title, wedding_type, culture, location, guest_count, budget_range, created_at",
    "id, event_name, title, wedding_type, culture, location, guest_count, budget, created_at",
    "id, culture, wedding_type, location, guest_count, created_at",
  ] as const;

  let rows: Array<Record<string, unknown>> = [];

  for (const select of selectAttempts) {
    const result = await supabase
      .from("weddings")
      .select(select)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!result.error) {
      rows = Array.isArray(result.data) ? (result.data as Array<Record<string, unknown>>) : [];
      return {
        loadError: false,
        events: rows.map((row) => ({
          id: String(row.id),
          title: buildWeddingTitle(row),
          weddingType: stringValue(row.wedding_type),
          culture: stringValue(row.culture),
          location: stringValue(row.location),
          guestCount: row.guest_count === null ? null : Number(row.guest_count),
          budgetRange: stringValue(row.budget_range),
          weddingDate: stringValue(row.wedding_date) || null,
          createdAt: stringValue(row.created_at) || null,
        })),
      };
    }

    if (!isMissingColumnError(result.error)) {
      console.warn("AI Planner events load failed", {
        userId,
        code: result.error.code ?? null,
        message: result.error.message,
        details: result.error.details ?? null,
        hint: result.error.hint ?? null,
      });
      return { loadError: true, events: [] };
    }
  }

  return { loadError: true, events: [] };
}

function buildWeddingTitle(row: Record<string, unknown>) {
  const explicitTitle = stringValue(row.event_name) || stringValue(row.title);
  const detailTitle = `${stringValue(row.culture)} ${stringValue(row.wedding_type)}`.trim();

  if (explicitTitle && !isPlaceholderWeddingTitle(explicitTitle)) {
    return explicitTitle;
  }

  return detailTitle || "Wedding event";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isMissingColumnError(error: {
  code?: string | null;
  message?: string | null;
}) {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.code === "PGRST204" ||
    (message.includes("column") &&
      (message.includes("does not exist") || message.includes("could not find")))
  );
}

function isPlaceholderWeddingTitle(value: string) {
  return ["wedding plan", "general planning"].includes(value.trim().toLowerCase());
}
