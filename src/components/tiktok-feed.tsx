"use client";

import { useState } from "react";

import { TrackedLink } from "@/components/tracked-link";
import {
  buildTikTokVendorHref,
  getTikTokThumbnailUrl,
  getTikTokWatchHref,
  type TikTokVideo,
} from "@/lib/tiktok-shared";

export function TikTokFeed({
  videos,
  title,
  subtitle,
  stickyCta = false,
  source = "tiktok",
  ctaLabel = "Find Vendors Like This",
}: {
  videos: TikTokVideo[];
  title: string;
  subtitle: string;
  stickyCta?: boolean;
  source?: string;
  ctaLabel?: string;
}) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
          TikTok feed
        </p>
        <h2 className="font-display mt-2 text-4xl text-[color:var(--color-ink)]">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-8 text-[color:var(--color-muted)]">
          {subtitle}
        </p>
        </div>
        <TrackedLink
          href="/vendors?source=tiktok&intent=discover"
          eventName="homepage_tiktok_section_browse_click"
          source={source}
          className="btn-secondary w-fit backdrop-blur-sm"
        >
          Browse Vendors
        </TrackedLink>
      </div>

      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(106,62,124,0.28)_transparent]">
        {videos.map((video, index) => {
          const href = buildTikTokVendorHref(video);
          const watchHref = getTikTokWatchHref(video);
          const hasMetrics = video.views > 0 || video.likes > 0;

          return (
            <div key={`${video.postId}-${index}`} className="min-w-full snap-start sm:min-w-[48%] lg:min-w-[31%]">
              <article className="min-w-0 rounded-[1.75rem] border border-[rgba(106,62,124,0.08)] bg-white/94 p-3 shadow-[0_20px_46px_-40px_rgba(106,62,124,0.28)]">
                <TikTokPreviewCard
                  video={video}
                  watchHref={watchHref}
                  source={source}
                />
                <div className="mt-2.5 min-w-0 space-y-2.5">
                  <div className="flex flex-wrap gap-2">
                    <Metric label="Category" value={video.category} />
                    <Metric label="Culture" value={video.culture} />
                  </div>
                  <div className="space-y-1.5">
                    <p className="line-clamp-2 break-words text-sm leading-6 text-[color:var(--color-muted)]">
                      {video.caption}
                    </p>
                  </div>
                  {hasMetrics ? (
                    <div className="flex flex-wrap gap-2">
                      {video.views > 0 ? (
                        <Metric label="Views" value={formatCompact(video.views)} />
                      ) : null}
                      {video.likes > 0 ? (
                        <Metric label="Likes" value={formatCompact(video.likes)} />
                      ) : null}
                      <Metric label="Badge" value={video.engagementBadge} />
                    </div>
                  ) : (
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-[color:var(--color-brand-gold)]">
                      {video.engagementBadge}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2.5">
                    <TrackedLink
                      href={watchHref}
                      eventName="tiktok_watch_click"
                      source={source}
                      className="btn-secondary px-3 py-1.5 text-sm leading-none"
                      payload={{
                        postId: video.postId,
                        category: video.category,
                      }}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Watch on TikTok
                    </TrackedLink>
                    <TrackedLink
                      href={href}
                      eventName="tiktok_feed_vendor_cta_click"
                      source={source}
                      className="btn-primary px-3 py-1.5 text-sm leading-none"
                      payload={{
                        postId: video.postId,
                        category: video.category,
                        culture: video.culture,
                      }}
                    >
                      {ctaLabel}
                    </TrackedLink>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>

      {stickyCta ? (
        <div className="sticky bottom-4 z-10 md:hidden">
          <TrackedLink
            href="/vendors?source=tiktok"
            eventName="tiktok_sticky_cta_click"
            source={source}
            className="btn-primary flex w-full shadow-[0_18px_40px_-22px_rgba(106,62,124,0.6)]"
          >
            Find Vendors
          </TrackedLink>
        </div>
      ) : null}
    </section>
  );
}

function TikTokPreviewCard({
  video,
  watchHref,
  source,
}: {
  video: TikTokVideo;
  watchHref: string;
  source: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const thumbnailSrc = imageFailed ? null : getTikTokThumbnailUrl(video);

  return (
    <TrackedLink
      href={watchHref}
      eventName="tiktok_preview_click"
      source={source}
      target="_blank"
      rel="noreferrer"
      payload={{ postId: video.postId, category: video.category }}
      className="group block overflow-hidden rounded-[1.35rem]"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-[1.35rem] bg-[linear-gradient(172deg,rgba(131,82,151,0.4)_0%,rgba(106,62,124,0.92)_64%,rgba(66,37,81,0.96)_100%)]">
        {thumbnailSrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailSrc}
              alt={video.title ?? video.caption}
              loading="lazy"
              onError={() => setImageFailed(true)}
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(58,33,70,0.22)_0%,rgba(58,33,70,0.48)_42%,rgba(34,18,44,0.9)_100%)]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,236,251,0.46),transparent_44%),linear-gradient(176deg,rgba(146,101,164,0.58)_0%,rgba(106,62,124,0.92)_62%,rgba(66,37,81,0.95)_100%)]" />
        )}

        <div className="absolute inset-0 flex flex-col justify-between p-3.5">
          <div className="flex flex-col items-start gap-2.5">
            <span className="rounded-full bg-white/88 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-brand-primary)]">
              @{`iyeobaweddings`}
            </span>
            <span className="inline-flex max-w-[13.5rem] min-w-0 items-center rounded-full border border-white/34 bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
              <span className="block min-w-0 truncate">{video.category}</span>
            </span>
          </div>

          <div className="min-w-0 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-brand-gold)]" />
              Watch on TikTok
            </div>
            <div className="min-w-0">
              <p className="line-clamp-2 break-words text-[1.35rem] font-semibold tracking-[-0.03em] text-white">
                {video.title ?? "Featured wedding inspiration"}
              </p>
              <p className="mt-1 line-clamp-2 max-w-[18rem] break-words text-sm leading-5 text-white/86">
                {video.caption}
              </p>
            </div>
          </div>
        </div>
      </div>
    </TrackedLink>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full bg-[color:var(--color-brand-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--color-brand-primary)]">
      <span className="truncate">
        {label}: {value}
      </span>
    </span>
  );
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
