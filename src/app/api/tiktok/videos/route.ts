import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type TikTokVideoRow = {
  post_id: string | null;
  share_url: string | null;
  title: string | null;
  caption: string | null;
  thumbnail_url: string | null;
  views: number | string | null;
  likes: number | string | null;
  created_at: string | null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const typeParam = String(searchParams.get("type") ?? "latest").toLowerCase();
    const limitParam = Number(searchParams.get("limit") ?? "5");
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 20)
      : 5;
    const isTop = typeParam === "top";

    const supabase = await createSupabaseServerClient();
    const baseSelect =
      "post_id, share_url, title, caption, thumbnail_url, views, likes, created_at, active";

    let { data, error } = await runTikTokQuery({
      supabase,
      baseSelect,
      limit,
      isTop,
      approvalColumn: "status",
    });

    if (error && isColumnMissingError(error)) {
      const fallback = await runTikTokQuery({
        supabase,
        baseSelect,
        limit,
        isTop,
        approvalColumn: "moderation_status",
      });
      data = fallback.data;
      error = fallback.error;
    }

    if (error && isColumnMissingError(error)) {
      const fallback = await runTikTokQuery({
        supabase,
        baseSelect,
        limit,
        isTop,
      });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error("TikTok videos API failed", serializeSupabaseError(error));
      return NextResponse.json(
        {
          videos: [],
          message: "Could not load TikTok videos right now.",
        },
        { status: 200 },
      );
    }

    const rows = (data ?? []) as TikTokVideoRow[];
    const videos = rows.slice(0, limit).map((row) => ({
      id: String(row.post_id ?? ""),
      title: String(row.title ?? row.caption ?? "Wedding inspiration"),
      url: String(row.share_url ?? "https://www.tiktok.com/@iyeobaweddings"),
      cover_image_url: String(
        row.thumbnail_url ?? "/vendors/placeholders/event-planner.svg",
      ),
      view_count:
        typeof row.views === "number"
          ? row.views
          : Number(row.views ?? 0) || 0,
      like_count:
        typeof row.likes === "number"
          ? row.likes
          : Number(row.likes ?? 0) || 0,
      create_time: String(row.created_at ?? new Date().toISOString()),
    }));

    return NextResponse.json({
      videos,
      type: isTop ? "top" : "latest",
      message: videos.length
        ? "Latest approved TikTok videos loaded."
        : "No approved TikTok videos found yet.",
    });
  } catch (error) {
    console.error("TikTok videos API unexpected error", error);
    return NextResponse.json(
      {
        videos: [],
        message: "Could not load TikTok videos right now.",
      },
      { status: 200 },
    );
  }
}

async function runTikTokQuery({
  supabase,
  baseSelect,
  limit,
  isTop,
  approvalColumn,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  baseSelect: string;
  limit: number;
  isTop: boolean;
  approvalColumn?: "status" | "moderation_status";
}) {
  let query = supabase.from("tiktok_videos").select(baseSelect).eq("active", true) as any;
  if (approvalColumn) {
    query = query.eq(approvalColumn, "approved");
  }
  if (isTop) {
    query = query.order("views", { ascending: false, nullsFirst: false });
    query = query.order("likes", { ascending: false, nullsFirst: false });
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }
  return query.limit(limit);
}

function isColumnMissingError(error: { code?: string | null; message?: string | null }) {
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    (message.includes("column") && message.includes("does not exist"))
  );
}

function serializeSupabaseError(error: {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}) {
  return {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}
