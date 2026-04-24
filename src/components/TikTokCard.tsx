import Link from "next/link";

import type { HomepageTikTokItem } from "@/lib/tiktok";

export function TikTokCard({ item }: { item: HomepageTikTokItem }) {
  return (
    <article className="min-w-[250px] snap-start rounded-2xl border border-[rgba(91,44,131,0.1)] bg-white/90 p-3 shadow-[0_18px_42px_-34px_rgba(106,62,124,0.24)] sm:min-w-[270px]">
      <div className="h-1.5 w-8 rounded-full bg-[color:var(--color-brand-gold)]" />
      <div className="mt-2.5 aspect-[4/5] overflow-hidden rounded-xl bg-[color:var(--color-brand-soft)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbnail}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>

      <h3 className="mt-2.5 line-clamp-1 text-sm font-semibold text-[color:var(--color-brand-primary)]">
        {item.title}
      </h3>
      <p className="mt-1 text-[11px] text-[color:var(--color-muted)]">
        {formatCompact(item.views)} views · {formatCompact(item.likes)} likes
      </p>

      <Link
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex whitespace-nowrap rounded-full border border-[#5B2C83] bg-white px-3 py-1 text-[11px] font-semibold text-[#5B2C83] transition-all duration-200 ease-in-out hover:border-[#5B2C83] hover:bg-[#5B2C83] hover:!text-white"
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
