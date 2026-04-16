export type TikTokVideo = {
  postId: string;
  shareUrl: string;
  caption: string;
  title?: string;
  shortDescription?: string;
  category: string;
  subcategory?: string | null;
  culture: string;
  locationRelevance?: string | null;
  vendorSlug?: string;
  views: number;
  likes: number;
  engagementBadge: string;
  thumbnailUrl?: string;
  sourceType?: "latest" | "top" | "featured";
  featuredPriority?: number;
  performanceScore?: number;
  publishedAt?: string;
  featuredHome?: boolean;
  featuredLanding?: boolean;
  featuredProfile?: boolean;
  active?: boolean;
};

export const tiktokHandle = "iyeobaweddings";

export const curatedTopTikTokPostUrls = [
  "https://www.tiktok.com/@iyeobaweddings/photo/7616580908258168072",
  "https://www.tiktok.com/@iyeobaweddings/photo/7620729278899965191",
  "https://www.tiktok.com/@iyeobaweddings/photo/7485961632280104247",
  "https://www.tiktok.com/@iyeobaweddings/photo/7488366728733297925",
  "https://www.tiktok.com/@iyeobaweddings/photo/7449159474096524550",
] as const;

export const marketplaceCategoryMap = {
  "Photographers": "Photographer",
  "Makeup Artists": "Makeup Artist",
  Decorators: "Decorator",
  "Asoebi Vendors": "Asoebi Designer",
  "Asoebi Designer": "Asoebi Designer",
  "Event Planners": "Event Planner",
  "Event Planner": "Event Planner",
  "Makeup Artist": "Makeup Artist",
  Photographer: "Photographer",
  Decorator: "Decorator",
} as const;

const keywordMap: Array<{ keywords: string[]; category: string }> = [
  { keywords: ["makeup", "glam", "bridal beat"], category: "Makeup Artist" },
  { keywords: ["decor", "tablescape", "floral"], category: "Decorator" },
  { keywords: ["asoebi", "gele", "fabric"], category: "Asoebi Designer" },
  { keywords: ["photo", "photography", "portrait"], category: "Photographer" },
  { keywords: ["planner", "coordination"], category: "Event Planner" },
];

export const sampleTikTokVideos: TikTokVideo[] = [
  {
    postId: "iyeoba-glam-feature",
    shareUrl: "https://www.tiktok.com/@iyeobaweddings",
    thumbnailUrl: "/vendors/placeholders/makeup-artist.svg",
    title: "Soft Glam Bridal Inspiration",
    shortDescription: "Luxury Yoruba bridal glam inspiration.",
    caption:
      "Yoruba bridal glam with soft gold tones, luxury morning prep, and a calm makeup finish that still holds all day.",
    category: "Beauty & Grooming",
    subcategory: "Makeup",
    culture: "Yoruba",
    locationRelevance: "Lagos",
    vendorSlug: "adunni-bridal-studio",
    views: 124000,
    likes: 9800,
    engagementBadge: "Featured on TikTok",
    featuredPriority: 0,
    performanceScore: 10200,
    publishedAt: "2026-04-13T10:00:00.000Z",
    featuredHome: true,
    featuredLanding: true,
    featuredProfile: true,
    active: true,
  },
  {
    postId: "iyeoba-decor-feature",
    shareUrl: "https://www.tiktok.com/@iyeobaweddings",
    thumbnailUrl: "/vendors/placeholders/decorator.svg",
    title: "Reception Decor Inspiration",
    shortDescription: "Reception styling and floral moodboard.",
    caption:
      "Luxury reception decor reveal for a Yoruba wedding with candlelight, cream florals, and premium hall styling.",
    category: "Decor & Floral",
    subcategory: "Decorators",
    culture: "Yoruba",
    locationRelevance: "Abuja",
    views: 151000,
    likes: 12300,
    engagementBadge: "Featured on TikTok",
    featuredPriority: 0,
    performanceScore: 12550,
    publishedAt: "2026-04-12T12:30:00.000Z",
    featuredHome: true,
    featuredLanding: true,
    active: true,
  },
  {
    postId: "iyeoba-photo-feature",
    shareUrl: "https://www.tiktok.com/@iyeobaweddings",
    thumbnailUrl: "/vendors/placeholders/photographer.svg",
    title: "Editorial Couple Portrait Ideas",
    shortDescription: "Editorial portrait direction for diaspora weddings.",
    caption:
      "Diaspora couple portrait direction with editorial framing, family storytelling, and refined photography pacing.",
    category: "Photography & Video",
    subcategory: "Photographer",
    culture: "Yoruba",
    locationRelevance: "UK",
    vendorSlug: "aroha-films",
    views: 89000,
    likes: 7100,
    engagementBadge: "Featured on TikTok",
    featuredPriority: 0,
    performanceScore: 7280,
    publishedAt: "2026-04-11T09:15:00.000Z",
    featuredHome: true,
    featuredLanding: true,
    featuredProfile: true,
    active: true,
  },
  {
    postId: "iyeoba-asoebi-feature",
    shareUrl: "https://www.tiktok.com/@iyeobaweddings",
    thumbnailUrl: "/vendors/placeholders/bridal-fashion.svg",
    title: "Asoebi Styling Inspiration",
    shortDescription: "Asoebi styling and gele coordination ideas.",
    caption:
      "Asoebi styling inspiration with gele structure, coordinated family looks, and luxury wedding fashion details.",
    category: "Fashion & Attire",
    subcategory: "Aso-Oke",
    culture: "Yoruba",
    locationRelevance: "Nigeria",
    vendorSlug: "gele-house-by-ife",
    views: 112000,
    likes: 9300,
    engagementBadge: "Featured on TikTok",
    featuredPriority: 0,
    performanceScore: 9540,
    publishedAt: "2026-04-10T16:10:00.000Z",
    featuredLanding: true,
    featuredProfile: true,
    featuredHome: true,
    active: true,
  },
  {
    postId: "iyeoba-dj-feature",
    shareUrl: "https://www.tiktok.com/@iyeobaweddings",
    thumbnailUrl: "/vendors/placeholders/mc-host.svg",
    title: "Reception Energy with Live DJ",
    shortDescription: "DJ set pacing for high-energy reception moments.",
    caption:
      "Entertainment flow with DJ transitions, crowd moments, and clean sound setups for Nigerian wedding receptions.",
    category: "Entertainment",
    subcategory: "DJ",
    culture: "Yoruba",
    locationRelevance: "Lagos",
    views: 76000,
    likes: 5900,
    engagementBadge: "Top-performing",
    featuredPriority: 0,
    performanceScore: 6070,
    publishedAt: "2026-04-09T14:20:00.000Z",
    featuredHome: true,
    featuredLanding: true,
    active: true,
  },
  {
    postId: "iyeoba-catering-feature",
    shareUrl: "https://www.tiktok.com/@iyeobaweddings",
    thumbnailUrl: "/vendors/placeholders/catering.svg",
    title: "Catering Presentation Ideas",
    shortDescription: "Meal and dessert styling for guest wow factor.",
    caption:
      "Curated meal service and cake presentation ideas for Nigerian wedding receptions with premium guest experience.",
    category: "Catering & Desserts",
    subcategory: "Meals",
    culture: "Yoruba",
    locationRelevance: "Port Harcourt",
    views: 68000,
    likes: 5300,
    engagementBadge: "Top-performing",
    featuredPriority: 0,
    performanceScore: 5460,
    publishedAt: "2026-04-08T11:40:00.000Z",
    featuredHome: true,
    featuredLanding: true,
    active: true,
  },
  {
    postId: "iyeoba-bar-feature",
    shareUrl: "https://www.tiktok.com/@iyeobaweddings",
    thumbnailUrl: "/vendors/placeholders/venue.svg",
    title: "Luxury Wedding Drinks Service",
    shortDescription: "Bar setup inspiration for premium receptions.",
    caption:
      "Signature drinks and mixology setup inspiration for couples planning elegant wedding bar experiences.",
    category: "Drinks & Bar",
    subcategory: "Mixologists",
    culture: "Yoruba",
    locationRelevance: "Abuja",
    views: 72000,
    likes: 6100,
    engagementBadge: "Top-performing",
    featuredPriority: 0,
    performanceScore: 6220,
    publishedAt: "2026-04-07T18:05:00.000Z",
    featuredHome: true,
    featuredLanding: true,
    active: true,
  },
  {
    postId: "iyeoba-invite-feature",
    shareUrl: "https://www.tiktok.com/@iyeobaweddings",
    thumbnailUrl: "/vendors/placeholders/event-planner.svg",
    title: "Wedding Invite Design Inspiration",
    shortDescription: "Invitation and stationery style references.",
    caption:
      "Invitation suites, signage, and print branding details that elevate wedding identity and guest communication.",
    category: "Printing & Branding",
    subcategory: "Invites",
    culture: "Yoruba",
    locationRelevance: "US",
    views: 54000,
    likes: 4300,
    engagementBadge: "Top-performing",
    featuredPriority: 0,
    performanceScore: 4410,
    publishedAt: "2026-04-06T13:00:00.000Z",
    featuredHome: true,
    featuredLanding: true,
    active: true,
  },
  {
    postId: "iyeoba-logistics-feature",
    shareUrl: "https://www.tiktok.com/@iyeobaweddings",
    thumbnailUrl: "/vendors/placeholders/event-planner.svg",
    title: "Wedding Logistics Planning Notes",
    shortDescription: "Transport and movement planning tips.",
    caption:
      "Guest movement, vendor logistics, and timeline planning to keep Nigerian wedding day execution smooth.",
    category: "Logistics & Transport",
    subcategory: "Movement",
    culture: "Yoruba",
    locationRelevance: "Canada",
    views: 61000,
    likes: 4700,
    engagementBadge: "Top-performing",
    featuredPriority: 0,
    performanceScore: 4830,
    publishedAt: "2026-04-05T15:30:00.000Z",
    featuredHome: true,
    featuredLanding: true,
    active: true,
  },
  {
    postId: "iyeoba-hospitality-feature",
    shareUrl: "https://www.tiktok.com/@iyeobaweddings",
    thumbnailUrl: "/vendors/placeholders/venue.svg",
    title: "Guest Accommodation Ideas",
    shortDescription: "Hospitality planning for out-of-town guests.",
    caption:
      "Shortlet and guest accommodation planning for wedding weekends with diaspora family travel.",
    category: "Hospitality",
    subcategory: "Guest accommodation",
    culture: "Yoruba",
    locationRelevance: "Europe",
    views: 47000,
    likes: 3600,
    engagementBadge: "Top-performing",
    featuredPriority: 0,
    performanceScore: 3700,
    publishedAt: "2026-04-04T09:25:00.000Z",
    featuredHome: true,
    featuredLanding: true,
    active: true,
  },
];

export function detectVendorCategoryFromCaption(caption: string) {
  const normalized = caption.toLowerCase();
  const match = keywordMap.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(keyword)),
  );

  return match?.category ?? "Event Planner";
}

export function normalizeMarketplaceCategory(category: string) {
  return (
    marketplaceCategoryMap[category as keyof typeof marketplaceCategoryMap] ??
    category
  );
}

export function buildTikTokVendorHref(video: TikTokVideo) {
  const category = normalizeMarketplaceCategory(
    video.category || detectVendorCategoryFromCaption(video.caption),
  );
  const params = new URLSearchParams({
    category,
    culture: video.culture || "Yoruba",
    source: "tiktok",
    tiktok_post_id: video.postId,
    intent: "discover",
  });

  if (video.subcategory) {
    params.set("subcategory", video.subcategory);
  }
  if (video.locationRelevance) {
    params.set("location", video.locationRelevance);
  }

  return `/vendors?${params.toString()}`;
}

export function getTikTokWatchHref(video: TikTokVideo) {
  if (isExactTikTokPostUrl(video.shareUrl)) {
    return video.shareUrl;
  }

  console.warn("TikTok card is missing an exact post URL; falling back to profile", {
    postId: video.postId,
    shareUrl: video.shareUrl,
  });

  return `https://www.tiktok.com/@${tiktokHandle}`;
}

export function getTikTokThumbnailUrl(video: TikTokVideo) {
  if (video.thumbnailUrl?.trim()) {
    return video.thumbnailUrl.trim();
  }

  return getTikTokFallbackThumbnail(video.category);
}

function getTikTokFallbackThumbnail(category: string) {
  const normalized = category.toLowerCase();

  if (normalized.includes("photo") || normalized.includes("video")) {
    return "/vendors/placeholders/photographer.svg";
  }
  if (normalized.includes("makeup") || normalized.includes("beauty")) {
    return "/vendors/placeholders/makeup-artist.svg";
  }
  if (normalized.includes("decor") || normalized.includes("floral")) {
    return "/vendors/placeholders/decorator.svg";
  }
  if (normalized.includes("fashion") || normalized.includes("aso")) {
    return "/vendors/placeholders/bridal-fashion.svg";
  }
  if (normalized.includes("catering") || normalized.includes("dessert")) {
    return "/vendors/placeholders/catering.svg";
  }
  if (normalized.includes("entertain")) {
    return "/vendors/placeholders/mc-host.svg";
  }
  if (normalized.includes("logistics") || normalized.includes("transport")) {
    return "/vendors/placeholders/event-planner.svg";
  }
  if (normalized.includes("hospitality") || normalized.includes("venue")) {
    return "/vendors/placeholders/venue.svg";
  }

  return "/vendors/placeholders/beauty.svg";
}

export function isExactTikTokPostUrl(value: string | undefined) {
  if (!value) {
    return false;
  }
  return /tiktok\.com\/@[^/]+\/(?:video|photo)\/\d+/i.test(value);
}

export function buildTikTokEmbedUrl(postId: string) {
  return `https://www.tiktok.com/player/v1/${postId}?description=1&controls=1`;
}
