"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

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
export type PlannerGuest = {
  id: string;
  name: string;
  phone: string;
  email: string;
  guestGroup: string;
  inviteStatus: string;
  notes: string;
  createdAt: string | null;
  updatedAt: string | null;
};
export type PlannerGuestInvite = {
  id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestGroup: string;
  coupleName: string;
  weddingDate: string;
  weddingTime: string;
  venue: string;
  customMessage: string;
  inviteStatus: string;
  rsvpStatus: string;
  rsvpToken: string;
  sentAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};
type PlannerGuestWedding = {
  title: string;
  weddingType: string;
  location: string;
  weddingDate: string | null;
};

const guestGroupOptions = [
  "Bride family",
  "Groom family",
  "Friend",
  "Colleague",
  "Vendor",
  "Other",
];

const inviteStatusOptions = [
  "Not invited",
  "Invited",
  "Confirmed",
  "Declined",
  "Maybe",
];

const defaultPhoneCode = "+234";

const countryCallingCodes = [
  { country: "Nigeria", code: "+234" },
  { country: "United Kingdom", code: "+44" },
  { country: "United States", code: "+1" },
  { country: "Canada", code: "+1" },
  { country: "Ghana", code: "+233" },
  { country: "South Africa", code: "+27" },
  { country: "Kenya", code: "+254" },
  { country: "Uganda", code: "+256" },
  { country: "Tanzania", code: "+255" },
  { country: "Rwanda", code: "+250" },
  { country: "Ethiopia", code: "+251" },
  { country: "Egypt", code: "+20" },
  { country: "Morocco", code: "+212" },
  { country: "Cameroon", code: "+237" },
  { country: "Senegal", code: "+221" },
  { country: "Ivory Coast", code: "+225" },
  { country: "Benin", code: "+229" },
  { country: "Togo", code: "+228" },
  { country: "Sierra Leone", code: "+232" },
  { country: "Liberia", code: "+231" },
  { country: "Gambia", code: "+220" },
  { country: "Zimbabwe", code: "+263" },
  { country: "Zambia", code: "+260" },
  { country: "Botswana", code: "+267" },
  { country: "Namibia", code: "+264" },
  { country: "Australia", code: "+61" },
  { country: "New Zealand", code: "+64" },
  { country: "Ireland", code: "+353" },
  { country: "France", code: "+33" },
  { country: "Germany", code: "+49" },
  { country: "Italy", code: "+39" },
  { country: "Spain", code: "+34" },
  { country: "Netherlands", code: "+31" },
  { country: "Belgium", code: "+32" },
  { country: "Switzerland", code: "+41" },
  { country: "Sweden", code: "+46" },
  { country: "Norway", code: "+47" },
  { country: "Denmark", code: "+45" },
  { country: "Finland", code: "+358" },
  { country: "United Arab Emirates", code: "+971" },
  { country: "Saudi Arabia", code: "+966" },
  { country: "Qatar", code: "+974" },
  { country: "India", code: "+91" },
  { country: "Pakistan", code: "+92" },
  { country: "China", code: "+86" },
  { country: "Japan", code: "+81" },
  { country: "South Korea", code: "+82" },
  { country: "Singapore", code: "+65" },
  { country: "Malaysia", code: "+60" },
  { country: "Philippines", code: "+63" },
  { country: "Brazil", code: "+55" },
  { country: "Mexico", code: "+52" },
  { country: "Jamaica", code: "+1" },
  { country: "Trinidad and Tobago", code: "+1" },
];

export function PlannerProgressSection({
  initialItems,
  catalog,
  weddingId,
  weddingTitle,
}: {
  initialItems: ProgressItem[];
  catalog: string[];
  weddingId?: string | null;
  weddingTitle?: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [draftStatuses, setDraftStatuses] = useState<Record<string, ProgressStatus>>({});
  const [selectedItem, setSelectedItem] = useState("");
  const [customItem, setCustomItem] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const availableItems = useMemo(
    () =>
      catalog.filter(
        (label) => !items.some((item) => item.label.toLowerCase() === label.toLowerCase()),
      ),
    [catalog, items],
  );
  const addItemValue = customItem.trim() || selectedItem || availableItems[0] || "";

  async function updateProgress(payload: {
    intent: "save" | "add" | "remove";
    itemKey?: string;
    itemLabel?: string;
    status?: ProgressStatus;
  }) {
    setFeedback(null);
    setPendingKey(`${payload.intent}-${payload.itemKey ?? payload.itemLabel ?? "new"}`);

    try {
      const response = await fetch("/api/planner/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, weddingId: weddingId ?? null }),
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
      subtitle={weddingTitle ? `For: ${weddingTitle}` : "For: General planning fallback. Select a wedding event before adding planning items."}
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
      {!weddingId ? (
        <p className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Select or create a wedding event before adding checklist items.
        </p>
      ) : null}

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
          const isSaving = pendingKey === `save-${item.key}`;
          const isRemoving = pendingKey === `remove-${item.key}`;
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
                  {isSaving ? "Saving..." : "Save"}
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
                  {isRemoving ? "Removing..." : "Remove"}
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
            disabled={!weddingId || !availableItems.length}
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
          disabled={!weddingId}
          className="field-input mt-2 rounded-[1rem] px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={!weddingId || !addItemValue || Boolean(pendingKey)}
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
          {pendingKey?.startsWith("add-") ? "Adding..." : "Add item"}
        </button>
      </div>
    </DashboardCollapsibleSection>
  );
}

export function WeddingBudgetSection({
  initialBudget,
  weddingId,
  weddingTitle,
}: {
  initialBudget: PlannerBudget | null;
  weddingId?: string | null;
  weddingTitle?: string | null;
}) {
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
        body: JSON.stringify({ ...payload, weddingId: weddingId ?? null }),
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
      subtitle={weddingTitle ? `For: ${weddingTitle}` : "For: General planning fallback. Select a wedding event before adding budget details."}
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
      {!weddingId ? (
        <p className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Select or create a wedding event before adding budget details.
        </p>
      ) : null}

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
          {weddingTitle
            ? `No budget saved yet for ${weddingTitle}. Generate a plan in Iyeoba AI Planner or add budget categories here.`
            : "No budget saved yet. Select a wedding event before adding budget categories."}
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
              disabled={!weddingId}
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
                disabled={!weddingId}
                className="field-input rounded-[1rem]"
              />
            </label>
            <button
              type="button"
              disabled={!weddingId || Boolean(pendingKey)}
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
              {pendingKey === "total" ? "Saving..." : "Save total"}
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
                        disabled={!weddingId}
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
                        disabled={!weddingId}
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
                        disabled={!weddingId}
                        className="field-input rounded-[1rem]"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!weddingId || Boolean(pendingKey)}
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
                      {pendingKey === category.id ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      disabled={!weddingId || Boolean(pendingKey)}
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
                      {pendingKey === `remove-${category.id}` ? "Removing..." : "Remove"}
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
            disabled={!weddingId}
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
            disabled={!weddingId}
            className="field-input rounded-[1rem]"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
          Note
          <input
            value={addDraft.note}
            onChange={(event) => setAddDraft((current) => ({ ...current, note: event.target.value }))}
            placeholder="Optional"
            disabled={!weddingId}
            className="field-input rounded-[1rem]"
          />
        </label>
        <button
          type="button"
          disabled={!weddingId || Boolean(pendingKey) || !addDraft.categoryName.trim()}
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
          {pendingKey === "add-category" ? "Adding..." : "Add"}
        </button>
      </div>
    </DashboardCollapsibleSection>
  );
}

export function GuestListSection({
  initialGuests,
  initialInvites,
  weddingId,
  weddingTitle,
  wedding,
}: {
  initialGuests: PlannerGuest[];
  initialInvites: PlannerGuestInvite[];
  weddingId?: string | null;
  weddingTitle?: string | null;
  wedding: PlannerGuestWedding | null;
}) {
  const [guests, setGuests] = useState(initialGuests);
  const [invites, setInvites] = useState(initialInvites);
  const [draft, setDraft] = useState({
    guestId: "",
    name: "",
    phone: "",
    email: "",
    guestGroup: "Friend",
    inviteStatus: "Not invited",
    notes: "",
  });
  const [inviteDetails, setInviteDetails] = useState({
    inviteId: "",
    coupleName: wedding?.title || "",
    weddingDate: wedding?.weddingDate || "",
    weddingTime: "",
    venue: wedding?.location || "",
  });
  const [phoneCode, setPhoneCode] = useState(defaultPhoneCode);
  const [selectedGuestId, setSelectedGuestId] = useState(initialGuests[0]?.id ?? "");
  const [inviteMessage, setInviteMessage] = useState(() =>
    buildInviteMessage(wedding, initialGuests[0]?.name || ""),
  );
  const [inviteMessageEdited, setInviteMessageEdited] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const [guestFeedback, setGuestFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [inviteFeedback, setInviteFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const selectedGuest = guests.find((guest) => guest.id === selectedGuestId) ?? null;
  const inviteGuestName = draft.name.trim() || selectedGuest?.name || "";
  const generatedInviteMessage = useMemo(
    () => buildInviteMessage(wedding, inviteGuestName),
    [wedding, inviteGuestName],
  );
  const confirmedCount = guests.filter((guest) => guest.inviteStatus === "Confirmed").length;
  const invitedCount = guests.filter((guest) => guest.inviteStatus !== "Not invited").length;
  const draftGuestPendingKey = `${draft.guestId ? "update" : "add"}-${draft.guestId || "new"}`;

  useEffect(() => {
    if (!inviteMessageEdited) {
      setInviteMessage(generatedInviteMessage);
      return;
    }

    setInviteMessage((current) =>
      replaceInviteGreeting(current, getInviteGreetingLine(wedding, inviteGuestName)),
    );
  }, [generatedInviteMessage, inviteGuestName, inviteMessageEdited, wedding]);

  async function saveGuest(intent: "add" | "update" | "delete" | "status", payload: Record<string, unknown>) {
    setGuestFeedback(null);
    setPendingKey(`${intent}-${String(payload.guestId ?? "new")}`);

    try {
      const response = await fetch("/api/planner/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          weddingId: weddingId ?? null,
          ...payload,
          phone: intent === "add" || intent === "update" ? composePhone(phoneCode, draft.phone) : payload.phone,
        }),
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        error?: string;
        message?: string;
        guests?: PlannerGuest[];
      } | null;

      if (!response.ok || !result?.ok || !Array.isArray(result.guests)) {
        throw new Error(result?.error || "We could not update this guest list right now.");
      }

      setGuests(result.guests);
      setInviteFeedback(null);
      setGuestFeedback({ type: "success", text: result.message || "Guest saved." });
      if (intent === "add" || intent === "update") {
        setDraft({
          guestId: "",
          name: "",
          phone: "",
          email: "",
          guestGroup: "Friend",
          inviteStatus: "Not invited",
          notes: "",
        });
        setPhoneCode(defaultPhoneCode);
      }
      if (intent === "delete" && selectedGuestId === payload.guestId) {
        setSelectedGuestId(result.guests[0]?.id ?? "");
      }
    } catch (error) {
      setGuestFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "We could not save this guest right now.",
      });
    } finally {
      setPendingKey(null);
    }
  }

  function editGuest(guest: PlannerGuest) {
    const parsedPhone = splitPhoneForDisplay(guest.phone);
    setDraft({
      guestId: guest.id,
      name: guest.name,
      phone: parsedPhone.phone,
      email: guest.email,
      guestGroup: guest.guestGroup || "Friend",
      inviteStatus: guest.inviteStatus || "Not invited",
      notes: guest.notes,
    });
    setPhoneCode(parsedPhone.phoneCode);
    setSelectedGuestId(guest.id);
    const invite = findInviteForGuest(invites, guest.email);
    if (invite) {
      setInviteDetails({
        inviteId: invite.id,
        coupleName: invite.coupleName,
        weddingDate: invite.weddingDate,
        weddingTime: invite.weddingTime,
        venue: invite.venue,
      });
      if (invite.customMessage) {
        setInviteMessage(invite.customMessage);
        setInviteMessageEdited(true);
      }
    }
  }

  async function copyInviteMessage() {
    try {
      await navigator.clipboard.writeText(inviteMessage);
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus(""), 2200);
    } catch {
      setCopyStatus("");
      setInviteFeedback({ type: "error", text: "Copy failed. You can select and copy the message manually." });
    }
  }

  async function saveInvite(intent: "save" | "send", guest?: PlannerGuest) {
    const sourceName = guest?.name || draft.name;
    const sourceEmail = guest?.email || draft.email;
    const sourcePhone = guest?.phone || composePhone(phoneCode, draft.phone);
    const sourceGroup = guest?.guestGroup || draft.guestGroup;
    const existingInvite = findInviteForGuest(invites, sourceEmail);

    setInviteFeedback(null);
    setCopyStatus("");
    setPendingKey(`${intent}-invite-${guest?.id || draft.guestId || "draft"}`);

    try {
      const response = await fetch("/api/planner/guest-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent,
          weddingId: weddingId ?? null,
          guestId: guest?.id || draft.guestId || null,
          inviteId: inviteDetails.inviteId || existingInvite?.id || null,
          guestName: sourceName,
          guestEmail: sourceEmail,
          guestPhone: sourcePhone,
          guestGroup: sourceGroup,
          coupleName: inviteDetails.coupleName || wedding?.title || "",
          weddingDate: inviteDetails.weddingDate,
          weddingTime: inviteDetails.weddingTime,
          venue: inviteDetails.venue || wedding?.location || "",
          customMessage: inviteMessage,
        }),
      });
      const result = await response.json().catch(() => null) as {
        ok?: boolean;
        error?: string;
        message?: string;
        guests?: PlannerGuest[];
        invites?: PlannerGuestInvite[];
      } | null;

      if (!response.ok || !result?.ok) {
        if (Array.isArray(result?.invites)) setInvites(result.invites);
        if (Array.isArray(result?.guests)) setGuests(result.guests);
        throw new Error(result?.error || (intent === "send" ? "We could not send this invite right now." : "We could not save this invite right now."));
      }

      if (Array.isArray(result.guests)) setGuests(result.guests);
      if (Array.isArray(result.invites)) setInvites(result.invites);
      setGuestFeedback(null);
      setInviteFeedback({ type: "success", text: result.message || (intent === "send" ? "Invite email sent." : "Guest invite saved.") });
    } catch (error) {
      setInviteFeedback({
        type: "error",
        text: error instanceof Error
          ? error.message
          : intent === "send"
            ? "We could not send this invite right now."
            : "We could not save this invite right now.",
      });
    } finally {
      setPendingKey(null);
    }
  }

  function selectInviteForGuest(guest: PlannerGuest) {
    editGuest(guest);
    setSelectedGuestId(guest.id);
  }

  return (
    <DashboardCollapsibleSection
      eyebrow="Guest List"
      title="Guest List & Invites"
      subtitle={weddingTitle ? `For: ${weddingTitle}. Add guests, send invitations, and track RSVP responses.` : "For: General planning fallback. Select a wedding event before adding guests or invites."}
      defaultOpen={false}
      storageKey={`iyeoba:planner-dashboard:guest-list:${weddingId ?? "general"}`}
      badge={
        <div className="flex flex-wrap justify-end gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
          <span className="rounded-full bg-[rgba(106,62,124,0.08)] px-3 py-1 text-[color:var(--color-brand-primary)]">
            {guests.length} guests
          </span>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
            {confirmedCount} confirmed
          </span>
        </div>
      }
    >
      {guestFeedback ? (
        <p
          className={`mt-4 rounded-[1.25rem] px-4 py-3 text-sm ${
            guestFeedback.type === "success"
              ? "surface-soft text-[color:var(--color-brand-primary)]"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {guestFeedback.text}
        </p>
      ) : null}

      {inviteFeedback ? (
        <p
          className={`mt-4 rounded-[1.25rem] px-4 py-3 text-sm ${
            inviteFeedback.type === "success"
              ? "surface-soft text-[color:var(--color-brand-primary)]"
              : "border border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {inviteFeedback.text}
        </p>
      ) : null}

      {!weddingId ? (
        <p className="mt-4 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Create or select a wedding event before adding guests.
        </p>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.95fr]">
        <div className="grid gap-4">
          <div className="surface-soft grid gap-3 rounded-[1.35rem] p-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
              Guest name
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Guest name"
                className="field-input rounded-[1rem]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
              Guest group
              <select
                value={draft.guestGroup}
                onChange={(event) => setDraft((current) => ({ ...current, guestGroup: event.target.value }))}
                className="field-input rounded-[1rem]"
              >
                {guestGroupOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
              Phone
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
                <select
                  aria-label="Phone country code"
                  value={phoneCode}
                  onChange={(event) => setPhoneCode(event.target.value)}
                  className="field-input rounded-[1rem]"
                >
                  {countryCallingCodes.map((option) => (
                    <option key={`${option.country}-${option.code}`} value={option.code}>
                      {option.country} ({option.code})
                    </option>
                  ))}
                </select>
                <input
                  value={draft.phone}
                  onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="Phone number"
                  className="field-input rounded-[1rem]"
                />
              </div>
            </label>
            <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
              Email
              <input
                type="email"
                value={draft.email}
                onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
                placeholder="guest@example.com"
                className="field-input rounded-[1rem]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
              Invite status
              <select
                value={draft.inviteStatus}
                onChange={(event) => setDraft((current) => ({ ...current, inviteStatus: event.target.value }))}
                className="field-input rounded-[1rem]"
              >
                {inviteStatusOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
              Couple name
              <input
                value={inviteDetails.coupleName}
                onChange={(event) => setInviteDetails((current) => ({ ...current, coupleName: event.target.value }))}
                placeholder="Ashaake & Copy"
                className="field-input rounded-[1rem]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
              Wedding date
              <input
                type="date"
                value={inviteDetails.weddingDate}
                onChange={(event) => setInviteDetails((current) => ({ ...current, weddingDate: event.target.value }))}
                className="field-input rounded-[1rem]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
              Wedding time
              <input
                type="time"
                value={inviteDetails.weddingTime}
                onChange={(event) => setInviteDetails((current) => ({ ...current, weddingTime: event.target.value }))}
                className="field-input rounded-[1rem]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)]">
              Venue/location
              <input
                value={inviteDetails.venue}
                onChange={(event) => setInviteDetails((current) => ({ ...current, venue: event.target.value }))}
                placeholder="Venue or city"
                className="field-input rounded-[1rem]"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-[color:var(--color-ink)] sm:col-span-2">
              Notes
              <input
                value={draft.notes}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Dietary needs, family side, travel notes..."
                className="field-input rounded-[1rem]"
              />
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button
                type="button"
                disabled={!weddingId || !draft.name.trim() || Boolean(pendingKey)}
                onClick={() =>
                  startTransition(() =>
                    void saveGuest(draft.guestId ? "update" : "add", draft),
                  )
                }
                className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
              >
                {pendingKey === draftGuestPendingKey ? "Saving..." : "Save guest"}
              </button>
              <button
                type="button"
                disabled={!weddingId || !draft.name.trim() || !draft.email.trim() || !inviteDetails.coupleName.trim() || Boolean(pendingKey)}
                onClick={() => startTransition(() => void saveInvite("send"))}
                className="btn-secondary px-4 py-2 text-sm disabled:opacity-60"
              >
                {pendingKey === `send-invite-${draft.guestId || "draft"}` ? "Sending..." : "Send invite"}
              </button>
              {draft.guestId ? (
                <button
                  type="button"
                  onClick={() => {
                    setDraft({
                      guestId: "",
                      name: "",
                      phone: "",
                      email: "",
                      guestGroup: "Other",
                      inviteStatus: "Not invited",
                      notes: "",
                    });
                    setPhoneCode(defaultPhoneCode);
                  }}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3">
            {guests.length ? guests.map((guest) => {
              const invite = findInviteForGuest(invites, guest.email);
              return (
              <div key={guest.id} className="surface-soft rounded-[1.2rem] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-[color:var(--color-ink)]">{guest.name}</p>
                    <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                      {[guest.guestGroup, guest.phone, guest.email].filter(Boolean).join(" · ") || "No contact details yet"}
                    </p>
                    <p className="mt-2 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
                      <span className="rounded-full bg-white px-3 py-1 text-[color:var(--color-brand-primary)]">
                        Invite: {invite?.inviteStatus || "draft"}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-[color:var(--color-muted)]">
                        RSVP: {invite?.rsvpStatus || "pending"}
                      </span>
                      {invite?.sentAt ? (
                        <span className="rounded-full bg-white px-3 py-1 text-[color:var(--color-muted)]">
                          Sent {formatShortDate(invite.sentAt)}
                        </span>
                      ) : null}
                    </p>
                    {guest.notes ? (
                      <p className="mt-1 text-sm text-[color:var(--color-muted)]">{guest.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <select
                      value={guest.inviteStatus}
                      onChange={(event) =>
                        startTransition(() =>
                          void saveGuest("status", {
                            guestId: guest.id,
                            inviteStatus: event.target.value,
                          }),
                        )
                      }
                      className="field-input min-h-10 rounded-full px-3 py-1.5 text-xs font-semibold"
                    >
                      {inviteStatusOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => editGuest(guest)} className="btn-secondary px-3 py-1.5 text-xs">
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(pendingKey)}
                      onClick={() =>
                        startTransition(() => void saveGuest("delete", { guestId: guest.id }))
                      }
                      className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-60"
                    >
                      {pendingKey === `delete-${guest.id}` ? "Removing..." : "Remove"}
                    </button>
                    <button type="button" onClick={() => selectInviteForGuest(guest)} className="btn-secondary px-3 py-1.5 text-xs">
                      Use for invite
                    </button>
                    <button
                      type="button"
                      disabled={!guest.email || Boolean(pendingKey)}
                      onClick={() => startTransition(() => void saveInvite("send", guest))}
                      className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-60"
                    >
                      {pendingKey === `send-invite-${guest.id}`
                        ? "Sending..."
                        : invite?.inviteStatus === "sent"
                          ? "Resend invite"
                          : "Send invite"}
                    </button>
                    {invite?.rsvpToken ? (
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard.writeText(`${window.location.origin}/rsvp/${invite.rsvpToken}`);
                          setCopyStatus("Link copied");
                          window.setTimeout(() => setCopyStatus(""), 2200);
                        }}
                        className="btn-secondary px-3 py-1.5 text-xs"
                      >
                        Copy RSVP link
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              );
            }) : (
              <p className="surface-soft rounded-[1.25rem] p-4 text-sm leading-7 text-[color:var(--color-muted)]">
                No guests added for this wedding event yet.
              </p>
            )}
          </div>
        </div>

        <div className="surface-soft rounded-[1.35rem] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-brand-primary)]">
                Invite Message
              </p>
              <p className="mt-1 text-sm text-[color:var(--color-muted)]">
                {inviteGuestName ? `Personalized for ${inviteGuestName}` : "Generic message"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {copyStatus ? (
                <span className="text-xs font-semibold text-[color:var(--color-brand-primary)]">{copyStatus}</span>
              ) : null}
              <button
                type="button"
                disabled={!weddingId || !draft.name.trim() || !draft.email.trim() || !inviteDetails.coupleName.trim() || Boolean(pendingKey)}
                onClick={() => startTransition(() => void saveInvite("save"))}
                className="btn-secondary px-3 py-2 text-xs disabled:opacity-60"
              >
                {pendingKey === `save-invite-${draft.guestId || "draft"}` ? "Saving..." : "Save invite"}
              </button>
              <button type="button" onClick={copyInviteMessage} className="btn-secondary px-3 py-2 text-xs">
                Copy message
              </button>
            </div>
          </div>
          <textarea
            value={inviteMessage}
            onChange={(event) => {
              setInviteMessage(event.target.value);
              setInviteMessageEdited(true);
            }}
            placeholder="We would love for you to celebrate this special day with us."
            className="field-input mt-4 min-h-[220px] rounded-[1.25rem] text-sm leading-7"
          />
          <p className="mt-3 text-xs leading-6 text-[color:var(--color-muted)]">
            Beta invite helper only. Invitation card upload, WhatsApp sharing, SMS, email sending, RSVP links, and QR codes are coming later.
          </p>
          <div className="mt-4 grid gap-2 text-sm text-[color:var(--color-muted)] sm:grid-cols-2">
            <MetricCard label="Invited or replied" value={String(invitedCount)} />
            <MetricCard label="Confirmed" value={String(confirmedCount)} />
          </div>
        </div>
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

function buildInviteMessage(
  wedding: PlannerGuestWedding | null,
  guestNameValue: string,
) {
  return [
    getInviteGreetingLine(wedding, guestNameValue),
    "",
    `Date: ${wedding?.weddingDate ? formatInviteDate(wedding.weddingDate) : ""}`,
    `Location: ${wedding?.location || ""}`,
    "",
    "We would love to celebrate with you. Please confirm if you'll be attending.",
  ].join("\n");
}

function getInviteGreetingLine(wedding: PlannerGuestWedding | null, guestNameValue: string) {
  const guestName = guestNameValue.trim() || "[Guest Name]";
  const eventName = wedding?.title || "our wedding";
  const weddingType = wedding?.weddingType || "wedding";

  return `Hi ${guestName}, you're warmly invited to ${eventName}'s ${weddingType} celebration.`;
}

function replaceInviteGreeting(current: string, nextGreeting: string) {
  const lines = current.split("\n");
  if (!lines.length || /^Hi .+?, you're warmly invited/.test(lines[0])) {
    return [nextGreeting, ...lines.slice(1)].join("\n");
  }
  return current;
}

function composePhone(phoneCode: string, phone: string) {
  const trimmedPhone = phone.trim();
  if (!trimmedPhone) {
    return "";
  }
  if (trimmedPhone.startsWith("+")) {
    return trimmedPhone;
  }
  return `${phoneCode} ${trimmedPhone.replace(/^0+/, "")}`.trim();
}

function splitPhoneForDisplay(value: string) {
  const trimmedPhone = value.trim();
  if (!trimmedPhone.startsWith("+")) {
    return { phoneCode: defaultPhoneCode, phone: trimmedPhone };
  }

  const match = countryCallingCodes
    .slice()
    .sort((left, right) => right.code.length - left.code.length)
    .find((option) => trimmedPhone === option.code || trimmedPhone.startsWith(`${option.code} `));

  if (!match) {
    return { phoneCode: defaultPhoneCode, phone: trimmedPhone };
  }

  return {
    phoneCode: match.code,
    phone: trimmedPhone.slice(match.code.length).trim(),
  };
}

function findInviteForGuest(invites: PlannerGuestInvite[], email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }
  return invites.find((invite) => invite.guestEmail.trim().toLowerCase() === normalizedEmail) ?? null;
}

function formatShortDate(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(parsed));
}

function formatInviteDate(value: string) {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(parsed));
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
