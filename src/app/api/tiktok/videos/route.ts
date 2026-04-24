import { NextResponse } from "next/server";

export async function GET() {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;

  if (!accessToken) {
    return NextResponse.json(
      {
        videos: [],
        message:
          "TIKTOK_ACCESS_TOKEN is not configured yet. Set it after OAuth callback.",
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    videos: [],
    message:
      "TikTok access token detected. Video fetch endpoint will be connected in the next step.",
  });
}
