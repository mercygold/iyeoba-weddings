import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") ?? "signup";
  const next = normalizeNextPath(requestUrl.searchParams.get("next"));

  if (!tokenHash) {
    return NextResponse.redirect(
      new URL(
        `/auth/sign-in?error=${encodeURIComponent(
          "We could not verify your auth link. Please request a new email link.",
        )}`,
        requestUrl.origin,
      ),
    );
  }

  const supabase = await createSupabaseRouteHandlerClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: normalizeOtpType(type),
  });

  if (error) {
    console.warn("[auth:confirm] verifyOtp failed", {
      type,
      message: error.message,
      status: "status" in error ? error.status : undefined,
    });
    return NextResponse.redirect(
      new URL(
        `/auth/sign-in?error=${encodeURIComponent(
          "We could not verify your auth link. Please request a new email link.",
        )}`,
        requestUrl.origin,
      ),
    );
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

function normalizeOtpType(value: string): EmailOtpType {
  if (value === "recovery" || value === "email_change" || value === "invite" || value === "magiclink") {
    return value;
  }
  return "signup";
}

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}
