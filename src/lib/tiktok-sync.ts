import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const TIKTOK_VIDEO_LIST_URL = "https://open.tiktokapis.com/v2/video/list/";
const TIKTOK_PROVIDER = "iyeobaweddings";

type TikTokStoredToken = {
  id: string;
  provider: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  refresh_expires_at: string | null;
};

type TikTokTokenPayload = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  open_id?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
  data?: {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    refresh_expires_in?: number;
    open_id?: string;
    scope?: string;
    token_type?: string;
  };
};

type TikTokVideoListPayload = {
  data?: {
    videos?: Array<{
      id?: string;
      title?: string;
      video_description?: string;
      cover_image_url?: string;
      share_url?: string;
      view_count?: number;
      like_count?: number;
      create_time?: number;
    }>;
  };
  error?: {
    code?: string;
    message?: string;
    log_id?: string;
  };
};

function getTokenData(payload: TikTokTokenPayload) {
  return payload.data ?? payload;
}

function toIsoFromNow(seconds?: number) {
  if (!seconds || !Number.isFinite(seconds)) {
    return null;
  }
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export async function storeTikTokTokens(payload: TikTokTokenPayload) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const tokenData = getTokenData(payload);
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    throw new Error("TikTok access token missing from OAuth response.");
  }

  const upsertPayload = {
    provider: TIKTOK_PROVIDER,
    access_token: accessToken,
    refresh_token: tokenData.refresh_token ?? null,
    expires_at: toIsoFromNow(tokenData.expires_in),
    refresh_expires_at: toIsoFromNow(tokenData.refresh_expires_in),
    open_id: tokenData.open_id ?? null,
    scope: tokenData.scope ?? null,
    token_type: tokenData.token_type ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from("tiktok_oauth_tokens")
    .upsert(upsertPayload, { onConflict: "provider" });

  if (error) {
    if (error.code === "PGRST205") {
      throw new Error(
        "Missing table public.tiktok_oauth_tokens. Run the latest Supabase migration before connecting TikTok.",
      );
    }
    throw new Error(
      `Failed to store TikTok tokens: ${error.message} (${error.code ?? "no_code"})`,
    );
  }
}

async function refreshTikTokAccessToken(refreshToken: string) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

  if (!clientKey || !clientSecret) {
    throw new Error(
      "Missing TikTok OAuth env vars. Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET.",
    );
  }

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const payload = (await response.json()) as TikTokTokenPayload;
  const tokenData = getTokenData(payload);
  if (!response.ok || payload.error || !tokenData.access_token) {
    throw new Error(
      `TikTok refresh token failed: ${payload.error_description ?? payload.error ?? "unknown error"}`,
    );
  }

  await storeTikTokTokens(payload);
  return tokenData.access_token;
}

async function getValidTikTokAccessToken() {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const { data, error } = await admin
    .from("tiktok_oauth_tokens")
    .select("id, provider, access_token, refresh_token, expires_at, refresh_expires_at")
    .eq("provider", TIKTOK_PROVIDER)
    .maybeSingle();

  if (error) {
    if (error.code === "PGRST205") {
      const envToken = process.env.TIKTOK_ACCESS_TOKEN;
      if (envToken) {
        return envToken;
      }
      throw new Error(
        "Missing table public.tiktok_oauth_tokens and no TIKTOK_ACCESS_TOKEN env fallback set.",
      );
    }
    throw new Error(
      `Failed to load TikTok OAuth token row: ${error.message} (${error.code ?? "no_code"})`,
    );
  }
  if (!data?.access_token) {
    throw new Error("TikTok is not connected yet. Connect the account first.");
  }

  const tokenRow = data as TikTokStoredToken;
  const expiresAtMs = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0;
  const isExpiring = Boolean(expiresAtMs && Date.now() >= expiresAtMs - 60_000);

  if (!isExpiring) {
    return tokenRow.access_token;
  }
  if (!tokenRow.refresh_token) {
    throw new Error("TikTok access token expired and no refresh token exists.");
  }

  return refreshTikTokAccessToken(tokenRow.refresh_token);
}

function mapTikTokTimestampToIso(value?: number) {
  if (!value || !Number.isFinite(value)) {
    return new Date().toISOString();
  }
  return new Date(value * 1000).toISOString();
}

export async function syncTikTokVideos(limit = 20) {
  const accessToken = await getValidTikTokAccessToken();
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin client is not configured.");
  }

  const fields = [
    "id",
    "title",
    "video_description",
    "cover_image_url",
    "share_url",
    "view_count",
    "like_count",
    "create_time",
  ].join(",");

  const response = await fetch(`${TIKTOK_VIDEO_LIST_URL}?fields=${encodeURIComponent(fields)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ max_count: Math.min(Math.max(limit, 1), 20) }),
    cache: "no-store",
  });

  const payload = (await response.json()) as TikTokVideoListPayload;
  const videos = payload.data?.videos ?? [];

  if (!response.ok || (payload.error && payload.error.code !== "ok")) {
    throw new Error(
      `TikTok video sync failed: ${payload.error?.message ?? `http_${response.status}`}`,
    );
  }

  const rows = videos
    .filter((video) => video.id)
    .map((video) => {
      const postId = String(video.id);
      return {
        post_id: postId,
        video_id: postId,
        share_url: String(video.share_url ?? "https://www.tiktok.com/@iyeobaweddings"),
        video_url: String(video.share_url ?? "https://www.tiktok.com/@iyeobaweddings"),
        title: video.title?.trim() || null,
        caption: (video.video_description ?? video.title ?? "Wedding inspiration").trim(),
        thumbnail_url: video.cover_image_url ?? null,
        views: Number(video.view_count ?? 0),
        likes: Number(video.like_count ?? 0),
        created_at: mapTikTokTimestampToIso(video.create_time),
        status: "approved",
        active: true,
      };
    });

  if (!rows.length) {
    return { synced: 0 };
  }

  const primaryUpsert = await admin
    .from("tiktok_videos")
    .upsert(rows, { onConflict: "post_id" });

  if (primaryUpsert.error) {
    const missingColumn = primaryUpsert.error.code === "42703";
    if (!missingColumn) {
      throw new Error(
        `Failed to upsert TikTok videos: ${primaryUpsert.error.message} (${primaryUpsert.error.code ?? "no_code"})`,
      );
    }

    const legacyRows = rows.map((row) => ({
      post_id: row.post_id,
      share_url: row.share_url,
      title: row.title,
      thumbnail_url: row.thumbnail_url,
      caption: row.caption,
      views: row.views,
      likes: row.likes,
      active: row.active,
    }));
    const legacyUpsert = await admin
      .from("tiktok_videos")
      .upsert(legacyRows, { onConflict: "post_id" });

    if (legacyUpsert.error) {
      throw new Error(
        `Failed to upsert TikTok videos (legacy fallback): ${legacyUpsert.error.message} (${legacyUpsert.error.code ?? "no_code"})`,
      );
    }
  }

  return { synced: rows.length };
}
