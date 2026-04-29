import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncTikTokVideos } from "@/lib/tiktok-sync";

async function assertAdminApiUser() {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData.user;

  if (authError || !user) {
    return { ok: false as const, status: 401, message: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return { ok: false as const, status: 403, message: "Forbidden" };
  }

  return { ok: true as const };
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}

async function handleSync(request: Request) {
  const access = await assertAdminApiUser();
  if (!access.ok) {
    return NextResponse.json({ error: access.message }, { status: access.status });
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "5");
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 20)
    : 5;

  try {
    const result = await syncTikTokVideos(limit);
    return NextResponse.json({
      ok: true,
      synced: result.synced,
      message: `Synced ${result.synced} TikTok videos.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error.";
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
