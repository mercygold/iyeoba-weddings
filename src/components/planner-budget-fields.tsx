"use client";

import { useEffect, useMemo, useState } from "react";

import {
  budgetCurrencies,
  getBudgetRangesForCurrency,
  isBudgetCurrency,
  locations,
  suggestBudgetCurrency,
  type BudgetCurrency,
} from "@/lib/planner";

type PlannerBudgetFieldsProps = {
  defaultLocation?: string;
  defaultBudgetCurrency?: string;
  defaultBudgetRange?: string;
  locationFieldClassName?: string;
  currencyFieldClassName?: string;
  budgetFieldClassName?: string;
};

export function PlannerBudgetFields({
  defaultLocation = "",
  defaultBudgetCurrency = "",
  defaultBudgetRange = "",
  locationFieldClassName,
  currencyFieldClassName,
  budgetFieldClassName,
}: PlannerBudgetFieldsProps) {
  const [location, setLocation] = useState(defaultLocation);
  const [currency, setCurrency] = useState<BudgetCurrency>(
    isBudgetCurrency(defaultBudgetCurrency)
      ? defaultBudgetCurrency
      : suggestBudgetCurrency(defaultLocation),
  );
  const [budgetRange, setBudgetRange] = useState(defaultBudgetRange);

  const budgetRangeOptions = useMemo(
    () => getBudgetRangesForCurrency(currency),
    [currency],
  );

  useEffect(() => {
    if (!budgetRange) {
      return;
    }
    if (!budgetRangeOptions.includes(budgetRange)) {
      setBudgetRange("");
    }
  }, [budgetRange, budgetRangeOptions]);

  const shouldRenderLegacyBudgetOption =
    Boolean(defaultBudgetRange) &&
    Boolean(budgetRange) &&
    !budgetRangeOptions.includes(budgetRange);

  return (
    <>
      <label
        className={
          locationFieldClassName ??
          "grid gap-2 text-sm font-medium text-[color:var(--color-ink)]"
        }
      >
        Location
        <select
          name="location"
          required
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          className="field-input rounded-[1rem]"
        >
          <option value="" disabled>
            Select location
          </option>
          {locations.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label
        className={
          currencyFieldClassName ??
          "grid gap-2 text-sm font-medium text-[color:var(--color-ink)]"
        }
      >
        Budget currency
        <select
          name="budgetCurrency"
          required
          value={currency}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (!isBudgetCurrency(nextValue)) {
              return;
            }
            setCurrency(nextValue);
          }}
          className="field-input rounded-[1rem]"
        >
          {budgetCurrencies.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>

      <label
        className={
          budgetFieldClassName ??
          "grid gap-2 text-sm font-medium text-[color:var(--color-ink)]"
        }
      >
        Budget range
        <select
          name="budgetRange"
          required
          value={budgetRange}
          onChange={(event) => setBudgetRange(event.target.value)}
          className="field-input rounded-[1rem]"
        >
          <option value="" disabled>
            Select budget range
          </option>
          {shouldRenderLegacyBudgetOption ? (
            <option value={budgetRange}>{budgetRange}</option>
          ) : null}
          {budgetRangeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
