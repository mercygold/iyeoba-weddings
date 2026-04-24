import { NextResponse } from "next/server";

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
  if (!code) {
    return NextResponse.json(
      { error: "Missing TikTok authorization code." },
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

  // TEMP SETUP RESPONSE ONLY: remove token display after setup is complete.
  const responseText = [
    "TikTok connected successfully.",
    `ACCESS_TOKEN=${tokenPayload.access_token ?? ""}`,
    `REFRESH_TOKEN=${tokenPayload.refresh_token ?? ""}`,
    `expires_in=${tokenPayload.expires_in ?? ""}`,
  ].join("\n");

  return new NextResponse(responseText, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
