"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type PlannerPlan = {
  reply: string;
  checklist: string[];
  budget_breakdown: string[];
  vendor_categories: string[];
  timeline: string[];
  next_steps: string[];
  questions: string[];
};

type AiPlannerChatProps = {
  isAuthenticated: boolean;
  initialName?: string;
};

const starterPrompts = [
  "Create a 6-month plan for a Lagos traditional and white wedding.",
  "Help me plan a diaspora Nigerian wedding with 200 guests.",
  "Build a vendor checklist for an intimate court wedding.",
];

const emptyPlan: PlannerPlan = {
  reply: "",
  checklist: [],
  budget_breakdown: [],
  vendor_categories: [],
  timeline: [],
  next_steps: [],
  questions: [],
};

export function AiPlannerChat({ isAuthenticated, initialName }: AiPlannerChatProps) {
  const [weddingType, setWeddingType] = useState("");
  const [location, setLocation] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [budget, setBudget] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [culture, setCulture] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [plan, setPlan] = useState<PlannerPlan>(emptyPlan);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const hasPlan = useMemo(
    () =>
      plan.reply ||
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
            weddingType,
            location,
            guestCount,
            budget,
            weddingDate,
            culture,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Iyeoba AI could not create a plan right now.");
      }

      const nextPlan: PlannerPlan = {
        reply: data.reply ?? "",
        checklist: data.checklist ?? [],
        budget_breakdown: data.budget_breakdown ?? [],
        vendor_categories: data.vendor_categories ?? [],
        timeline: data.timeline ?? [],
        next_steps: data.next_steps ?? [],
        questions: data.questions ?? [],
      };

      setPlan(nextPlan);
      setSaved(Boolean(data.saved));
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

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <aside className="surface-card rounded-[2rem] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-brand-primary)]">
          Planning Details
        </p>
        <div className="mt-5 space-y-4">
          <PlannerField
            label="Wedding type"
            value={weddingType}
            onChange={setWeddingType}
            placeholder="Traditional, court, white, or combined"
          />
          <PlannerField
            label="Location"
            value={location}
            onChange={setLocation}
            placeholder="Lagos, Abuja, London, Atlanta..."
          />
          <PlannerField
            label="Guest count"
            value={guestCount}
            onChange={setGuestCount}
            placeholder="150 guests"
          />
          <PlannerField
            label="Budget"
            value={budget}
            onChange={setBudget}
            placeholder="₦8m, $25k, £18k..."
          />
          <PlannerField
            label="Wedding date/month"
            value={weddingDate}
            onChange={setWeddingDate}
            placeholder="December 2026"
          />
          <PlannerField
            label="Culture or tradition"
            value={culture}
            onChange={setCulture}
            placeholder="Yoruba, Igbo, Edo, Hausa, inter-cultural..."
          />
        </div>

        <div className="surface-soft mt-6 rounded-[1.5rem] p-4 text-sm leading-7 text-[color:var(--color-muted)]">
          {isAuthenticated ? (
            <p>
              {initialName ? `${initialName}, your` : "Your"} AI planner chats are saved to your account when Supabase is configured.
            </p>
          ) : (
            <p>
              You can draft a plan now. <Link href="/auth/sign-in?next=/ai-planner" className="font-semibold text-[color:var(--color-brand-primary)]">Sign in</Link> to save chat history.
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

          {hasPlan ? <PlannerResult plan={plan} /> : null}
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
};

function PlannerField({ label, value, onChange, placeholder }: PlannerFieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-muted)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field-input mt-2 rounded-[1.25rem] text-sm"
        placeholder={placeholder}
      />
    </label>
  );
}

function PlannerResult({ plan }: { plan: PlannerPlan }) {
  return (
    <div className="grid gap-4 pt-2 md:grid-cols-2">
      <ResultList title="Checklist" items={plan.checklist} />
      <ResultList title="Budget Breakdown" items={plan.budget_breakdown} />
      <ResultList title="Vendor Categories" items={plan.vendor_categories} />
      <ResultList title="Timeline" items={plan.timeline} />
      <ResultList title="Next Steps" items={plan.next_steps} />
      <ResultList title="Questions to Confirm" items={plan.questions} />
    </div>
  );
}

function ResultList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <article className="surface-soft rounded-[1.5rem] p-4">
      <h3 className="font-display text-2xl text-[color:var(--color-ink)]">
        {title}
      </h3>
      <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--color-muted)]">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <span className="mt-[0.58rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-brand-gold)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
