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
  const wantsJson = request.headers.get("x-vendor-dashboard-submit") === "json";

  try {
    await saveOrSubmitVendorProfileAction(formData);
    if (wantsJson) {
      return NextResponse.json({
        ok: true,
        message: "Your profile has been updated successfully.",
      });
    }
    return NextResponse.redirect(
      new URL("/vendor/dashboard?edit=1", request.url),
      { status: 303 },
    );
  } catch (error) {
    const location = extractRedirectLocation(error);
    if (location) {
      if (wantsJson) {
        return buildJsonRedirectResponse(location, request.url);
      }
      return NextResponse.redirect(new URL(location, request.url), { status: 303 });
    }

    console.error("Vendor dashboard update route failed", error);
    if (wantsJson) {
      return NextResponse.json(
        {
          ok: false,
          error: "We couldn’t save your profile yet. Your changes are still here. Please try again.",
        },
        { status: 500 },
      );
    }
    return NextResponse.redirect(
      new URL(
        "/vendor/dashboard?edit=1&error=We%20could%20not%20save%20your%20profile%20right%20now.",
        request.url,
      ),
      { status: 303 },
    );
  }
}

function buildJsonRedirectResponse(location: string, requestUrl: string) {
  const url = new URL(location, requestUrl);
  const error = url.searchParams.get("error");
  const message = url.searchParams.get("message");
  const isError = Boolean(error) || url.pathname.startsWith("/auth/sign-in");

  return NextResponse.json(
    {
      ok: !isError,
      message: message || null,
      error:
        error ||
        (url.pathname.startsWith("/auth/sign-in")
          ? "Please sign in again before saving your profile."
          : null),
      redirectTo: `${url.pathname}${url.search}`,
    },
    { status: isError ? 400 : 200 },
  );
}
