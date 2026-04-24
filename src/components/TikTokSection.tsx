"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { TikTokCard } from "@/components/TikTokCard";
import type { HomepageTikTokItem } from "@/lib/tiktok";

export function TikTokSection({
  latestTikToks,
  topTikToks,
}: {
  latestTikToks: HomepageTikTokItem[];
  topTikToks: HomepageTikTokItem[];
}) {
  const [apiVideos, setApiVideos] = useState<TikTokApiVideo[] | null>(null);
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadVideos() {
      try {
        const response = await fetch("/api/tiktok/videos", { cache: "no-store" });
        if (!response.ok) {
          if (!cancelled) {
            setApiFailed(true);
          }
          return;
        }

        const payload = (await response.json()) as { videos?: TikTokApiVideo[] };
        if (!cancelled) {
          setApiVideos(payload.videos ?? []);
        }
      } catch {
        if (!cancelled) {
          setApiFailed(true);
        }
      }
    }

    loadVideos();
    return () => {
      cancelled = true;
    };
  }, []);

  const split = useMemo(() => {
    if (!apiVideos || !apiVideos.length) {
      return null;
    }

    const normalized = apiVideos.map(mapApiVideoToHomepageItem);

    const latest = [...normalized]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, 5);

    const top = [...normalized]
      .sort((a, b) => {
        if (b.views !== a.views) {
          return b.views - a.views;
        }
        return b.likes - a.likes;
      })
      .slice(0, 5);

    return { latest, top };
  }, [apiVideos]);

  const latestToRender = split?.latest ?? latestTikToks;
  const topToRender = split?.top ?? topTikToks;
  const showFallback = apiFailed || (!split && !latestTikToks.length && !topTikToks.length);

  return (
    <section className="rounded-[2rem] border border-[rgba(91,44,131,0.09)] bg-[color:var(--bg-soft)] p-6 shadow-[0_22px_58px_-46px_rgba(91,44,131,0.24)] md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
            Wedding Inspiration from TikTok
          </p>
          <p className="mt-3 max-w-3xl text-base leading-8 text-[color:var(--color-muted)]">
            Explore Nigerian wedding styles, vendor ideas, cultural moments, and planning inspiration from Iyeoba Weddings.
          </p>
        </div>
        <Link
          href="https://www.tiktok.com/@iyeobaweddings"
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit whitespace-nowrap rounded-full border border-[#5B2C83] bg-[#5B2C83] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-[#4A2268]"
        >
          Follow Iyeoba on TikTok
        </Link>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-brand-primary)]">
            Latest TikTok Posts
          </p>
          <div className="mt-3 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(106,62,124,0.28)_transparent]">
            {(latestToRender.length ? latestToRender : fallbackCards("latest")).map((item) => (
              <TikTokCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-brand-primary)]">
            Top TikTok Posts
          </p>
          <div className="mt-3 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin] [scrollbar-color:rgba(106,62,124,0.28)_transparent]">
            {(topToRender.length ? topToRender : fallbackCards("top")).map((item) => (
              <TikTokCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>

      {showFallback ? (
        <p className="mt-4 text-xs text-[color:var(--color-muted)]">
          Showing curated inspiration cards while TikTok API access is unavailable.
        </p>
      ) : null}
    </section>
  );
}

type TikTokApiVideo = {
  id: string;
  title: string;
  url: string;
  cover_image_url: string;
  view_count: number;
  like_count: number;
  create_time: string;
};

function mapApiVideoToHomepageItem(video: TikTokApiVideo): HomepageTikTokItem {
  return {
    id: video.id,
    title: video.title || "Wedding inspiration",
    url: video.url || "https://www.tiktok.com/@iyeobaweddings",
    thumbnail: video.cover_image_url || "/vendors/placeholders/event-planner.svg",
    views: video.view_count || 0,
    likes: video.like_count || 0,
    category: "Wedding Inspiration",
    createdAt: video.create_time || new Date().toISOString(),
  };
}

function fallbackCards(type: "latest" | "top"): HomepageTikTokItem[] {
  const baseTitle =
    type === "latest" ? "Latest inspiration from Iyeoba" : "Top inspiration from Iyeoba";

  return Array.from({ length: 4 }).map((_, index) => ({
    id: `${type}-fallback-${index + 1}`,
    title: `${baseTitle} ${index + 1}`,
    url: "https://www.tiktok.com/@iyeobaweddings",
    thumbnail: "/vendors/placeholders/event-planner.svg",
    views: 0,
    likes: 0,
    category: "Wedding Inspiration",
    createdAt: new Date().toISOString(),
  }));
}
