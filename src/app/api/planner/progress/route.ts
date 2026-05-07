import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getPlannerPrimaryWeddingId } from "@/lib/inquiries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProgressStatus = "not_done" | "ongoing" | "done";
type ProgressItem = {
  key: string;
  label: string;
  status: ProgressStatus;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authResult, error: authError } = await supabase.auth.getUser();
  const user = authResult.user;

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: "Sign in to update planning progress." },
      { status: 401 },
    );
  }

  let body: {
    intent?: string;
    itemKey?: string;
    itemLabel?: string;
    status?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid planning progress request." },
      { status: 400 },
    );
  }

  const intent = String(body.intent ?? "").trim();
  const requestedWeddingId = normalizeUuid((body as { weddingId?: unknown }).weddingId);
  const weddingId = requestedWeddingId ?? await getPlannerPrimaryWeddingId(user.id);
  const itemLabel = String(body.itemLabel ?? "").trim();
  const itemKey = String(body.itemKey ?? "").trim() || toProgressKey(itemLabel);
  const status = normalizePlannerProgressStatus(body.status);

  if (!["save", "add", "remove"].includes(intent)) {
    return NextResponse.json(
      { ok: false, error: "Invalid planning progress action." },
      { status: 400 },
    );
  }

  if (!itemKey || (intent !== "remove" && !itemLabel)) {
    return NextResponse.json(
      { ok: false, error: "Choose a planning item before saving." },
      { status: 400 },
    );
  }

  const { blueprint, error: loadError } = await getBlueprintForWedding({
    supabase,
    userId: user.id,
    weddingId,
    includeFallback: !requestedWeddingId,
  });

  if (loadError) {
    console.error("Planner progress API load failed", {
      hasUserId: Boolean(user.id),
      error: serializeSupabaseError(loadError),
    });
    return NextResponse.json(
      { ok: false, error: "We could not load your planning progress right now." },
      { status: 500 },
    );
  }

  const currentItems = normalizeProgressItems(blueprint?.checklist_json);
  let nextItems: ProgressItem[];

  if (intent === "remove") {
    nextItems = currentItems.filter((item) => item.key !== itemKey);
  } else {
    const existingIndex = currentItems.findIndex((item) => item.key === itemKey);
    nextItems = [...currentItems];
    if (existingIndex >= 0) {
      nextItems[existingIndex] = { key: itemKey, label: itemLabel, status };
    } else {
      nextItems.push({ key: itemKey, label: itemLabel, status });
    }
  }

  if (blueprint?.id) {
    const { error } = await supabase
      .from("blueprints")
      .update({ checklist_json: nextItems })
      .eq("id", blueprint.id);

    if (error) {
      console.error("Planner progress API update failed", {
        hasUserId: Boolean(user.id),
        blueprintId: blueprint.id,
        error: serializeSupabaseError(error),
      });
      return NextResponse.json(
        { ok: false, error: "We could not save this planning update right now." },
        { status: 500 },
      );
    }
  } else {
    const { error } = await supabase.from("blueprints").insert({
      user_id: user.id,
      wedding_id: weddingId,
      summary: null,
      timeline_json: [],
      checklist_json: nextItems,
      vendor_categories_json: [],
      missing_items_json: [],
    });

    if (error) {
      console.error("Planner progress API create failed", {
        hasUserId: Boolean(user.id),
        error: serializeSupabaseError(error),
      });
      return NextResponse.json(
        { ok: false, error: "We could not save this planning update right now." },
        { status: 500 },
      );
    }
  }

  revalidatePath("/planner/dashboard");

  return NextResponse.json({
    ok: true,
    message: "Planning progress updated.",
    weddingId,
    items: nextItems,
  });
}

async function getBlueprintForWedding({
  supabase,
  userId,
  weddingId,
  includeFallback,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  weddingId: string | null;
  includeFallback: boolean;
}) {
  const blueprints = supabase.from("blueprints") as any;

  if (weddingId) {
    const scoped = await blueprints
      .select("id, wedding_id, checklist_json")
      .eq("user_id", userId)
      .eq("wedding_id", weddingId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (scoped.error || scoped.data?.[0]) {
      return { blueprint: scoped.data?.[0] ?? null, error: scoped.error };
    }
  }

  if (!includeFallback) {
    return { blueprint: null, error: null };
  }

  let fallbackQuery = blueprints
    .select("id, wedding_id, checklist_json")
    .eq("user_id", userId);
  if (weddingId) {
    fallbackQuery = fallbackQuery.is("wedding_id", null);
  }
  const fallback = await fallbackQuery
    .order("created_at", { ascending: false })
    .limit(1);

  return { blueprint: fallback.data?.[0] ?? null, error: fallback.error };
}

function normalizeUuid(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)
    ? raw
    : null;
}

function normalizeProgressItems(value: unknown): ProgressItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is { key?: string; label?: string; status?: string } =>
        typeof item === "object" && item !== null,
    )
    .map((item) => ({
      key: String(item.key ?? ""),
      label: String(item.label ?? ""),
      status: normalizePlannerProgressStatus(item.status),
    }))
    .filter((item) => item.key && item.label);
}

function normalizePlannerProgressStatus(value: unknown): ProgressStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "done" || normalized === "completed") {
    return "done";
  }
  if (normalized === "ongoing" || normalized === "in_progress") {
    return "ongoing";
  }
  return "not_done";
}

function toProgressKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function serializeSupabaseError(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}) {
  return {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}
