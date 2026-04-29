"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { TikTokCard } from "@/components/TikTokCard";
import type { HomepageTikTokItem } from "@/lib/tiktok";

export function TikTokSection({
  title = "From TikTok",
  subtitle = "Latest wedding inspiration and vendor features from Iyeoba Weddings.",
}: {
  title?: string;
  subtitle?: string;
}) {
  const [latestVideos, setLatestVideos] = useState<TikTokApiVideo[]>([]);
  const [topVideos, setTopVideos] = useState<TikTokApiVideo[]>([]);
  const [activeTab, setActiveTab] = useState<"latest" | "top">("latest");
  const [apiFailed, setApiFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadVideos() {
      try {
        const [latestResponse, topResponse] = await Promise.all([
          fetch("/api/tiktok/videos?type=latest&limit=5", { cache: "no-store" }),
          fetch("/api/tiktok/videos?type=top&limit=5", { cache: "no-store" }),
        ]);

        if (!latestResponse.ok || !topResponse.ok) {
          if (!cancelled) {
            setApiFailed(true);
          }
          return;
        }

        const latestPayload = (await latestResponse.json()) as { videos?: TikTokApiVideo[] };
        const topPayload = (await topResponse.json()) as { videos?: TikTokApiVideo[] };
        if (!cancelled) {
          setLatestVideos(latestPayload.videos ?? []);
          setTopVideos(topPayload.videos ?? []);
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

  const latestItems = useMemo(
    () => latestVideos.map(mapApiVideoToHomepageItem),
    [latestVideos],
  );
  const topItems = useMemo(
    () => topVideos.map(mapApiVideoToHomepageItem),
    [topVideos],
  );
  const itemsToRender = activeTab === "latest" ? latestItems : topItems;
  const showEmptyState = apiFailed || itemsToRender.length === 0;

  return (
    <section className="rounded-[2rem] border border-[rgba(91,44,131,0.09)] bg-[color:var(--bg-soft)] p-6 shadow-[0_22px_58px_-46px_rgba(91,44,131,0.24)] md:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-brand-primary)]">
            {title}
          </p>
          <p className="mt-3 max-w-3xl text-base leading-8 text-[color:var(--color-muted)]">
            {subtitle}
          </p>
        </div>
        <Link
          href="https://www.tiktok.com/@iyeobaweddings"
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit whitespace-nowrap rounded-full border border-[#5B2C83] bg-[#5B2C83] px-5 py-2.5 text-sm font-semibold !text-white transition-all duration-300 ease-in-out hover:scale-[1.03] hover:border-[#C9A15B] hover:bg-white hover:!text-[#5B2C83] hover:shadow-[0_12px_28px_-16px_rgba(201,161,91,0.75)]"
        >
          Follow @IyeobaWeddings on TikTok
        </Link>
      </div>

      <div className="mt-6">
        <div className="mb-4 inline-flex rounded-full border border-[rgba(91,44,131,0.15)] bg-white/80 p-1">
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "latest"
                ? "bg-[color:var(--color-brand-primary)] text-white"
                : "text-[color:var(--color-brand-primary)] hover:bg-[rgba(91,44,131,0.08)]"
            }`}
            onClick={() => setActiveTab("latest")}
          >
            Latest Posts
          </button>
          <button
            type="button"
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === "top"
                ? "bg-[color:var(--color-brand-primary)] text-white"
                : "text-[color:var(--color-brand-primary)] hover:bg-[rgba(91,44,131,0.08)]"
            }`}
            onClick={() => setActiveTab("top")}
          >
            Top Posts
          </button>
        </div>
        <div className="flex snap-x snap-mandatory flex-nowrap gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {itemsToRender.map((item) => (
            <TikTokCard key={item.id} item={item} />
          ))}
        </div>
      </div>

      {showEmptyState ? (
        <p className="mt-4 text-xs text-[color:var(--color-muted)]">
          TikTok posts will appear here soon.
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
    category: "",
    createdAt: video.create_time || new Date().toISOString(),
  };
}
