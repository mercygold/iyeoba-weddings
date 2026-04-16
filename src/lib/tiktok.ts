import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  curatedTopTikTokPostUrls,
  detectVendorCategoryFromCaption,
  getTikTokThumbnailUrl,
  isExactTikTokPostUrl,
  tiktokHandle,
  sampleTikTokVideos,
  type TikTokVideo,
} from "@/lib/tiktok-shared";

type TikTokVideoRecord = {
  post_id: string;
  share_url: string;
  caption: string;
  title: string | null;
  category: string | null;
  culture: string | null;
  vendor_slug: string | null;
  views: number | null;
  likes: number | null;
  engagement_badge: string | null;
  thumbnail_url: string | null;
  featured_home: boolean | null;
  featured_landing: boolean | null;
  featured_profile: boolean | null;
  active: boolean | null;
  created_at: string | null;
};

export async function getTikTokVideos(filters?: {
  featuredHome?: boolean;
  featuredLanding?: boolean;
  featuredProfile?: boolean;
  vendorSlug?: string;
  limit?: number;
}) {
  const dbConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  let videos = [...sampleTikTokVideos];

  if (dbConfigured) {
    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("tiktok_videos")
      .select(
        "post_id, share_url, caption, title, category, culture, vendor_slug, views, likes, engagement_badge, thumbnail_url, featured_home, featured_landing, featured_profile, active, created_at",
      )
      .eq("active", true);

    if (filters?.featuredHome) {
      query = query.eq("featured_home", true);
    }
    if (filters?.featuredLanding) {
      query = query.eq("featured_landing", true);
    }
    if (filters?.featuredProfile) {
      query = query.eq("featured_profile", true);
    }
    if (filters?.vendorSlug) {
      query = query.eq("vendor_slug", filters.vendorSlug);
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (!error && data?.length) {
      videos = data.map(mapTikTokRecord);
    }
  }

  const filtered = videos.filter((video) => {
    if (filters?.featuredHome && !video.featuredHome) {
      return false;
    }
    if (filters?.featuredLanding && !video.featuredLanding) {
      return false;
    }
    if (filters?.featuredProfile && !video.featuredProfile) {
      return false;
    }
    if (filters?.vendorSlug && video.vendorSlug !== filters.vendorSlug) {
      return false;
    }
    return video.active !== false;
  });

  return typeof filters?.limit === "number"
    ? filtered.slice(0, filters.limit)
    : filtered;
}

export async function getHomepageTikTokVideos() {
  const FEED_SIZE = 10;
  const LATEST_COUNT = 5;
  const TOP_COUNT = 5;

  const pool = await getTikTokVideos({ limit: 100 });
  const curatedTop = buildCuratedTopPosts();
  const curatedTopUrlSet = new Set(curatedTop.map((item) => item.shareUrl));

  const exactCandidates = pool.filter((video) => isExactTikTokPostUrl(video.shareUrl));

  const latestCandidates = [...exactCandidates]
    .filter((video) => !curatedTopUrlSet.has(video.shareUrl))
    .sort((a, b) => getPublishedTimestamp(b) - getPublishedTimestamp(a))
    .map((video) => ({ ...video, sourceType: "latest" as const }));

  const recentFallback = buildRecentFallbackPosts()
    .filter((video) => !curatedTopUrlSet.has(video.shareUrl))
    .map((video) => ({ ...video, sourceType: "latest" as const }));

  const latest = pickUnique(latestCandidates, LATEST_COUNT);
  if (latest.length < LATEST_COUNT) {
    const latestFill = pickUnique(
      recentFallback,
      LATEST_COUNT - latest.length,
      new Set(latest.map((video) => video.postId)),
    );
    latest.push(...latestFill);
  }

  const top = pickUnique(
    curatedTop.map((video) => ({ ...video, sourceType: "top" as const })),
    TOP_COUNT,
    new Set(latest.map((video) => video.postId)),
  );

  if (top.length < TOP_COUNT) {
    const additionalTop = pickUnique(
      [...exactCandidates]
        .sort((a, b) => getPerformanceScore(b) - getPerformanceScore(a))
        .map((video) => ({ ...video, sourceType: "top" as const })),
      TOP_COUNT - top.length,
      new Set([...latest, ...top].map((video) => video.postId)),
    );
    top.push(...additionalTop);
  }

  const blended = [...latest.slice(0, LATEST_COUNT), ...top.slice(0, TOP_COUNT)];
  const feed = await hydrateTikTokFeedAssets(blended.slice(0, FEED_SIZE));

  console.log("TikTok homepage feed diagnostics", {
    total: feed.length,
    exactPostUrls: feed.filter((video) => isExactTikTokPostUrl(video.shareUrl)).length,
    fallbackProfileUrls: feed.filter((video) => !isExactTikTokPostUrl(video.shareUrl))
      .length,
    missingThumbnails: feed.filter((video) => !video.thumbnailUrl?.trim()).length,
    items: feed.map((video, index) => ({
      slot: index + 1,
      postId: video.postId,
      sourceType: video.sourceType ?? null,
      hasExactPostUrl: isExactTikTokPostUrl(video.shareUrl),
      hasThumbnail: Boolean(video.thumbnailUrl?.trim()),
      shareUrl: video.shareUrl,
      watchUrl: getResolvedTikTokWatchUrl(video),
    })),
  });

  return feed;
}

export async function getLandingTikTokVideos() {
  return getTikTokVideos({ featuredLanding: true, limit: 4 });
}

export async function getVendorTikTokVideos(vendorSlug: string) {
  return getTikTokVideos({
    vendorSlug,
    featuredProfile: true,
    limit: 3,
  });
}

function mapTikTokRecord(record: TikTokVideoRecord): TikTokVideo {
  const performanceScore = derivePerformanceScore(record.views, record.likes);

  const mapped: TikTokVideo = {
    postId: record.post_id,
    shareUrl: record.share_url,
    caption: record.caption,
    title: record.title ?? undefined,
    category:
      record.category ?? detectVendorCategoryFromCaption(record.caption),
    culture: record.culture ?? "Yoruba",
    vendorSlug: record.vendor_slug ?? undefined,
    views: record.views ?? 0,
    likes: record.likes ?? 0,
    engagementBadge: record.engagement_badge ?? "Featured on TikTok",
    thumbnailUrl: record.thumbnail_url ?? undefined,
    featuredPriority: record.featured_home ? 100 : 0,
    performanceScore,
    publishedAt: record.created_at ?? undefined,
    featuredHome: record.featured_home ?? false,
    featuredLanding: record.featured_landing ?? false,
    featuredProfile: record.featured_profile ?? false,
    active: record.active ?? true,
  };

  return mapped;
}

function derivePerformanceScore(views: number | null, likes: number | null) {
  const safeViews = Math.max(0, views ?? 0);
  const safeLikes = Math.max(0, likes ?? 0);
  return safeLikes * 1.5 + safeViews * 0.05;
}

function getPerformanceScore(video: TikTokVideo) {
  if (typeof video.performanceScore === "number") {
    return video.performanceScore;
  }
  return derivePerformanceScore(video.views, video.likes);
}

function getPublishedTimestamp(video: TikTokVideo) {
  if (!video.publishedAt) {
    return 0;
  }
  const timestamp = Date.parse(video.publishedAt);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function pickUnique(
  videos: TikTokVideo[],
  limit: number,
  existingIds = new Set<string>(),
) {
  const selected: TikTokVideo[] = [];
  const seen = new Set(existingIds);

  for (const video of videos) {
    if (selected.length >= limit) {
      break;
    }
    if (seen.has(video.postId)) {
      continue;
    }
    seen.add(video.postId);
    selected.push(video);
  }

  return selected;
}

function buildCuratedTopPosts(): TikTokVideo[] {
  return curatedTopTikTokPostUrls.map((url, index) => ({
    postId: getPostIdFromTikTokUrl(url) ?? `curated-top-${index + 1}`,
    shareUrl: url,
    caption: "Trending Iyeoba wedding inspiration from TikTok.",
    title: `Trending Inspiration ${index + 1}`,
    shortDescription: "Curated top-performing post from @iyeobaweddings.",
    category: "Wedding Inspiration",
    subcategory: "Featured",
    culture: "Yoruba",
    locationRelevance: null,
    views: 0,
    likes: 100 - index,
    engagementBadge: "Top-performing",
    sourceType: "top",
    publishedAt: new Date(Date.now() - index * 86400000).toISOString(),
    featuredHome: true,
    active: true,
  }));
}

function buildRecentFallbackPosts(): TikTokVideo[] {
  return sampleTikTokVideos
    .filter((video) => isExactTikTokPostUrl(video.shareUrl))
    .sort((a, b) => getPublishedTimestamp(b) - getPublishedTimestamp(a))
    .map((video) => ({ ...video, sourceType: "latest" as const }));
}

function getPostIdFromTikTokUrl(value: string) {
  const match = value.match(/\/(?:video|photo)\/(\d+)/i);
  return match?.[1] ?? null;
}

async function hydrateTikTokFeedAssets(videos: TikTokVideo[]) {
  const hydrated = await Promise.all(
    videos.map(async (video) => {
      const watchUrl = getResolvedTikTokWatchUrl(video);
      const oembedThumbnail = await getTikTokOEmbedThumbnail(watchUrl);
      const thumbnailUrl = oembedThumbnail ?? getTikTokThumbnailUrl(video);

      return {
        ...video,
        shareUrl: watchUrl,
        thumbnailUrl,
      } satisfies TikTokVideo;
    }),
  );

  return hydrated;
}

function getResolvedTikTokWatchUrl(video: TikTokVideo) {
  if (isExactTikTokPostUrl(video.shareUrl)) {
    return video.shareUrl;
  }

  console.warn("TikTok feed item missing exact post URL; using profile fallback", {
    postId: video.postId,
    sourceType: video.sourceType ?? null,
    shareUrl: video.shareUrl,
  });
  return `https://www.tiktok.com/@${tiktokHandle}`;
}

async function getTikTokOEmbedThumbnail(url: string) {
  if (!isExactTikTokPostUrl(url)) {
    return null;
  }

  try {
    const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(endpoint, {
      method: "GET",
      cache: "force-cache",
      next: { revalidate: 60 * 60 * 6 },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { thumbnail_url?: string };
    return payload.thumbnail_url?.trim() || null;
  } catch {
    return null;
  }
}
