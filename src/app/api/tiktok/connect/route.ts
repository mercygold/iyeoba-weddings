import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const TIKTOK_AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_SCOPES = ["user.info.basic", "video.list"];

export async function GET(request: Request) {
  const baseUrl = new URL(request.url);
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.redirect(
      new URL("/auth/sign-in?next=/admin/tiktok", baseUrl.origin),
    );
  }
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return NextResponse.redirect(new URL("/?error=Access%20denied", baseUrl.origin));
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  if (!clientKey || !redirectUri) {
    return NextResponse.json(
      {
        error:
          "Missing TikTok OAuth configuration. Set TIKTOK_CLIENT_KEY and TIKTOK_REDIRECT_URI.",
      },
      { status: 500 },
    );
  }

  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("tiktok_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 15,
  });

  const authUrl = new URL(TIKTOK_AUTHORIZE_URL);
  authUrl.searchParams.set("client_key", clientKey);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", TIKTOK_SCOPES.join(","));
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl);
}
