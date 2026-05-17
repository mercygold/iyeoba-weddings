import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getPlannerPrimaryWeddingId } from "@/lib/inquiries";
import { resolvePlannerOwnerIdForSupabase } from "@/lib/planner-owner";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type BudgetCategory = {
  id: string;
  name: string;
  amount: number | null;
  percentage: number | null;
  percentageMin: number | null;
  percentageMax: number | null;
  amountMin: number | null;
  amountMax: number | null;
  note: string;
  source: "ai" | "manual";
};

type SavedBudget = {
  currency: "NGN" | "USD" | "GBP" | "EUR" | "UNKNOWN";
  totalBudget: number | null;
  allocatedAmount: number | null;
  remainingAmount: number | null;
  bufferPercentage: number | null;
  categories: BudgetCategory[];
  notes: string[];
  source: "ai" | "manual";
  updatedAt: string;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userResult, error: authError } = await supabase.auth.getUser();
  const user = userResult.user;

  console.info("AI planner budget route hit", {
    hasUserId: Boolean(user?.id),
  });

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: "Sign in as a planner to save this budget to your dashboard." },
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

  if (userRole === "vendor") {
    return NextResponse.json(
      { ok: false, error: "Only planner accounts can save budgets to the planner dashboard." },
      { status: 403 },
    );
  }
  const ownerId = await resolvePlannerOwnerIdForSupabase(supabase, user.id);

  let body: { budget?: unknown; weddingId?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid budget request." },
      { status: 400 },
    );
  }

  const budget = normalizeBudgetPayload(body.budget);
  const requestedWeddingId = normalizeUuid(body.weddingId);
  const weddingId = requestedWeddingId ?? await getPlannerPrimaryWeddingId(ownerId);

  console.info("AI planner budget save request", {
    hasUserId: Boolean(ownerId),
    userRole,
    hasBudgetPayload: Boolean(body.budget),
    categoryCount: budget.categories.length,
    hasNotes: budget.notes.length > 0,
  });

  if (!budget.categories.length && !budget.notes.length && !budget.totalBudget) {
    return NextResponse.json(
      { ok: false, error: "No budget details were available to save." },
      { status: 400 },
    );
  }

  const { blueprint, error: blueprintError } = await getBlueprintForWedding({
    supabase,
    userId: ownerId,
    weddingId,
    includeFallback: !requestedWeddingId,
  });

  if (blueprintError) {
    console.error("AI planner budget blueprint load failed", {
      table: "blueprints",
      hasUserId: Boolean(ownerId),
      userRole,
      error: serializeSupabaseError(blueprintError),
    });
    return NextResponse.json(
      { ok: false, error: "We could not load your dashboard budget right now." },
      { status: 500 },
    );
  }

  let savedBlueprintId = blueprint?.id ?? null;

  console.info("AI planner budget blueprint selected", {
    hasUserId: Boolean(ownerId),
    userRole,
    blueprintId: savedBlueprintId,
    selectedWeddingId: weddingId,
    blueprintUserMatches: blueprint?.user_id === ownerId,
    existingBudgetJsonExists: Boolean(
      blueprint?.budget_json &&
        typeof blueprint.budget_json === "object" &&
        !Array.isArray(blueprint.budget_json),
    ),
    budgetJsonCategoriesCount:
      blueprint?.budget_json &&
      typeof blueprint.budget_json === "object" &&
      !Array.isArray(blueprint.budget_json) &&
      Array.isArray((blueprint.budget_json as { categories?: unknown }).categories)
        ? (blueprint.budget_json as { categories: unknown[] }).categories.length
        : 0,
  });

  if (blueprint?.id) {
    const { error } = await supabase
      .from("blueprints")
      .update({ budget_json: budget })
      .eq("id", blueprint.id);

    if (error) {
      console.error("AI planner budget update failed", {
        table: "blueprints",
        hasUserId: Boolean(ownerId),
        userRole,
        error: serializeSupabaseError(error),
      });
      return NextResponse.json(
        { ok: false, error: "We could not save this budget right now." },
        { status: 500 },
      );
    }
    savedBlueprintId = blueprint.id;
  } else {
    const { error } = await supabase
      .from("blueprints")
      .insert({
        user_id: ownerId,
        wedding_id: weddingId,
        summary: null,
        timeline_json: [],
        checklist_json: [],
        vendor_categories_json: [],
        missing_items_json: [],
        budget_json: budget,
      });

    if (error) {
      console.error("AI planner budget create failed", {
        table: "blueprints",
        hasUserId: Boolean(ownerId),
        userRole,
        error: serializeSupabaseError(error),
      });
      return NextResponse.json(
        { ok: false, error: "We could not save this budget right now." },
        { status: 500 },
      );
    }
    const blueprints = supabase.from("blueprints") as any;
    let latestQuery = blueprints
      .select("id")
      .eq("user_id", ownerId)
      .order("created_at", { ascending: false });
    if (weddingId) {
      latestQuery = latestQuery.eq("wedding_id", weddingId);
    }
    const latestResult = await latestQuery;
    savedBlueprintId = Array.isArray(latestResult.data)
      ? latestResult.data[0]?.id ?? null
      : null;
  }

  const persistedResult = savedBlueprintId
    ? await supabase
        .from("blueprints")
        .select("id, user_id, budget_json")
        .eq("id", savedBlueprintId)
        .maybeSingle()
    : { data: null, error: null };
  const persistedBudget = persistedResult.data?.budget_json;
  const persistedCategoriesCount =
    persistedBudget &&
    typeof persistedBudget === "object" &&
    !Array.isArray(persistedBudget) &&
    Array.isArray((persistedBudget as { categories?: unknown }).categories)
      ? (persistedBudget as { categories: unknown[] }).categories.length
      : 0;

  console.info("AI planner budget persisted verification", {
    hasUserId: Boolean(ownerId),
    userRole,
    blueprintId: savedBlueprintId,
    weddingId,
    budgetJsonExists: Boolean(persistedBudget),
    budgetJsonCategoriesCount: persistedCategoriesCount,
    error: persistedResult.error ? serializeSupabaseError(persistedResult.error) : null,
  });

  if (persistedResult.error || !persistedBudget) {
    return NextResponse.json(
      { ok: false, error: "We could not confirm that your budget was saved." },
      { status: 500 },
    );
  }

  revalidatePath("/planner/dashboard");

  console.info("AI planner budget save succeeded", {
    hasUserId: Boolean(ownerId),
    userRole,
    saved: true,
    blueprintId: savedBlueprintId,
    weddingId,
    budgetJsonCategoriesCount: persistedCategoriesCount,
  });

  return NextResponse.json({
    ok: true,
    message: "Budget saved to dashboard.",
    categoriesSaved: budget.categories.length,
    totalBudget: budget.totalBudget,
    currency: budget.currency,
    blueprintId: savedBlueprintId,
    budget: {
      totalBudget: budget.totalBudget,
      allocatedAmount: budget.allocatedAmount,
      remainingAmount: budget.remainingAmount,
      categoryCount: budget.categories.length,
    },
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
      .select("id, user_id, wedding_id, budget_json")
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
    .select("id, user_id, wedding_id, budget_json")
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

function normalizeBudgetPayload(value: unknown): SavedBudget {
  const record = isRecord(value) ? value : {};
  const summary = isRecord(record.summary) ? record.summary : {};
  const totalBudget = parseMoneyValue(record.totalBudget ?? summary.total_budget);
  const notes = Array.isArray(record.notes)
    ? record.notes.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      )
    : Array.isArray(record.breakdownItems)
      ? record.breakdownItems.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
      : [];
  const categories = Array.isArray(record.categories)
    ? record.categories.map((item) => normalizeCategory(item, totalBudget)).filter(Boolean)
    : [];
  const normalizedCategories = categories as BudgetCategory[];
  const allocatedAmount = normalizedCategories.reduce(
    (total, item) => total + (item.amount ?? item.amountMax ?? item.amountMin ?? 0),
    0,
  );

  return {
    currency: normalizeCurrency(record.currency ?? summary.total_budget),
    totalBudget,
    allocatedAmount: allocatedAmount || parseMoneyValue(summary.allocated_amount),
    remainingAmount:
      totalBudget !== null
        ? totalBudget - allocatedAmount
        : parseMoneyValue(summary.remaining_buffer),
    bufferPercentage: parseNumber(record.bufferPercentage) ?? findBufferPercentage(normalizedCategories),
    categories: normalizedCategories,
    notes,
    source: "ai",
    updatedAt: new Date().toISOString(),
  };
}

function normalizeCategory(value: unknown, totalBudget: number | null): BudgetCategory | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = stringValue(value.name ?? value.category).trim();
  const amount = parseMoneyValue(value.amount);
  const percentage = parseNumber(value.percentage);
  const percentageMin = parseNumber(value.percentageMin);
  const percentageMax = parseNumber(value.percentageMax);
  const amountMin =
    parseMoneyValue(value.amountMin) ??
    (totalBudget !== null && percentageMin !== null
      ? totalBudget * (percentageMin / 100)
      : null);
  const amountMax =
    parseMoneyValue(value.amountMax) ??
    (totalBudget !== null && percentageMax !== null
      ? totalBudget * (percentageMax / 100)
      : null);

  if (!name) {
    return null;
  }

  return {
    id: toBudgetKey(stringValue(value.id) || name),
    name,
    amount,
    percentage,
    percentageMin,
    percentageMax,
    amountMin,
    amountMax,
    note: stringValue(value.note || value.amount || value.percentage),
    source: "ai",
  };
}

function normalizeCurrency(value: unknown): SavedBudget["currency"] {
  const text = stringValue(value).toUpperCase();
  if (text.includes("NGN") || text.includes("₦")) return "NGN";
  if (text.includes("USD") || text.includes("$")) return "USD";
  if (text.includes("GBP") || text.includes("£")) return "GBP";
  if (text.includes("EUR") || text.includes("€")) return "EUR";
  return "UNKNOWN";
}

function parseMoneyValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = stringValue(value);
  const numeric = Number(text.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const numeric = Number(stringValue(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function findBufferPercentage(categories: BudgetCategory[]) {
  const contingency = categories.find((item) => item.name.toLowerCase().includes("contingency"));
  return contingency?.percentage ?? contingency?.percentageMax ?? contingency?.percentageMin ?? null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function toBudgetKey(value: string) {
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
