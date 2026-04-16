"use client";

import { useState } from "react";

type PlannerAssistantModulesProps = {
  weddingType: string;
  guestCount: number;
  location: string;
};

type ItemStatus = "not_started" | "ongoing" | "done";

type ChecklistItem = {
  id: string;
  title: string;
  note: string;
};

type TimelineStage = {
  id: string;
  title: string;
  guidance: string;
};

const statusOptions: Array<{ value: ItemStatus; label: string }> = [
  { value: "not_started", label: "Not started" },
  { value: "ongoing", label: "Ongoing" },
  { value: "done", label: "Done" },
];

export function PlannerAssistantModules({
  weddingType,
  guestCount,
  location,
}: PlannerAssistantModulesProps) {
  const checklistItems: ChecklistItem[] = [
    {
      id: "format",
      title: "Lock wedding style and format",
      note: `Confirm how your ${weddingType.toLowerCase()} should feel across key moments.`,
    },
    {
      id: "guests",
      title: "Set guest count estimate",
      note: `Keep planning anchored around your current estimate of ${guestCount} guests.`,
    },
    {
      id: "venue_shortlist",
      title: "Shortlist venue options",
      note: `Save 2 to 4 venue options that fit ${location} and your event flow.`,
    },
    {
      id: "venue_contact",
      title: "Contact top venue choice",
      note: "Reach out early to confirm availability and booking timeline.",
    },
    {
      id: "planner_shortlist",
      title: "Shortlist planner/coordinator",
      note: "Prioritize teams with strong Nigerian wedding and family logistics experience.",
    },
    {
      id: "photographer_contact",
      title: "Contact photographer",
      note: "Start with your top visual style match to secure availability.",
    },
    {
      id: "budget_direction",
      title: "Confirm working budget direction",
      note: "Set a realistic direction before expanding vendor outreach.",
    },
    {
      id: "saved_vendors",
      title: "Save preferred vendors",
      note: "Build a focused shortlist before sending broad inquiries.",
    },
  ];

  const timelineStages: TimelineStage[] = [
    {
      id: "vision",
      title: "Define vision",
      guidance: "Clarify wedding style, ceremony flow, and atmosphere.",
    },
    {
      id: "baseline",
      title: "Build guest count and budget baseline",
      guidance: "Set practical planning boundaries for spend and scale.",
    },
    {
      id: "shortlist",
      title: "Shortlist priority vendors",
      guidance: "Save top choices for venue, planner, and photography first.",
    },
    {
      id: "inquiries",
      title: "Send inquiries",
      guidance: "Reach out with focused details instead of broad requests.",
    },
    {
      id: "compare",
      title: "Compare responses",
      guidance: "Review fit, pricing, and availability side by side.",
    },
    {
      id: "lock",
      title: "Lock core vendors",
      guidance: "Confirm your top vendors and move key decisions forward.",
    },
    {
      id: "logistics",
      title: "Refine logistics",
      guidance: "Tighten timelines, family coordination, and final details.",
    },
  ];

  const [checklistStatus, setChecklistStatus] = useState<Record<string, ItemStatus>>(() =>
    Object.fromEntries(checklistItems.map((item) => [item.id, "not_started"])),
  );
  const [timelineStatus, setTimelineStatus] = useState<Record<string, ItemStatus>>(() =>
    Object.fromEntries(timelineStages.map((stage) => [stage.id, "not_started"])),
  );

  const completedChecklist = checklistItems.filter(
    (item) => checklistStatus[item.id] === "done",
  ).length;
  const completedTimeline = timelineStages.filter(
    (stage) => timelineStatus[stage.id] === "done",
  ).length;

  return (
    <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <article className="surface-card rounded-[2rem] p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
              Planning clarity
            </p>
            <h2 className="font-display mt-3 text-3xl text-[color:var(--color-ink)]">
              Checklist
            </h2>
          </div>
          <span className="surface-soft rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-brand-primary)]">
            {completedChecklist} of {checklistItems.length} done
          </span>
        </div>

        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[color:var(--color-brand-light)]">
          <div
            className="h-full rounded-full bg-[color:var(--color-brand-primary)] transition-all"
            style={{
              width: `${Math.round((completedChecklist / checklistItems.length) * 100)}%`,
            }}
          />
        </div>

        <div className="mt-5 grid gap-3">
          {checklistItems.map((item) => {
            const status = checklistStatus[item.id];
            return (
              <div key={item.id} className="surface-soft rounded-[1.25rem] px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm leading-7 text-[color:var(--color-muted)]">
                      {item.note}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusChip status={status} />
                    <select
                      value={status}
                      onChange={(event) =>
                        setChecklistStatus((current) => ({
                          ...current,
                          [item.id]: event.target.value as ItemStatus,
                        }))
                      }
                      className="field-input rounded-[999px] px-3 py-1.5 text-xs font-semibold"
                      aria-label={`Set status for ${item.title}`}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </article>

      <article className="surface-card rounded-[2rem] p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
              Shape the sequence
            </p>
            <h2 className="font-display mt-3 text-3xl text-[color:var(--color-ink)]">
              Rough timeline
            </h2>
          </div>
          <span className="surface-soft rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-brand-primary)]">
            {completedTimeline} of {timelineStages.length} stages complete
          </span>
        </div>

        <div className="mt-5 grid gap-3">
          {timelineStages.map((stage, index) => {
            const status = timelineStatus[stage.id];
            return (
              <div
                key={stage.id}
                className="rounded-[1.25rem] border border-[color:var(--color-brand-light)] bg-white px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-brand-gold)]">
                      Stage {index + 1}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[color:var(--color-ink)]">
                      {stage.title}
                    </p>
                    <p className="mt-1 text-sm leading-7 text-[color:var(--color-muted)]">
                      {stage.guidance}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusChip status={status} />
                    <select
                      value={status}
                      onChange={(event) =>
                        setTimelineStatus((current) => ({
                          ...current,
                          [stage.id]: event.target.value as ItemStatus,
                        }))
                      }
                      className="field-input rounded-[999px] px-3 py-1.5 text-xs font-semibold"
                      aria-label={`Set status for ${stage.title}`}
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-sm leading-7 text-[color:var(--color-muted)]">
          This free planner keeps your essentials organized. Advanced automation, timeline
          intelligence, and deeper coordination can be expanded in a future Pro experience.
        </p>
      </article>
    </section>
  );
}

function StatusChip({ status }: { status: ItemStatus }) {
  if (status === "done") {
    return (
      <span className="rounded-full bg-[#E8F6EE] px-3 py-1 text-xs font-semibold text-[#1F7A48]">
        Done
      </span>
    );
  }

  if (status === "ongoing") {
    return (
      <span className="rounded-full bg-[#FFF4DE] px-3 py-1 text-xs font-semibold text-[#8C5A14]">
        Ongoing
      </span>
    );
  }

  return (
    <span className="rounded-full bg-[color:var(--color-brand-light)] px-3 py-1 text-xs font-semibold text-[color:var(--color-brand-primary)]">
      Not started
    </span>
  );
}
