import Link from "next/link";

import type { HomepageTikTokItem } from "@/lib/tiktok";

export function TikTokCard({ item }: { item: HomepageTikTokItem }) {
  return (
    <article className="min-w-[230px] rounded-2xl border border-[rgba(91,44,131,0.1)] bg-white/90 p-4 shadow-[0_18px_42px_-34px_rgba(106,62,124,0.24)]">
      <div className="h-1.5 w-8 rounded-full bg-[color:var(--color-brand-gold)]" />
      <div className="mt-3 aspect-[4/3] overflow-hidden rounded-xl bg-[color:var(--color-brand-soft)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbnail}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>

      <h3 className="mt-3 line-clamp-2 text-base font-semibold text-[color:var(--color-brand-primary)]">
        {item.title}
      </h3>
      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[color:var(--color-muted)]">
        {item.category}
      </p>
      <p className="mt-2 text-xs text-[color:var(--color-muted)]">
        {formatCompact(item.views)} views · {formatCompact(item.likes)} likes
      </p>

      <Link
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex whitespace-nowrap rounded-full border border-[#5B2C83] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#5B2C83] transition-all duration-200 ease-in-out hover:bg-[#5B2C83] hover:text-white"
      >
        View on TikTok
      </Link>
    </article>
  );
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
