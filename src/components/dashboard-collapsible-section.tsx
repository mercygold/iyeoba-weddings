"use client";

import { type ReactNode, useEffect, useId, useState } from "react";

type DashboardCollapsibleSectionProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  storageKey: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  priorityOpen?: boolean;
};

export function DashboardCollapsibleSection({
  eyebrow,
  title,
  subtitle,
  defaultOpen = true,
  storageKey,
  badge,
  children,
  className = "",
  contentClassName = "mt-5",
  priorityOpen = false,
}: DashboardCollapsibleSectionProps) {
  const contentId = useId();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      if (priorityOpen) {
        setIsOpen(true);
        return;
      }

      try {
        const saved = window.localStorage.getItem(storageKey);
        if (saved === "open") {
          setIsOpen(true);
        } else if (saved === "closed") {
          setIsOpen(false);
        }
      } catch {
        // localStorage is optional; defaults still keep the dashboard usable.
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [defaultOpen, priorityOpen, storageKey]);

  function toggleOpen() {
    setIsOpen((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(storageKey, next ? "open" : "closed");
      } catch {
        // Ignore persistence failures.
      }
      return next;
    });
  }

  return (
    <section className={`surface-card rounded-[1.35rem] p-4 sm:rounded-[2rem] sm:p-7 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-brand-primary)] sm:text-sm sm:tracking-[0.22em]">
            {eyebrow}
          </p>
          <h2 className="font-display mt-2 text-[1.55rem] leading-tight text-[color:var(--color-ink)] sm:text-3xl">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--color-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {badge}
          <button
            type="button"
            aria-expanded={isOpen ? "true" : "false"}
            aria-controls={contentId}
            onClick={toggleOpen}
            className="inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-[rgba(201,161,91,0.55)] bg-white text-xl font-semibold leading-none text-[color:var(--color-brand-primary)] shadow-sm transition hover:bg-[rgba(201,161,91,0.12)]"
          >
            <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
            <span className="sr-only">{isOpen ? "Collapse" : "Expand"} {title}</span>
          </button>
        </div>
      </div>

      {isOpen ? (
        <div
          id={contentId}
          className={`${contentClassName} [content-visibility:auto] [contain-intrinsic-size:1px_720px]`}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
