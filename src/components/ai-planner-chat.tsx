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
  budget_summary: BudgetSummary;
  budget_allocations: BudgetAllocation[];
  vendor_categories: string[];
  timeline: string[];
  next_steps: string[];
  questions: string[];
};

type BudgetSummary = {
  total_budget: string;
  allocated_amount: string;
  remaining_buffer: string;
  note: string;
};

type BudgetAllocation = {
  category: string;
  amount: string;
  percentage: number;
  percentageMin?: number | null;
  percentageMax?: number | null;
  amountMin?: number | null;
  amountMax?: number | null;
  note?: string;
};

export type AiPlannerInitialState = {
  id?: string | null;
  title?: string | null;
  weddingId?: string | null;
  messages?: unknown;
  plan?: Record<string, unknown>;
  intake?: Record<string, unknown>;
};

export type AiPlannerWeddingEvent = {
  id: string;
  title: string;
  weddingType: string;
  culture: string;
  location: string;
  guestCount: number | null;
  budgetRange: string;
  weddingDate: string | null;
  createdAt: string | null;
};

export type AiPlannerChatHistoryItem = {
  id: string;
  title: string;
  weddingId: string | null;
  messages: unknown;
  plan: Record<string, unknown>;
  updatedAt: string | null;
  createdAt: string | null;
};

type AiPlannerChatProps = {
  isAuthenticated: boolean;
  isPlanner: boolean;
  initialName?: string;
  initialState?: AiPlannerInitialState | null;
  weddingEvents?: AiPlannerWeddingEvent[];
  chatHistory?: AiPlannerChatHistoryItem[];
  selectedWeddingId?: string | null;
  selectedChatId?: string | null;
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
  budget_summary: {
    total_budget: "",
    allocated_amount: "",
    remaining_buffer: "",
    note: "",
  },
  budget_allocations: [],
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
  weddingEvents: initialWeddingEvents = [],
  chatHistory: initialChatHistory = [],
  selectedWeddingId,
  selectedChatId,
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
  const [weddingEvents, setWeddingEvents] = useState(initialWeddingEvents);
  const [chatHistory, setChatHistory] = useState(initialChatHistory);
  const [activeWeddingId, setActiveWeddingId] = useState(
    selectedWeddingId ?? initialState?.weddingId ?? initialWeddingEvents[0]?.id ?? "",
  );
  const [activeChatId, setActiveChatId] = useState(
    selectedChatId ?? initialState?.id ?? null,
  );
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
  const [budgetFeedback, setBudgetFeedback] = useState("");
  const [budgetError, setBudgetError] = useState("");
  const [historyFeedback, setHistoryFeedback] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [isManagingChat, setIsManagingChat] = useState(false);
  const [isSavingBudget, setIsSavingBudget] = useState(false);
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
      plan.budget_allocations.length ||
      plan.vendor_categories.length ||
      plan.timeline.length ||
      plan.next_steps.length,
    [plan],
  );
  const activeWedding = weddingEvents.find((event) => event.id === activeWeddingId) ?? null;
  const activeChat = chatHistory.find((chat) => chat.id === activeChatId) ?? null;

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
          chatId: activeChatId,
          weddingId: activeWeddingId || null,
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
        budget_summary: normalizeBudgetSummary(data.budget_summary),
        budget_allocations: normalizeBudgetAllocations(data.budget_allocations),
        vendor_categories: data.vendor_categories ?? [],
        timeline: data.timeline ?? [],
        next_steps: data.next_steps ?? [],
        questions: data.questions ?? [],
      };

      setPlan(nextPlan);
      setSaved(Boolean(data.saved));
      if (typeof data.chatId === "string") {
        setActiveChatId(data.chatId);
      }
      if (typeof data.weddingId === "string") {
        setActiveWeddingId(data.weddingId);
      }
      if (typeof data.chatId === "string") {
        upsertChatHistory({
          id: data.chatId,
          title: nextMessages.find((item) => item.role === "user")?.content.slice(0, 90) || "Iyeoba AI Planner chat",
          weddingId: typeof data.weddingId === "string" ? data.weddingId : activeWeddingId || null,
          messages: [
            ...nextMessages,
            {
              role: "assistant",
              content: nextPlan.reply || "I created a first planning draft below.",
            },
          ],
          plan: {
            ...nextPlan,
            intake: {
              weddingType:
                weddingType === "Other" ? customWeddingType.trim() || "Other" : weddingType,
              location,
              guestCount,
              budget,
              weddingDate,
              culture,
            },
          },
          updatedAt: new Date().toISOString(),
          createdAt: activeChat?.createdAt ?? new Date().toISOString(),
        });
        updateAiPlannerUrl(
          typeof data.weddingId === "string" ? data.weddingId : activeWeddingId || null,
          data.chatId,
        );
      }
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

  function startNewChat() {
    setActiveChatId(null);
    setMessages([]);
    setPlan(emptyPlan);
    setSaved(false);
    setAddedChecklistItems(new Set());
    setError("");
    setNotice("");
    setHistoryFeedback("New chat started.");
    updateAiPlannerUrl(activeWeddingId || null, null);
  }

  function openChat(chat: AiPlannerChatHistoryItem) {
    const chatIntake = normalizeInitialIntake(chat.plan?.intake as Record<string, unknown> | undefined);
    const nextWeddingType = resolveInitialWeddingType(chatIntake.weddingType);
    setActiveChatId(chat.id);
    setActiveWeddingId(chat.weddingId ?? "");
    setWeddingType(nextWeddingType.weddingType);
    setCustomWeddingType(nextWeddingType.customWeddingType);
    setLocation(chatIntake.location);
    setGuestCount(chatIntake.guestCount);
    setBudget(chatIntake.budget);
    setWeddingDate(chatIntake.weddingDate);
    setCulture(chatIntake.culture);
    setMessages(normalizeInitialMessages(chat.messages));
    setPlan(normalizeInitialPlan(chat.plan));
    setSaved(true);
    setAddedChecklistItems(new Set());
    setError("");
    setNotice("");
    setHistoryFeedback("");
    updateAiPlannerUrl(chat.weddingId, chat.id);
  }

  async function createWeddingEventFromDetails() {
    if (!isAuthenticated || isManagingChat) {
      return;
    }

    setIsManagingChat(true);
    setHistoryError("");
    setHistoryFeedback("");

    try {
      const response = await fetch("/api/ai-planner/chats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          intent: "createWedding",
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
      const payload = await response.json().catch(() => null) as {
        ok?: boolean;
        error?: string;
        wedding?: AiPlannerWeddingEvent;
      } | null;

      if (!response.ok || !payload?.ok || !payload.wedding) {
        throw new Error(payload?.error || "We could not create this wedding event right now.");
      }

      setWeddingEvents((current) => [payload.wedding!, ...current]);
      setActiveWeddingId(payload.wedding.id);
      setHistoryFeedback("Wedding event created.");
      updateAiPlannerUrl(payload.wedding.id, activeChatId);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "We could not create this wedding event right now.");
    } finally {
      setIsManagingChat(false);
    }
  }

  async function clearCurrentChat() {
    if (!activeChatId) {
      setMessages([]);
      setPlan(emptyPlan);
      setSaved(false);
      setHistoryFeedback("Current draft cleared.");
      return;
    }

    await manageCurrentChat("clear");
  }

  async function deleteCurrentChat() {
    if (!activeChatId) {
      startNewChat();
      return;
    }

    await manageCurrentChat("delete");
  }

  async function manageCurrentChat(intent: "clear" | "delete") {
    if (isManagingChat || !activeChatId) {
      return;
    }

    setIsManagingChat(true);
    setHistoryError("");
    setHistoryFeedback("");

    try {
      const response = await fetch("/api/ai-planner/chats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ intent, chatId: activeChatId }),
      });
      const payload = await response.json().catch(() => null) as {
        ok?: boolean;
        error?: string;
        message?: string;
      } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "We could not update this chat right now.");
      }

      if (intent === "clear") {
        setMessages([]);
        setPlan(emptyPlan);
        setSaved(true);
        setChatHistory((current) =>
          current.map((chat) =>
            chat.id === activeChatId
              ? { ...chat, messages: [], plan: {}, updatedAt: new Date().toISOString() }
              : chat,
          ),
        );
        setHistoryFeedback("Chat cleared.");
      } else {
        setChatHistory((current) => current.filter((chat) => chat.id !== activeChatId));
        setActiveChatId(null);
        setMessages([]);
        setPlan(emptyPlan);
        setSaved(false);
        setHistoryFeedback("Chat deleted.");
        updateAiPlannerUrl(activeWeddingId || null, null);
      }
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "We could not update this chat right now.");
    } finally {
      setIsManagingChat(false);
    }
  }

  function upsertChatHistory(chat: AiPlannerChatHistoryItem) {
    setChatHistory((current) => {
      const existing = current.filter((item) => item.id !== chat.id);
      return [chat, ...existing].sort((a, b) => toTime(b.updatedAt) - toTime(a.updatedAt));
    });
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
        body: JSON.stringify({ items, weddingId: activeWeddingId || null }),
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

  async function saveBudgetToDashboard() {
    if (!isPlanner || isSavingBudget) {
      return;
    }

    setBudgetError("");
    setBudgetFeedback("");
    setIsSavingBudget(true);

    try {
      const budgetPayload = buildBudgetSavePayload(plan, budget);

      console.info("AI planner budget save payload", {
        hasBudgetSummary: Boolean(
          plan.budget_summary.total_budget ||
            plan.budget_summary.allocated_amount ||
            plan.budget_summary.remaining_buffer ||
            plan.budget_summary.note,
        ),
        budgetAllocationsCount: plan.budget_allocations.length,
        visibleBudgetItemsCount: plan.budget_breakdown.length,
        normalizedCategoriesCount: budgetPayload.categories.length,
        budgetPayloadKeys: Object.keys(budgetPayload),
      });

      const response = await fetch("/api/ai-planner/budget", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          budget: budgetPayload,
          weddingId: activeWeddingId || null,
        }),
      });
      const rawText = await response.text();
      const payload = rawText ? JSON.parse(rawText) : {};

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "We could not save this budget right now.");
      }

      console.info("AI planner budget save response", {
        ok: payload.ok,
        routeCalled: true,
        blueprintId: payload.blueprintId ?? null,
        categoriesSaved: payload.categoriesSaved ?? null,
        totalBudget: payload.totalBudget ?? null,
        currency: payload.currency ?? null,
      });
      setBudgetFeedback(payload.message ?? "Budget saved to dashboard.");
    } catch (error) {
      console.error("AI planner budget save failed", error);
      setBudgetError(
        error instanceof Error
          ? error.message
          : "We could not save this budget right now.",
      );
    } finally {
      setIsSavingBudget(false);
    }
  }

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(280px,0.55fr)_minmax(0,1.45fr)] lg:items-start">
      <aside className="surface-card min-w-0 rounded-[2rem] p-5 sm:p-6 lg:sticky lg:top-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-brand-primary)]">
          Planning Details
        </p>
        {isAuthenticated ? (
          <div className="mt-5 rounded-[1.35rem] border border-[rgba(91,44,131,0.1)] bg-white/70 p-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
                Wedding event
              </span>
              <select
                value={activeWeddingId}
                onChange={(event) => {
                  setActiveWeddingId(event.target.value);
                  setAddedChecklistItems(new Set());
                  updateAiPlannerUrl(event.target.value || null, activeChatId);
                }}
                className="field-input mt-2 rounded-[1.25rem] text-sm"
              >
                <option value="">General planning</option>
                {weddingEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={createWeddingEventFromDetails}
              disabled={isManagingChat}
              className="btn-secondary mt-3 w-full px-3 py-2 text-xs disabled:opacity-60"
            >
              {isManagingChat ? "Saving..." : "Create wedding/event from details"}
            </button>
          </div>
        ) : null}
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

        {isAuthenticated ? (
          <div className="mt-6 rounded-[1.5rem] border border-[rgba(91,44,131,0.1)] bg-white/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-brand-primary)]">
                Chat History
              </p>
              <button
                type="button"
                onClick={startNewChat}
                className="btn-secondary px-3 py-1.5 text-xs"
              >
                New chat
              </button>
            </div>
            {chatHistory.length ? (
              <div className="mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {chatHistory.map((chat) => {
                  const wedding = weddingEvents.find((event) => event.id === chat.weddingId);
                  const isActive = chat.id === activeChatId;
                  return (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => openChat(chat)}
                      className={`w-full rounded-[1rem] px-3 py-2.5 text-left transition ${
                        isActive
                          ? "bg-[rgba(91,44,131,0.12)]"
                          : "hover:bg-[rgba(91,44,131,0.06)]"
                      }`}
                    >
                      <span className="block truncate text-sm font-semibold text-[color:var(--color-ink)]">
                        {chat.title || "Iyeoba AI Planner chat"}
                      </span>
                      <span className="mt-1 block truncate text-xs text-[color:var(--color-muted)]">
                        {wedding?.title ?? "General planning"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[color:var(--color-muted)]">
                Your saved AI Planner chats will appear here.
              </p>
            )}
          </div>
        ) : null}

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

      <div className="surface-card min-w-0 rounded-[2rem] p-5 sm:p-7 lg:p-8">
        <div className="flex flex-col gap-3 border-b border-[rgba(91,44,131,0.1)] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-brand-primary)]">
              Planning Assistant
            </p>
            <h2 className="font-display mt-2 text-3xl text-[color:var(--color-ink)]">
              Wedding plan draft
            </h2>
            <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted)]">
              {activeWedding?.title ?? "General planning"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              onClick={startNewChat}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              New chat
            </button>
            <button
              type="button"
              onClick={clearCurrentChat}
              disabled={isManagingChat}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-60"
            >
              Clear chat
            </button>
            <button
              type="button"
              onClick={deleteCurrentChat}
              disabled={isManagingChat || !activeChatId}
              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-60"
            >
              Delete chat
            </button>
            {saved ? (
              <span className="surface-soft w-fit rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-brand-primary)]">
                Saved
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-6 min-h-[320px] space-y-5">
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

          {historyFeedback ? (
            <div className="surface-soft rounded-[1.5rem] border border-emerald-200 p-4 text-xs leading-6 text-emerald-800">
              {historyFeedback}
            </div>
          ) : null}

          {historyError ? (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-xs leading-6 text-red-700">
              {historyError}
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

          {budgetFeedback ? (
            <div className="surface-soft rounded-[1.5rem] border border-emerald-200 p-4 text-xs leading-6 text-emerald-800">
              {budgetFeedback}
            </div>
          ) : null}

          {budgetError ? (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-xs leading-6 text-red-700">
              {budgetError}
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
              isSavingBudget={isSavingBudget}
              onSaveBudget={saveBudgetToDashboard}
              onUseQuestion={(question) => {
                setMessage(question);
                setNotice("Question added to the planning prompt.");
              }}
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
    budget_summary: normalizeBudgetSummary(plan.budget_summary),
    budget_allocations: normalizeBudgetAllocations(plan.budget_allocations),
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

function normalizeBudgetSummary(value: unknown): BudgetSummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyPlan.budget_summary;
  }

  const record = value as Record<string, unknown>;

  return {
    total_budget: stringValue(record.total_budget),
    allocated_amount: stringValue(record.allocated_amount),
    remaining_buffer: stringValue(record.remaining_buffer),
    note: stringValue(record.note),
  };
}

function normalizeBudgetAllocations(value: unknown): BudgetAllocation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object" && !Array.isArray(item)),
    )
    .map((item) => ({
      category: stringValue(item.category),
      amount: stringValue(item.amount),
      percentage: Number(item.percentage),
      percentageMin: nullableNumber(item.percentageMin),
      percentageMax: nullableNumber(item.percentageMax),
      amountMin: nullableNumber(item.amountMin),
      amountMax: nullableNumber(item.amountMax),
      note: stringValue(item.note),
    }))
    .filter(
      (item) =>
        item.category &&
        ((Number.isFinite(item.percentage) && item.percentage > 0) ||
          item.percentageMin ||
          item.percentageMax ||
          item.note ||
          item.amount),
    );
}

function nullableNumber(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
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

function updateAiPlannerUrl(weddingId: string | null, chatId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  if (weddingId) {
    url.searchParams.set("weddingId", weddingId);
  } else {
    url.searchParams.delete("weddingId");
  }
  if (chatId) {
    url.searchParams.set("chatId", chatId);
  } else {
    url.searchParams.delete("chatId");
  }
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

function toTime(value: string | null | undefined) {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
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
  isSavingBudget,
  onSaveBudget,
  onUseQuestion,
}: {
  plan: PlannerPlan;
  isAuthenticated: boolean;
  isPlanner: boolean;
  savingChecklistItems: Set<string>;
  addedChecklistItems: Set<string>;
  onAddChecklistItems: (items: string[]) => void;
  isSavingBudget: boolean;
  onSaveBudget: () => void;
  onUseQuestion: (question: string) => void;
}) {
  return (
    <div className="space-y-5 pt-2">
      {plan.reply ? (
        <article className="surface-soft min-w-0 rounded-[1.75rem] border border-[rgba(91,44,131,0.08)] p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-brand-primary)]">
            Plan summary
          </p>
          <p className="mt-3 break-words text-sm leading-8 text-[color:var(--color-muted)] sm:text-base">
            {plan.reply}
          </p>
        </article>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-2">
        <BudgetModule
          summary={plan.budget_summary}
          allocations={plan.budget_allocations}
          fallbackItems={plan.budget_breakdown}
          isAuthenticated={isAuthenticated}
          isPlanner={isPlanner}
          isSavingBudget={isSavingBudget}
          onSaveBudget={onSaveBudget}
        />
        <ResultList
          title="Checklist"
          items={plan.checklist}
          isChecklist
          description="Tasks to move into your planner dashboard for this selected wedding event."
          isAuthenticated={isAuthenticated}
          isPlanner={isPlanner}
          savingChecklistItems={savingChecklistItems}
          addedChecklistItems={addedChecklistItems}
          onAddChecklistItems={onAddChecklistItems}
        />
        <ResultList
          title="Suggested Cultural Elements"
          items={plan.suggested_cultural_elements}
          description="Traditions and cultural details to discuss with your families, planner, and vendors."
        />
        <ResultList title="Vendor Categories" items={plan.vendor_categories} compact />
        <ResultList title="Timeline" items={plan.timeline} compact />
        <ResultList title="Next Steps" items={plan.next_steps} compact />
      </div>
      <QuestionList items={plan.questions} onUseQuestion={onUseQuestion} />
    </div>
  );
}

function ResultList({
  title,
  items,
  description,
  isChecklist = false,
  compact = false,
  isAuthenticated = false,
  isPlanner = false,
  savingChecklistItems = new Set<string>(),
  addedChecklistItems = new Set<string>(),
  onAddChecklistItems,
}: {
  title: string;
  items: string[];
  description?: string;
  isChecklist?: boolean;
  compact?: boolean;
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
    <article className={`surface-soft min-w-0 rounded-[1.75rem] border border-[rgba(91,44,131,0.08)] ${compact ? "p-4 sm:p-5" : "p-5 sm:p-6"}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h3 className="font-display text-2xl text-[color:var(--color-ink)] sm:text-3xl">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 max-w-2xl text-xs leading-6 text-[color:var(--color-muted)] sm:text-sm">
              {description}
            </p>
          ) : null}
        </div>
        {isChecklist && isPlanner ? (
          <button
            type="button"
            onClick={() => onAddChecklistItems?.(items)}
            disabled={items.every((item) => addedChecklistItems.has(toProgressKey(item)))}
            className="btn-secondary w-fit shrink-0 whitespace-nowrap px-3 py-2 text-xs disabled:opacity-60"
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
      <ul className={`${description ? "mt-5" : "mt-4"} space-y-3 text-sm leading-7 text-[color:var(--color-muted)]`}>
        {items.map((item, index) => (
          <li
            key={`${title}-${index}`}
            className={
              isChecklist && isPlanner
                ? "grid gap-3 rounded-[1.15rem] bg-white/70 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                : "flex gap-3 rounded-[1.15rem] bg-white/55 p-3"
            }
          >
            <div className="flex min-w-0 gap-3">
              <span className="mt-[0.62rem] h-2 w-2 shrink-0 rounded-full bg-[color:var(--color-brand-gold)] shadow-[0_0_0_4px_rgba(201,161,91,0.14)]" />
              <span className="min-w-0 break-words">{item}</span>
            </div>
            {isChecklist && isPlanner ? (
              <button
                type="button"
                onClick={() => onAddChecklistItems?.([item])}
                disabled={
                  savingChecklistItems.has(toProgressKey(item)) ||
                  addedChecklistItems.has(toProgressKey(item))
                }
                className="btn-secondary h-fit w-fit shrink-0 justify-self-start whitespace-nowrap px-3 py-1.5 text-[11px] disabled:opacity-60 sm:justify-self-end"
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

function QuestionList({
  items,
  onUseQuestion,
}: {
  items: string[];
  onUseQuestion: (question: string) => void;
}) {
  if (!items.length) {
    return null;
  }

  return (
    <article className="surface-soft min-w-0 rounded-[1.75rem] border border-[rgba(91,44,131,0.08)] p-5 sm:p-6">
      <div className="min-w-0">
        <h3 className="font-display text-2xl text-[color:var(--color-ink)] sm:text-3xl">
          Questions to Confirm
        </h3>
        <p className="mt-1 max-w-3xl text-xs leading-6 text-[color:var(--color-muted)] sm:text-sm">
          Tap a question to place it into the Planning Assistant prompt for a follow-up.
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {items.map((item, index) => (
          <button
            key={`question-${index}`}
            type="button"
            onClick={() => onUseQuestion(item)}
            className="rounded-full border border-[rgba(201,161,91,0.55)] bg-white/75 px-4 py-2 text-left text-xs font-semibold leading-5 text-[color:var(--color-brand-primary)] transition hover:border-[color:var(--color-brand-primary)] hover:bg-white"
          >
            <span className="break-words">{item}</span>
          </button>
        ))}
      </div>
    </article>
  );
}

function BudgetModule({
  summary,
  allocations,
  fallbackItems,
  isAuthenticated,
  isPlanner,
  isSavingBudget,
  onSaveBudget,
}: {
  summary: BudgetSummary;
  allocations: BudgetAllocation[];
  fallbackItems: string[];
  isAuthenticated: boolean;
  isPlanner: boolean;
  isSavingBudget: boolean;
  onSaveBudget: () => void;
}) {
  if (!allocations.length && !fallbackItems.length) {
    return null;
  }

  const allocatedTotal = allocations
    .filter((item) => item.category.toLowerCase() !== "contingency")
    .reduce((total, item) => total + item.percentage, 0);
  const contingency = allocations.find(
    (item) => item.category.toLowerCase() === "contingency",
  );

  return (
    <article className="surface-soft min-w-0 rounded-[1.75rem] border border-[rgba(91,44,131,0.08)] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-2xl text-[color:var(--color-ink)]">
            Budget Breakdown
          </h3>
          <p className="mt-1 text-xs leading-6 text-[color:var(--color-muted)]">
            Starter estimates for planning. Confirm actual pricing with vendors and families.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          {summary.total_budget ? (
            <div className="rounded-[1rem] bg-white px-4 py-3 text-sm shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
                Total budget
              </p>
              <p className="mt-1 font-semibold text-[color:var(--color-ink)]">
                {summary.total_budget}
              </p>
            </div>
          ) : null}
          {isPlanner ? (
            <button
              type="button"
              onClick={onSaveBudget}
              disabled={isSavingBudget}
              className="btn-secondary w-fit px-3 py-2 text-xs disabled:opacity-60"
            >
              {isSavingBudget ? "Saving..." : "Save budget to dashboard"}
            </button>
          ) : null}
        </div>
      </div>
      {!isAuthenticated ? (
        <p className="mt-3 text-xs leading-6 text-[color:var(--color-muted)]">
          Sign in as a planner to save this budget to your dashboard.
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <BudgetMetric label="Allocated" value={summary.allocated_amount || `${allocatedTotal}%`} />
        <BudgetMetric
          label="Buffer / contingency"
          value={summary.remaining_buffer || `${contingency?.percentage ?? 10}%`}
        />
        <BudgetMetric label="Categories" value={`${allocations.length || fallbackItems.length}`} />
      </div>

      {allocations.length ? (
        <div className="mt-5 space-y-3">
          {allocations.map((item) => (
            <div key={item.category} className="rounded-[1rem] bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <p className="min-w-0 break-words font-semibold text-[color:var(--color-ink)]">
                  {item.category}
                </p>
                <p className="shrink-0 text-right text-xs font-semibold text-[color:var(--color-muted)] max-sm:text-left">
                  {item.amount || `${item.percentage}%`} · {item.percentage}%
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgba(91,44,131,0.12)]">
                <div
                  className="h-full rounded-full bg-[color:var(--color-brand-primary)]"
                  style={{ width: `${Math.min(Math.max(item.percentage, 0), 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <ul className="mt-4 space-y-2 text-sm leading-7 text-[color:var(--color-muted)]">
          {fallbackItems.map((item, index) => (
            <li key={`budget-fallback-${index}`} className="flex min-w-0 gap-2">
              <span className="mt-[0.58rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-brand-gold)]" />
              <span className="min-w-0 break-words">{item}</span>
            </li>
          ))}
        </ul>
      )}

      {summary.note ? (
        <p className="mt-4 text-xs leading-6 text-[color:var(--color-muted)]">
          {summary.note}
        </p>
      ) : null}
    </article>
  );
}

function buildBudgetSavePayload(plan: PlannerPlan, budgetInput: string) {
  const parsedInputBudget = parseMoneyText(budgetInput);
  const parsedSummaryBudget = parseMoneyText(plan.budget_summary.total_budget);
  const totalBudget = parsedSummaryBudget.amount ?? parsedInputBudget.amount;
  const currency = parsedSummaryBudget.currency || parsedInputBudget.currency || "UNKNOWN";
  const structuredCategories = plan.budget_allocations.map((item) => {
    const parsedAmount = parseMoneyText(item.amount);
    const percentage = Number.isFinite(item.percentage) ? item.percentage : null;
    return {
      id: toProgressKey(item.category),
      name: item.category,
      amount: parsedAmount.amount,
      percentage,
      percentageMin: item.percentageMin ?? null,
      percentageMax: item.percentageMax ?? null,
      amountMin: item.amountMin ?? null,
      amountMax: item.amountMax ?? null,
      note: item.note || item.amount || (percentage ? `${percentage}%` : ""),
      source: "ai",
    };
  });
  const categories = structuredCategories.length
    ? structuredCategories
    : deriveBudgetCategoriesFromText(plan.budget_breakdown, totalBudget, currency);
  const allocatedAmount = categories.reduce(
    (total, item) => total + (item.amount ?? item.amountMax ?? item.amountMin ?? 0),
    0,
  );
  const bufferCategory = categories.find((item) =>
    item.name.toLowerCase().includes("contingency"),
  );

  return {
    currency,
    totalBudget,
    allocatedAmount: allocatedAmount || null,
    remainingAmount:
      totalBudget !== null && allocatedAmount ? totalBudget - allocatedAmount : null,
    bufferPercentage:
      bufferCategory?.percentage ?? bufferCategory?.percentageMax ?? bufferCategory?.percentageMin ?? null,
    categories,
    notes: plan.budget_breakdown,
    summary: plan.budget_summary,
    source: "ai",
    updatedAt: new Date().toISOString(),
  };
}

function deriveBudgetCategoriesFromText(
  items: string[],
  totalBudget: number | null,
  currency: string,
) {
  return items.map((item, index) => {
    const [rawName, ...rest] = item.split(":");
    const name = rest.length ? rawName.trim() : `Budget item ${index + 1}`;
    const note = rest.length ? rest.join(":").trim() : item;
    const percentages = [...item.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map((match) =>
      Number(match[1]),
    );
    const percentageMin = percentages.length ? Math.min(...percentages) : null;
    const percentageMax = percentages.length ? Math.max(...percentages) : null;
    const percentage =
      percentageMin !== null && percentageMax !== null && percentageMin === percentageMax
        ? percentageMin
        : null;
    const amountMin =
      totalBudget !== null && percentageMin !== null
        ? totalBudget * (percentageMin / 100)
        : parseMoneyText(item).amount;
    const amountMax =
      totalBudget !== null && percentageMax !== null
        ? totalBudget * (percentageMax / 100)
        : amountMin;

    return {
      id: toProgressKey(name || `budget_item_${index + 1}`),
      name,
      amount: percentage !== null ? amountMin : null,
      percentage,
      percentageMin,
      percentageMax,
      amountMin,
      amountMax,
      note: note || item,
      source: "ai",
    };
  });
}

function parseMoneyText(value: string) {
  const text = value || "";
  const currency = text.includes("₦") || /ngn|naira/i.test(text)
    ? "NGN"
    : text.includes("$") || /usd/i.test(text)
      ? "USD"
      : text.includes("£") || /gbp/i.test(text)
        ? "GBP"
        : text.includes("€") || /eur/i.test(text)
          ? "EUR"
          : "";
  const numeric = Number(text.replace(/[^0-9.]/g, ""));

  return {
    currency,
    amount: Number.isFinite(numeric) && numeric >= 0 ? numeric : null,
  };
}

function BudgetMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] bg-white px-4 py-3 text-sm shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
        {label}
      </p>
      <p className="mt-1 font-semibold text-[color:var(--color-ink)]">
        {value}
      </p>
    </div>
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
