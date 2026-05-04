"use client";

import { useMemo, useState, useTransition } from "react";

import { DashboardCollapsibleSection } from "@/components/dashboard-collapsible-section";

type ProgressStatus = "not_done" | "ongoing" | "done";
type ProgressItem = {
  key: string;
  label: string;
  status: ProgressStatus;
};
type PlannerBudgetCategory = {
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
  currency: "NGN" | "USD" | "GBP" | "EUR" | "UNKNOWN";
  totalBudget: number | null;
  allocatedAmount: number | null;
  remainingAmount: number | null;
  bufferPercentage: number | null;
  categories: PlannerBudgetCategory[];
  notes: string[];
  source: "ai" | "manual";
  updatedAt: string | null;
};

export function PlannerProgressSection({
  initialItems,
  catalog,
}: {
  initialItems: ProgressItem[];
  catalog: string[];
}) {
  const [items, setItems] = useState(initialItems);
  const [draftStatuses, setDraftStatuses] = useState<Record<string, ProgressStatus>>({});
  const [selectedItem, setSelectedItem] = useState("");
  const [customItem, setCustomItem] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const availableItems = catalog.filter(
    (label) => !items.some((item) => item.label.toLowerCase() === label.toLowerCase()),
  );
  const addItemValue = customItem.trim() || selectedItem || availableItems[0] || "";

  async function updateProgress(payload: {
    intent: "save" | "add" | "remove";
    itemKey?: string;
    itemLabel?: string;
    status?: ProgressStatus;
  }) {
    setFeedback(null);
    setPendingKey(payload.itemKey ?? payload.itemLabel ?? payload.intent);

    try {
      const response = await fetch("/api/planner/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        error?: string;
        message?: string;
        items?: ProgressItem[];
      } | null;

      if (!response.ok || !result?.ok || !Array.isArray(result.items)) {
        throw new Error(result?.error || "We could not save this planning update right now.");
      }

      setItems(result.items);
      setDraftStatuses({});
      setSelectedItem("");
      setCustomItem("");
      setFeedback({ type: "success", text: result.message || "Planning progress updated." });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "We could not save this planning update right now.",
      });
    } finally {
      setPendingKey(null);
    }
  }

  const doneCount = items.filter((item) => item.status === "done").length;

  return (
    <DashboardCollapsibleSection
      eyebrow="Planning Progress"
      title="Track your planning items"
      defaultOpen
      storageKey="iyeoba:planner-dashboard:planning-progress"
      badge={
        <div className="flex flex-wrap justify-end gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
          <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">
            {items.filter((item) => item.status === "not_done").length} not done
          </span>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
            {items.filter((item) => item.status === "ongoing").length} ongoing
          </span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
            {doneCount} done
          </span>
        </div>
      }
    >

      {feedback ? (
        <p
          className={`mt-4 rounded-[1.25rem] px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "surface-soft text-[color:var(--color-brand-primary)]"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}

      <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[rgba(106,62,124,0.12)]">
        <div
          className="h-full rounded-full bg-[color:var(--color-brand-primary)]"
          style={{ width: `${Math.round((doneCount / Math.max(items.length, 1)) * 100)}%` }}
        />
      </div>

      <div className="mt-5 grid gap-2.5 sm:mt-6 sm:gap-3">
        {items.map((item) => {
          const draftStatus = draftStatuses[item.key] ?? item.status;
          const isSaving = pendingKey === item.key;
          return (
            <div
              key={item.key}
              className="surface-soft grid gap-3 rounded-[1.1rem] px-3 py-3 sm:grid-cols-[minmax(0,1fr)_11rem_7rem] sm:items-center sm:rounded-[1.3rem] sm:px-4 sm:py-3"
            >
              <p className="min-w-0 text-sm font-medium leading-snug text-[color:var(--color-ink)]">
                {item.label}
              </p>
              <select
                value={draftStatus}
                onChange={(event) =>
                  setDraftStatuses((current) => ({
                    ...current,
                    [item.key]: event.target.value as ProgressStatus,
                  }))
                }
                className="field-input w-full rounded-[999px] px-3 py-2 text-xs font-semibold"
              >
                <option value="not_done">Not done</option>
                <option value="ongoing">Ongoing</option>
                <option value="done">Done</option>
              </select>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
                <button
                  type="button"
                  disabled={Boolean(pendingKey)}
                  onClick={() =>
                    startTransition(() =>
                      void updateProgress({
                        intent: "save",
                        itemKey: item.key,
                        itemLabel: item.label,
                        status: draftStatus,
                      }),
                    )
                  }
                  className="btn-secondary w-full px-3 py-1.5 text-xs disabled:opacity-60 sm:text-sm"
                >
                  {isSaving ? "Saving" : "Save"}
                </button>
                <button
                  type="button"
                  disabled={Boolean(pendingKey)}
                  onClick={() =>
                    startTransition(() =>
                      void updateProgress({
                        intent: "remove",
                        itemKey: item.key,
                        itemLabel: item.label,
                      }),
                    )
                  }
                  className="btn-secondary w-full px-3 py-1.5 text-xs disabled:opacity-60 sm:text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2.5 sm:mt-5 sm:gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
            Add planning item
          </label>
          <select
            className="field-input mt-2 rounded-[1rem] px-3 py-2 text-sm"
            value={addItemValue}
            onChange={(event) => setSelectedItem(event.target.value)}
            disabled={!availableItems.length}
          >
            {availableItems.length ? (
              availableItems.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))
            ) : (
              <option value="">All suggested items added</option>
            )}
          </select>
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--color-muted)]">
            Or add custom item
          </label>
          <input
            type="text"
            value={customItem}
            onChange={(event) => setCustomItem(event.target.value)}
            placeholder="e.g. Traditional intro outfit"
            className="field-input mt-2 rounded-[1rem] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={!addItemValue || Boolean(pendingKey)}
          onClick={() =>
            startTransition(() =>
              void updateProgress({
                intent: "add",
                itemLabel: addItemValue,
                status: "not_done",
              }),
            )
          }
          className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
        >
          Add item
        </button>
      </div>
    </DashboardCollapsibleSection>
  );
}

export function WeddingBudgetSection({ initialBudget }: { initialBudget: PlannerBudget | null }) {
  const [budget, setBudget] = useState(initialBudget);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [addDraft, setAddDraft] = useState({ categoryName: "", amount: "", note: "" });
  const [, startTransition] = useTransition();
  const displayBudget = useMemo(() => recalculateBudget(budget), [budget]);
  const totalBudget = displayBudget?.totalBudget ?? null;
  const allocatedAmount =
    displayBudget?.categories.reduce((total, item) => total + (item.amount ?? 0), 0) ?? 0;
  const remainingAmount = totalBudget === null ? null : totalBudget - allocatedAmount;
  const isOverBudget = totalBudget !== null && allocatedAmount > totalBudget;

  async function updateBudget(payload: Record<string, unknown>, pendingId: string) {
    setFeedback(null);
    setPendingKey(pendingId);

    try {
      const response = await fetch("/api/planner/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        error?: string;
        message?: string;
        budget?: PlannerBudget;
      } | null;

      if (!response.ok || !result?.ok || !result.budget) {
        throw new Error(result?.error || "We could not save this budget right now.");
      }

      setBudget(result.budget);
      setAddDraft({ categoryName: "", amount: "", note: "" });
      setFeedback({ type: "success", text: result.message || "Budget updated." });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "We could not save this budget right now.",
      });
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <DashboardCollapsibleSection
      eyebrow="Wedding Budget"
      title="Edit your starter budget and track where your money is going."
      defaultOpen
      storageKey="iyeoba:planner-dashboard:wedding-budget"
      badge={
        displayBudget ? (
          <p className="surface-soft rounded-full px-3 py-1.5 text-xs font-semibold text-[color:var(--color-brand-primary)]">
            {displayBudget.source === "ai" ? "Imported from AI Planner" : "Manual budget"}
          </p>
        ) : null
      }
    >

      {feedback ? (
        <p
          className={`mt-4 rounded-[1.25rem] px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "surface-soft text-[color:var(--color-brand-primary)]"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}

      {!displayBudget ? (
        <div className="mt-5 surface-soft rounded-[1.35rem] p-5 text-sm leading-7 text-[color:var(--color-muted)]">
          No budget saved yet. Generate a plan in Iyeoba AI Planner and save the budget to your dashboard.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total budget" value={formatBudgetAmount(totalBudget, displayBudget.currency)} />
            <MetricCard label="Allocated" value={formatBudgetAmount(allocatedAmount, displayBudget.currency)} />
            <MetricCard label="Remaining / Buffer" value={formatBudgetAmount(remainingAmount, displayBudget.currency)} />
            <MetricCard label="Categories" value={String(displayBudget.categories.length)} />
          </div>
          {isOverBudget ? (
            <p className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              This budget is over your total estimate.
            </p>
          ) : null}

          <div className="mt-5 surface-soft grid gap-3 rounded-[1.35rem] p-4 sm:grid-cols-[1fr_1fr_auto]">
            <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
              Currency
              <select
                value={displayBudget.currency}
                onChange={(event) =>
                  setBudget((current) =>
                    current ? { ...current, currency: event.target.value as PlannerBudget["currency"] } : current,
                  )
                }
                className="field-input rounded-[1rem]"
              >
                <option value="NGN">NGN</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
                <option value="UNKNOWN">Other</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
              Total budget
              <input
                type="number"
                min="0"
                value={displayBudget.totalBudget ?? ""}
                onChange={(event) =>
                  setBudget((current) =>
                    current ? { ...current, totalBudget: parseBudgetNumber(event.target.value) } : current,
                  )
                }
                className="field-input rounded-[1rem]"
              />
            </label>
            <button
              type="button"
              disabled={Boolean(pendingKey)}
              onClick={() =>
                startTransition(() =>
                  void updateBudget(
                    {
                      intent: "updateTotal",
                      currency: displayBudget.currency,
                      totalBudget: displayBudget.totalBudget,
                    },
                    "total",
                  ),
                )
              }
              className="btn-primary h-fit self-end px-4 py-2 text-sm disabled:opacity-60"
            >
              {pendingKey === "total" ? "Saving" : "Save total"}
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            {displayBudget.categories.map((category) => {
              const percentage =
                totalBudget && category.amount !== null
                  ? Math.round((category.amount / totalBudget) * 1000) / 10
                  : category.percentage ?? category.percentageMax ?? category.percentageMin ?? 0;
              const amountDisplay = getBudgetCategoryAmountDisplay(category, displayBudget.currency);
              return (
                <div key={category.id} className="surface-soft rounded-[1.35rem] p-4">
                  <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_1fr_auto_auto] lg:items-end">
                    <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
                      Category
                      <input
                        value={category.name}
                        onChange={(event) =>
                          setBudget((current) => updateBudgetCategoryDraft(current, category.id, { name: event.target.value }))
                        }
                        className="field-input rounded-[1rem]"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
                      Amount
                      <input
                        type="number"
                        min="0"
                        value={category.amount ?? ""}
                        onChange={(event) =>
                          setBudget((current) =>
                            updateBudgetCategoryDraft(current, category.id, {
                              amount: parseBudgetNumber(event.target.value),
                            }),
                          )
                        }
                        className="field-input rounded-[1rem]"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
                      Note
                      <input
                        value={category.note}
                        onChange={(event) =>
                          setBudget((current) => updateBudgetCategoryDraft(current, category.id, { note: event.target.value }))
                        }
                        className="field-input rounded-[1rem]"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={Boolean(pendingKey)}
                      onClick={() =>
                        startTransition(() =>
                          void updateBudget(
                            {
                              intent: "updateCategory",
                              categoryId: category.id,
                              categoryName: category.name,
                              amount: category.amount,
                              note: category.note,
                            },
                            category.id,
                          ),
                        )
                      }
                      className="btn-secondary px-3 py-2 text-sm disabled:opacity-60"
                    >
                      {pendingKey === category.id ? "Saving" : "Save"}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(pendingKey)}
                      onClick={() =>
                        startTransition(() =>
                          void updateBudget(
                            {
                              intent: "removeCategory",
                              categoryId: category.id,
                            },
                            `remove-${category.id}`,
                          ),
                        )
                      }
                      className="btn-secondary px-3 py-2 text-sm disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-[color:var(--color-muted)]">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[rgba(106,62,124,0.12)]">
                      <div
                        className="h-full rounded-full bg-[color:var(--color-brand-primary)]"
                        style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
                      />
                    </div>
                    <span className="w-28 text-right font-semibold">{amountDisplay} · {percentage}%</span>
                  </div>
                  {category.note ? (
                    <p className="mt-2 text-xs leading-6 text-[color:var(--color-muted)]">
                      {category.note}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {displayBudget.notes.length ? (
            <div className="mt-5 surface-soft rounded-[1.35rem] p-4 text-sm leading-7 text-[color:var(--color-muted)]">
              <p className="font-semibold text-[color:var(--color-ink)]">Budget notes</p>
              <ul className="mt-2 space-y-2">
                {displayBudget.notes.map((note, index) => (
                  <li key={`budget-note-${index}`}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      <div className="mt-5 surface-soft grid gap-3 rounded-[1.35rem] p-4 lg:grid-cols-[1.2fr_0.8fr_1fr_auto] lg:items-end">
        <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
          Add category
          <input
            value={addDraft.categoryName}
            onChange={(event) => setAddDraft((current) => ({ ...current, categoryName: event.target.value }))}
            placeholder="e.g. Bridal party gifts"
            className="field-input rounded-[1rem]"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
          Amount
          <input
            value={addDraft.amount}
            onChange={(event) => setAddDraft((current) => ({ ...current, amount: event.target.value }))}
            type="number"
            min="0"
            className="field-input rounded-[1rem]"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
          Note
          <input
            value={addDraft.note}
            onChange={(event) => setAddDraft((current) => ({ ...current, note: event.target.value }))}
            placeholder="Optional"
            className="field-input rounded-[1rem]"
          />
        </label>
        <button
          type="button"
          disabled={Boolean(pendingKey) || !addDraft.categoryName.trim()}
          onClick={() =>
            startTransition(() =>
              void updateBudget(
                {
                  intent: "addCategory",
                  categoryName: addDraft.categoryName,
                  amount: addDraft.amount,
                  note: addDraft.note,
                },
                "add-category",
              ),
            )
          }
          className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
        >
          {pendingKey === "add-category" ? "Adding" : "Add"}
        </button>
      </div>
    </DashboardCollapsibleSection>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-soft rounded-[1.25rem] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-[color:var(--color-ink)]">{value}</p>
    </div>
  );
}

function formatBudgetAmount(amount: number | null, currency: PlannerBudget["currency"]) {
  if (amount === null) {
    return "Not set";
  }

  const symbol =
    currency === "NGN"
      ? "₦"
      : currency === "USD"
        ? "$"
        : currency === "GBP"
          ? "£"
          : currency === "EUR"
            ? "€"
            : "";

  return `${symbol}${Math.round(amount).toLocaleString()}`;
}

function getBudgetCategoryAmountDisplay(
  category: PlannerBudgetCategory,
  currency: PlannerBudget["currency"],
) {
  if (category.amount !== null) {
    return formatBudgetAmount(category.amount, currency);
  }
  if (category.amountMin !== null || category.amountMax !== null) {
    return `${formatBudgetAmount(category.amountMin, currency)} - ${formatBudgetAmount(category.amountMax, currency)}`;
  }
  if (category.percentageMin !== null || category.percentageMax !== null) {
    return `${category.percentageMin ?? category.percentageMax}% - ${category.percentageMax ?? category.percentageMin}%`;
  }
  if (category.percentage !== null) {
    return `${category.percentage}%`;
  }
  return "Estimate";
}

function updateBudgetCategoryDraft(
  budget: PlannerBudget | null,
  categoryId: string,
  patch: Partial<PlannerBudgetCategory>,
) {
  if (!budget) {
    return budget;
  }

  return {
    ...budget,
    categories: budget.categories.map((category) =>
      category.id === categoryId ? { ...category, ...patch, source: "manual" as const } : category,
    ),
  };
}

function recalculateBudget(budget: PlannerBudget | null): PlannerBudget | null {
  if (!budget) {
    return null;
  }

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

function parseBudgetNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}
