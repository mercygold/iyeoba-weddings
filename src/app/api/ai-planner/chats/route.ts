import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

type PlannerIntake = {
  weddingType?: string;
  location?: string;
  guestCount?: string;
  budget?: string;
  weddingDate?: string;
  culture?: string;
  eventName?: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authResult, error: authError } = await supabase.auth.getUser();
  const user = authResult.user;

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: "Sign in to manage AI Planner chats." },
      { status: 401 },
    );
  }

  let body: {
    intent?: string;
    chatId?: string | null;
    weddingId?: string | null;
    intake?: PlannerIntake;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid AI Planner chat request." },
      { status: 400 },
    );
  }

  const intent = String(body.intent ?? "").trim();
  const chatId = normalizeUuid(body.chatId);

  if (intent === "createWedding") {
    const wedding = await createWeddingFromIntake(user.id, body.intake ?? {});
    if (!wedding) {
      return NextResponse.json(
        { ok: false, error: "We could not create this wedding event right now." },
        { status: 500 },
      );
    }

    revalidatePath("/ai-planner");
    revalidatePath("/planner/dashboard");
    return NextResponse.json({ ok: true, wedding });
  }

  if (intent === "clear") {
    if (!chatId) {
      return NextResponse.json(
        { ok: false, error: "Choose a chat to clear." },
        { status: 400 },
      );
    }

    const aiPlannerChats = supabase.from("ai_planner_chats") as any;
    const { data, error } = await aiPlannerChats
      .update({
        messages: [],
        plan: {},
      })
      .eq("id", chatId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error || !data?.id) {
      return NextResponse.json(
        { ok: false, error: "We could not clear this chat right now." },
        { status: 500 },
      );
    }

    revalidatePath("/ai-planner");
    return NextResponse.json({ ok: true, message: "Chat cleared." });
  }

  if (intent === "delete") {
    if (!chatId) {
      return NextResponse.json(
        { ok: false, error: "Choose a chat to delete." },
        { status: 400 },
      );
    }

    const aiPlannerChats = supabase.from("ai_planner_chats") as any;
    const { error } = await aiPlannerChats
      .delete()
      .eq("id", chatId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "We could not delete this chat right now." },
        { status: 500 },
      );
    }

    revalidatePath("/ai-planner");
    return NextResponse.json({ ok: true, message: "Chat deleted." });
  }

  return NextResponse.json(
    { ok: false, error: "Invalid AI Planner chat action." },
    { status: 400 },
  );
}

async function createWeddingFromIntake(userId: string, intake: PlannerIntake) {
  const supabase = await createSupabaseServerClient();
  const weddings = supabase.from("weddings") as any;
  const weddingType = cleanText(intake.weddingType) || "Wedding plan";
  const culture = cleanText(intake.culture) || "Not set";
  const location = cleanText(intake.location) || "Not set";
  const budgetRange = cleanText(intake.budget) || "Not set";
  const eventName =
    cleanText(intake.eventName) ||
    `${culture !== "Not set" ? culture : ""} ${weddingType}`.trim() ||
    "Wedding plan";

  const { data, error } = await weddings
    .insert({
      user_id: userId,
      event_name: eventName,
      wedding_type: weddingType,
      culture,
      location,
      guest_count: parseGuestCount(intake.guestCount),
      budget_range: budgetRange,
      wedding_date: cleanText(intake.weddingDate) || null,
    })
    .select("id, event_name, wedding_type, culture, location, guest_count, budget_range, wedding_date, created_at")
    .maybeSingle();

  if (error || !data?.id) {
    console.warn("AI Planner wedding create failed", {
      userId,
      error: error
        ? {
            code: error.code ?? null,
            message: error.message ?? null,
            details: error.details ?? null,
            hint: error.hint ?? null,
          }
        : null,
    });
    return null;
  }

  return {
    id: data.id,
    title: buildWeddingTitle(data),
    weddingType: stringValue(data.wedding_type),
    culture: stringValue(data.culture),
    location: stringValue(data.location),
    guestCount: data.guest_count === null ? null : Number(data.guest_count),
    budgetRange: stringValue(data.budget_range),
    weddingDate: stringValue(data.wedding_date),
    createdAt: stringValue(data.created_at),
  };
}

function buildWeddingTitle(row: Record<string, unknown>) {
  return (
    stringValue(row.event_name) ||
    `${stringValue(row.culture)} ${stringValue(row.wedding_type)}`.trim() ||
    "Wedding event"
  );
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 240) : "";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseGuestCount(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function normalizeUuid(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)
    ? raw
    : null;
}
