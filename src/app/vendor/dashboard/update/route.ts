import { NextRequest, NextResponse } from "next/server";

import { saveOrSubmitVendorProfileAction } from "@/app/vendor/dashboard/actions";

function extractRedirectLocation(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const digest =
    "digest" in error && typeof (error as { digest?: unknown }).digest === "string"
      ? (error as { digest: string }).digest
      : null;

  if (!digest || !digest.startsWith("NEXT_REDIRECT")) {
    return null;
  }

  const parts = digest.split(";");
  return parts.length >= 3 ? parts[2] : null;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  try {
    await saveOrSubmitVendorProfileAction(formData);
    return NextResponse.redirect(
      new URL("/vendor/dashboard?edit=1", request.url),
      { status: 303 },
    );
  } catch (error) {
    const location = extractRedirectLocation(error);
    if (location) {
      return NextResponse.redirect(new URL(location, request.url), { status: 303 });
    }

    console.error("Vendor dashboard update route failed", error);
    return NextResponse.redirect(
      new URL(
        "/vendor/dashboard?edit=1&error=We%20could%20not%20save%20your%20profile%20right%20now.",
        request.url,
      ),
      { status: 303 },
    );
  }
}
