import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getPlannerPrimaryWeddingId } from "@/lib/inquiries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type BudgetCurrency = "NGN" | "USD" | "GBP" | "EUR" | "UNKNOWN";
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
type PlannerBudget = {
  currency: BudgetCurrency;
  totalBudget: number | null;
  allocatedAmount: number | null;
  remainingAmount: number | null;
  bufferPercentage: number | null;
  categories: BudgetCategory[];
  notes: string[];
  source: "ai" | "manual";
  updatedAt: string | null;
};

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authResult, error: authError } = await supabase.auth.getUser();
  const user = authResult.user;

  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: "Sign in to update your wedding budget." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid budget update request." },
      { status: 400 },
    );
  }

  const intent = String(body.intent ?? "").trim();
  const requestedWeddingId = normalizeUuid(body.weddingId);
  const weddingId = requestedWeddingId ?? await getPlannerPrimaryWeddingId(user.id);
  const { blueprint, error: loadError } = await getBlueprintForWedding({
    supabase,
    userId: user.id,
    weddingId,
    includeFallback: !requestedWeddingId,
  });

  if (loadError) {
    console.error("Planner budget API load failed", {
      hasUserId: Boolean(user.id),
      error: serializeSupabaseError(loadError),
    });
    return NextResponse.json(
      { ok: false, error: "We could not load your budget right now." },
      { status: 500 },
    );
  }

  const currentBudget = normalizePlannerBudgetPayload(blueprint?.budget_json);
  let nextBudget = currentBudget;

  if (intent === "updateTotal") {
    nextBudget = recalculateBudget({
      ...currentBudget,
      currency: normalizeBudgetCurrency(body.currency),
      totalBudget: parseBudgetNumber(body.totalBudget),
      source: "manual",
    });
  } else if (intent === "updateCategory") {
    const categoryId = String(body.categoryId ?? "").trim();
    const categoryName = String(body.categoryName ?? "").trim();
    if (!categoryId || !categoryName) {
      return NextResponse.json(
        { ok: false, error: "Add a category name before saving." },
        { status: 400 },
      );
    }

    nextBudget = recalculateBudget({
      ...currentBudget,
      source: "manual",
      categories: currentBudget.categories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              id: categoryId,
              name: categoryName,
              amount: parseBudgetNumber(body.amount),
              percentageMin: null,
              percentageMax: null,
              amountMin: null,
              amountMax: null,
              note: String(body.note ?? "").trim(),
              source: "manual" as const,
            }
          : category,
      ),
    });
  } else if (intent === "removeCategory") {
    const categoryId = String(body.categoryId ?? "").trim();
    nextBudget = recalculateBudget({
      ...currentBudget,
      source: "manual",
      categories: currentBudget.categories.filter((category) => category.id !== categoryId),
    });
  } else if (intent === "addCategory") {
    const categoryName = String(body.categoryName ?? "").trim();
    if (!categoryName) {
      return NextResponse.json(
        { ok: false, error: "Add a category name before saving." },
        { status: 400 },
      );
    }

    nextBudget = recalculateBudget({
      ...currentBudget,
      source: "manual",
      categories: [
        ...currentBudget.categories,
        {
          id: toPlannerBudgetKey(categoryName),
          name: categoryName,
          amount: parseBudgetNumber(body.amount),
          percentage: null,
          percentageMin: null,
          percentageMax: null,
          amountMin: null,
          amountMax: null,
          note: String(body.note ?? "").trim(),
          source: "manual" as const,
        },
      ],
    });
  } else {
    return NextResponse.json(
      { ok: false, error: "Invalid budget update action." },
      { status: 400 },
    );
  }

  const payload = {
    ...nextBudget,
    updatedAt: new Date().toISOString(),
  };

  if (blueprint?.id) {
    const { error } = await supabase
      .from("blueprints")
      .update({ budget_json: payload })
      .eq("id", blueprint.id);

    if (error) {
      console.error("Planner budget API update failed", {
        hasUserId: Boolean(user.id),
        blueprintId: blueprint.id,
        error: serializeSupabaseError(error),
      });
      return NextResponse.json(
        { ok: false, error: "We could not save this budget right now." },
        { status: 500 },
      );
    }
  } else {
    const { error } = await supabase.from("blueprints").insert({
      user_id: user.id,
      wedding_id: weddingId,
      summary: null,
      timeline_json: [],
      checklist_json: [],
      vendor_categories_json: [],
      missing_items_json: [],
      budget_json: payload,
    });

    if (error) {
      console.error("Planner budget API create failed", {
        hasUserId: Boolean(user.id),
        error: serializeSupabaseError(error),
      });
      return NextResponse.json(
        { ok: false, error: "We could not save this budget right now." },
        { status: 500 },
      );
    }
  }

  revalidatePath("/planner/dashboard");

  return NextResponse.json({
    ok: true,
    message: "Budget updated.",
    weddingId,
    budget: payload,
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
      .select("id, wedding_id, budget_json")
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
    .select("id, wedding_id, budget_json")
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

function normalizePlannerBudgetPayload(value: unknown): PlannerBudget {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  const categories = Array.isArray(record.categories)
    ? record.categories
        .filter((category): category is Record<string, unknown> =>
          Boolean(category && typeof category === "object" && !Array.isArray(category)),
        )
        .map((category) => ({
          id: String(category.id ?? toPlannerBudgetKey(String(category.name ?? ""))),
          name: String(category.name ?? ""),
          amount: parseBudgetNumber(category.amount),
          percentage: parseBudgetNumber(category.percentage),
          percentageMin: parseBudgetNumber(category.percentageMin),
          percentageMax: parseBudgetNumber(category.percentageMax),
          amountMin: parseBudgetNumber(category.amountMin),
          amountMax: parseBudgetNumber(category.amountMax),
          note: String(category.note ?? ""),
          source: category.source === "manual" ? "manual" as const : "ai" as const,
        }))
        .filter((category) => category.id && category.name)
    : [];
  const notes = Array.isArray(record.notes)
    ? record.notes.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0,
      )
    : [];

  return recalculateBudget({
    currency: normalizeBudgetCurrency(record.currency),
    totalBudget: parseBudgetNumber(record.totalBudget),
    allocatedAmount: parseBudgetNumber(record.allocatedAmount),
    remainingAmount: parseBudgetNumber(record.remainingAmount),
    bufferPercentage: parseBudgetNumber(record.bufferPercentage),
    categories,
    notes,
    source: record.source === "manual" ? "manual" as const : "ai" as const,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : null,
  });
}

function recalculateBudget(budget: PlannerBudget): PlannerBudget {
  const allocatedAmount = budget.categories.reduce(
    (total, category) => total + (category.amount ?? category.amountMax ?? category.amountMin ?? 0),
    0,
  );

  return {
    ...budget,
    allocatedAmount,
    remainingAmount:
      budget.totalBudget === null ? null : budget.totalBudget - allocatedAmount,
    categories: budget.categories.map((category) => ({
      ...category,
      percentage:
        budget.totalBudget && category.amount !== null
          ? Math.round((category.amount / budget.totalBudget) * 1000) / 10
          : category.percentage,
    })),
  };
}

function normalizeBudgetCurrency(value: unknown): BudgetCurrency {
  const normalized = String(value ?? "").toUpperCase();
  if (normalized === "NGN" || normalized.includes("₦")) return "NGN";
  if (normalized === "USD" || normalized.includes("$")) return "USD";
  if (normalized === "GBP" || normalized.includes("£")) return "GBP";
  if (normalized === "EUR" || normalized.includes("€")) return "EUR";
  return "UNKNOWN";
}

function parseBudgetNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function toPlannerBudgetKey(value: string) {
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
