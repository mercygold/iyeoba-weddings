import Link from "next/link";

import type { HomepageTikTokItem } from "@/lib/tiktok";

type PlannerInspirationFeedProps = {
  items: HomepageTikTokItem[];
};

export function PlannerInspirationFeed({ items }: PlannerInspirationFeedProps) {
  const fallback = [
    "Bridal looks",
    "Decor",
    "Entry dances",
    "Nigerian wedding moments",
  ];
  const feedItems = items.length
    ? items.slice(0, 8)
    : fallback.map((label, index) => ({
        id: `planner-fallback-${index + 1}`,
        title: label,
        url: "https://www.tiktok.com/@iyeobaweddings",
        thumbnail: "/vendors/placeholders/event-planner.svg",
        views: 0,
        likes: 0,
        category: "Inspiration",
        createdAt: new Date().toISOString(),
      }));

  return (
    <section className="surface-card rounded-[2rem] p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--color-brand-primary)]">
            Wedding Ideas For You
          </p>
          <p className="mt-2 text-sm leading-7 text-[color:var(--color-muted)]">
            Bridal looks, decor, entry dances, and real Nigerian wedding moments.
          </p>
        </div>
        <Link
          href="https://www.tiktok.com/@iyeobaweddings"
          target="_blank"
          rel="noreferrer"
          className="btn-primary px-4 py-2 text-sm"
        >
          Watch on TikTok
        </Link>
      </div>

      <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(106,62,124,0.28)_transparent]">
        {feedItems.map((item) => (
          <article
            key={item.id}
            className="surface-soft min-w-[72%] snap-start overflow-hidden rounded-[1.35rem] sm:min-w-[48%] lg:min-w-[31%]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.thumbnail || "/vendors/placeholders/event-planner.svg"}
              alt={item.title}
              className="h-36 w-full object-cover"
              loading="lazy"
            />
            <div className="p-3.5">
              <p className="line-clamp-2 text-sm font-semibold text-[color:var(--color-ink)]">
                {item.title}
              </p>
              <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                {item.views ? `${item.views.toLocaleString()} views` : "Fresh inspiration"}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
