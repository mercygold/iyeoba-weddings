import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

const TIKTOK_AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TIKTOK_SCOPES = ["user.info.basic", "video.list"];

export async function GET() {
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

  const authUrl = new URL(TIKTOK_AUTHORIZE_URL);
  authUrl.searchParams.set("client_key", clientKey);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", TIKTOK_SCOPES.join(","));
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl);
}
