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
  const traceId = `vendor-profile-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const wantsJson =
    request.headers.get("accept")?.includes("application/json") ||
    request.headers.get("x-requested-with") === "vendor-dashboard-form" ||
    request.headers.get("x-vendor-dashboard-submit") === "json";
  let intent = "unknown";

  try {
    const formData = await request.formData();
    intent = String(formData.get("intent") ?? "").trim().toLowerCase();

    console.log("Vendor dashboard update route hit", {
      traceId,
      method: request.method,
      url: request.url,
      intent,
      wantsJson,
      formSummary: summarizeRouteFormData(formData),
    });

    await saveOrSubmitVendorProfileAction(formData);
    const fallbackLocation = "/vendor/dashboard?edit=1";

    if (wantsJson) {
      return NextResponse.json({
        ok: true,
        traceId,
        intent,
        message: getSuccessMessage(intent),
        redirectTo: fallbackLocation,
      });
    }

    return NextResponse.redirect(new URL(fallbackLocation, request.url), {
      status: 303,
    });
  } catch (error) {
    const location = extractRedirectLocation(error);
    if (location) {
      if (wantsJson) {
        const response = buildJsonRedirectResponse(location, request.url, {
          traceId,
          intent,
        });
        console.log("Vendor dashboard update route returned redirect payload", {
          traceId,
          intent,
          location,
          status: response.status,
        });
        return response;
      }

      return NextResponse.redirect(new URL(location, request.url), { status: 303 });
    }

    console.error("Vendor dashboard update route failed", {
      traceId,
      method: request.method,
      url: request.url,
      intent,
      error: serializeRouteError(error),
    });

    if (wantsJson) {
      return NextResponse.json(
        {
          ok: false,
          traceId,
          intent,
          error: "We couldn’t save your profile yet. Your changes are still here. Please try again.",
          details: serializeRouteError(error),
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

function buildJsonRedirectResponse(
  location: string,
  requestUrl: string,
  context: { traceId: string; intent: string },
) {
  const url = new URL(location, requestUrl);
  const error = url.searchParams.get("error");
  const message = url.searchParams.get("message");
  const isError = Boolean(error) || url.pathname.startsWith("/auth/sign-in");

  return NextResponse.json(
    {
      ok: !isError,
      traceId: context.traceId,
      intent: context.intent,
      message: message || (!isError ? getSuccessMessage(context.intent) : null),
      error:
        error ||
        (url.pathname.startsWith("/auth/sign-in")
          ? "Please sign in again before saving your profile."
          : null),
      details: {
        source: "server_action_redirect",
        pathname: url.pathname,
        search: url.search,
      },
      redirectTo: `${url.pathname}${url.search}`,
    },
    { status: isError ? 400 : 200 },
  );
}

function getSuccessMessage(intent: string) {
  if (intent === "submit") {
    return "Sent to admin. Your updated profile is now under review.";
  }
  if (intent === "publish") {
    return "Your profile has been updated successfully.";
  }
  return "Draft saved. You can continue editing later.";
}

function serializeRouteError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    };
  }

  if (error && typeof error === "object") {
    return Object.fromEntries(
      Object.entries(error as Record<string, unknown>)
        .filter(([key]) => !key.toLowerCase().includes("key"))
        .map(([key, value]) => [
          key,
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
            ? value
            : String(value),
        ]),
    );
  }

  return { message: String(error) };
}

function summarizeRouteFormData(formData: FormData) {
  return {
    keys: [...formData.keys()],
    intent: String(formData.get("intent") ?? ""),
    hasBusinessName: Boolean(String(formData.get("businessName") ?? "").trim()),
    hasOwnerName: Boolean(String(formData.get("ownerName") ?? "").trim()),
    hasEmail: Boolean(String(formData.get("email") ?? "").trim()),
    hasCategory: Boolean(String(formData.get("category") ?? "").trim()),
    hasCountryRegion: Boolean(String(formData.get("countryRegion") ?? "").trim()),
    hasPhoneLocal: Boolean(String(formData.get("phoneLocal") ?? "").trim()),
    hasPrimarySocialLink: Boolean(
      String(formData.get("primarySocialLink") ?? "").trim(),
    ),
    portfolioImageCount: safeJsonArrayLength(formData.get("portfolioImageUrls")),
    hasGovernmentIdPath: Boolean(
      String(formData.get("governmentIdPath") ?? "").trim(),
    ),
    hasCacCertificatePath: Boolean(
      String(formData.get("cacCertificatePath") ?? "").trim(),
    ),
  };
}

function safeJsonArrayLength(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string") {
    return 0;
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}
