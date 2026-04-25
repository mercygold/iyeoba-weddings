import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const VERIFICATION_FILE_NAME = "tiktok-verification.txt";
const LEGACY_VERIFICATION_FILE_NAME = "tiktokpCAz8ZXPGtJLumXussJ9ct5xkwY6ygD9.txt";

export const dynamic = "force-static";

export async function GET() {
  const publicDir = path.join(process.cwd(), "public");

  try {
    const text = await readFile(
      path.join(publicDir, VERIFICATION_FILE_NAME),
      "utf8",
    );

    return new NextResponse(text.trim(), {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  } catch {
    try {
      const legacyText = await readFile(
        path.join(publicDir, LEGACY_VERIFICATION_FILE_NAME),
        "utf8",
      );

      return new NextResponse(legacyText.trim(), {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "public, max-age=300",
        },
      });
    } catch {
      return NextResponse.json(
        {
          error:
            "TikTok verification file is missing. Add /public/tiktok-verification.txt.",
        },
        { status: 404 },
      );
    }
  }
}
