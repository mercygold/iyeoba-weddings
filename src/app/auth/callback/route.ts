import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = normalizeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseRouteHandlerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth:callback] exchangeCodeForSession failed", {
        error,
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
  } else if (tokenHash && type === "recovery") {
    const supabase = await createSupabaseRouteHandlerClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });
    if (error) {
      console.error("[auth:callback] verifyOtp recovery failed", {
        error,
        next,
      });
      return NextResponse.redirect(
        new URL(
          `/auth/reset-password?error=${encodeURIComponent(
            "We could not verify your reset link. Please request a new password reset email.",
          )}`,
          requestUrl.origin,
        ),
      );
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}

function normalizeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}
