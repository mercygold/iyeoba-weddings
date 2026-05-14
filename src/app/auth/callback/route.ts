import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { getAuthRoleRedirectPath } from "@/lib/auth-profile-sync";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = normalizeNextPath(requestUrl.searchParams.get("next"));
  let supabase: Awaited<ReturnType<typeof createSupabaseRouteHandlerClient>> | null = null;

  if (code) {
    supabase = await createSupabaseRouteHandlerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.warn("[auth:callback] exchangeCodeForSession failed", {
        message: error.message,
        status: "status" in error ? error.status : undefined,
        next,
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
  } else if (tokenHash) {
    supabase = await createSupabaseRouteHandlerClient();
    const otpType = normalizeOtpType(type);
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (error) {
      console.warn("[auth:callback] verifyOtp failed", {
        type: otpType,
        message: error.message,
        status: "status" in error ? error.status : undefined,
        next,
      });
      const errorPath =
        otpType === "recovery"
          ? `/auth/reset-password?error=${encodeURIComponent(
              "We could not verify your reset link. Please request a new password reset email.",
            )}`
          : `/auth/sign-in?error=${encodeURIComponent(
              "We could not verify your auth link. Please request a new email link.",
            )}`;
      return NextResponse.redirect(
        new URL(errorPath, requestUrl.origin),
      );
    }
  }

  const destination =
    next === "/dashboard" && supabase
      ? await getAuthRoleRedirectPath(supabase)
      : next;

  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

function normalizeOtpType(value: string | null): EmailOtpType {
  if (
    value === "signup" ||
    value === "email" ||
    value === "recovery" ||
    value === "email_change" ||
    value === "invite" ||
    value === "magiclink"
  ) {
    return value;
  }
  return "email";
}
