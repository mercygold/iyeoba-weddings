import { NextResponse } from "next/server";

const TIKTOK_VERIFY_TEXT =
  "tiktok-developers-site-verification=NtAry8NLt2sLodUetFjztUm1XQhe4sIw";

export async function GET() {
  return new NextResponse(TIKTOK_VERIFY_TEXT, {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
