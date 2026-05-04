"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type PlannerPlan = {
  reply: string;
  suggested_cultural_elements: string[];
  checklist: string[];
  budget_breakdown: string[];
  vendor_categories: string[];
  timeline: string[];
  next_steps: string[];
  questions: string[];
};

export type AiPlannerInitialState = {
  messages?: unknown;
  plan?: Record<string, unknown>;
  intake?: Record<string, unknown>;
};

type AiPlannerChatProps = {
  isAuthenticated: boolean;
  isPlanner: boolean;
  initialName?: string;
  initialState?: AiPlannerInitialState | null;
};

const starterPrompts = [
  "Create a 6-month plan for a Lagos traditional and white wedding.",
  "Help me plan a diaspora Nigerian wedding with 200 guests.",
  "Build a vendor checklist for an intimate court wedding.",
];

const weddingTypeOptions = [
  "Traditional wedding",
  "White wedding",
  "Court/Civil wedding",
  "Introduction",
  "Traditional + White wedding",
  "Traditional + Court wedding",
  "White + Court wedding",
  "Full wedding celebration",
  "Other",
];

const emptyPlan: PlannerPlan = {
  reply: "",
  suggested_cultural_elements: [],
  checklist: [],
  budget_breakdown: [],
  vendor_categories: [],
  timeline: [],
  next_steps: [],
  questions: [],
};

export function AiPlannerChat({
  isAuthenticated,
  isPlanner,
  initialName,
  initialState,
}: AiPlannerChatProps) {
  const initialIntake = normalizeInitialIntake(initialState?.intake);
  const initialWeddingType = resolveInitialWeddingType(initialIntake.weddingType);
  const [weddingType, setWeddingType] = useState(initialWeddingType.weddingType);
  const [customWeddingType, setCustomWeddingType] = useState(
    initialWeddingType.customWeddingType,
  );
  const [location, setLocation] = useState(initialIntake.location);
  const [guestCount, setGuestCount] = useState(initialIntake.guestCount);
  const [budget, setBudget] = useState(initialIntake.budget);
  const [weddingDate, setWeddingDate] = useState(initialIntake.weddingDate);
  const [culture, setCulture] = useState(initialIntake.culture);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(
    normalizeInitialMessages(initialState?.messages),
  );
  const [plan, setPlan] = useState<PlannerPlan>(
    normalizeInitialPlan(initialState?.plan),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(Boolean(initialState));
  const [checklistFeedback, setChecklistFeedback] = useState("");
  const [checklistError, setChecklistError] = useState("");
  const [savingChecklistItems, setSavingChecklistItems] = useState<Set<string>>(
    () => new Set(),
  );
  const [addedChecklistItems, setAddedChecklistItems] = useState<Set<string>>(
    () => new Set(),
  );

  const hasPlan = useMemo(
    () =>
      plan.reply ||
      plan.suggested_cultural_elements.length ||
      plan.checklist.length ||
      plan.budget_breakdown.length ||
      plan.vendor_categories.length ||
      plan.timeline.length ||
      plan.next_steps.length,
    [plan],
  );

  async function submitPlannerMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLoading) {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmedMessage },
    ];

    setMessages(nextMessages);
    setMessage("");
    setError("");
    setNotice("");
    setSaved(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai-planner", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
          intake: {
            weddingType:
              weddingType === "Other" ? customWeddingType.trim() || "Other" : weddingType,
            location,
            guestCount,
            budget,
            weddingDate,
            culture,
          },
        }),
      });

      const rawText = await response.text();
      let data: Record<string, any> = {};

      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (parseError) {
        console.error("Iyeoba AI planner response parse failed", {
          status: response.status,
          statusText: response.statusText,
          rawText,
          parseError,
        });
        throw new Error("Iyeoba AI returned an unexpected response. Please try again.");
      }

      if (!response.ok) {
        console.error("Iyeoba AI planner request failed", {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          diagnostics: data.diagnostics,
        });
        throw new Error(data.error ?? "Iyeoba AI could not create a plan right now.");
      }

      const nextPlan: PlannerPlan = {
        reply: data.reply ?? "",
        suggested_cultural_elements: data.suggested_cultural_elements ?? [],
        checklist: data.checklist ?? [],
        budget_breakdown: data.budget_breakdown ?? [],
        vendor_categories: data.vendor_categories ?? [],
        timeline: data.timeline ?? [],
        next_steps: data.next_steps ?? [],
        questions: data.questions ?? [],
      };

      setPlan(nextPlan);
      setSaved(Boolean(data.saved));
      if (data.saveError && !data.providerFallback) {
        setNotice("Starter plan shown. Full AI planning and saved chat history will resume shortly.");
      }
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: nextPlan.reply || "I created a first planning draft below.",
        },
      ]);
    } catch (plannerError) {
      setError(
        plannerError instanceof Error
          ? plannerError.message
          : "Iyeoba AI could not create a plan right now.",
      );
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  }

  function useStarterPrompt(prompt: string) {
    setMessage(prompt);
  }

  async function addChecklistItemsToDashboard(items: string[]) {
    if (!isPlanner || !items.length) {
      return;
    }

    const itemKeys = items.map(toProgressKey).filter(Boolean);
    setChecklistError("");
    setChecklistFeedback("");
    setSavingChecklistItems((current) => new Set([...current, ...itemKeys]));

    try {
      const response = await fetch("/api/ai-planner/checklist", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ items }),
      });
      const rawText = await response.text();
      const payload = rawText ? JSON.parse(rawText) : {};

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.error ?? "We could not add checklist items right now.",
        );
      }

      const addedKeys = [
        ...normalizeChecklistResponseItems(payload.added),
        ...normalizeChecklistResponseItems(payload.skipped),
      ];
      setAddedChecklistItems((current) => new Set([...current, ...addedKeys]));
      setChecklistFeedback(
        payload.message ?? "Checklist item added to your planner dashboard.",
      );
    } catch (error) {
      console.error("AI planner checklist save failed", error);
      setChecklistError(
        error instanceof Error
          ? error.message
          : "We could not add checklist items right now.",
      );
    } finally {
      setSavingChecklistItems((current) => {
        const next = new Set(current);
        itemKeys.forEach((key) => next.delete(key));
        return next;
      });
    }
  }

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <aside className="surface-card rounded-[2rem] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-brand-primary)]">
          Planning Details
        </p>
        <div className="mt-5 space-y-4">
          <PlannerSelectField
            label="Wedding type"
            value={weddingType}
            onChange={setWeddingType}
            options={weddingTypeOptions}
            placeholder="Choose wedding type"
          />
          {weddingType === "Other" ? (
            <PlannerField
              label="Custom wedding type"
              value={customWeddingType}
              onChange={setCustomWeddingType}
              placeholder="Tell us the wedding format"
            />
          ) : null}
          <PlannerField
            label="Location"
            value={location}
            onChange={setLocation}
            placeholder="Lagos, Abuja, London, Houston, Toronto..."
          />
          <PlannerField
            label="Guest count"
            value={guestCount}
            onChange={setGuestCount}
            placeholder="300"
            type="number"
            min={1}
          />
          <PlannerField
            label="Budget"
            value={budget}
            onChange={setBudget}
            placeholder="₦5,000,000 or $10,000"
          />
          <PlannerField
            label="Wedding date"
            value={weddingDate}
            onChange={setWeddingDate}
            placeholder=""
            type="date"
          />
          <PlannerField
            label="Culture or tradition"
            value={culture}
            onChange={setCulture}
            placeholder="Yoruba, Igbo, Hausa, Edo, Nigerian diaspora, mixed culture..."
          />
        </div>

        <div className="surface-soft mt-6 rounded-[1.5rem] p-4 text-sm leading-7 text-[color:var(--color-muted)]">
          {isAuthenticated ? (
            <p>
              {initialName ? `${initialName}, your` : "Your"} AI planner chats and planning details are saved to your account.
            </p>
          ) : (
            <p>
              You can draft a plan now. <Link href="/auth/sign-in?next=/ai-planner" className="font-semibold text-[color:var(--color-brand-primary)]">Sign in</Link> to save your plan, checklist, and chat history.
            </p>
          )}
        </div>
      </aside>

      <div className="surface-card rounded-[2rem] p-5 sm:p-7">
        <div className="flex flex-col gap-3 border-b border-[rgba(91,44,131,0.1)] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-brand-primary)]">
              Chat Assistant
            </p>
            <h2 className="font-display mt-2 text-3xl text-[color:var(--color-ink)]">
              Wedding plan draft
            </h2>
          </div>
          {saved ? (
            <span className="surface-soft w-fit rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-brand-primary)]">
              Saved
            </span>
          ) : null}
        </div>

        <div className="mt-5 min-h-[320px] space-y-4">
          {messages.length === 0 ? (
            <div className="surface-soft rounded-[1.5rem] p-5">
              <p className="text-sm leading-7 text-[color:var(--color-muted)]">
                Start with what you know. Iyeoba AI will ask for missing details and turn your answers into a checklist, budget outline, vendor categories, timeline, and next steps.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => useStarterPrompt(prompt)}
                    className="btn-secondary px-3 py-2 text-xs"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((chatMessage, index) => (
                <div
                  key={`${chatMessage.role}-${index}`}
                  className={`flex ${chatMessage.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[92%] rounded-[1.35rem] px-4 py-3 text-sm leading-7 sm:max-w-[78%] ${
                      chatMessage.role === "user"
                        ? "bg-[color:var(--color-brand-primary)] text-white"
                        : "surface-soft text-[color:var(--color-muted)]"
                    }`}
                  >
                    {chatMessage.content}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="surface-soft rounded-[1.5rem] p-4 text-sm text-[color:var(--color-brand-primary)]">
              Iyeoba AI is preparing your planning draft...
            </div>
          ) : null}

          {error ? (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-700">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="surface-soft rounded-[1.5rem] border border-[rgba(91,44,131,0.12)] p-4 text-xs leading-6 text-[color:var(--color-muted)]">
              {notice}
            </div>
          ) : null}

          {checklistFeedback ? (
            <div className="surface-soft rounded-[1.5rem] border border-emerald-200 p-4 text-xs leading-6 text-emerald-800">
              {checklistFeedback}
            </div>
          ) : null}

          {checklistError ? (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-xs leading-6 text-red-700">
              {checklistError}
            </div>
          ) : null}

          {hasPlan ? (
            <PlannerResult
              plan={plan}
              isAuthenticated={isAuthenticated}
              isPlanner={isPlanner}
              savingChecklistItems={savingChecklistItems}
              addedChecklistItems={addedChecklistItems}
              onAddChecklistItems={addChecklistItemsToDashboard}
            />
          ) : null}
        </div>

        <form onSubmit={submitPlannerMessage} className="mt-5">
          <label htmlFor="ai-planner-message" className="sr-only">
            Message Iyeoba AI
          </label>
          <textarea
            id="ai-planner-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="field-input min-h-[112px] rounded-[1.35rem] text-sm"
            placeholder="Tell Iyeoba AI what you want help planning..."
          />
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-6 text-[color:var(--color-muted)]">
              Iyeoba AI provides planning guidance. Traditions, pricing, and vendor availability may vary. Please confirm details with families and vendors.
            </p>
            <button type="submit" disabled={isLoading} className="btn-primary shrink-0 disabled:opacity-60">
              {isLoading ? "Planning..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

type PlannerFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  min?: number;
};

function PlannerField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
}: PlannerFieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-input mt-2 rounded-[1.25rem] text-sm"
        placeholder={placeholder}
        min={min}
      />
    </label>
  );
}

function PlannerSelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-input mt-2 rounded-[1.25rem] text-sm"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function normalizeInitialMessages(messages: unknown): ChatMessage[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter(isChatMessage)
    .slice(-12)
    .map((chatMessage) => ({
      role: chatMessage.role,
      content: chatMessage.content,
    }));
}

function isChatMessage(message: unknown): message is ChatMessage {
  return (
    Boolean(message) &&
    typeof message === "object" &&
    (message as ChatMessage).role !== undefined &&
    ((message as ChatMessage).role === "user" ||
      (message as ChatMessage).role === "assistant") &&
    typeof (message as ChatMessage).content === "string" &&
    (message as ChatMessage).content.trim().length > 0
  );
}

function normalizeInitialPlan(plan: Record<string, unknown> | undefined): PlannerPlan {
  if (!plan) {
    return emptyPlan;
  }

  return {
    reply: typeof plan.reply === "string" ? plan.reply : "",
    suggested_cultural_elements: stringArray(plan.suggested_cultural_elements),
    checklist: stringArray(plan.checklist),
    budget_breakdown: stringArray(plan.budget_breakdown),
    vendor_categories: stringArray(plan.vendor_categories),
    timeline: stringArray(plan.timeline),
    next_steps: stringArray(plan.next_steps),
    questions: stringArray(plan.questions),
  };
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function normalizeInitialIntake(intake: Record<string, unknown> | undefined) {
  return {
    weddingType: stringValue(intake?.weddingType),
    location: stringValue(intake?.location),
    guestCount: stringValue(intake?.guestCount),
    budget: stringValue(intake?.budget),
    weddingDate: stringValue(intake?.weddingDate),
    culture: stringValue(intake?.culture ?? intake?.cultureOrTradition),
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function resolveInitialWeddingType(savedWeddingType: string) {
  if (!savedWeddingType) {
    return {
      weddingType: "",
      customWeddingType: "",
    };
  }

  if (weddingTypeOptions.includes(savedWeddingType)) {
    return {
      weddingType: savedWeddingType,
      customWeddingType: "",
    };
  }

  return {
    weddingType: "Other",
    customWeddingType: savedWeddingType,
  };
}

function PlannerResult({
  plan,
  isAuthenticated,
  isPlanner,
  savingChecklistItems,
  addedChecklistItems,
  onAddChecklistItems,
}: {
  plan: PlannerPlan;
  isAuthenticated: boolean;
  isPlanner: boolean;
  savingChecklistItems: Set<string>;
  addedChecklistItems: Set<string>;
  onAddChecklistItems: (items: string[]) => void;
}) {
  return (
    <div className="grid gap-4 pt-2 md:grid-cols-2">
      <ResultList
        title="Suggested Cultural Elements"
        items={plan.suggested_cultural_elements}
      />
      <ResultList
        title="Checklist"
        items={plan.checklist}
        isChecklist
        isAuthenticated={isAuthenticated}
        isPlanner={isPlanner}
        savingChecklistItems={savingChecklistItems}
        addedChecklistItems={addedChecklistItems}
        onAddChecklistItems={onAddChecklistItems}
      />
      <ResultList title="Budget Breakdown" items={plan.budget_breakdown} />
      <ResultList title="Vendor Categories" items={plan.vendor_categories} />
      <ResultList title="Timeline" items={plan.timeline} />
      <ResultList title="Next Steps" items={plan.next_steps} />
      <ResultList title="Questions to Confirm" items={plan.questions} />
    </div>
  );
}

function ResultList({
  title,
  items,
  isChecklist = false,
  isAuthenticated = false,
  isPlanner = false,
  savingChecklistItems = new Set<string>(),
  addedChecklistItems = new Set<string>(),
  onAddChecklistItems,
}: {
  title: string;
  items: string[];
  isChecklist?: boolean;
  isAuthenticated?: boolean;
  isPlanner?: boolean;
  savingChecklistItems?: Set<string>;
  addedChecklistItems?: Set<string>;
  onAddChecklistItems?: (items: string[]) => void;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <article className="surface-soft rounded-[1.5rem] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h3 className="font-display text-2xl text-[color:var(--color-ink)]">
          {title}
        </h3>
        {isChecklist && isPlanner ? (
          <button
            type="button"
            onClick={() => onAddChecklistItems?.(items)}
            disabled={items.every((item) => addedChecklistItems.has(toProgressKey(item)))}
            className="btn-secondary w-fit px-3 py-2 text-xs disabled:opacity-60"
          >
            Add all to dashboard
          </button>
        ) : null}
      </div>
      {isChecklist && !isAuthenticated ? (
        <p className="mt-3 text-xs leading-6 text-[color:var(--color-muted)]">
          Sign in as a planner to add checklist items to your dashboard.
        </p>
      ) : null}
      {isChecklist && isAuthenticated && !isPlanner ? (
        <p className="mt-3 text-xs leading-6 text-[color:var(--color-muted)]">
          Planner accounts can add checklist items to the planner dashboard.
        </p>
      ) : null}
      <ul className="mt-3 space-y-3 text-sm leading-7 text-[color:var(--color-muted)]">
        {items.map((item, index) => (
          <li
            key={`${title}-${index}`}
            className="flex flex-col gap-2 sm:flex-row sm:items-start"
          >
            <div className="flex flex-1 gap-2">
              <span className="mt-[0.58rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-brand-gold)]" />
              <span>{item}</span>
            </div>
            {isChecklist && isPlanner ? (
              <button
                type="button"
                onClick={() => onAddChecklistItems?.([item])}
                disabled={
                  savingChecklistItems.has(toProgressKey(item)) ||
                  addedChecklistItems.has(toProgressKey(item))
                }
                className="btn-secondary h-fit w-fit shrink-0 px-3 py-1.5 text-[11px] disabled:opacity-60"
              >
                {addedChecklistItems.has(toProgressKey(item))
                  ? "Already added"
                  : savingChecklistItems.has(toProgressKey(item))
                    ? "Adding..."
                    : "Add"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </article>
  );
}

function normalizeChecklistResponseItems(items: unknown) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) =>
      typeof item === "object" && item !== null
        ? toProgressKey(String((item as { label?: unknown }).label ?? ""))
        : "",
    )
    .filter(Boolean);
}

function toProgressKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
