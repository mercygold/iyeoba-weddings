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
  const { data: userResult, error: authError } = await supabase.auth.getUser();
  const user = userResult.user;

  console.info("AI planner checklist route hit", {
    hasUserId: Boolean(user?.id),
  });

  if (authError || !user) {
    console.warn("AI planner checklist auth failed", {
      hasUserId: Boolean(user?.id),
      error: authError
        ? {
            message: authError.message,
            status: authError.status,
          }
        : null,
    });
    return NextResponse.json(
      { ok: false, error: "Sign in to add checklist items to your planner dashboard." },
      { status: 401 },
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  const userRole =
    typeof profile?.role === "string"
      ? profile.role
      : typeof user.user_metadata?.role === "string"
        ? user.user_metadata.role
        : "planner";

  console.info("AI planner checklist profile resolved", {
    hasUserId: Boolean(user.id),
    userRole,
    profileError: profileError ? serializeSupabaseError(profileError) : null,
  });

  if (userRole === "vendor") {
    return NextResponse.json(
      { ok: false, error: "Only planner accounts can add checklist items to the planner dashboard." },
      { status: 403 },
    );
  }

  let body: { items?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid checklist request." },
      { status: 400 },
    );
  }

  const requestedItems = normalizeRequestedItems(body.items);

  console.info("AI planner checklist add request", {
    hasUserId: Boolean(user.id),
    userRole,
    itemCount: requestedItems.length,
    itemTitles: requestedItems,
  });

  if (!requestedItems.length) {
    return NextResponse.json(
      { ok: false, error: "Choose at least one checklist item to add." },
      { status: 400 },
    );
  }

  const { data: blueprints, error: blueprintError } = await supabase
    .from("blueprints")
    .select("id, checklist_json")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (blueprintError) {
    console.error("AI planner checklist blueprint load failed", {
      table: "blueprints",
      userId: user.id,
      userRole,
      error: serializeSupabaseError(blueprintError),
    });
    return NextResponse.json(
      { ok: false, error: "We could not load your planner dashboard checklist right now." },
      { status: 500 },
    );
  }

  const blueprint = Array.isArray(blueprints) ? blueprints[0] ?? null : null;
  const currentItems = normalizeProgressItems(blueprint?.checklist_json);
  const existingKeys = new Set(currentItems.map((item) => item.key));
  const added: ProgressItem[] = [];
  const skipped: ProgressItem[] = [];

  for (const label of requestedItems) {
    const key = toProgressKey(label);

    if (!key || existingKeys.has(key)) {
      skipped.push({ key, label, status: "not_done" });
      continue;
    }

    const item = { key, label, status: "not_done" as const };
    currentItems.push(item);
    existingKeys.add(key);
    added.push(item);
  }

  if (!added.length) {
    return NextResponse.json({
      ok: true,
      added,
      skipped,
      message: "Already added.",
    });
  }

  if (blueprint?.id) {
    const { error } = await supabase
      .from("blueprints")
      .update({ checklist_json: currentItems })
      .eq("id", blueprint.id);

    if (error) {
      console.error("AI planner checklist update failed", {
        table: "blueprints",
        userId: user.id,
        userRole,
        blueprintId: blueprint.id,
        error: serializeSupabaseError(error),
      });
      return NextResponse.json(
        { ok: false, error: "We could not add checklist items right now." },
        { status: 500 },
      );
    }
  } else {
    const weddingId = await getPlannerPrimaryWeddingId(user.id);
    const { error } = await supabase.from("blueprints").insert({
      user_id: user.id,
      wedding_id: weddingId,
      summary: null,
      timeline_json: [],
      checklist_json: currentItems,
      vendor_categories_json: [],
      missing_items_json: [],
    });

    if (error) {
      console.error("AI planner checklist create failed", {
        table: "blueprints",
        userId: user.id,
        userRole,
        error: serializeSupabaseError(error),
      });
      return NextResponse.json(
        { ok: false, error: "We could not add checklist items right now." },
        { status: 500 },
      );
    }
  }

  revalidatePath("/planner/dashboard");

  console.info("AI planner checklist save succeeded", {
    hasUserId: Boolean(user.id),
    userRole,
    addedCount: added.length,
    skippedCount: skipped.length,
    status: 200,
  });

  return NextResponse.json({
    ok: true,
    added,
    skipped,
    message:
      skipped.length && !added.length
        ? "Already added."
        : skipped.length
          ? "New checklist items added. Some were already in your dashboard."
          : "Checklist item added to your planner dashboard.",
  });
}

function normalizeRequestedItems(items: unknown) {
  if (!Array.isArray(items)) {
    return [];
  }

  const seen = new Set<string>();
  return items
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.slice(0, 220))
    .filter((item) => {
      const key = toProgressKey(item);
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 20);
}

function normalizeProgressItems(value: unknown): ProgressItem[] {
  return Array.isArray(value)
    ? value
        .filter(
          (item): item is { key?: string; label?: string; status?: string } =>
            typeof item === "object" && item !== null,
        )
        .map((item) => ({
          key: String(item.key ?? ""),
          label: String(item.label ?? ""),
          status: normalizeProgressStatus(item.status),
        }))
        .filter((item) => item.key && item.label)
    : [];
}

function normalizeProgressStatus(value: unknown): ProgressStatus {
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
