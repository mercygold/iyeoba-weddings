import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { storeTikTokTokens } from "@/lib/tiktok-sync";

const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

type TikTokTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_expires_in?: number;
  token_type?: string;
  scope?: string;
  open_id?: string;
  error?: string;
  error_description?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code) {
    return NextResponse.json(
      { error: "Missing TikTok authorization code." },
      { status: 400 },
    );
  }
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("tiktok_oauth_state")?.value ?? null;
  if (!state || !expectedState || state !== expectedState) {
    return NextResponse.json(
      { error: "Invalid TikTok OAuth state." },
      { status: 400 },
    );
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_REDIRECT_URI;

  if (!clientKey || !clientSecret || !redirectUri) {
    return NextResponse.json(
      {
        error:
          "Missing TikTok OAuth env vars. Set TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, and TIKTOK_REDIRECT_URI.",
      },
      { status: 500 },
    );
  }

  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const tokenResponse = await fetch(TIKTOK_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
    cache: "no-store",
  });

  const tokenPayload = (await tokenResponse.json()) as TikTokTokenResponse;

  if (!tokenResponse.ok || tokenPayload.error) {
    console.error("TikTok OAuth callback token exchange failed", {
      status: tokenResponse.status,
      error: tokenPayload.error,
      error_description: tokenPayload.error_description,
    });

    return NextResponse.json(
      {
        error: "TikTok token exchange failed.",
        details: tokenPayload.error_description ?? tokenPayload.error ?? null,
      },
      { status: 500 },
    );
  }
  try {
    await storeTikTokTokens(tokenPayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown token storage error";
    return NextResponse.json(
      { error: "TikTok connected, but token storage failed.", details: message },
      { status: 500 },
    );
  }

  cookieStore.delete("tiktok_oauth_state");
  return NextResponse.redirect(
    new URL("/admin/tiktok?message=TikTok%20account%20connected.", url.origin),
  );
}
