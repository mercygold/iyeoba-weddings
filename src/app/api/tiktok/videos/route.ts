import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const baseSelect =
      "post_id, share_url, title, caption, thumbnail_url, views, likes, created_at, active";

    let { data, error } = await supabase
      .from("tiktok_videos")
      .select(baseSelect)
      .eq("active", true)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error && isColumnMissingError(error)) {
      const fallback = await supabase
        .from("tiktok_videos")
        .select(baseSelect)
        .eq("active", true)
        .eq("moderation_status", "approved")
        .order("created_at", { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (error && isColumnMissingError(error)) {
      const fallback = await supabase
        .from("tiktok_videos")
        .select(baseSelect)
        .eq("active", true)
        .order("created_at", { ascending: false });
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

    const videos = (data ?? []).slice(0, 12).map((row) => ({
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
